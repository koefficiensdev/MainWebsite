"use strict";

const crypto = require("node:crypto");
const { resolveProducts, calculateTotals } = require("./catalog");
const TERMS_VERSION = "2026-08-30";
const SUPPORTED_EVENTS = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired", "invoice.paid", "invoice.payment_failed", "customer.subscription.updated", "customer.subscription.deleted"];

function hufToMinor(amount) {
  if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(amount * 100)) throw new Error("Invalid HUF amount");
  return amount * 100;
}

function validateOrder(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Érvénytelen rendelés.");
  if (!/^[a-f0-9-]{32,36}$/i.test(input.requestId || "")) throw new Error("Érvénytelen kérésazonosító.");
  if (input.website) throw new Error("Érvénytelen kérés.");
  if (input.termsAccepted !== true || input.operatingCostsAcknowledged !== true) throw new Error("Fogadd el a feltételeket és az üzemeltetési költségekről szóló tájékoztatást.");
  const products = resolveProducts(input.itemIds).map((p) => ({ ...p }));
  for (const prefix of ["website-", "maintenance-"]) {
    if (products.filter((p) => p.id.startsWith(prefix)).length > 1) throw new Error("Egy kategóriából egy csomag választható.");
  }
  if (products.filter((p) => p.id.startsWith("marketing-") && p.billing === "monthly").length > 1) throw new Error("Egy havi marketingcsomag választható.");
  const order = {};
  for (const [key, min, max] of [["contactName", 2, 80], ["companyName", 2, 120], ["email", 5, 160], ["phone", 0, 32], ["businessDescription", 10, 1200], ["primaryGoal", 2, 80], ["targetAudience", 0, 300], ["currentUrl", 0, 300], ["tone", 0, 80], ["notes", 0, 1600]]) {
    if (input[key] != null && typeof input[key] !== "string") throw new Error(`Érvénytelen mező: ${key}`);
    const value = (input[key] || "").replace(/\s+/g, " ").trim();
    if (value.length < min || value.length > max) throw new Error(`Ellenőrizd ezt a mezőt: ${key}`);
    order[key] = value;
  }
  order.email = order.email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email)) throw new Error("Érvénytelen e-mail-cím.");
  if (order.currentUrl && !/^https?:\/\//i.test(order.currentUrl)) throw new Error("Érvénytelen webcím.");
  const totals = calculateTotals(products);
  return { ...order, products, itemIds: products.map((p) => p.id), itemNames: products.map((p) => p.name), onceTotal: totals.once, monthlyTotal: totals.monthly,
    termsAccepted: true, operatingCostsAcknowledged: true, termsVersion: TERMS_VERSION, marketingConsent: input.marketingConsent === true,
    source: "ovexi_storefront", requestId: input.requestId.toLowerCase(), bundleMaintenanceGift: false };
}

function fingerprint(order) {
  return crypto.createHash("sha256").update(JSON.stringify(order)).digest("hex");
}

function paymentGate(order, env = process.env) {
  if (order.itemIds.includes("website-business")) return "booking_in_development";
  const approved = String(env.INSTANT_PRODUCT_IDS || "").split(",").map((id) => id.trim()).filter(Boolean);
  if (!order.itemIds.every((id) => approved.includes(id))) return "scope_review";
  if (env.PAYMENTS_ENABLED !== "true") return "payments_disabled";
  if (env.PAYMENT_MODE !== "test" && env.PAYMENT_MODE !== "live") return "invalid_payment_mode";
  if (env.PAYMENT_MODE === "live" && (env.LIVE_PAYMENTS_APPROVED !== "true" || env.BILLINGO_ENABLED !== "true" || env.SMTP_ENABLED !== "true" || !Number(env.BILLINGO_BLOCK_ID))) return "live_configuration_incomplete";
  return null;
}

function assertKeyMode(key, mode) {
  if (!["test", "live"].includes(mode) || !String(key).startsWith(`sk_${mode}_`)) throw new Error("A Stripe kulcs és a fizetési környezet nem egyezik.");
}

function checkoutPayload(orderId, order) {
  const recurring = order.products.some((p) => p.billing === "monthly");
  const metadata = { orderId, orderNumber: order.orderNumber, app: "ovexi" };
  return { mode: recurring ? "subscription" : "payment", locale: "hu", payment_method_types: ["card"], customer_email: order.email,
    billing_address_collection: "required", tax_id_collection: { enabled: true }, allow_promotion_codes: false,
    client_reference_id: orderId, metadata, ...(recurring ? { subscription_data: { metadata } } : { customer_creation: "always", payment_intent_data: { metadata } }),
    line_items: order.products.map((p) => ({ quantity: 1, price_data: { currency: "huf", unit_amount: hufToMinor(p.price), product_data: { name: p.name, metadata: { ovexiProductId: p.id } }, ...(p.billing === "monthly" ? { recurring: { interval: "month" } } : {}) } })),
    success_url: "https://ovexi.hu/?payment=returned", cancel_url: "https://ovexi.hu/?payment=cancelled" };
}

function verifyCheckout(session, order) {
  if (session.id !== order.stripeCheckoutSessionId || session.metadata?.app !== "ovexi") throw new Error("Checkout mismatch");
  if (session.livemode !== order.livemode) throw new Error("Payment mode mismatch");
  if (session.payment_status !== "paid" || session.status !== "complete") return false;
  if (session.currency !== "huf" || session.amount_total !== hufToMinor(order.onceTotal + order.monthlyTotal)) throw new Error("Payment amount mismatch");
  return true;
}

function invoiceSubscriptionId(invoice) {
  const sub = invoice.parent?.subscription_details?.subscription || invoice.subscription;
  return typeof sub === "object" ? sub?.id : sub;
}

function verifySubscriptionInvoice(invoice, order) {
  if (invoice.status !== "paid" || invoice.amount_remaining !== 0) throw new Error("Invoice is not paid");
  if (invoiceSubscriptionId(invoice) !== order.stripeSubscriptionId || invoice.livemode !== order.livemode) throw new Error("Subscription mismatch");
  const initial = invoice.billing_reason === "subscription_create";
  if (!initial && invoice.billing_reason !== "subscription_cycle") throw new Error("Proration/manual invoice requires review");
  const expected = hufToMinor((initial ? order.onceTotal : 0) + order.monthlyTotal);
  if (invoice.currency !== "huf" || invoice.total !== expected || invoice.amount_paid !== expected) throw new Error("Invoice amount mismatch; credits/discounts require review");
  return order.products.filter((p) => initial || p.billing === "monthly");
}

module.exports = { TERMS_VERSION, SUPPORTED_EVENTS, hufToMinor, validateOrder, fingerprint, paymentGate, assertKeyMode, checkoutPayload, verifyCheckout, invoiceSubscriptionId, verifySubscriptionInvoice };
