"use strict";
const crypto = require("node:crypto");
const { hash, fail, checkApproval, FOOTER } = require("./outreach-domain");
const DAILY_OUTREACH_LIMIT = 10;
const UNSUBSCRIBE_URL = "https://europe-west1-ovexi-6ef38.cloudfunctions.net/outreachUnsubscribe";
async function approveAndSend(db, transport, uid, item) {
  if (!/^[a-f0-9]{64}$/.test(item.id || "")) fail("INVALID_ID");
  const ref = db.collection("outreach_messages").doc(item.id);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(new Date());
  const quota = db.collection("outreach_controls").doc(`day-${day}`);
  const row = await db.runTransaction(async tx => {
    const snap = await tx.get(ref); if (!snap.exists) fail("NOT_FOUND");
    const data = snap.data(), automatic = data.legalReview?.status === "verified_corporate_role" ? data.legalReview : null;
    const approval = { ...item, legalBasis: item.legalBasis || automatic?.legalBasis, legalNote: item.legalNote || automatic?.legalNote };
    checkApproval(data, approval);
    const suppress = db.collection("outreach_suppressions").doc(hash(data.recipient));
    const contact = db.collection("outreach_contacts").doc(hash(data.recipient));
    const domain = db.collection("outreach_contacts").doc(`domain-${hash(data.recipient.split("@")[1])}`);
    const [blocked, contacted, companyContacted, count] = await Promise.all([tx.get(suppress), tx.get(contact), tx.get(domain), tx.get(quota)]);
    if (blocked.exists) fail("SUPPRESSED");
    if (contacted.exists || companyContacted.exists) fail("ALREADY_CONTACTED");
    if (Number(count.data()?.count || 0) >= DAILY_OUTREACH_LIMIT) fail("DAILY_LIMIT");
    const now = new Date(), providerMessageId = `<ovexi-${item.id}@ovexi.hu>`, unsubscribeToken = crypto.randomBytes(32).toString("hex");
    tx.set(quota, { count: Number(count.data()?.count || 0) + 1, updatedAt: now });
    tx.set(contact, { messageId: item.id, createdAt: now });
    tx.set(domain, { messageId: item.id, createdAt: now });
    tx.update(ref, { status: "sending", approvedBy: uid, approvedAt: now, approvedRevision: item.revision, legalBasis: approval.legalBasis, legalNote: approval.legalNote, providerMessageId, unsubscribeTokenHash: hash(unsubscribeToken), updatedAt: now });
    return { ...data, providerMessageId, unsubscribeToken };
  });
  // A committed claim is never retried, even after a crash/ambiguous SMTP result.
  try {
    const unsubscribe = `${UNSUBSCRIBE_URL}?id=${item.id}&token=${row.unsubscribeToken}`;
    const info = await transport.sendMail({ from: { name: "OVEXI · Turai Sándor Attila EV", address: "info@ovexi.hu" }, to: row.recipient, replyTo: "info@ovexi.hu", subject: row.subject, text: row.body + FOOTER + `\nKapcsolat nyilvános forrása: ${row.sourceUrl}`, messageId: row.providerMessageId, headers: { "List-Unsubscribe": `<${unsubscribe}>, <mailto:info@ovexi.hu?subject=LEIRATKOZAS>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click", "Auto-Submitted": "no" }, disableFileAccess: true, disableUrlAccess: true });
    if (!info.accepted?.some(r => String(r).toLowerCase() === row.recipient)) throw new Error("NOT_ACCEPTED");
    await db.runTransaction(async tx => {
      const latest = await tx.get(ref), now = new Date();
      tx.update(ref, { ...(latest.data()?.status === "suppressed" ? {} : { status: "sent" }), source: "provider", provider: "rackhost_smtp", sentAt: now, updatedAt: now, errorCode: null });
    });
    return { id: item.id, status: "sent" };
  } catch {
    await ref.update({ status: "send_unknown", errorCode: "CHECK_MAILBOX_NO_AUTOMATIC_RETRY", updatedAt: new Date() }).catch(() => {});
    return { id: item.id, status: "send_unknown" };
  }
}
module.exports = { approveAndSend, DAILY_OUTREACH_LIMIT, UNSUBSCRIBE_URL };
