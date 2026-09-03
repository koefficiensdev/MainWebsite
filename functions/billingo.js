"use strict";

const BILLINGO_BASE_URL = "https://api.billingo.hu/v3";

function buildPartner(order, customerDetails = {}) {
  const address = customerDetails.address || {};
  const requiredAddress = [address.country, address.postal_code, address.city, address.line1];
  if (requiredAddress.some((value) => !String(value || "").trim())) {
    throw new Error("A Stripe számlázási cím hiányos; Billingo partner nem hozható létre.");
  }
  const taxId = Array.isArray(customerDetails.tax_ids)
    ? customerDetails.tax_ids.find((entry) => entry?.value)?.value
    : "";
  return {
    name: String(order.companyName || customerDetails.name || order.contactName).trim(),
    address: {
      country_code: String(address.country).toUpperCase(),
      post_code: String(address.postal_code).trim(),
      city: String(address.city).trim(),
      address: [address.line1, address.line2].filter(Boolean).join(" ").trim()
    },
    emails: [String(customerDetails.email || order.email).trim()],
    ...(taxId ? { taxcode: String(taxId).trim() } : {}),
    ...(order.phone ? { phone: String(order.phone).trim() } : {})
  };
}

function buildInvoice({ partnerId, blockId, products, vat, vendorId, date = hungarianDate(), documentType = "invoice", servicePeriod, advanceInvoiceIds = [] }) {
  if (!Number.isInteger(Number(blockId)) || Number(blockId) < 1) throw new Error("Érvénytelen Billingo számlatömb azonosító.");
  if (!String(vat || "").trim()) throw new Error("A Billingo áfakulcs nincs beállítva.");
  if (!Array.isArray(products) || products.length === 0) throw new Error("Üres Billingo számla nem hozható létre.");
  if (!["invoice", "advance"].includes(documentType)) throw new Error("Érvénytelen Billingo bizonylattípus.");
  if (documentType === "advance" && advanceInvoiceIds.length) throw new Error("Előlegszámlához nem kapcsolható előlegszámla.");
  const vatCode = String(vat).trim();
  const period = servicePeriod?.start && servicePeriod?.end ? `${servicePeriod.start} – ${servicePeriod.end}` : "";
  return {
    vendor_id: String(vendorId).slice(0, 100),
    partner_id: Number(partnerId),
    block_id: Number(blockId),
    type: documentType,
    fulfillment_date: date,
    due_date: date,
    payment_method: "online_bankcard",
    language: "hu",
    currency: "HUF",
    electronic: true,
    paid: true,
    ...(advanceInvoiceIds.length ? { advance_invoice: advanceInvoiceIds.map(Number) } : {}),
    ...(period ? { comment: `Elszámolási időszak: ${period}` } : {}),
    items: products.map((product) => ({
      name: documentType === "advance" ? `Előleg – ${product.name}` : `${product.name}${product.billing === "monthly" && period ? ` (${period})` : ""}`,
      unit_price: product.price,
      unit_price_type: "gross",
      quantity: 1,
      unit: product.billing === "monthly" ? "hónap" : "db",
      vat: vatCode,
      ...(vatCode === "AAM" ? { entitlement: "AAM" } : {})
    }))
  };
}

async function createPaidInvoice({ apiKey, blockId, vat, order, products, customerDetails, vendorId, request = fetch }) {
  if (!apiKey) throw new Error("A Billingo API-kulcs nincs beállítva.");
  const partner = await billingoRequest(request, apiKey, "/partners", buildPartner(order, customerDetails));
  const invoicePayload = buildInvoice({ partnerId: partner.id, blockId, products, vat, vendorId });
  const invoice = await billingoRequest(request, apiKey, "/documents", invoicePayload);
  return { partner, invoice };
}

async function billingoRequest(request, apiKey, path, body, method = "POST") {
  const response = await request(`${BILLINGO_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-KEY": apiKey },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000)
  });
  const responseText = await response.text();
  let data = {};
  try { data = responseText ? JSON.parse(responseText) : {}; } catch { data = { message: responseText }; }
  if (!response.ok) {
    const message = data.message || data.error || responseText || `HTTP ${response.status}`;
    const error = new Error(`Billingo API hiba (${response.status}): ${String(message).slice(0, 400)}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function hungarianDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Budapest", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(now);
}

// Missing-vendor lookup must be an explicit 404. Authentication/rate-limit errors
// never mean "not found" and must not result in issuing another document.
async function findInvoiceByVendor(apiKey, vendorId, request = fetch) {
  try {
    return await billingoRequest(request, apiKey, `/documents/vendor/${encodeURIComponent(vendorId)}`, undefined, "GET");
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function sendInvoice(apiKey, invoiceId, email, request = fetch) {
  if (!Number.isSafeInteger(Number(invoiceId)) || Number(invoiceId) < 1) throw new Error("Invalid invoice ID");
  return billingoRequest(request, apiKey, `/documents/${invoiceId}/send`, { emails: [email] });
}

module.exports = { buildPartner, buildInvoice, createPaidInvoice, hungarianDate, billingoRequest, findInvoiceByVendor, sendInvoice };
