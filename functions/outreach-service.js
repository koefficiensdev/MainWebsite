"use strict";
const { hash, fail, checkApproval, FOOTER } = require("./outreach-domain");
async function approveAndSend(db, transport, uid, item) {
  if (!/^[a-f0-9]{64}$/.test(item.id || "")) fail("INVALID_ID");
  const ref = db.collection("outreach_messages").doc(item.id);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(new Date());
  const quota = db.collection("outreach_controls").doc(`day-${day}`);
  const row = await db.runTransaction(async tx => {
    const snap = await tx.get(ref); if (!snap.exists) fail("NOT_FOUND");
    const data = snap.data(); checkApproval(data, item);
    const suppress = db.collection("outreach_suppressions").doc(hash(data.recipient));
    const contact = db.collection("outreach_contacts").doc(hash(data.recipient));
    const domain = db.collection("outreach_contacts").doc(`domain-${hash(data.recipient.split("@")[1])}`);
    const [blocked, contacted, companyContacted, count] = await Promise.all([tx.get(suppress), tx.get(contact), tx.get(domain), tx.get(quota)]);
    if (blocked.exists) fail("SUPPRESSED");
    if (contacted.exists || companyContacted.exists) fail("ALREADY_CONTACTED");
    if (Number(count.data()?.count || 0) >= 100) fail("DAILY_LIMIT");
    const now = new Date(), providerMessageId = `<ovexi-${item.id}@ovexi.hu>`;
    tx.set(quota, { count: Number(count.data()?.count || 0) + 1, updatedAt: now });
    tx.set(contact, { messageId: item.id, createdAt: now });
    tx.set(domain, { messageId: item.id, createdAt: now });
    tx.update(ref, { status: "sending", approvedBy: uid, approvedAt: now, approvedRevision: item.revision, legalBasis: item.legalBasis, legalNote: item.legalNote, providerMessageId, updatedAt: now });
    return { ...data, providerMessageId };
  });
  // A committed claim is never retried, even after a crash/ambiguous SMTP result.
  try {
    const info = await transport.sendMail({ from: { name: "OVEXI · Turai Sándor Attila EV", address: "info@ovexi.hu" }, to: row.recipient, replyTo: "info@ovexi.hu", subject: row.subject, text: row.body + FOOTER + `\nKapcsolat nyilvános forrása: ${row.sourceUrl}`, messageId: row.providerMessageId, headers: { "List-Unsubscribe": "<mailto:info@ovexi.hu?subject=LEIRATKOZAS>" }, disableFileAccess: true, disableUrlAccess: true });
    if (!info.accepted?.some(r => String(r).toLowerCase() === row.recipient)) throw new Error("NOT_ACCEPTED");
    await ref.update({ status: "sent", source: "provider", provider: "rackhost_smtp", sentAt: new Date(), updatedAt: new Date(), errorCode: null });
    return { id: item.id, status: "sent" };
  } catch {
    await ref.update({ status: "send_unknown", errorCode: "CHECK_MAILBOX_NO_AUTOMATIC_RETRY", updatedAt: new Date() }).catch(() => {});
    return { id: item.id, status: "send_unknown" };
  }
}
module.exports = { approveAndSend };
