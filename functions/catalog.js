"use strict";

const products = [
  ["website-onepage", "Egylapos weboldal", 39990, "once"],
  ["website-business", "Céges weboldal", 69990, "once"],
  ["website-pro", "Haladó weboldal", 149990, "once"],
  ["website-shop", "Webshop", 199990, "once"],
  ["marketing-mini", "Marketing Mini", 4990, "monthly"],
  ["marketing-start", "Marketing Start", 9990, "monthly"],
  ["marketing-pro", "Marketing Pro", 19990, "monthly"],
  ["marketing-max", "Marketing Max", 34990, "monthly"],
  ["maintenance-monitor", "Monitor", 2990, "monthly"],
  ["maintenance-basic", "Karbantartás Basic", 5990, "monthly"],
  ["maintenance-plus", "Karbantartás Plus", 9990, "monthly"],
  ["maintenance-pro", "Karbantartás Pro", 19990, "monthly"],
  ["marketing-launch", "Induló marketingcsomag", 14990, "once"],
  ["marketing-month", "30 napos tartalomcsomag", 19990, "once"],
  ["marketing-campaign", "Kampánycsomag", 39990, "once"],
  ["quick-audit", "Gyors weboldal-ellenőrzés", 990, "once"],
  ["external-audit", "Külső weboldal audit", 9990, "once"]
].map(([id, name, price, billing]) => ({ id, name, price, billing }));

const PRODUCT_MAP = new Map(products.map((product) => [product.id, product]));

function resolveProducts(itemIds) {
  if (!Array.isArray(itemIds) || itemIds.length < 1 || itemIds.length > 12) {
    throw new Error("Invalid cart.");
  }
  const uniqueIds = [...new Set(itemIds)];
  if (uniqueIds.length !== itemIds.length) throw new Error("Duplicate cart item.");
  const resolved = uniqueIds.map((id) => PRODUCT_MAP.get(id));
  if (resolved.some((product) => !product)) throw new Error("Unknown product.");
  return resolved;
}

function calculateTotals(resolvedProducts) {
  return resolvedProducts.reduce((totals, product) => {
    totals[product.billing] += product.price;
    return totals;
  }, { once: 0, monthly: 0 });
}

module.exports = { products, resolveProducts, calculateTotals };
