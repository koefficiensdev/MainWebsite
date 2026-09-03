"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { products, resolveProducts, calculateTotals } = require("../catalog");
const { parseCsv } = require("../import-leads");

test("frontend and server catalogs use the same ids, prices and billing", async () => {
  const frontend = await import("../../js/catalog.js");
  const normalize = (items) => items.map(({ id, name, price, billing }) => ({ id, name, price, billing })).sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(normalize(products), normalize(frontend.PRODUCT_CATALOG));
});

test("mixed carts calculate one-time and monthly totals separately", () => {
  const selected = resolveProducts(["website-business", "marketing-start", "maintenance-basic"]);
  assert.deepEqual(calculateTotals(selected), { once: 69990, monthly: 15980 });
});

test("business website includes booking at the agreed one-time price", async () => {
  const frontend = await import("../../js/catalog.js");
  const product = frontend.getProduct("website-business");
  assert.equal(product.price, 69990);
  assert.equal(product.billing, "once");
  assert.ok(product.features.some((feature) => feature.includes("Online foglalás")));
  assert.ok(product.features.some((feature) => feature.includes("ügyféladatok")));
  assert.ok(product.description.includes("szakmától függetlenül"));
  assert.deepEqual(calculateTotals(resolveProducts(["website-business"])), { once: 69990, monthly: 0 });
});

test("every product still offered on the storefront is directly payable", async () => {
  const frontend = await import("../../js/catalog.js");
  const offered = frontend.PRODUCT_CATALOG.filter((product) => product.availability !== "retired");
  assert.ok(offered.length >= 16);
  for (const product of offered) assert.equal(product.availability, undefined, product.id);
});

test("unknown and duplicate product ids are rejected", () => {
  assert.throws(() => resolveProducts(["unknown"]), /Unknown product/);
  assert.throws(() => resolveProducts(["website-business", "website-business"]), /Duplicate/);
});

test("quick audit remains in history but is retired from new storefront orders", async () => {
  const frontend = await import("../../js/catalog.js");
  const product = frontend.getProduct("quick-audit");
  assert.equal(product.price, 990);
  assert.equal(product.billing, "once");
  assert.equal(product.availability, "retired");
  assert.ok(product.features.some((feature) => feature.includes("3 munkanapon")));
});

test("lead CSV parser preserves quoted commas", () => {
  const rows = parseCsv('companyName,reason\n"Minta Kft.","Mobilon lassú, nincs CTA"\n');
  assert.deepEqual(rows, [["companyName", "reason"], ["Minta Kft.", "Mobilon lassú, nincs CTA"]]);
});
