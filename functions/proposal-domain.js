"use strict";

const crypto = require("node:crypto");

const text = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedNeeds = new Set(["website", "inquiries", "appointments", "quotes", "administration", "unsure"]);

function safeUrl(value) {
  const raw = text(value, 300);
  if (!raw) return "";
  let url;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`); } catch { throw new Error("Ellenőrizd a weboldal vagy közösségi oldal címét."); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("Ellenőrizd a weboldal vagy közösségi oldal címét.");
  return url.href.slice(0, 300);
}

function validateProposal(input = {}) {
  const landingVariant = text(input.landingVariant, 32) === "social" ? "social" : "";
  const result = {
    requestId: text(input.requestId, 80),
    contactName: text(input.contactName, 80),
    companyName: text(input.companyName, 120),
    email: text(input.email, 160).toLowerCase(),
    phone: text(input.phone, 32),
    businessType: text(input.businessType, 120),
    currentUrl: safeUrl(input.currentUrl),
    mainChallenge: text(input.mainChallenge, 1200),
    needs: [...new Set(Array.isArray(input.needs) ? input.needs.map(item => text(item, 32)) : [])].filter(item => allowedNeeds.has(item)),
    contactConsent: input.contactConsent === true,
    // One tick now covers both statements; kept as separate stored flags so
    // existing records stay comparable.
    privacyAccepted: input.privacyAccepted === true,
    landingVariant,
    campaignSource: text(input.campaignSource, 40),
    campaignName: text(input.campaignName, 80),
    campaignContent: text(input.campaignContent, 80),
    source: landingVariant === "social" ? "social_landing" : "website_proposal_form"
  };
  // Only two things are genuinely needed: a way to reply, and permission to
  // use it. Everything else is helpful context the visitor may skip — the
  // form asked for a name, a company, a trade, a tagged area and a 15+
  // character brief before it would accept anything.
  if (!/^[0-9a-f-]{36}$/i.test(result.requestId)) throw new Error("A kérés azonosítója hibás. Frissítsd az oldalt.");
  if (!emailPattern.test(result.email)) throw new Error("Adj meg egy működő e-mail-címet, hogy válaszolni tudjunk.");
  if (!result.contactConsent) throw new Error("A válaszhoz szükséges elfogadnod a kapcsolatfelvételt.");
  if (!result.privacyAccepted) throw new Error("A beküldéshez szükséges megismerned az adatkezelési tájékoztatót.");
  return result;
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

module.exports = { validateProposal, fingerprint };
