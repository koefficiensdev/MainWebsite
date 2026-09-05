"use strict";

const crypto = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const { defineSecret } = require("firebase-functions/params");
const OpenAI = require("openai");
const { resolveProducts } = require("./catalog");
const { releaseAiBudget, reserveAiBudget, settleAiBudget } = require("./ai-budget");

initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 2, minInstances: 0, memory: "256MiB" });
const db = getFirestore();
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// Commerce endpoints handle validated requests, signed payments and durable retries.
Object.assign(exports, require("./commerce"));
Object.assign(exports, require("./proposal"));
Object.assign(exports, require("./outreach"));
Object.assign(exports, require("./operations"));
Object.assign(exports, require("./notification-worker"));
Object.assign(exports, require("./production"));
Object.assign(exports, require("./housekeeping"));

// Booking remains closed by default, independently of payment/AI switches.
const booking = require("./booking");
for (const name of ["bookingGuestStatus", "bookingAvailability", "bookingCreate", "bookingCancel", "bookingOwnerDay", "bookingPublicConfig", "bookingOwnerMove", "bookingOwnerStatus", "bookingOwnerMoveSlots", "bookingAdminSaveTenant"]) exports[name] = booking[name];

exports.onOrderStatusChanged = onDocumentUpdated({ document: "orders/{orderId}", timeoutSeconds:540, secrets: [OPENAI_API_KEY] }, async (event) => {
  if (process.env.AI_PRODUCTION_ENABLED !== "true") return;
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status || after.status !== "paid" || !after.paidAt) return;
  await createProductionJob(event.params.orderId, after, event.data.after.ref);
});

exports.generateLeadDraft = onCall({ secrets: [OPENAI_API_KEY] }, async (request) => {
  if (request.auth?.token?.admin !== true) throw new HttpsError("permission-denied", "Admin access required.");
  if (!OPENAI_API_KEY.value()) throw new HttpsError("failed-precondition", "OpenAI is not configured.");
  const leadId = String(request.data?.leadId || "");
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(leadId)) throw new HttpsError("invalid-argument", "Invalid lead id.");
  const leadRef = db.collection("leads").doc(leadId);
  const snapshot = await leadRef.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Lead not found.");
  const lead = snapshot.data();
  if (lead.status === "do_not_contact") throw new HttpsError("failed-precondition", "This lead is suppressed.");

  const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
  const reservation = await reserveAiBudget(db, "lead-draft");
  let response;
  try {
    response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      store: false,
      max_output_tokens: 1200,
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content: "Write a short, respectful Hungarian B2B first-contact draft. Use only the supplied facts. Do not claim you inspected anything not explicitly provided. No fake familiarity, urgency, manipulation, or exaggerated promises. One observation, one relevant benefit, one low-pressure question. Maximum 90 words. Do not send it; it is an approval draft."
        },
        {
          role: "user",
          content: `Company: ${lead.companyName}\nChannel: ${lead.channel}\nWebsite: ${lead.website || "not supplied"}\nRelevant observed reason: ${lead.reason}\nOffer: affordable website, marketing, or maintenance service from OVEXI.`
        }
      ],
      text: { verbosity: "low" }
    });
    await settleAiBudget(db, reservation, response.usage);
  } catch (error) {
    // Preserve allowance when the provider may have consumed the request.
    if (error.code === "AI_MONTHLY_BUDGET_EXCEEDED") {
      throw new HttpsError("resource-exhausted", "Az AI havi költségkerete elfogyott.");
    }
    throw error;
  }
  const draft = String(response.output_text || "").trim().slice(0, 2000);
  await leadRef.update({ draft, draftModel: process.env.OPENAI_MODEL || "gpt-5.6-luna", draftCreatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { draft };
});

async function createProductionJob(orderId, order, orderRef) {
  const requestId=crypto.createHash('sha256').update(orderId+':'+Number(order.briefRevision||0)).digest('hex').slice(0,36).padEnd(36,'0');
  const result=await require('./bespoke-production').generate(db,{orderId,requestId,briefRevision:Number(order.briefRevision||0)},'system',OPENAI_API_KEY.value(),new OpenAI({apiKey:OPENAI_API_KEY.value(),maxRetries:0,timeout:450000}).responses);
  await orderRef.update({productionJobId:result.id,updatedAt:FieldValue.serverTimestamp()});
}
