"use strict";
const crypto = require("node:crypto");
const ipaddr = require("ipaddr.js");
const hash = value => crypto.createHash("sha256").update(String(value)).digest("hex");
const fail = code => { throw Object.assign(new Error(code), { code }); };
function email(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v.length > 160 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(v)) fail("INVALID_EMAIL");
  return v;
}
function text(value, max, min = 1) {
  if (typeof value !== "string" || value.trim().length < min || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) fail("INVALID_TEXT");
  return value.trim();
}
function publicUrl(value) {
  let url; try { url = new URL(value); } catch { fail("INVALID_URL"); }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !url.hostname.includes(".") || ipaddr.isValid(url.hostname.replace(/[\[\]]/g, "")) || /\.(local|internal|localhost)$/i.test(url.hostname)) fail("INVALID_URL");
  return url;
}
function publicIp(value) { try { return ipaddr.process(value).range() === "unicast"; } catch { return false; } }
function draftFields(raw) {
  const subject = text(raw.subject, 160);
  if (/[\r\n]/.test(subject)) fail("INVALID_SUBJECT");
  return { subject, body: text(raw.body, 4000, 20) };
}
function revision(row) {
  // Firestore converts Date to Timestamp: hash only stable assessment content.
  const { checkedAt, ...assessment } = row.qualification || {};
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  return hash(JSON.stringify([row.recipient, row.subject, row.body, row.sourceUrl, row.companyName, row.offer, row.companyDescription, row.qualification ? canonical(assessment) : null]));
}
function corporateRole(row) {
  return /\b(kft|bt|zrt|nyrt)\b/i.test(row.companyName) && /^(info|iroda|kapcsolat|hello|office|ugyfelszolgalat|ajanlat|szerviz|service|sales|ertekesites)@/.test(row.recipient) && !/@(gmail|yahoo|hotmail|outlook|freemail|citromail)\./.test(row.recipient);
}
function checkApproval(row, raw) {
  if (row.status !== "draft") fail("NOT_DRAFT");
  if (row.source === "ai_research" && (row.qualification?.version !== 2 || !["no_website","website_refresh"].includes(row.qualification?.targetMode))) fail("QUALIFICATION_REQUIRED");
  if (revision(row) !== raw.revision) fail("DRAFT_CHANGED");
  if (!row.emailVerifiedAt || !row.sourceUrl) fail("SOURCE_REQUIRED");
  const verified = row.emailVerifiedAt.toMillis ? row.emailVerifiedAt.toMillis() : new Date(row.emailVerifiedAt).getTime();
  if (!Number.isFinite(verified) || Date.now() - verified > 30 * 86400000) fail("SOURCE_EXPIRED");
  if (raw.legalBasis === "corporate_role") { if (!corporateRole(row)) fail("CONSENT_REQUIRED"); }
  else if (raw.legalBasis !== "consent") fail("LEGAL_REVIEW_REQUIRED");
  text(raw.legalNote, 1000, 20);
}
const FOOTER = "\n\nÜdvözlettel,\nTurai Sándor Attila EV · OVEXI\ninfo@ovexi.hu · https://ovexi.hu\nAdatkezelés: https://ovexi.hu/adatkezeles\nHa nem kér több megkeresést, válaszoljon: LEIRATKOZAS. A tiltást díjmentesen rögzítjük.";
function replyIds(value) { return [...String(value || "").matchAll(/<ovexi-([a-f0-9]{64})@ovexi\.hu>/g)].map(m => m[1]); }
function replyKind(subject, body, autoSubmitted = "") {
  if (autoSubmitted && autoSubmitted !== "no") return "automatic";
  const first = String(body).split(/\n>|\nOn .*wrote:|\n.*írta:/)[0].trim();
  return /^(leiratkoz[aá]s|unsubscribe|nem k[eé]rek t[oö]bb (levelet|megkeres[eé]st))[.!\s]*$/i.test(first) || /^(leiratkoz[aá]s|unsubscribe)$/i.test(String(subject).trim()) ? "unsubscribe" : "reply";
}
module.exports = { hash, fail, email, text, publicUrl, publicIp, draftFields, revision, corporateRole, checkApproval, FOOTER, replyIds, replyKind };
