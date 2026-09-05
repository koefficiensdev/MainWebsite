"use strict";
const https = require("node:https");
const { email, hash } = require("./outreach-domain");
const { emailCandidates } = require("./outreach-source");

const SECTORS = [
  { pattern: /fodr[aá]sz|barber|borb[eé]ly/i, filter: '["shop"="hairdresser"]', label: "fodrászat" },
  { pattern: /aut[oó]szerviz|aut[oó]szerel|g[aá]zszerviz/i, filter: '["shop"="car_repair"]', label: "autószerviz" },
  { pattern: /kozmetik|sz[eé]ps[eé]gszalon/i, filter: '["shop"="beauty"]', label: "szépségszalon" },
  { pattern: /[eé]tterem/i, filter: '["amenity"="restaurant"]', label: "étterem" },
  { pattern: /k[aá]v[eé]z[oő]|k[aá]v[eé]z[oó]/i, filter: '["amenity"="cafe"]', label: "kávézó" }
];
const CITIES = ["Budapest","Debrecen","Szeged","Miskolc","Pécs","Győr","Nyíregyháza","Kecskemét","Székesfehérvár","Szombathely","Érd","Tatabánya","Sopron","Kaposvár","Veszprém","Békéscsaba","Zalaegerszeg","Eger"];

function osmPlan(criteria) {
  const sector = SECTORS.find(item => item.pattern.test(criteria));
  const normalized = String(criteria).toLocaleLowerCase("hu-HU");
  const city = CITIES.find(item => normalized.includes(item.toLocaleLowerCase("hu-HU")));
  return sector && city ? { ...sector, city } : null;
}
function osmQuery(plan) {
  return `[out:json][timeout:45];area["name"="${plan.city}"]["boundary"="administrative"]->.a;(nwr(area.a)${plan.filter}["email"][!"website"][!"contact:website"];nwr(area.a)${plan.filter}["contact:email"][!"website"][!"contact:website"];);out tags center qt;`;
}
const OVERPASS_ENDPOINTS = [
  { hostname: "overpass-api.de", path: "/api/interpreter" },
  { hostname: "overpass.private.coffee", path: "/api/interpreter" }
];
function postEndpoint(endpoint, query) {
  const body = `data=${encodeURIComponent(query)}`;
  return new Promise((resolve, reject) => {
    const req = https.request({ ...endpoint, method: "POST", timeout: 35000, headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body), "User-Agent": "OVEXI-LeadResearch/1.0 (+https://ovexi.hu)" } }, response => {
      if (response.statusCode !== 200) { response.resume(); return reject(new Error(`OSM_HTTP_${response.statusCode || 0}`)); }
      let size = 0; const chunks = [];
      response.on("data", chunk => { size += chunk.length; if (size > 2_000_000) req.destroy(new Error("OSM_RESPONSE_TOO_LARGE")); else chunks.push(chunk); });
      response.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { reject(new Error("OSM_INVALID_RESPONSE")); } });
    });
    req.on("timeout", () => req.destroy(new Error("OSM_TIMEOUT"))); req.on("error", reject); req.end(body);
  });
}
async function postOverpass(query) {
  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try { return await postEndpoint(endpoint, query); }
    catch (error) { lastError = error; }
  }
  throw lastError || new Error("OSM_UNAVAILABLE");
}
function normalizeElements(payload, plan) {
  const rows = [], seen = new Set();
  for (const item of payload?.elements || []) {
    const tags = item.tags || {}, candidates = emailCandidates(tags.email || tags["contact:email"] || "");
    if (!tags.name || !candidates.length || tags.website || tags["contact:website"] || !["node","way","relation"].includes(item.type)) continue;
    let recipient; try { recipient = email(candidates[0]); } catch { continue; }
    if (seen.has(recipient)) continue; seen.add(recipient);
    const address = [tags["addr:postcode"], plan.city, tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
    const sourceUrl = `https://www.openstreetmap.org/${item.type}/${item.id}`;
    const evidenceText = `${tags.name} ${plan.label} ${address} ${recipient}`.replace(/\s+/g," ").trim();
    rows.push({ companyName: String(tags.name).slice(0,160), companyDescription: `${plan.city} területén nyilvántartott ${plan.label}${address ? `, ${address}` : ""}.`, recipient, sourceUrl, evidenceText, sourceContentHash: hash(JSON.stringify(tags)) });
  }
  return rows;
}
async function discoverOsm(criteria, fetcher = postOverpass) {
  const plan = osmPlan(criteria); if (!plan) return [];
  return normalizeElements(await fetcher(osmQuery(plan)), plan);
}
module.exports = { discoverOsm, normalizeElements, osmPlan, osmQuery, postOverpass };
