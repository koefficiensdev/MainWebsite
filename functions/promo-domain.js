"use strict";

const PROMO_ID = "first-year-domain-hosting";
const PROMO_LABEL = "Az első 12 hónap standard .hu domain- és 1 GB webtárhelydíját az OVEXI vállalja.";

function normalizePromoCode(value) {
  const code = String(value || "").toUpperCase().replace(/[\s-]+/g, "").trim();
  if (!code) return "";
  if (!/^[A-Z0-9]{4,24}$/.test(code)) throw new Error("A promókód formátuma érvénytelen.");
  return code;
}

function configuredCodes(env = process.env) {
  return new Set(String(env.PROMO_CODES || "").split(",").map((code) => {
    try { return normalizePromoCode(code); } catch { return ""; }
  }).filter(Boolean));
}

function integer(value, min, max, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error(`${label}: ${min} és ${max} közötti egész szám szükséges.`);
  return number;
}

function validateCouponInput(raw) {
  const code = normalizePromoCode(raw?.code);
  if (!code) throw new Error("Adj meg kuponkódot.");
  const name = String(raw?.name || "").replace(/\s+/g, " ").trim();
  if (name.length < 3 || name.length > 120) throw new Error("A kupon neve 3–120 karakter legyen.");
  const domainYears = integer(raw?.domainYears, 0, 10, "Domain időtartama");
  const hostingYears = integer(raw?.hostingYears, 0, 10, "Tárhely időtartama");
  const discountPercent = integer(raw?.discountPercent, 0, 99, "Kedvezmény");
  if (!domainYears && !hostingYears && !discountPercent) throw new Error("Adj legalább egy kedvezményt a kuponhoz.");
  return { code, name, domainYears, hostingYears, discountPercent };
}

function requireWebsite(products) {
  if (!Array.isArray(products) || !products.some((product) => product.id.startsWith("website-"))) throw new Error("Ez a promókód weboldalcsomaggal használható.");
}

function couponLabel(coupon) {
  const benefits = [];
  if (coupon.domainYears) benefits.push(`egy standard .hu domain díja ${coupon.domainYears} évre`);
  if (coupon.hostingYears) benefits.push(`1 GB webtárhely díja ${coupon.hostingYears} évre`);
  if (coupon.discountPercent) benefits.push(`${coupon.discountPercent}% kedvezmény a weboldalcsomag egyszeri fejlesztési díjából`);
  return benefits.join(", ").replace(/, ([^,]*)$/, " és $1") + ".";
}

function resolveManagedPromotion(value, products, stored, couponId) {
  const code = normalizePromoCode(value);
  requireWebsite(products);
  if (!stored || stored.code !== code || stored.active !== true) throw new Error("A promókód érvénytelen vagy már nem aktív.");
  const clean = validateCouponInput(stored);
  return { id:"managed-coupon", couponId, code, name:clean.name, label:couponLabel(clean), domainYears:clean.domainYears,
    hostingYears:clean.hostingYears, discountPercent:clean.discountPercent, domainCount:clean.domainYears ? 1 : 0,
    domainType:".hu", hostingGb:clean.hostingYears ? 1 : 0, cashValue:false };
}

function resolvePromotion(value, products, env = process.env) {
  const code = normalizePromoCode(value);
  if (!code) return null;
  if (!configuredCodes(env).has(code)) throw new Error("A promókód érvénytelen vagy már nem aktív.");
  requireWebsite(products);
  return {
    id: PROMO_ID,
    code,
    name: "Első éves domain és tárhely",
    label: PROMO_LABEL,
    domainYears: 1,
    hostingYears: 1,
    discountPercent: 0,
    months: 12,
    domainCount: 1,
    domainType: ".hu",
    hostingGb: 1,
    cashValue: false
  };
}

function applyPromotion(products, promotion) {
  if (!promotion) return products.map((product) => ({ ...product }));
  requireWebsite(products);
  return products.map((product) => {
    if (!product.id.startsWith("website-") || !promotion.discountPercent) return { ...product };
    const price = Math.round(product.price * (100 - promotion.discountPercent) / 100);
    return { ...product, originalPrice:product.price, price, discountPercent:promotion.discountPercent };
  });
}

module.exports = { PROMO_ID, PROMO_LABEL, normalizePromoCode, configuredCodes, validateCouponInput, couponLabel,
  resolveManagedPromotion, resolvePromotion, applyPromotion };
