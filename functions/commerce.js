"use strict";

const crypto = require("node:crypto");
const { getFirestore } = require("firebase-admin/firestore");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");
const domain = require("./commerce-domain");
const promo = require("./promo-domain");
const billing = require("./billingo");
const configuredSecrets = require("./integration-config");

const db = getFirestore();
const stripeKey = defineSecret("STRIPE_SECRET_KEY");
const webhookKey = defineSecret("STRIPE_WEBHOOK_SECRET");
const smtpKey = configuredSecrets.smtpSecretConfigured ? defineSecret("SMTP_PASS") : { value: () => "" };
const billingoKey = configuredSecrets.billingoSecretConfigured ? defineSecret("BILLINGO_API_KEY") : { value: () => "" };
const workerSecrets = [...(configuredSecrets.smtpSecretConfigured ? [smtpKey] : []), ...(configuredSecrets.billingoSecretConfigured ? [billingoKey] : [])];
const callableOptions = { cors: ["https://ovexi.hu", "https://www.ovexi.hu", "https://ovexi-6ef38.web.app"], secrets: [stripeKey], timeoutSeconds: 60, maxInstances: 2 };
const publicCallableOptions = { cors: callableOptions.cors, timeoutSeconds: 15, maxInstances: 2 };
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stripeClient = () => new Stripe(stripeKey.value(), { maxNetworkRetries: 2, timeout: 20000 });
const taskRef = (id) => db.collection("commerce_tasks").doc(id);

function task(type, data) {
  return { type, ...data, status: "pending", attempts: 0, nextAttemptAt: new Date(), createdAt: new Date(), updatedAt: new Date() };
}

async function putTask(id, type, data) {
  try { await taskRef(id).create(task(type, data)); } catch (error) { if (error.code !== 6) throw error; }
}

async function reserveRequest(order, rawRequest) {
  const id = hash(order.requestId);
  const ref = db.collection("orders").doc(id);
  const now = new Date();
  const window = Math.floor(now.getTime() / 3600000);
  const rateIds = [hash(`ip:${rawRequest.ip || "unknown"}:${window}`), hash(`email:${order.email}:${window}`), `global-${window}`];
  const refs = rateIds.map((key) => db.collection("request_limits").doc(key));
  const promoClaimRef = order.promotion ? db.collection("promo_claims").doc(hash(`${order.promotion.id}:${order.email}`)) : null;
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      if (existing.data().requestFingerprint !== domain.fingerprint(order)) throw new HttpsError("already-exists", "A beküldés azonosítója más adatokhoz tartozik. Frissítsd az oldalt.");
      return { ref, order: existing.data() };
    }
    const [limits, promoClaim] = await Promise.all([
      Promise.all(refs.map((r) => tx.get(r))),
      promoClaimRef ? tx.get(promoClaimRef) : Promise.resolve(null)
    ]);
    if (limits.some((s, i) => Number(s.data()?.count || 0) >= (i === 2 ? 100 : 5))) throw new HttpsError("resource-exhausted", "Túl sok beküldés. Kérlek, próbáld később.");
    const promoExpiry = promoClaim?.data()?.expiresAt?.toMillis?.() || new Date(promoClaim?.data()?.expiresAt || 0).getTime();
    if (promoClaim?.exists && (promoClaim.data().status === "redeemed" || promoExpiry > now.getTime())) {
      throw new HttpsError("already-exists", "Ezt a promóciót ezzel az e-mail-címmel már igénybe vetted vagy egy folyamatban lévő rendeléshez lefoglaltad.");
    }
    const block = domain.paymentGate(order);
    const saved = { ...order, orderNumber: `OVX-${now.getTime().toString(36).toUpperCase()}-${id.slice(0, 6).toUpperCase()}`, requestFingerprint: domain.fingerprint(order),
      status: block ? "needs_review" : "checkout_pending", reviewReason: block || "", livemode: process.env.PAYMENT_MODE === "live", createdAt: now, updatedAt: now };
    tx.create(ref, saved);
    tx.create(db.collection("order_workflows").doc(id), {orderId:id,orderNumber:saved.orderNumber,companyName:saved.companyName,...require("./operations-domain").workflowFor(saved),createdAt:now,updatedAt:now});
    limits.forEach((s, i) => tx.set(refs[i], { count: Number(s.data()?.count || 0) + 1, expiresAt: new Date(now.getTime() + 86400000) }));
    if (promoClaimRef) tx.set(promoClaimRef, { orderId:id, promoId:order.promotion.id, code:order.promoCode, emailHash:hash(order.email), status:"reserved", expiresAt:new Date(now.getTime()+25*3600000), createdAt:now, updatedAt:now });
    tx.create(taskRef(`request-${id}`), task("order_received", { orderId: id }));
    return { ref, order: saved };
  });
}

exports.submitOrder = onCall(callableOptions, async (request) => {
  if (Buffer.byteLength(JSON.stringify(request.data || {})) > 16000) throw new HttpsError("invalid-argument", "Túl nagy beküldés.");
  let clean;
  try { clean = domain.validateOrder(request.data); } catch (error) { throw new HttpsError("invalid-argument", error.message); }
  const { ref, order } = await reserveRequest(clean, request.rawRequest);
  const result = { orderNumber: order.orderNumber, status: "received", emailQueued: process.env.SMTP_ENABLED === "true" };
  if (domain.paymentGate(order) || ["paid", "in_production", "completed", "cancelled"].includes(order.status)) return result;
  if (order.checkoutUrl) return { ...result, status: "awaiting_payment", checkoutUrl: order.checkoutUrl };
  // Stripe stores idempotency keys for 24h. Never recreate an uncertain older checkout.
  const created = order.createdAt?.toMillis?.() || new Date(order.createdAt).getTime();
  if (Date.now() - created > 23 * 3600000) return result;
  try {
    domain.assertKeyMode(stripeKey.value(), process.env.PAYMENT_MODE);
    const session = await stripeClient().checkout.sessions.create(domain.checkoutPayload(ref.id, order), { idempotencyKey: `ovexi-checkout-${ref.id}` });
    await ref.update({ stripeCheckoutSessionId: session.id, checkoutUrl: session.url, status: "awaiting_payment", updatedAt: new Date() });
    return { ...result, status: "awaiting_payment", checkoutUrl: session.url };
  } catch {
    await ref.update({ paymentStatus: "checkout_failed", updatedAt: new Date() });
    // Order is durable; never ask the customer to resubmit and create a duplicate.
    return { ...result, status: "checkout_failed" };
  }
});

exports.checkPromoCode = onCall(publicCallableOptions, async (request) => {
  if (Buffer.byteLength(JSON.stringify(request.data || {})) > 2000) throw new HttpsError("invalid-argument", "Túl nagy kérés.");
  try {
    const products = require("./catalog").resolveProducts(request.data?.itemIds);
    const promotion = promo.resolvePromotion(request.data?.promoCode, products);
    if (!promotion) throw new Error("Adj meg egy promókódot.");
    return { valid: true, code: promotion.code, label: promotion.label };
  } catch (error) {
    throw new HttpsError("invalid-argument", error.message);
  }
});

async function recordPayment(event, orderRef, paymentId, products, details, initial, context = {}) {
  const paymentRef = db.collection("payments").doc(paymentId);
  await db.runTransaction(async (tx) => {
    const [payment, orderSnap] = await Promise.all([tx.get(paymentRef), tx.get(orderRef)]);
    if (payment.exists) return;
    if (!orderSnap.exists) throw new Error("Order missing");
    const order = orderSnap.data();
    tx.create(paymentRef, { orderId: orderRef.id, eventId: event.id, products, customerDetails: details, livemode: event.livemode, status: "paid", invoiceStatus: "pending",
      createdAt: context.paidAt || new Date(Number(event.created || Date.now() / 1000) * 1000), ...(context.servicePeriod ? { servicePeriod: context.servicePeriod } : {}) });
    // First Checkout and invoice.paid events can arrive in either order.
    // Never regress a fulfilled order when the next monthly payment arrives.
    tx.update(orderRef, { ...(initial && !order.paidAt ? { status: "paid", paidAt: new Date(), initialPaymentId: paymentId } : {}), paymentStatus: "paid", invoiceStatus: "pending", lastPaymentId: paymentId, updatedAt: new Date() });
    if (initial && order.promotion?.id) {
      const promoClaimRef=db.collection("promo_claims").doc(hash(`${order.promotion.id}:${order.email}`));
      tx.set(promoClaimRef,{orderId:orderRef.id,promoId:order.promotion.id,code:order.promoCode,emailHash:hash(order.email),status:"redeemed",redeemedAt:new Date(),updatedAt:new Date()},{merge:true});
    }
    tx.create(taskRef(`invoice-${paymentId}`), task("invoice", { orderId: orderRef.id, paymentId }));
    tx.create(taskRef(`paid-${paymentId}`), task("payment_received", { orderId: orderRef.id, paymentId }));
  });
}

async function applyEvent(event) {
  const stripe = stripeClient();
  const object = event.data.object;
  if (event.type.startsWith("checkout.session.")) {
    const session = await stripe.checkout.sessions.retrieve(object.id);
    if (session.metadata?.app !== "ovexi" || !/^[a-f0-9]{64}$/.test(session.metadata?.orderId || "")) return;
    const ref = db.collection("orders").doc(session.metadata.orderId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error("Order missing");
    const order = snap.data();
    if (session.id !== order.stripeCheckoutSessionId) throw new Error("Checkout not linked yet");
    if (session.livemode !== order.livemode) throw new Error("Payment mode mismatch");
    if (!domain.verifyCheckout(session, order)) {
      if (session.status === "expired" && !order.paidAt) await ref.update({ paymentStatus: "expired", updatedAt: new Date() });
      return;
    }
    const sub = typeof session.subscription === "object" ? session.subscription?.id : session.subscription;
    const customer = typeof session.customer === "object" ? session.customer?.id : session.customer;
    await ref.update({ stripeCustomerId: customer || "", stripeSubscriptionId: sub || "", updatedAt: new Date() });
    if (sub) {
      await db.collection("subscriptions").doc(sub).set({ orderId: ref.id, customerId: customer, updatedAt: new Date() }, { merge: true });
      // The invoice event is the sole source of recurring invoices (including the first).
      const invoiceId = typeof session.invoice === "object" ? session.invoice?.id : session.invoice;
      if (invoiceId) await applyPaidInvoice(event, await stripe.invoices.retrieve(invoiceId), ref);
    } else {
      await recordPayment(event, ref, session.id, order.products, session.customer_details || {}, true);
    }
    return;
  }
  if (event.type.startsWith("invoice.")) {
    const invoice = await stripe.invoices.retrieve(object.id);
    const subId = domain.invoiceSubscriptionId(invoice);
    if (!subId) return;
    const sub = await stripe.subscriptions.retrieve(subId);
    if (sub.metadata?.app !== "ovexi" || !/^[a-f0-9]{64}$/.test(sub.metadata?.orderId || "")) return;
    const ref = db.collection("orders").doc(sub.metadata.orderId);
    const orderSnap = await ref.get();
    if (!orderSnap.exists) throw new Error("Order missing");
    const order = orderSnap.data();
    if (order.livemode !== invoice.livemode) throw new Error("Mode mismatch");
    // Bind only after checking the server-created Checkout session.
    const session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
    if ((typeof session.subscription === "object" ? session.subscription?.id : session.subscription) !== subId) throw new Error("Unrelated subscription");
    await ref.update({ stripeSubscriptionId: subId, stripeCustomerId: typeof sub.customer === "object" ? sub.customer.id : sub.customer, subscriptionStatus: sub.status, updatedAt: new Date() });
    await db.collection("subscriptions").doc(subId).set({ orderId: ref.id, updatedAt: new Date() }, { merge: true });
    if (invoice.status === "paid") await applyPaidInvoice(event, invoice, ref);
    else if (event.type === "invoice.payment_failed") {
      await ref.update({ paymentStatus: "payment_failed", updatedAt: new Date() });
      await putTask(`failed-${invoice.id}`, "payment_failed", { orderId: ref.id });
    }
    return;
  }
  if (event.type.startsWith("customer.subscription.")) {
    const sub = await stripe.subscriptions.retrieve(object.id);
    if (sub.metadata?.app !== "ovexi" || !/^[a-f0-9]{64}$/.test(sub.metadata?.orderId || "")) return;
    const ref = db.collection("orders").doc(sub.metadata.orderId);
    const order = (await ref.get()).data();
    if (!order || order.stripeSubscriptionId !== sub.id || order.livemode !== sub.livemode) return;
    await ref.update({ subscriptionStatus: sub.status, cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end), updatedAt: new Date() });
    if (sub.status === "canceled") await putTask(`cancel-${sub.id}`, "subscription_cancelled", { orderId: ref.id });
  }
}

async function applyPaidInvoice(event, invoice, ref) {
  const order = (await ref.get()).data();
  const products = domain.verifySubscriptionInvoice(invoice, order);
  const details = { name: invoice.customer_name, email: invoice.customer_email, address: invoice.customer_address, tax_ids: invoice.customer_tax_ids || [] };
  const periods = (invoice.lines?.data || []).map((line) => line.period).filter((period) => period?.start && period?.end);
  const servicePeriod = periods.length ? { start: billing.hungarianDate(new Date(Math.min(...periods.map((p) => p.start)) * 1000)), end: billing.hungarianDate(new Date((Math.max(...periods.map((p) => p.end)) - 1) * 1000)) } : undefined;
  const paidAt = invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : undefined;
  await recordPayment(event, ref, invoice.id, products, details, invoice.billing_reason === "subscription_create", { servicePeriod, paidAt });
}

exports.stripeWebhook = onRequest({ secrets: [stripeKey, webhookKey], cors: false, timeoutSeconds: 120, maxInstances: 2 }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  let event;
  try { event = stripeClient().webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], webhookKey.value()); }
  catch { return res.status(400).send("Invalid signature"); }
  if (!domain.SUPPORTED_EVENTS.includes(event.type)) return res.status(200).json({ received: true });
  if (event.livemode !== (process.env.PAYMENT_MODE === "live")) return res.status(400).send("Mode mismatch");
  const ref = db.collection("stripe_events").doc(event.id);
  const owner = crypto.randomUUID();
  const claimed = await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    if (data?.status === "done") return "done";
    if (data?.leaseUntil?.toMillis() > Date.now()) return "busy";
    tx.set(ref, { type: event.type, status: "processing", leaseOwner: owner, leaseUntil: new Date(Date.now() + 150000), updatedAt: new Date(), createdAt: data?.createdAt || new Date() });
    return "claimed";
  });
  if (claimed === "done") return res.status(200).json({ duplicate: true });
  if (claimed === "busy") return res.status(503).send("Retry later");
  try {
    await applyEvent(event);
    await ref.update({ status: "done", leaseUntil: new Date(0), updatedAt: new Date() });
    return res.status(200).json({ received: true });
  } catch {
    await ref.update({ status: "failed", errorCode: "event_processing_failed", leaseUntil: new Date(0), updatedAt: new Date() });
    // Stripe retries; no paid/issued success is fabricated on failure.
    return res.status(500).send("Processing failed");
  }
});

async function mailTask(id, data, order) {
  if (process.env.SMTP_ENABLED !== "true") return { status: "blocked", errorCode: "smtp_not_configured" };
  const message = require("./commerce-email").buildCommerceEmail(data.type, order);
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: smtpKey.value() }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 });
  await taskRef(id).update({mailStartedAt:new Date()});
  try { await transport.sendMail({ from: process.env.EMAIL_FROM || `OVEXI <${process.env.SMTP_USER}>`, to: order.email,
    subject: message.subject, text: message.text, html: message.html,
    messageId: `<${id}@ovexi.hu>`, replyTo: process.env.ADMIN_EMAIL || "info@ovexi.hu" }); }
  catch(error) { const result=require('./mail-delivery').failure(error,data.attempts);return {...result,status:result.status==='send_unknown'?'needs_review':result.status,mailStartedAt:result.status==='send_unknown'?new Date():null}; }
  return { status: "done" };
}

async function invoiceTask(ref, data, order) {
  const payRef = db.collection("payments").doc(data.paymentId);
  const payment = (await payRef.get()).data();
  if (!payment) throw new Error("Payment missing");
  // Never access an unbound secret when invoicing is disabled.
  const apiKey = process.env.BILLINGO_ENABLED === "true" ? billingoKey.value() : "";
  const method = data.type === "final_invoice" ? "processFinalInvoice" : "processInvoice";
  return require("./invoice-workflow")[method]({ payment, data, order, env: process.env,
    updateTask: (patch) => ref.update(patch), updatePayment: (patch) => payRef.update(patch),
    updateOrder: (patch) => db.collection("orders").doc(data.orderId).update(patch),
    api: {
      find: (id) => billing.findInvoiceByVendor(apiKey, id),
      partner: (o, details) => billing.billingoRequest(fetch, apiKey, "/partners", billing.buildPartner(o, details)),
      payload: billing.buildInvoice, date: billing.hungarianDate,
      create: (payload) => billing.billingoRequest(fetch, apiKey, "/documents", payload),
      send: (id, email) => billing.sendInvoice(apiKey, id, email)
    }
  });
}

async function runTask(ref) {
  const token = crypto.randomUUID();
  const data = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const value = snap.data();
    if (!value || ["done", "needs_review", "blocked", "failed"].includes(value.status)) return null;
    if (value.status === "processing" && value.leaseUntil?.toMillis() > Date.now()) return null;
    if (value.nextAttemptAt?.toMillis() > Date.now()) return null;
    if(value.type!=="invoice"&&value.mailStartedAt){tx.update(ref,{status:"needs_review",errorCode:"smtp_result_uncertain",updatedAt:new Date()});return null;}
    tx.update(ref, { status: "processing", leaseOwner: token, leaseUntil: new Date(Date.now() + 180000), attempts: Number(value.attempts || 0) + 1, updatedAt: new Date() });
    return { ...value, attempts: Number(value.attempts || 0) + 1 };
  });
  if (!data) return;
  try {
    const order = (await db.collection("orders").doc(data.orderId).get()).data();
    if (!order) throw new Error("Order missing");
    const result = ["invoice", "final_invoice"].includes(data.type) ? await invoiceTask(ref, data, order) : await mailTask(ref.id, data, order);
    await ref.update({ ...result, leaseUntil: new Date(0), updatedAt: new Date() });
  } catch {
    const latest=(await ref.get()).data();
    await ref.update({ status: latest?.mailStartedAt || data.attempts >= 5 ? "needs_review" : "retry", errorCode: latest?.mailStartedAt ? "smtp_result_uncertain" : `${data.type}_failed`,
      nextAttemptAt: new Date(Date.now() + Math.min(24 * 3600000, 60000 * 2 ** data.attempts)), leaseUntil: new Date(0), updatedAt: new Date() });
  }
}

exports.processCommerceTask = onDocumentCreated({ document: "commerce_tasks/{taskId}", secrets: workerSecrets, timeoutSeconds: 120, maxInstances: 2 }, async (event) => {
  if (event.data) await runTask(event.data.ref);
});

exports.retryCommerceTasks = onSchedule({ schedule: "every 30 minutes", secrets: workerSecrets, timeoutSeconds: 300, maxInstances: 1 }, async () => {
  // Oldest due work first: future retries must not starve ready tasks.
  const stopStartingAt = Date.now() + 150000;
  for (const status of ["retry", "pending", "processing"]) {
    const dueField = status === "processing" ? "leaseUntil" : "nextAttemptAt";
    const docs = await db.collection("commerce_tasks").where("status", "==", status)
      .where(dueField, "<=", new Date()).orderBy(dueField).limit(10).get();
    for (const entry of docs.docs) {
      if (Date.now() >= stopStartingAt) return;
      await runTask(entry.ref);
    }
  }
});

exports.retryCommerceTask = onCall({ secrets: workerSecrets, timeoutSeconds: 120 }, async (request) => {
  if (request.auth?.token?.admin !== true) throw new HttpsError("permission-denied", "Admin access required");
  const id = String(request.data?.taskId || "");
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(id)) throw new HttpsError("invalid-argument", "Invalid task");
  const ref = taskRef(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Task missing");
  if (!["retry", "blocked"].includes(snap.data().status)) throw new HttpsError("failed-precondition", "Only blocked or retry tasks may be retried. Uncertain invoices require manual reconciliation.");
  await ref.update({ status: "retry", nextAttemptAt: new Date() });
  await runTask(ref);
  return { status: (await ref.get()).data().status };
});

exports.createCustomerPortal = onCall(callableOptions, async (request) => {
  if (request.auth?.token?.admin !== true) throw new HttpsError("permission-denied", "Admin access required");
  const id = String(request.data?.orderId || "");
  if (!/^[a-f0-9]{64}$/.test(id)) throw new HttpsError("invalid-argument", "Invalid order");
  const order = (await db.collection("orders").doc(id).get()).data();
  if (!order?.stripeCustomerId) throw new HttpsError("failed-precondition", "Nincs kapcsolt Stripe-ügyfél.");
  domain.assertKeyMode(stripeKey.value(), order.livemode ? "live" : "test");
  // Portal settings (cancellation at period end, no proration changes) must be configured in Stripe.
  const session = await stripeClient().billingPortal.sessions.create({ customer: order.stripeCustomerId, return_url: "https://ovexi.hu/" });
  return { url: session.url };
});
