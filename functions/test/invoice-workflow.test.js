"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { processInvoice } = require("../invoice-workflow");
function setup() {
  const counts = { create: 0, send: 0, find: 0 };
  const payment = { livemode: true, products: [{ price: 69990 }], createdAt: { toDate: () => new Date() }, customerDetails: {} };
  const data = { paymentId: "in_test", invoiceCreateStarted: false };
  const order = { email: "test@example.com" };
  const options = { payment, data, order, env: { BILLINGO_ENABLED: "true", BILLINGO_BLOCK_ID: "1", BILLINGO_VAT: "AAM" },
    updateTask: async (p) => Object.assign(data, p), updatePayment: async (p) => Object.assign(payment, p), updateOrder: async (p) => Object.assign(order, p),
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
  assert.equal(x.data.invoiceCreateStarted, true);
  x.options.api.find = async (id) => { assert.equal(id, "ovexi-in_test"); return { id: 123 }; };
  assert.equal((await processInvoice(x.options)).status, "done");
  assert.equal(x.counts.create, 1); assert.equal(x.counts.send, 1);
});
test("ambiguous creation with no visible invoice stops for manual reconciliation", async () => {
  const x = setup(); x.data.invoiceCreateStarted = true;
  assert.equal((await processInvoice(x.options)).errorCode, "invoice_creation_uncertain");
  assert.equal(x.counts.create, 0);
});
test("explicit Billingo rate limit allows creation retry without pretending success", async () => {
  const x = setup(); x.options.api.create = async () => { throw Object.assign(new Error("rate limit"), { status: 429 }); };
  await assert.rejects(processInvoice(x.options));
  assert.equal(x.data.invoiceCreateStarted, false);
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
  assert.equal((await processInvoice(x.options)).errorCode, "invoice_delivery_uncertain");
  assert.equal(x.counts.create, 1);
});
