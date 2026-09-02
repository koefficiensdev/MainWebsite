"use strict";

// Local operator check. Secret is fetched in memory; no password or raw errors are logged.
const path = require("node:path");
const nodemailer = require("../functions/node_modules/nodemailer");

async function main() {
  const lib = process.argv[2];
  if (!lib) throw Object.assign(new Error(), { code: "CLI_LIBRARY_REQUIRED" });
  const logger = require(path.join(lib, "logger.js")).logger;
  logger.silent = true;
  const account = require(path.join(lib, "auth.js")).getProjectDefaultAccount(path.resolve(__dirname, ".."));
  if (!account) throw Object.assign(new Error(), { code: "CLI_LOGIN_REQUIRED" });
  await require(path.join(lib, "requireAuth.js")).requireAuth({ project: "ovexi-6ef38", ...account });
  const pass = await require(path.join(lib, "gcp/secretManager.js")).accessSecretVersion("ovexi-6ef38", "SMTP_PASS", "latest");
  process.loadEnvFile(path.resolve(__dirname, "../functions/.env.ovexi-6ef38"));
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    logger: false, debug: false
  });
  try {
    await transport.verify();
    console.log(JSON.stringify({ smtpAuthenticated: true, messageSent: false }));
  } finally { transport.close(); }
}

main().catch((error) => {
  const allowedCodes = ["EAUTH", "ETIMEDOUT", "ESOCKET", "ECONNECTION", "EDNS", "CLI_LIBRARY_REQUIRED", "CLI_LOGIN_REQUIRED"];
  console.log(JSON.stringify({ smtpAuthenticated: false, code: allowedCodes.includes(error.code) ? error.code : "CHECK_FAILED", responseCode: Number(error.responseCode) || null }));
  process.exitCode = 1;
});
