"use strict";
// Local-only allowlisted preview: never serves credentials, ops or backend files.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const files = new Map([
  ["/", ["index.html", "text/html"]],
  ["/css/site.css", ["css/site.css", "text/css"]],
  ["/js/main.js", ["js/main.js", "text/javascript"]],
  ["/js/checkout-model.js", ["js/checkout-model.js", "text/javascript"]],
  ["/js/storefront-config.js", ["js/storefront-config.js", "text/javascript"]],
  ["/assets/images/og-ovexi.png", ["assets/images/og-ovexi.png", "image/png"]],
  ["/foglalas", ["pages/foglalas.html", "text/html"]],
  ["/css/booking.css", ["css/booking.css", "text/css"]],
  ["/js/booking-ui.js", ["js/booking-ui.js", "text/javascript"]],
  ["/js/booking-model.js", ["js/booking-model.js", "text/javascript"]],
  ["/js/booking-api.js", ["js/booking-api.js", "text/javascript"]],
  ["/js/booking-config.js", ["js/booking-config.js", "text/javascript"]],
  ["/admin", ["pages/admin.html", "text/html"]],
  ["/css/admin.css", ["css/admin.css", "text/css"]],
  ["/js/admin.js", ["js/admin.js", "text/javascript"]],
  ["/js/outreach-ui.js", ["js/outreach-ui.js", "text/javascript"]],
  ["/js/admin-model.js", ["js/admin-model.js", "text/javascript"]],
  ["/js/catalog.js", ["js/catalog.js", "text/javascript"]],
  ["/assets/images/logo.png", ["assets/images/logo.png", "image/png"]]
]);
http.createServer((req, res) => {
  const item = files.get(new URL(req.url, "http://127.0.0.1").pathname);
  if (!item || !["GET", "HEAD"].includes(req.method)) { res.writeHead(404); return res.end(); }
  fs.readFile(path.resolve(__dirname, "..", item[0]), (error, content) => {
    if (error) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": `${item[1]}; charset=utf-8`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(req.method === "HEAD" ? undefined : content);
  });
}).listen(8877, "127.0.0.1", () => console.log("Local: http://127.0.0.1:8877/admin"));
