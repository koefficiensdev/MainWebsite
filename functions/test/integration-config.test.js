"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

test("mail workers bind SMTP secret even when runtime flags are absent during discovery", () => {
  const previous = process.env.SMTP_ENABLED;
  delete process.env.SMTP_ENABLED;
  try {
    const functions = require("../index");
    for (const name of ["processCommerceTask", "retryCommerceTasks", "retryCommerceTask"]) {
      assert.ok(functions[name].__endpoint.secretEnvironmentVariables.some((secret) => secret.key === "SMTP_PASS"));
    }
  } finally {
    if (previous === undefined) delete process.env.SMTP_ENABLED;
    else process.env.SMTP_ENABLED = previous;
  }
});
