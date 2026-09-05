"use strict";
const { getFirestore } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const { research } = require("./outreach-research");
const { approveAndSend } = require("./outreach-service");
const { syncInbox } = require("./outreach-inbox");
const { composeProspectDraft } = require("./outreach-copy");
const { hash, draftFields, revision, fail } = require("./outreach-domain");
const db = getFirestore(), ai = defineSecret("OPENAI_API_KEY"), smtp = defineSecret("SMTP_PASS");
function admin(request) { if (request.auth?.token?.admin !== true) throw new HttpsError("permission-denied", "Adminjogosultság szükséges."); }
function id(raw) { if (!/^[a-f0-9]{64}$/.test(raw || "")) throw new HttpsError("invalid-argument", "Hibás azonosító."); return raw; }
// Keep one slot available for fast lock/status responses while a long research
// request occupies the worker. The Firestore lease still serializes paid runs.
const base = { maxInstances: 2, concurrency: 1, minInstances: 0 };
exports.researchOutreach = onCall({ ...base, secrets: [ai], timeoutSeconds: 540 }, async request => {
  admin(request);
  try { return await research(db, ai.value(), request.auth.uid, request.data || {}); }
  catch (error) { throw new HttpsError("failed-precondition", error.code === "RESEARCH_BUSY" ? "Már fut egy kutatás. Várd meg a befejezését." : "Ellenőrizd a keresési feltételeket (1–20 cég)." ); }
});
exports.saveOutreachDraft = onCall(base, async request => {
  admin(request); const raw = request.data || {}, ref = db.collection("outreach_messages").doc(id(raw.id));
  try {
    return await db.runTransaction(async tx => {
      const row = (await tx.get(ref)).data(); if (!row || row.status !== "draft" || row.revision !== raw.revision) fail("DRAFT_CHANGED");
      const next = { ...row, ...draftFields(raw) }; const version = revision(next);
      tx.update(ref, { ...draftFields(raw), revision: version, updatedAt: new Date(), editedBy: request.auth.uid }); return { revision: version };
    });
  } catch { throw new HttpsError("failed-precondition", "A piszkozat megváltozott, már nem szerkeszthető vagy hibás a szöveg. Frissítsd az oldalt."); }
});
exports.generateOutreachDrafts = onCall(base, async request => {
  admin(request); const ids = request.data?.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 10 || ids.some(value => !/^[a-f0-9]{64}$/.test(value))) throw new HttpsError("invalid-argument", "Egyszerre 1–10 jelölt választható.");
  const results = [];
  for (const candidateId of [...new Set(ids)]) {
    try {
      const result = await db.runTransaction(async tx => {
        const candidateRef = db.collection("outreach_candidates").doc(candidateId), messageRef = db.collection("outreach_messages").doc(candidateId), suppressionRef = db.collection("outreach_suppressions").doc(candidateId);
        const [candidateSnap, messageSnap, suppressionSnap] = await Promise.all([tx.get(candidateRef), tx.get(messageRef), tx.get(suppressionRef)]);
        if (!candidateSnap.exists) fail("NOT_FOUND");
        if (messageSnap.exists) return "already_generated";
        if (suppressionSnap.exists) fail("SUPPRESSED");
        const candidate = candidateSnap.data();
        if (candidate.status !== "researched" || candidate.qualification?.version !== 2 || !candidate.emailVerifiedAt || !candidate.sourceUrl) fail("QUALIFICATION_REQUIRED");
        const draft = { recipient: candidate.recipient, companyName: candidate.companyName, companyDescription: candidate.companyDescription, ...composeProspectDraft(candidate, candidate.qualification), sourceUrl: candidate.sourceUrl, emailVerifiedAt: candidate.emailVerifiedAt, sourceContentHash: candidate.sourceContentHash, qualification: candidate.qualification, status: "draft", source: "ai_research", researchId: candidate.researchId, model: candidate.model, createdAt: new Date(), updatedAt: new Date() };
        draft.revision = revision(draft); tx.create(messageRef, draft); tx.update(candidateRef, { status: "generated", messageId: candidateId, generatedAt: new Date(), updatedAt: new Date() }); return "generated";
      });
      results.push({ id: candidateId, status: result });
    } catch (error) { results.push({ id: candidateId, status: "blocked", errorCode: ["NOT_FOUND","SUPPRESSED","QUALIFICATION_REQUIRED"].includes(error.code) ? error.code : "CHECK_REQUIRED" }); }
  }
  return { results };
});
exports.approveOutreach = onCall({ ...base, secrets: [smtp], timeoutSeconds: 300 }, async request => {
  admin(request); const items = request.data?.items;
  if (process.env.OUTREACH_SEND_ENABLED !== "true") throw new HttpsError("failed-precondition", "A hirdető levélküldés jelenleg le van állítva.");
  if (!Array.isArray(items) || !items.length || items.length > 10) throw new HttpsError("invalid-argument", "Egyszerre 1–10 levél hagyható jóvá.");
  const transport = nodemailer.createTransport({ host: "smtp.rackhost.hu", port: 465, secure: true, auth: { user: "info@ovexi.hu", pass: smtp.value() }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, logger: false, debug: false });
  const results = [];
  try {
    for (const item of items) {
      try { results.push(await approveAndSend(db, transport, request.auth.uid, item)); }
      catch (error) { const safe = ["QUALIFICATION_REQUIRED","SOURCE_EXPIRED","NOT_DRAFT","DRAFT_CHANGED","SOURCE_REQUIRED","CONSENT_REQUIRED","LEGAL_REVIEW_REQUIRED","SUPPRESSED","ALREADY_CONTACTED","DAILY_LIMIT","INVALID_TEXT"]; results.push({ id: String(item.id || "").slice(0,64), status: "blocked", errorCode: safe.includes(error.code) ? error.code : "CHECK_REQUIRED" }); }
    }
  } finally { transport.close(); }
  return { results };
});
exports.suppressOutreach = onCall(base, async request => {
  admin(request); const ref = db.collection("outreach_messages").doc(id(request.data?.id));
  await db.runTransaction(async tx => {
    const row = (await tx.get(ref)).data(); if (!row) throw new HttpsError("not-found", "Nincs ilyen megkeresés.");
    tx.set(db.collection("outreach_suppressions").doc(hash(row.recipient)), { reason: "manual_admin", createdAt: new Date(), createdBy: request.auth.uid });
    tx.update(ref, { ...(row.status === "draft" ? { status: "suppressed" } : {}), suppressedAt: new Date(), updatedAt: new Date() });
  }); return { suppressed: true };
});
exports.syncOutreachReplies = onCall({ ...base, secrets: [smtp], timeoutSeconds: 240 }, async request => { admin(request); return syncInbox(db, smtp.value()); });
exports.pollOutreachReplies = onSchedule({ ...base, secrets: [smtp], timeoutSeconds: 240, schedule: "every 15 minutes", retryCount: 0 }, async () => {
  if (process.env.OUTREACH_INBOX_ENABLED === "true") await syncInbox(db, smtp.value());
});
