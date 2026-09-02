"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const model=import("../../js/admin-model.js");
test("admin: manual contacted lead and AI drafts never count as sent email",async()=>{
  const {summarize}=await model;
  const report=summarize({leads:[{status:"contacted"}],outreach_messages:[{status:"draft"},{status:"sent",source:"manual",sentAt:1},{status:"sent",source:"provider",sentAt:1},{status:"sent",source:"provider",sentAt:1,providerMessageId:"confirmed"}]});
  assert.equal(report.sent,1);assert.equal(report.replied,0);
});
test("admin: only paid live payment records count, not orders or test charges",async()=>{
  const {summarize}=await model;
  const report=summarize({orders:[{status:"completed",onceTotal:999999}],payments:[{status:"paid",livemode:false,products:[{price:100000}]},{status:"pending",livemode:true,products:[{price:50000}]},{status:"paid",livemode:true,products:[{price:69990},{price:9900}]}]});
  assert.equal(report.paidValue,79890);
});
test("admin: campaign budget is never counted as spending and currencies stay separate",async()=>{
  const {summarize}=await model;
  const report=summarize({campaigns:[{budgetMinor:5000000}],expenses:[{currency:"HUF",amountMinor:239000},{currency:"EUR",amountMinor:1000},{currency:"USD",amountMinor:500}]});
  assert.deepEqual(report.costs,{HUF:2390,EUR:10,USD:5});
});
test("admin: inclusive Budapest dates apply to proper activity timestamps",async()=>{
  const {dayKey,summarize,inPeriod}=await model;
  assert.equal(dayKey("2026-08-30T22:30:00Z"),"2026-08-31");
  assert.equal(inPeriod(null,"2026-08-31","2026-08-31"),false);
  const r=summarize({orders:[{createdAt:"2026-08-30T22:30:00Z"},{createdAt:"2026-08-29T12:00:00Z"}],expenses:[{createdAt:"2026-08-31",incurredOn:"2026-07-01",amountMinor:500,currency:"EUR"}]},"2026-08-31","2026-08-31");
  assert.equal(r.orders,1);assert.equal(r.costs.EUR,0);
});
test("admin: stored HTML, script URLs and CSV formulas are neutralized",async()=>{
  const {escapeHtml,safeUrl,csv}=await model;
  assert.equal(safeUrl("javascript:alert(1)"),"");assert.equal(safeUrl("data:text/html,hi"),"");
  assert.equal(safeUrl("https://ovexi.hu"),"https://ovexi.hu/");
  assert.ok(!escapeHtml('<img onerror="x">').includes("<img"));
  const exported=csv([["=CMD()"," +1","normal",'quoted"']]);
  assert.ok(exported.includes("'=CMD()"));assert.ok(exported.includes("' +1"));assert.ok(exported.includes('quoted""'));
});
test("admin: monetary entry validation rejects negatives, exponent notation and overflow",async()=>{
  const {parseAmount}=await model;
  assert.equal(parseAmount("23,90","EUR"),2390);assert.equal(parseAmount("0","HUF",true),0);
  for(const value of ["-1","1e9","NaN","1.999","100000001","0"])assert.throws(()=>parseAmount(value,"HUF"));
});
test("admin: campaign validation keeps source manual and cannot pretend to launch an ad",async()=>{
  const {validateCampaign}=await model;
  const input={name:"OVEXI keresőhirdetés",platform:"Google Ads",destination:"https://ovexi.hu",budget:"10000",creative:"Weboldalak",status:"planned",source:"provider"};
  assert.equal(validateCampaign(input).source,"manual");assert.equal(validateCampaign(input).budgetMinor,1000000);
  assert.throws(()=>validateCampaign({...input,destination:"javascript:alert(1)"}));
});
test("admin: expenses require real dates, known currencies and existing campaign references",async()=>{
  const {validateExpense}=await model;
  const input={label:"Tárhely",amount:"15",currency:"EUR",incurredOn:"2026-08-31",category:"hosting",campaignId:""};
  assert.equal(validateExpense(input).amountMinor,1500);
  assert.throws(()=>validateExpense({...input,incurredOn:"2026-02-30"}));
  assert.throws(()=>validateExpense({...input,campaignId:"missing"}));
  assert.throws(()=>validateExpense({...input,currency:"BTC"}));
});
test("admin: page structure has nine panels, explicit login protection and matching element IDs",()=>{
  const root=path.resolve(__dirname,"../..");
  const html=fs.readFileSync(path.join(root,"pages/admin.html"),"utf8"),js=fs.readFileSync(path.join(root,"js/admin.js"),"utf8");
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  for(const [,id] of js.matchAll(/\$\("([^"]+)"\)/g))assert.ok(ids.includes(id),`Missing ${id}`);
  assert.equal([...html.matchAll(/data-panel=/g)].length,9);
  assert.match(html,/id="dashboardSection"[^>]*hidden/);assert.match(js,/token\.claims\.admin!==true/);
});
test("admin: outbound evidence is read-only in rules, campaigns and expenses are admin-only",()=>{
  const rules=fs.readFileSync(path.resolve(__dirname,"../../firestore.rules"),"utf8");
  assert.match(rules,/match \/outreach_messages\/\{messageId\} \{\s*allow read: if isAdmin\(\);\s*allow write: if false;/);
  assert.match(rules,/allow create: if isAdmin\(\) && validCampaign\(\)/);
  assert.match(rules,/allow create: if isAdmin\(\) && validExpense\(\)/);
});
