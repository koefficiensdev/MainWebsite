"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const d = require("../commerce-domain");

const input = () => ({ requestId: "e4a1bcdb-7b27-4655-a50a-1f59aaa0ff21", contactName: "Teszt Elek", companyName: "Teszt szalon", email: "teszt@example.com", itemIds: ["website-business"], businessDescription: "Időpont alapján dolgozó fodrászat.", primaryGoal: "Időpontfoglalás", termsAccepted: true, operatingCostsAcknowledged: true, businessPurchaseConfirmed: true, hungarianBillingConfirmed: true });
const order = () => ({ ...d.validateOrder(input()), orderNumber: "OVX-TEST-TEST", stripeCheckoutSessionId: "cs_test_123", stripeSubscriptionId: "sub_test", livemode: false });
test("69990 HUF is sent as 6999000 Stripe minor units", () => {
  assert.equal(d.hufToMinor(69990), 6999000);
  assert.throws(() => d.hufToMinor(1.1));
  assert.throws(() => d.hufToMinor(-1));
  assert.throws(() => d.hufToMinor(Number.MAX_SAFE_INTEGER));
  const session = d.checkoutPayload("abc", order());
  assert.equal(session.line_items[0].price_data.unit_amount, 6999000);
  assert.equal(session.allow_promotion_codes, false);
  assert.deepEqual(session.managed_payments, { enabled: false });
  assert.equal(session.mode, "payment");
});
test("server ignores client prices/status; takes immutable catalog snapshot", () => {
  const checked = d.validateOrder({ ...input(), onceTotal: 1, status: "paid", products: [] });
  assert.equal(checked.onceTotal, 69990);
  assert.equal(checked.status, undefined);
  assert.equal(checked.products[0].price, 69990);
  assert.equal(checked.bundleMaintenanceGift, false);
});
test("rejects invalid data, forged consent and incompatible carts", () => {
  for (const patch of [{ termsAccepted: false }, { operatingCostsAcknowledged: false }, { businessPurchaseConfirmed: false }, { hungarianBillingConfirmed: false }, { requestId: "guess" }, { email: "bad" }, { businessDescription: "x" }, { itemIds: ["website-onepage", "website-business"] }, { itemIds: ["marketing-mini", "marketing-pro"] }, { website: "spam" }, { contactName: {} }]) assert.throws(() => d.validateOrder({ ...input(), ...patch }));
});
test("every catalogue product can be charged once it is on the approved live list", () => {
  const live = { PAYMENTS_ENABLED: "true", PAYMENT_MODE: "live", LIVE_PAYMENTS_APPROVED: "true", BILLINGO_ENABLED: "true", SMTP_ENABLED: "true", BILLINGO_BLOCK_ID: "1" };
  for (const { id } of require("../catalog").products) {
    const checked = d.validateOrder({ ...input(), itemIds: [id], currentUrl: "example.com" });
    assert.equal(d.paymentGate(checked, { ...live, INSTANT_PRODUCT_IDS: id }), null, id);
    assert.equal(d.paymentGate(checked, { ...live, INSTANT_PRODUCT_IDS: "" }), "scope_review", id);
  }
});
test("instant checkout requires explicit product and service readiness", () => {
  const checked = d.validateOrder({ ...input(), itemIds: ["marketing-launch"] });
  assert.equal(d.paymentGate(checked, {}), "scope_review");
  assert.equal(d.paymentGate(checked, { INSTANT_PRODUCT_IDS: "marketing-launch", PAYMENTS_ENABLED: "true", PAYMENT_MODE: "live" }), "live_configuration_incomplete");
  assert.equal(d.paymentGate(checked, { INSTANT_PRODUCT_IDS: "marketing-launch", PAYMENTS_ENABLED: "true", PAYMENT_MODE: "test" }), null);
  assert.throws(() => d.assertKeyMode("sk_test_x", "live"));
});
test("quick audit requires the website that will be reviewed", () => {
  assert.throws(() => d.validateOrder({ ...input(), itemIds: ["quick-audit"], currentUrl: "" }), /webcímet/);
  const checked = d.validateOrder({ ...input(), itemIds: ["quick-audit"], currentUrl: "example.com" });
  assert.equal(checked.onceTotal, 990);
  assert.equal(checked.currentUrl, "https://example.com/");
});
test("Stripe key mode accepts standard and restricted keys only in the matching environment", () => {
  assert.doesNotThrow(() => d.assertKeyMode("sk_test_x", "test"));
  assert.doesNotThrow(() => d.assertKeyMode("rk_test_x", "test"));
  assert.doesNotThrow(() => d.assertKeyMode("sk_live_x", "live"));
  assert.doesNotThrow(() => d.assertKeyMode("rk_live_x", "live"));
  for (const key of ["pk_live_x", "rk_test_x", "", null]) assert.throws(() => d.assertKeyMode(key, "live"));
});
test("mixed Checkout uses subscription mode but one-time items never recur", () => {
  const checked = { ...d.validateOrder({ ...input(), itemIds: ["website-onepage", "marketing-mini"] }), orderNumber: "OVX-TEST-TEST" };
  const session = d.checkoutPayload("abc", checked);
  assert.equal(session.mode, "subscription");
  assert.equal(session.line_items[0].price_data.recurring, undefined);
  assert.deepEqual(session.line_items[1].price_data.recurring, { interval: "month" });
  assert.equal(session.subscription_data.metadata.app, "ovexi");
});
test("payment requires paid complete session, exact amount, identity and mode", () => {
  const paid = { id: "cs_test_123", metadata: { app: "ovexi" }, livemode: false, status: "complete", payment_status: "paid", currency: "huf", amount_total: 6999000 };
  assert.equal(d.verifyCheckout(paid, order()), true);
  assert.equal(d.verifyCheckout({ ...paid, payment_status: "unpaid" }, order()), false);
  for (const patch of [{ id: "cs_other" }, { currency: "eur" }, { amount_total: 69990 }, { livemode: true }, { metadata: {} }]) assert.throws(() => d.verifyCheckout({ ...paid, ...patch }, order()));
});
test("monthly renewal invoices only recurring products at frozen prices", () => {
  const checked = { ...order(), ...d.validateOrder({ ...input(), itemIds: ["website-onepage", "marketing-mini"] }) };
  const paid = { status: "paid", amount_remaining: 0, parent: { subscription_details: { subscription: "sub_test" } }, livemode: false, billing_reason: "subscription_cycle", currency: "huf", total: 499000, amount_paid: 499000 };
  assert.deepEqual(d.verifySubscriptionInvoice(paid, checked).map((p) => p.id), ["marketing-mini"]);
  assert.equal(d.verifySubscriptionInvoice({ ...paid, billing_reason: "subscription_create", total: 4498000, amount_paid: 4498000 }, checked).length, 2);
  for (const patch of [{ billing_reason: "subscription_update" }, { amount_paid: 0 }, { total: 1 }, { livemode: true }, { status: "open" }]) assert.throws(() => d.verifySubscriptionInvoice({ ...paid, ...patch }, checked));
});
test("same request fingerprint is stable; changed brief differs", () => {
  assert.equal(d.fingerprint(d.validateOrder(input())), d.fingerprint(d.validateOrder(input())));
  assert.notEqual(d.fingerprint(d.validateOrder(input())), d.fingerprint(d.validateOrder({ ...input(), notes: "Másik" })));
});
