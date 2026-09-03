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

function resolvePromotion(value, products, env = process.env) {
  const code = normalizePromoCode(value);
  if (!code) return null;
  if (!configuredCodes(env).has(code)) throw new Error("A promókód érvénytelen vagy már nem aktív.");
  if (!Array.isArray(products) || !products.some((product) => product.id.startsWith("website-"))) {
    throw new Error("Ez a promókód weboldalcsomaggal használható.");
  }
  return {
    id: PROMO_ID,
    code,
    label: PROMO_LABEL,
    months: 12,
    domainCount: 1,
    domainType: ".hu",
    hostingGb: 1,
    cashValue: false
  };
}

module.exports = { PROMO_ID, PROMO_LABEL, normalizePromoCode, configuredCodes, resolvePromotion };
