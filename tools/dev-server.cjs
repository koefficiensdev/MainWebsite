"use strict";

// Local static preview server for design checks. Mirrors Firebase Hosting cleanUrls.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 5173);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };

function resolveFile(pathname) {
  const requested = path.resolve(ROOT, `.${decodeURIComponent(pathname)}`);
  if (requested !== ROOT && !requested.startsWith(ROOT + path.sep)) return null;
  const relative = path.relative(ROOT, requested);
  const pageRequested = path.resolve(ROOT, "pages", relative);
  for (const candidate of [requested, `${requested}.html`, path.join(requested, "index.html"), pageRequested, `${pageRequested}.html`]) {
    if (candidate !== ROOT && !candidate.startsWith(ROOT + path.sep)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

http.createServer((request, response) => {
  const file = resolveFile(new URL(request.url, "http://localhost").pathname);
  if (!file) { response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); response.end("Not found"); return; }
  response.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(response);
}).listen(PORT, () => console.log(`Preview: http://localhost:${PORT}`));
