"use strict";
const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const { hash, replyIds, replyKind } = require("./outreach-domain");
function inboxClient(pass) {
  const client = new ImapFlow({ host: "imap.rackhost.hu", port: 993, secure: true, auth: { user: "info@ovexi.hu", pass }, logger: false, disableAutoIdle: true, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 });
  client.on("error", () => {}); return client;
}
async function syncInbox(db, pass, createClient = inboxClient) {
  const control = db.collection("outreach_controls").doc("inbox"), now = Date.now();
  const claimed = await db.runTransaction(async tx => {
    const data = (await tx.get(control)).data() || {};
    if (Number(data.lockUntil || 0) > now || now - Number(data.lastAttempt || 0) < 60000) return false;
    tx.set(control, { lockUntil: now + 250000, lastAttempt: now }, { merge: true }); return true;
  });
  if (!claimed) return { status: "busy" };
  const client = createClient(pass); let imported = 0;
  try {
    await client.connect(); const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const validity = String(client.mailbox.uidValidity), saved = (await control.get()).data();
      let cursor = saved.uidValidity === validity ? Number(saved.cursor || 0) : 0;
      const ceiling = Number(client.mailbox.uidNext) - 1;
      if (cursor < ceiling) {
        // Fetch only headers for unrelated mail; no private body is stored or sent to AI.
        const uids = (await client.search({ uid: `${cursor + 1}:${ceiling}` }, { uid: true })).sort((a,b) => a-b).slice(0, 50);
        for (const uid of uids) {
          const head = await client.fetchOne(uid, { headers: ["in-reply-to", "references", "from", "subject", "auto-submitted"], size: true }, { uid: true });
          if (!head) { cursor = uid; continue; }
          const parsedHead = await simpleParser(head.headers, { skipHtmlToText: true, skipTextToHtml: true });
          const ids = replyIds([parsedHead.inReplyTo, ...(Array.isArray(parsedHead.references) ? parsedHead.references : [parsedHead.references || ""])].join(" "));
          for (const id of [...new Set(ids)].reverse()) {
            const messageRef = db.collection("outreach_messages").doc(id), message = (await messageRef.get()).data();
            const sender = parsedHead.from?.value?.[0]?.address?.toLowerCase();
            if (!message?.approvedAt || !["sent","replied","send_unknown","sending"].includes(message.status) || sender !== message.recipient) continue;
            const replyRef = db.collection("outreach_replies").doc(hash(`${validity}:${uid}`));
            if ((await replyRef.get()).exists) break;
            let body = "A levél túl nagy; nyisd meg a Rackhost webmailben.", parsed = parsedHead;
            if (head.size <= 256000) { const full = await client.fetchOne(uid, { source: true }, { uid: true }); if (!full?.source) throw new Error("MISSING_SOURCE"); parsed = await simpleParser(full.source, { skipTextToHtml: true, skipImageLinks: true }); body = String(parsed.text || "Szöveges változat nincs; nyisd meg a webmailben.").slice(0,16000); }
            const kind = replyKind(parsed.subject, body, String(parsed.headers.get("auto-submitted") || ""));
            await db.runTransaction(async tx => {
              if ((await tx.get(replyRef)).exists) return;
              tx.create(replyRef, { messageId: id, recipient: sender, companyName: message.companyName, subject: String(parsed.subject || "").slice(0,300), body, kind, source: "rackhost_imap", receivedAt: parsed.date || new Date(), createdAt: new Date() });
              tx.update(messageRef, { ...(kind === "automatic" ? {} : { repliedAt: new Date(), ...(message.sentAt ? { status: "replied" } : {}) }), updatedAt: new Date() });
              // Any human reply blocks further automated prospecting pending human review.
              if (kind !== "automatic") tx.set(db.collection("outreach_suppressions").doc(hash(sender)), { reason: kind === "unsubscribe" ? "unsubscribe_reply" : "human_reply", createdAt: new Date() });
            }); imported++; break;
          }
          cursor = uid;
          await control.set({ cursor, uidValidity: validity }, { merge: true });
        }
      }
      await control.set({ uidValidity: validity, cursor, lastSuccess: new Date(), errorCode: null, lockUntil: 0 }, { merge: true });
      return { status: "done", imported, more: cursor < ceiling };
    } finally { lock.release(); }
  } catch { await control.set({ errorCode: "INBOX_SYNC_FAILED", lockUntil: 0 }, { merge: true }); return { status: "failed" }; }
  finally { await client.logout().catch(() => client.close()); }
}
module.exports = { inboxClient, syncInbox };
