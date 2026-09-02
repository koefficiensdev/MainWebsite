"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { applicationDefault, initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

async function main() {
  const inputPath = path.resolve(process.argv[2] || "../ops/first-leads.csv");
  const rows = parseCsv(fs.readFileSync(inputPath, "utf8"));
  if (rows.length < 2) throw new Error("A CSV nem tartalmaz leadeket.");
  const headers = rows[0];
  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();
  let imported = 0;
  for (const values of rows.slice(1)) {
    if (!values.some(Boolean)) continue;
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    const duplicate = await db.collection("leads").where("website", "==", record.website).limit(1).get();
    if (!duplicate.empty) continue;
    await db.collection("leads").add({
      companyName: record.companyName.slice(0, 120),
      website: record.website.slice(0, 300),
      segment: record.segment.slice(0, 80),
      score: Number(record.score || 0),
      reason: record.reason.slice(0, 1000),
      channel: record.channel.slice(0, 80),
      status: record.status || "researched",
      draft: record.draft.slice(0, 2000),
      source: "researched_csv",
      sourceVerifiedAt: record.sourceVerifiedAt,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    imported += 1;
  }
  console.log(`${imported} új lead importálva.`);
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += character;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

if (require.main === module) {
  main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
}

module.exports = { parseCsv };
