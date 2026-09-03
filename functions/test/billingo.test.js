"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPartner, buildInvoice, hungarianDate } = require("../billingo");
const { findInvoiceByVendor, sendInvoice } = require("../billingo");

test("buildPartner maps Stripe billing details to Billingo", () => {
  const partner = buildPartner(
    { companyName: "Minta Kft.", contactName: "Teszt Elek", email: "teszt@example.hu", phone: "+3612345678" },
    {
      email: "szamla@example.hu",
      address: { country: "HU", postal_code: "1111", city: "Budapest", line1: "Minta utca 1." },
      tax_ids: [{ type: "hu_tin", value: "12345678-2-43" }]
    }
  );
  assert.equal(partner.name, "Minta Kft.");
  assert.equal(partner.address.country_code, "HU");
  assert.equal(partner.taxcode, "12345678-2-43");
});

test("buildInvoice emits gross AAM invoice items", () => {
  const invoice = buildInvoice({
    partnerId: 42, blockId: 7, vat: "AAM", vendorId: "evt_test", date: "2026-08-10",
    products: [{ name: "Céges weboldal", price: 69990, billing: "once" }]
  });
  assert.equal(invoice.payment_method, "online_bankcard");
  assert.equal(invoice.items[0].unit_price_type, "gross");
  assert.equal(invoice.items[0].unit_price, 69990);
  assert.equal(invoice.items[0].entitlement, "AAM");
});

test("advance and periodic documents carry the legally relevant Billingo fields", () => {
  const advance = buildInvoice({ partnerId: 42, blockId: 7, vat: "AAM", vendorId: "evt-advance", date: "2026-09-03",
    documentType: "advance", products: [{ name: "Egylapos weboldal", price: 39990, billing: "once" }] });
  assert.equal(advance.type, "advance");
  assert.equal(advance.fulfillment_date, "2026-09-03");
  assert.match(advance.items[0].name, /^Előleg/);
  const periodic = buildInvoice({ partnerId: 42, blockId: 7, vat: "AAM", vendorId: "evt-periodic", date: "2026-09-03",
    servicePeriod: { start: "2026-09-03", end: "2026-10-02" }, products: [{ name: "Marketing Mini", price: 4990, billing: "monthly" }] });
  assert.equal(periodic.type, "invoice");
  assert.match(periodic.comment, /2026-09-03.*2026-10-02/);
  const final = buildInvoice({ partnerId: 42, blockId: 7, vat: "AAM", vendorId: "evt-final", date: "2026-09-20", advanceInvoiceIds: [123],
    products: [{ name: "Egylapos weboldal", price: 39990, billing: "once" }] });
  assert.deepEqual(final.advance_invoice, [123]);
});

test("hungarianDate is stable around UTC day boundary", () => {
  assert.equal(hungarianDate(new Date("2026-01-01T23:30:00Z")), "2026-01-02");
});

test("vendor lookup recovers existing invoice and only 404 means absent", async () => {
  const response = (status, data) => ({ ok: status === 200, status, text: async () => JSON.stringify(data) });
  assert.deepEqual(await findInvoiceByVendor("test-only", "ovexi-in_test", async (url, opts) => {
    assert.ok(url.endsWith("/documents/vendor/ovexi-in_test"));
    assert.equal(opts.method, "GET");
    assert.equal(opts.body, undefined);
    return response(200, { id: 123 });
  }), { id: 123 });
  assert.equal(await findInvoiceByVendor("test-only", "x", async () => response(404, {})), null);
  await assert.rejects(findInvoiceByVendor("test-only", "x", async () => response(401, {})));
  await assert.rejects(findInvoiceByVendor("test-only", "x", async () => response(429, {})));
});

test("invoice email is a separate Billingo operation with explicit recipient", async () => {
  await sendInvoice("test-only", 123, "test@example.com", async (url, opts) => {
    assert.ok(url.endsWith("/documents/123/send"));
    assert.equal(opts.method, "POST");
    assert.deepEqual(JSON.parse(opts.body), { emails: ["test@example.com"] });
    return { ok: true, status: 200, text: async () => '{"emails":["test@example.com"]}' };
  });
});
