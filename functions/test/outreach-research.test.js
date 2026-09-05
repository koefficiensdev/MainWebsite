"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {discoveryTarget,discoveredEmail}=require("../outreach-research");
const {discoverOsm,normalizeElements,normalizeTrustedSeeds,osmPlan,osmQuery}=require("../outreach-osm");
const fs=require("node:fs"),path=require("node:path");
test("research examines a larger bounded pool so rejected candidates can be replaced",()=>{
  assert.equal(discoveryTarget(1),3);
  assert.equal(discoveryTarget(5),10);
  assert.equal(discoveryTarget(20),20);
});
test("research normalizes public email formats and selects the first verifiable address",()=>{
  assert.equal(discoveredEmail("Kapcsolat: szerviz@ gmail.com"),"szerviz@gmail.com");
  assert.equal(discoveredEmail("szerviz kukac pelda pont hu"),"szerviz@pelda.hu");
  assert.equal(discoveredEmail("a@example.hu vagy b@example.hu"),"a@example.hu");
  assert.throws(()=>discoveredEmail("nincs nyilvános cím"),{code:"INVALID_EMAIL"});
});
test("research endpoint keeps a second instance available while one long search runs",()=>{
  const source=fs.readFileSync(path.join(__dirname,"../outreach.js"),"utf8");
  assert.match(source,/maxInstances:\s*2,\s*concurrency:\s*1/);
});
test("OSM discovery finds public Gmail hairdressers without a website tag",async()=>{
  const plan=osmPlan("fodrász Budapesten");assert.equal(plan.city,"Budapest");assert.match(osmQuery(plan),/shop.*hairdresser/);
  const payload={elements:[{type:"node",id:123,tags:{name:"Teszt Fodrászműhely",email:"teszt.fodrasz@ gmail.com","addr:street":"Minta utca","addr:housenumber":"1"}},{type:"node",id:124,tags:{name:"Honlapos Szalon",email:"szalon@gmail.com",website:"https://example.hu"}}]};
  const rows=normalizeElements(payload,plan);assert.equal(rows.length,1);assert.equal(rows[0].recipient,"teszt.fodrasz@gmail.com");assert.equal(rows[0].sourceUrl,"https://www.openstreetmap.org/node/123");
  assert.deepEqual(await discoverOsm("ismeretlen szakma Budapesten",async()=>assert.fail("must not fetch")),[]);
});
test("authenticated browser OSM seeds accept public Gmail and reject arbitrary sources",()=>{
  const rows=normalizeTrustedSeeds([{companyName:"Teszt Fodrász",companyDescription:"Budapesti fodrászat.",recipient:"fodrasz@gmail.com",sourceUrl:"https://www.openstreetmap.org/node/123"},{companyName:"Hamis",companyDescription:"Nem OSM.",recipient:"hamis@gmail.com",sourceUrl:"https://example.com/node/1"}]);
  assert.equal(rows.length,1);assert.equal(rows[0].verificationMethod,"openstreetmap_admin_public_data");assert.equal(rows[0].sourceUrl,"https://www.openstreetmap.org/node/123");
});
