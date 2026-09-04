"use strict";
const { text, publicUrl, fail } = require("./outreach-domain");
const { verifySource } = require("./outreach-source");
const properties = {
  websiteStatus: { type: "string", enum: ["not_found", "outdated"] },
  websiteUrl: { type: "string" },
  needReason: { type: "string" },
  evidenceUrl: { type: "string" },
  evidenceQuote: { type: "string" },
  issue: { type: "string", enum: ["no_site_found", "under_construction", "outdated_information", "legacy_technology"] },
  searchQueries: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
  foundedOn: { type: "string" },
  foundedSourceUrl: { type: "string" },
  foundedQuote: { type: "string" }
};
const qualificationSchema = { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
const normalize = value => String(value).normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
function citationKey(value) {
  try {
    const url = publicUrl(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|ref$|source$)/i.test(key)) url.searchParams.delete(key);
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.href;
  } catch { return ""; }
}
function isCited(sources, value) {
  const wanted = citationKey(value);
  return Boolean(wanted) && [...sources].some(source => citationKey(source) === wanted);
}
async function qualify(raw, sources, searchedQueries, fetchSource = verifySource, now = new Date(), targetMode = raw?.websiteStatus === "not_found" ? "no_website" : "website_refresh", contactSource = "") {
  if (!["no_website","website_refresh"].includes(targetMode)) fail("INVALID_TARGET_MODE");
  if (!raw || !["not_found","outdated"].includes(raw.websiteStatus)) fail("NO_BUYING_SIGNAL");
  if (targetMode === "no_website" && raw.websiteStatus !== "not_found") fail("EXISTING_WEBSITE_EXCLUDED");
  if (targetMode === "website_refresh" && raw.websiteStatus !== "outdated") fail("TARGET_MODE_MISMATCH");
  if (raw.websiteStatus === "not_found" && contactSource && !isBusinessProfile(contactSource)) fail("OWN_WEBSITE_CONTACT_SOURCE");
  const reason = text(raw.needReason, 1000, 40);
  const queries = [...new Set((raw.searchQueries || []).map(q => text(q, 400, 5)))];
  const observedQueries = new Set(searchedQueries.map(normalize));
  if (queries.length < 2 || queries.length > 4 || queries.some(q => !observedQueries.has(normalize(q)))) fail("SEARCH_CHECKS_REQUIRED");
  async function evidence(url, quote) {
    const href = publicUrl(url).href, excerpt = text(quote, 300, 15);
    if (excerpt.split(/\s+/).length > 20) fail("EVIDENCE_EXCERPT_TOO_LONG");
    if (!isCited(sources, href)) fail("UNCITED_QUALIFICATION");
    const page = await fetchSource(href, null, 0, { includeText: true });
    if (!normalize(page.evidenceText).includes(normalize(excerpt))) fail("UNSUPPORTED_QUALIFICATION");
    return { url: href, quote: excerpt, contentHash: page.sourceContentHash };
  }
  const proof = await evidence(raw.evidenceUrl, raw.evidenceQuote);
  let websiteUrl = "";
  if (raw.websiteStatus === "not_found") {
    if (raw.websiteUrl || raw.issue !== "no_site_found") fail("CONTRADICTORY_QUALIFICATION");
  } else {
    websiteUrl = publicUrl(raw.websiteUrl).href;
    if (!isCited(sources, websiteUrl) || !["under_construction","outdated_information","legacy_technology"].includes(raw.issue)) fail("CONCRETE_ISSUE_REQUIRED");
    if (new URL(websiteUrl).hostname.replace(/^www\./, "") !== new URL(proof.url).hostname.replace(/^www\./, "")) fail("WRONG_WEBSITE_EVIDENCE");
    if (/^(?:copyright|©|all rights reserved)/i.test(proof.quote)) fail("COPYRIGHT_NOT_A_DEFECT");
    if (raw.issue === "under_construction" && !/fejleszt[eé]s|[aá]talak[ií]t[aá]s|k[eé]sz[uü]l|under construction|coming soon/i.test(proof.quote)) fail("UNSUPPORTED_CONSTRUCTION_CLAIM");
    if (raw.issue === "legacy_technology" && !/flash player|adobe flash|silverlight|internet explorer\s*[1-9]\b/i.test(proof.quote)) fail("UNSUPPORTED_LEGACY_CLAIM");
  }
  let newBusiness = false, foundedOn = "", foundedEvidence = null;
  if (raw.foundedOn) {
    const date = new Date(raw.foundedOn);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.foundedOn) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== raw.foundedOn || date > now || now - date > 365*86400000) fail("UNSUPPORTED_NEW_BUSINESS");
    foundedEvidence = await evidence(raw.foundedSourceUrl, raw.foundedQuote);
    const numericDate = foundedEvidence.quote.match(/\b(\d{4})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})\b/);
    const months = ["január","február","március","április","május","június","július","augusztus","szeptember","október","november","december"];
    const huDate = foundedEvidence.quote.toLowerCase().match(/\b(\d{4})\.?\s+([a-záéíóöőúüű]+)\s+(\d{1,2})\b/);
    const parts = numericDate ? numericDate.slice(1) : huDate && months.includes(huDate[2]) ? [huDate[1], String(months.indexOf(huDate[2])+1), huDate[3]] : null;
    if (!parts || `${parts[0]}-${parts[1].padStart(2,"0")}-${parts[2].padStart(2,"0")}` !== raw.foundedOn) fail("UNSUPPORTED_NEW_BUSINESS");
    foundedOn = raw.foundedOn; newBusiness = true;
  } else if (raw.foundedSourceUrl || raw.foundedQuote) fail("UNSUPPORTED_NEW_BUSINESS");
  return { version: 2, targetMode, websiteStatus: raw.websiteStatus, websiteUrl, needReason: reason, issue: raw.issue, evidence: proof, searchQueries: queries, newBusiness, foundedOn, foundedEvidence, checkedAt: now, priority: newBusiness ? "new_business" : "website_need", assessment: "ai_prescreen_human_review_required" };
}
function isBusinessProfile(value) {
  try {
    const url = publicUrl(value), host = url.hostname.replace(/^(www|m)\./, "");
    const directoryRoots = ["aranyoldalak.hu","cylex.hu","nyitva.hu","joszaki.hu","qjob.hu","uzleti.hu"];
    const directory = directoryRoots.some(root => host === root || host.endsWith(`.${root}`));
    return ["facebook.com","instagram.com"].includes(host) && url.pathname.length > 2
      || host === "linkedin.com" && url.pathname.startsWith("/company/")
      || host === "google.com" && url.pathname.startsWith("/maps/")
      || host === "maps.app.goo.gl"
      || directory && url.pathname.length > 1;
  } catch { return false; }
}
async function checkEmailWebsite(recipient, fetchSource = verifySource) {
  const domain = recipient.split("@")[1];
  const sharedMail = new Set(["gmail.com","googlemail.com","outlook.com","hotmail.com","hotmail.hu","live.com","live.hu","msn.com","yahoo.com","yahoo.hu","ymail.com","icloud.com","me.com","freemail.hu","citromail.hu","indamail.hu","vipmail.hu","mailbox.hu","t-online.hu","t-email.hu","proton.me","protonmail.com"]);
  if (sharedMail.has(domain)) return "shared_mail_provider";
  // A responding custom email domain is a conservative exclusion, not proof
  // of ownership. A failed request never proves that a website is absent.
  for (const host of [domain, `www.${domain}`]) {
    let reachable = false;
    try { await fetchSource(`https://${host}/`, null); reachable = true; } catch {}
    if (reachable) fail("EMAIL_DOMAIN_HAS_WEBSITE");
  }
  return "inconclusive_human_review_required";
}
module.exports = { qualificationSchema, qualify, isBusinessProfile, checkEmailWebsite, citationKey, isCited };
