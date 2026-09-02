"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { estimateUsageMicros, monthKey, usdToMicros } = require("../ai-budget");

test("AI cost estimation uses configured per-million token prices", () => {
  assert.equal(estimateUsageMicros({ input_tokens: 1000, output_tokens: 500 }, {
    OPENAI_INPUT_USD_PER_MTOK: "1",
    OPENAI_OUTPUT_USD_PER_MTOK: "6"
  }), 4000);
});

test("USD budget values are stored as integer microdollars", () => {
  assert.equal(usdToMicros(10), 10_000_000);
  assert.equal(usdToMicros(0.2), 200_000);
});

test("month keys use a stable UTC year-month value", () => {
  assert.equal(monthKey(new Date("2026-08-31T23:59:59Z")), "2026-08");
});
