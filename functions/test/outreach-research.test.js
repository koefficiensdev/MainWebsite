"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {discoveryTarget}=require("../outreach-research");
test("research examines a larger bounded pool so rejected candidates can be replaced",()=>{
  assert.equal(discoveryTarget(1),10);
  assert.equal(discoveryTarget(5),15);
  assert.equal(discoveryTarget(20),20);
});
