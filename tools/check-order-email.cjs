"use strict";

// Read-only, allowlisted status report for one known order; no customer details or secrets.
const path = require("node:path");
const crypto = require("node:crypto");

async function main() {
  const [lib, requestId] = process.argv.slice(2);
  if (!lib || !/^[a-f0-9-]{32,36}$/.test(requestId || "")) throw new Error("Arguments required");
  require(path.join(lib, "logger.js")).logger.silent = true;
  const account = require(path.join(lib, "auth.js")).getProjectDefaultAccount(path.resolve(__dirname, ".."));
  if (!account) throw new Error("CLI login required");
  await require(path.join(lib, "requireAuth.js")).requireAuth({ project: "ovexi-6ef38", ...account });
  const { Client } = require(path.join(lib, "apiv2.js"));
  const client = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
  const orderId = crypto.createHash("sha256").update(requestId).digest("hex");
  const prefix = "projects/ovexi-6ef38/databases/(default)/documents/";
  const order = (await client.get(`${prefix}orders/${orderId}`)).body.fields;
  const task = (await client.get(`${prefix}commerce_tasks/request-${orderId}`)).body.fields;
  const value = (fields, key) => fields[key]?.stringValue || fields[key]?.integerValue || null;
  console.log(JSON.stringify({ orderNumber: value(order, "orderNumber"), orderStatus: value(order, "status"),
    reviewReason: value(order, "reviewReason"), emailTaskStatus: value(task, "status"),
    emailTaskError: value(task, "errorCode"), attempts: value(task, "attempts") }));
}

main().catch(() => { console.log(JSON.stringify({ status: "CHECK_FAILED" })); process.exitCode = 1; });
