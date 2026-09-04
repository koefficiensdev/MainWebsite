"use strict";
const https = require("node:https");
const dns = require("node:dns").promises;
const { publicUrl, publicIp, email, fail, hash } = require("./outreach-domain");
function emailCandidates(value) {
  const expanded=String(value||"")
    .replace(/&commat;/gi,"@").replace(/&period;/gi,".")
    .replace(/\s*(?:\[at\]|\(at\)|\{at\}|kukac)\s*/gi,"@")
    .replace(/\s*(?:\[dot\]|\(dot\)|\{dot\}|pont)\s*/gi,".")
    .replace(/([a-z0-9.!#$%&'*+/=?^_`{|}~-])\s*@\s*(?=[a-z0-9-])/gi,"$1@")
    .replace(/([a-z0-9-])\s*\.\s*(?=[a-z]{2,}\b)/gi,"$1.");
  return [...new Set((expanded.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi)||[]).map(item=>item.toLowerCase()))];
}
async function verifySource(sourceUrl, recipient, redirects = 0, options = {}) {
  const url = publicUrl(sourceUrl);
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(a => !publicIp(a.address))) fail("PRIVATE_ADDRESS");
  // Pin the validated DNS result to the socket, retaining normal TLS hostname checks.
  const address = addresses[0];
  const result = await new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "OVEXI-ContactVerification/1.0 (+https://ovexi.hu)", "Accept": "text/html,text/plain", "Accept-Encoding": "identity" }, lookup: (_host, opts, cb) => opts.all ? cb(null, [address]) : cb(null, address.address, address.family) }, res => {
      if ([301,302,303,307,308].includes(res.statusCode)) { res.resume(); return resolve({ redirect: res.headers.location }); }
      if (res.statusCode !== 200 || !/text\/(html|plain)/i.test(res.headers["content-type"] || "")) { res.resume(); return reject(new Error("SOURCE_UNAVAILABLE")); }
      let size = 0; const parts = [];
      res.on("data", chunk => { size += chunk.length; if (size > 512000) req.destroy(new Error("SOURCE_TOO_LARGE")); else parts.push(chunk); });
      res.on("end", () => resolve({ body: Buffer.concat(parts).toString("utf8") }));
      res.on("error", reject);
    });
    const timer = setTimeout(() => req.destroy(new Error("SOURCE_TIMEOUT")), 10000);
    req.on("close", () => clearTimeout(timer)); req.on("error", reject);
  });
  if (result.redirect) { if (redirects >= 3) fail("TOO_MANY_REDIRECTS"); return verifySource(new URL(result.redirect, url).href, recipient, redirects + 1, options); }
  const body = result.body.replace(/&#(?:x([a-f0-9]+)|(\d+));/gi, (_, hex, dec) => String.fromCodePoint(Math.min(0x10ffff, parseInt(hex || dec, hex ? 16 : 10))));
  const found = emailCandidates(body);
  if (recipient !== null && !found.includes(email(recipient))) fail("EMAIL_NOT_ON_SOURCE");
  return { sourceUrl: url.href, sourceContentHash: hash(result.body), emailVerifiedAt: new Date(), ...(options.includeText ? { evidenceText: body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ") } : {}) };
}
module.exports = { verifySource, emailCandidates };
