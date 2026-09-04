"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {discoveryTarget,discoveredEmail}=require("../outreach-research");
const fs=require("node:fs"),path=require("node:path");
test("research examines a larger bounded pool so rejected candidates can be replaced",()=>{
  assert.equal(discoveryTarget(1),10);
  assert.equal(discoveryTarget(5),15);
  assert.equal(discoveryTarget(20),20);
});
test("research normalizes one clearly obfuscated public email but rejects ambiguity",()=>{
  assert.equal(discoveredEmail("Kapcsolat: szerviz@ gmail.com"),"szerviz@gmail.com");
  assert.equal(discoveredEmail("szerviz kukac pelda pont hu"),"szerviz@pelda.hu");
  assert.throws(()=>discoveredEmail("a@example.hu vagy b@example.hu"),{code:"INVALID_EMAIL"});
});
test("research endpoint keeps a second instance available while one long search runs",()=>{
  const source=fs.readFileSync(path.join(__dirname,"../outreach.js"),"utf8");
  assert.match(source,/maxInstances:\s*2,\s*concurrency:\s*1/);
});
