"use strict";

const crypto = require("node:crypto");
const { getFirestore } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const domain = require("./proposal-domain");

const db = getFirestore();
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const options = { cors: ["https://ovexi.hu", "https://www.ovexi.hu", "https://ovexi-6ef38.web.app"], timeoutSeconds: 15, maxInstances: 2 };

exports.submitProposalRequest = onCall(options, async request => {
  if (Buffer.byteLength(JSON.stringify(request.data || {})) > 12000) throw new HttpsError("invalid-argument", "Túl nagy beküldés.");
  let clean;
  try { clean = domain.validateProposal(request.data); } catch (error) { throw new HttpsError("invalid-argument", error.message); }
  const id = hash(clean.requestId), now = new Date(), hour = Math.floor(now.getTime() / 3600000);
  const ref = db.collection("proposal_requests").doc(id);
  const limitRefs = [
    db.collection("proposal_request_limits").doc(hash(`ip:${request.rawRequest.ip || "unknown"}:${hour}`)),
    db.collection("proposal_request_limits").doc(hash(`email:${clean.email}:${hour}`)),
    db.collection("proposal_request_limits").doc(`global-${hour}`)
  ];
  const saved = await db.runTransaction(async tx => {
    const [existing, ...limits] = await Promise.all([tx.get(ref), ...limitRefs.map(item => tx.get(item))]);
    const requestFingerprint = domain.fingerprint(clean);
    if (existing.exists) {
      if (existing.data().requestFingerprint !== requestFingerprint) throw new HttpsError("already-exists", "Ez a kérésazonosító már más adatokhoz tartozik. Frissítsd az oldalt.");
      return existing.data();
    }
    if (limits.some((snapshot, index) => Number(snapshot.data()?.count || 0) >= (index === 2 ? 100 : 5))) throw new HttpsError("resource-exhausted", "Túl sok beküldés érkezett. Próbáld később.");
    const proposalNumber = `OVX-J-${now.getTime().toString(36).toUpperCase()}-${id.slice(0, 5).toUpperCase()}`;
    const record = { ...clean, proposalNumber, requestFingerprint, status: "new", consentVersion: "2026-09-05", createdAt: now, updatedAt: now };
    tx.create(ref, record);
    limits.forEach((snapshot, index) => tx.set(limitRefs[index], { count: Number(snapshot.data()?.count || 0) + 1, expiresAt: new Date(now.getTime() + 86400000) }));
    return record;
  });
  return { proposalNumber: saved.proposalNumber, status: saved.status };
});
