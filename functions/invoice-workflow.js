"use strict";

// Durable state is injected so crash/retry paths can be tested without real invoices.
async function processInvoice({ payment, data, order, env, api, updateTask, updatePayment, updateOrder }) {
  if (payment.invoiceStatus === "sent") return { status: "done", invoiceStatus: "sent" };
  if (!payment.livemode) {
    await updatePayment({ invoiceStatus: "test_skipped" });
    return { status: "done", invoiceStatus: "test_skipped" };
  }
  if (env.BILLINGO_ENABLED !== "true" || !Number(env.BILLINGO_BLOCK_ID)) return { status: "blocked", errorCode: "billingo_not_configured" };
  const vendorId = `ovexi-${data.paymentId}`;
  let invoice = payment.billingoInvoiceId ? { id: payment.billingoInvoiceId, invoice_number: payment.billingoInvoiceNumber || "" } : await api.find(vendorId);
  if (!invoice) {
    if (data.invoiceCreateStarted) return { status: "needs_review", errorCode: "invoice_creation_uncertain" };
    const partner = await api.partner(order, payment.customerDetails);
    const payload = api.payload({ partnerId: partner.id, blockId: Number(env.BILLINGO_BLOCK_ID), products: payment.products, vat: env.BILLINGO_VAT, vendorId,
      date: api.date(payment.createdAt.toDate()) });
    await updateTask({ invoiceCreateStarted: true });
    try { invoice = await api.create(payload); }
    catch (error) {
      // Explicit rejection is safe to retry after fixing the cause; transport errors are not.
      if ([400, 401, 402, 403, 422, 429].includes(error.status)) await updateTask({ invoiceCreateStarted: false });
      throw error;
    }
  }
  if (!invoice.id) throw new Error("Invalid invoice response");
  await updatePayment({ billingoInvoiceId: invoice.id, billingoInvoiceNumber: invoice.invoice_number || "", invoiceStatus: "issued" });
  await updateOrder({ invoiceStatus: "issued", billingoInvoiceNumber: invoice.invoice_number || "", updatedAt: new Date() });
  if (data.invoiceSendStarted) return { status: "needs_review", errorCode: "invoice_delivery_uncertain" };
  await updateTask({ invoiceSendStarted: true });
  try { await api.send(invoice.id, payment.customerDetails?.email || order.email); }
  catch (error) {
    if ([400, 401, 402, 403, 422, 429].includes(error.status)) await updateTask({ invoiceSendStarted: false });
    throw error;
  }
  await updatePayment({ invoiceStatus: "sent", invoiceSentAt: new Date() });
  await updateOrder({ invoiceStatus: "sent", updatedAt: new Date() });
  return { status: "done", invoiceStatus: "sent" };
}

module.exports = { processInvoice };
