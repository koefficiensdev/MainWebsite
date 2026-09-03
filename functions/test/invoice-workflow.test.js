"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { processInvoice, processFinalInvoice } = require("../invoice-workflow");
function setup() {
  const counts = { create: 0, send: 0, find: 0 };
  const payment = { livemode: true, products: [{ name: "Céges weboldal", price: 69990, billing: "once" }], createdAt: { toDate: () => new Date() }, customerDetails: {} };
  const data = { paymentId: "in_test" };
  const order = { email: "test@example.com" };
  const options = { payment, data, order, env: { BILLINGO_ENABLED: "true", BILLINGO_BLOCK_ID: "1", BILLINGO_VAT: "AAM" },
    updateTask: async (p) => Object.assign(data, structuredClone(p)), updatePayment: async (p) => Object.assign(payment, structuredClone(p)), updateOrder: async (p) => Object.assign(order, structuredClone(p)),
    api: { find: async () => { counts.find++; return null; }, partner: async () => ({ id: 1 }), payload: (x) => x, date: () => "2026-08-30",
      create: async () => { counts.create++; return { id: 123, invoice_number: "TEST-123" }; }, send: async () => { counts.send++; } } };
  return { counts, payment, data, options };
}
test("test payments never call Billingo, even if enabled", async () => {
  const x = setup(); x.payment.livemode = false;
  assert.equal((await processInvoice(x.options)).invoiceStatus, "test_skipped");
  assert.deepEqual(x.counts, { create: 0, send: 0, find: 0 });
});
test("retry after success never duplicates invoice or email", async () => {
  const x = setup();
  assert.equal((await processInvoice(x.options)).status, "done");
  assert.equal((await processInvoice(x.options)).status, "done");
  assert.equal(x.counts.create, 1); assert.equal(x.counts.send, 1);
});
test("uncertain create response recovers by stable vendor ID", async () => {
  const x = setup();
  x.options.api.create = async () => { x.counts.create++; throw new Error("timeout after create"); };
  await assert.rejects(processInvoice(x.options));
  assert.equal(x.data.documentProgress.advance.createStarted, true);
  x.options.api.find = async (id) => { assert.equal(id, "ovexi-in_test-advance"); return { id: 123 }; };
  assert.equal((await processInvoice(x.options)).status, "done");
  assert.equal(x.counts.create, 1); assert.equal(x.counts.send, 1);
});
test("ambiguous creation with no visible invoice stops for manual reconciliation", async () => {
  const x = setup(); x.data.documentProgress = { advance: { createStarted: true } };
  assert.equal((await processInvoice(x.options)).errorCode, "advance_creation_uncertain");
  assert.equal(x.counts.create, 0);
});
test("explicit Billingo rate limit allows creation retry without pretending success", async () => {
  const x = setup(); x.options.api.create = async () => { throw Object.assign(new Error("rate limit"), { status: 429 }); };
  await assert.rejects(processInvoice(x.options));
  assert.equal(x.data.documentProgress.advance.createStarted, false);
});
test("failed delivery retries only delivery, not invoice creation", async () => {
  const x = setup(); x.options.api.send = async () => { throw Object.assign(new Error("rate limit"), { status: 429 }); };
  await assert.rejects(processInvoice(x.options));
  assert.equal(x.payment.billingoInvoiceId, 123);
  x.options.api.send = async () => { x.counts.send++; };
  assert.equal((await processInvoice(x.options)).status, "done");
  assert.equal(x.counts.create, 1);
});
test("ambiguous email send is not automatically resent", async () => {
  const x = setup(); x.options.api.send = async () => { throw new Error("timeout"); };
  await assert.rejects(processInvoice(x.options));
  assert.equal((await processInvoice(x.options)).errorCode, "advance_delivery_uncertain");
  assert.equal(x.counts.create, 1);
});

test("mixed payment creates and sends separate advance and periodic documents", async () => {
  const x = setup();
  x.payment.products.push({ name: "Marketing Mini", price: 4990, billing: "monthly" });
  x.payment.servicePeriod = { start: "2026-09-03", end: "2026-10-02" };
  x.options.api.create = async (payload) => ({ id: ++x.counts.create, invoice_number: payload.documentType === "advance" ? "E-1" : "S-1" });
  await processInvoice(x.options);
  assert.equal(x.counts.create, 2); assert.equal(x.counts.send, 2);
  assert.equal(x.payment.billingoDocuments.advance.type, "advance");
  assert.equal(x.payment.billingoDocuments.periodic.type, "invoice");
});

test("delivery final invoice links the paid advance and is idempotent", async () => {
  const x = setup();
  x.payment.billingoPartnerId = 1;
  x.payment.billingoDocuments = { advance: { id: 123, invoiceNumber: "E-1", type: "advance", sent: true } };
  x.options.api.create = async (payload) => { x.counts.create++; assert.deepEqual(payload.advanceInvoiceIds, [123]); return { id: 456, invoice_number: "V-1" }; };
  assert.equal((await processFinalInvoice(x.options)).status, "done");
  assert.equal((await processFinalInvoice(x.options)).status, "done");
  assert.equal(x.counts.create, 1); assert.equal(x.counts.send, 1);
});
