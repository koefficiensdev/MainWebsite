"use strict";
// Read-only integration probes. No email sent, mailbox changed or AI content generated.
const path = require("node:path");
async function main() {
  const lib = process.argv[2], root = path.resolve(__dirname, "..");
  require(path.join(lib, "logger.js")).logger.silent = true;
  const account = require(path.join(lib, "auth.js")).getProjectDefaultAccount(root);
  await require(path.join(lib, "requireAuth.js")).requireAuth({ project: "ovexi-6ef38", ...account });
  const access = require(path.join(lib, "gcp/secretManager.js")).accessSecretVersion;
  const pass = await access("ovexi-6ef38", "SMTP_PASS", "latest");
  const { inboxClient } = require("../functions/outreach-inbox");
  const client = inboxClient(pass);
  try { await client.connect(); const box = await client.mailboxOpen("INBOX", { readOnly: true }); console.log(JSON.stringify({ imapAuthenticated: true, readOnly: box.readOnly, messageCount: box.exists, bodiesRead: 0 })); }
  catch { console.log(JSON.stringify({ imapAuthenticated: false })); process.exitCode = 1; }
  finally { await client.logout().catch(() => client.close()); }
  try {
    const key = await access("ovexi-6ef38", "OPENAI_API_KEY", "latest");
    const OpenAI = require("../functions/node_modules/openai");
    const model = await new OpenAI({ apiKey: key, maxRetries: 0, timeout: 15000 }).models.retrieve("gpt-5-mini");
    console.log(JSON.stringify({ researchModelAvailable: model.id === "gpt-5-mini", paidGeneration: false }));
  } catch { console.log(JSON.stringify({ researchModelAvailable: false })); process.exitCode = 1; }
}
main().catch(() => { console.log("OUTREACH_PROBE_FAILED"); process.exitCode = 1; });
