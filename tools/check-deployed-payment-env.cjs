"use strict";

const path = require("node:path");

async function main() {
  const lib = path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/lib");
  require(path.join(lib, "logger.js")).logger.silent = true;
  const auth = require(path.join(lib, "auth.js"));
  const account = auth.getProjectDefaultAccount(path.resolve(__dirname, ".."));
  if (!account) throw new Error("Firebase CLI bejelentkezés szükséges.");
  const options = { project: "ovexi-6ef38", ...account };
  await require(path.join(lib, "requireAuth.js")).requireAuth(options);
  const { Client } = require(path.join(lib, "apiv2.js"));
  const client = new Client({ urlPrefix: "https://cloudfunctions.googleapis.com", apiVersion: "v2" });
  const name = "projects/ovexi-6ef38/locations/europe-west1/functions/submitOrder";
  const response = await client.get(name);
  const env = response.body?.serviceConfig?.environmentVariables || {};
  const keys = ["PAYMENTS_ENABLED", "PAYMENT_MODE", "LIVE_PAYMENTS_APPROVED", "INSTANT_PRODUCT_IDS", "BILLINGO_ENABLED", "SMTP_ENABLED"];
  console.log(JSON.stringify(Object.fromEntries(keys.map((key) => [key, env[key] ?? null])), null, 2));
}

main().catch((error) => {
  console.error(`A telepített fizetési környezet nem ellenőrizhető: ${error.message}`);
  process.exitCode = 1;
});
