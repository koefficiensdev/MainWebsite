"use strict";

function documentSpecs(payment, data) {
  const once = payment.products.filter((product) => product.billing === "once");
  const monthly = payment.products.filter((product) => product.billing === "monthly");
  return [
    once.length ? { key: "advance", type: "advance", products: once, vendorId: `ovexi-${data.paymentId}-advance` } : null,
    monthly.length ? { key: "periodic", type: "invoice", products: monthly, vendorId: `ovexi-${data.paymentId}-periodic`, servicePeriod: payment.servicePeriod } : null
  ].filter(Boolean);
}

// Durable per-document state prevents duplicates when a mixed payment needs two documents.
async function processInvoice({ payment, data, order, env, api, updateTask, updatePayment, updateOrder }) {
  if (payment.invoiceStatus === "sent") return { status: "done", invoiceStatus: "sent" };
  if (!payment.livemode) {
    await updatePayment({ invoiceStatus: "test_skipped" });
    return { status: "done", invoiceStatus: "test_skipped" };
  }
  if (env.BILLINGO_ENABLED !== "true" || !Number(env.BILLINGO_BLOCK_ID)) return { status: "blocked", errorCode: "billingo_not_configured" };
  const specs = documentSpecs(payment, data);
  if (!specs.length) throw new Error("No billable products");
  const progress = structuredClone(data.documentProgress || {}), documents = structuredClone(payment.billingoDocuments || {});
  let partnerId = Number(payment.billingoPartnerId || 0);
  if (!partnerId) {
    const partner = await api.partner(order, payment.customerDetails);
    if (!partner.id) throw new Error("Invalid partner response");
    partnerId = Number(partner.id);
    await updatePayment({ billingoPartnerId: partnerId });
  }
  for (const spec of specs) {
    const state = progress[spec.key] ||= {};
    let invoice = documents[spec.key]?.id ? { id: documents[spec.key].id, invoice_number: documents[spec.key].invoiceNumber || "" } : await api.find(spec.vendorId);
    if (!invoice) {
      if (state.createStarted) return { status: "needs_review", errorCode: `${spec.key}_creation_uncertain` };
      const payload = api.payload({ partnerId, blockId: Number(env.BILLINGO_BLOCK_ID), products: spec.products, vat: env.BILLINGO_VAT,
        vendorId: spec.vendorId, date: api.date(payment.createdAt.toDate()), documentType: spec.type, servicePeriod: spec.servicePeriod });
      state.createStarted = true; await updateTask({ documentProgress: progress });
      try { invoice = await api.create(payload); }
      catch (error) { if ([400, 401, 402, 403, 422, 429].includes(error.status)) { state.createStarted = false; await updateTask({ documentProgress: progress }); } throw error; }
    }
    if (!invoice.id) throw new Error("Invalid invoice response");
    documents[spec.key] = { id: Number(invoice.id), invoiceNumber: invoice.invoice_number || "", type: spec.type, sent: documents[spec.key]?.sent === true };
    await updatePayment({ billingoDocuments: documents, billingoInvoiceId: Number(invoice.id), billingoInvoiceNumber: invoice.invoice_number || "", invoiceStatus: "issued" });
    if (!documents[spec.key].sent) {
      if (state.sendStarted) return { status: "needs_review", errorCode: `${spec.key}_delivery_uncertain` };
      state.sendStarted = true; await updateTask({ documentProgress: progress });
      try { await api.send(invoice.id, payment.customerDetails?.email || order.email); }
      catch (error) { if ([400, 401, 402, 403, 422, 429].includes(error.status)) { state.sendStarted = false; await updateTask({ documentProgress: progress }); } throw error; }
      documents[spec.key].sent = true;
      await updatePayment({ billingoDocuments: documents });
    }
  }
  const numbers = Object.values(documents).map((entry) => entry.invoiceNumber).filter(Boolean);
  await updatePayment({ invoiceStatus: "sent", invoiceSentAt: new Date(), billingoDocuments: documents });
  await updateOrder({ invoiceStatus: "sent", billingoInvoiceNumbers: numbers, updatedAt: new Date() });
  return { status: "done", invoiceStatus: "sent" };
}

async function processFinalInvoice({ payment, data, order, env, api, updateTask, updatePayment, updateOrder }) {
  if (payment.finalInvoiceStatus === "sent") return { status: "done", finalInvoiceStatus: "sent" };
  if (env.BILLINGO_ENABLED !== "true" || !Number(env.BILLINGO_BLOCK_ID)) return { status: "blocked", errorCode: "billingo_not_configured" };
  const advance = payment.billingoDocuments?.advance;
  const products = payment.products.filter((product) => product.billing === "once");
  if (!advance?.id || !advance.sent || !payment.billingoPartnerId) return { status: "retry", errorCode: "advance_invoice_not_ready", nextAttemptAt: new Date(Date.now() + 300000) };
  const vendorId = `ovexi-${data.paymentId}-final`, state = structuredClone(data.finalDocumentProgress || {});
  let invoice = payment.billingoFinalInvoiceId ? { id: payment.billingoFinalInvoiceId, invoice_number: payment.billingoFinalInvoiceNumber || "" } : await api.find(vendorId);
  if (!invoice) {
    if (state.createStarted) return { status: "needs_review", errorCode: "final_invoice_creation_uncertain" };
    const payload = api.payload({ partnerId: Number(payment.billingoPartnerId), blockId: Number(env.BILLINGO_BLOCK_ID), products, vat: env.BILLINGO_VAT,
      vendorId, date: api.date(order.completedAt?.toDate?.() || order.updatedAt?.toDate?.() || new Date()), documentType: "invoice", advanceInvoiceIds: [Number(advance.id)] });
    state.createStarted = true; await updateTask({ finalDocumentProgress: state });
    try { invoice = await api.create(payload); }
    catch (error) { if ([400, 401, 402, 403, 422, 429].includes(error.status)) { state.createStarted = false; await updateTask({ finalDocumentProgress: state }); } throw error; }
  }
  if (!invoice.id) throw new Error("Invalid final invoice response");
  await updatePayment({ billingoFinalInvoiceId: Number(invoice.id), billingoFinalInvoiceNumber: invoice.invoice_number || "", finalInvoiceStatus: "issued" });
  if (state.sendStarted) return { status: "needs_review", errorCode: "final_invoice_delivery_uncertain" };
  state.sendStarted = true; await updateTask({ finalDocumentProgress: state });
  try { await api.send(invoice.id, payment.customerDetails?.email || order.email); }
  catch (error) { if ([400, 401, 402, 403, 422, 429].includes(error.status)) { state.sendStarted = false; await updateTask({ finalDocumentProgress: state }); } throw error; }
  await updatePayment({ finalInvoiceStatus: "sent", finalInvoiceSentAt: new Date() });
  await updateOrder({ finalInvoiceStatus: "sent", billingoFinalInvoiceNumber: invoice.invoice_number || "", updatedAt: new Date() });
  return { status: "done", finalInvoiceStatus: "sent" };
}

module.exports = { documentSpecs, processInvoice, processFinalInvoice };
