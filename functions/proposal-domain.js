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
    privacyAccepted: input.privacyAccepted === true,
    source: "website_proposal_form"
  };
  if (!/^[0-9a-f-]{36}$/i.test(result.requestId)) throw new Error("A kérés azonosítója hibás. Frissítsd az oldalt.");
  if (result.contactName.length < 2 || result.companyName.length < 2 || result.businessType.length < 3) throw new Error("Add meg a nevedet, a vállalkozást és a tevékenységet.");
  if (!emailPattern.test(result.email)) throw new Error("Adj meg egy működő e-mail-címet.");
  if (result.mainChallenge.length < 15) throw new Error("Írd le legalább egy mondatban, miben segíthetne a rendszer.");
  if (!result.needs.length) throw new Error("Jelölj meg legalább egy területet.");
  if (!result.contactConsent || !result.privacyAccepted) throw new Error("A javaslat elkészítéséhez szükséges jelölőnégyzeteket el kell fogadnod.");
  return result;
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

module.exports = { validateProposal, fingerprint };
