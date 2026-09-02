import { readFile } from "node:fs/promises";

const host = "ovexi.hu";
const key = "d8830cba23998b9cc30c815742fc2a3dd259dd2e";
const keyLocation = `https://${host}/${key}.txt`;
const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
const urlList = [...sitemap.matchAll(/<loc>(https:\/\/ovexi\.hu\/[^<]*)<\/loc>/g)].map((match) => match[1]);

if (!urlList.length) {
  throw new Error("A sitemap nem tartalmaz beküldhető OVEXI URL-t.");
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
});

if (![200, 202].includes(response.status)) {
  throw new Error(`Az IndexNow beküldés sikertelen: HTTP ${response.status}`);
}

console.log(`IndexNow: ${urlList.length} URL elfogadva (HTTP ${response.status}).`);
