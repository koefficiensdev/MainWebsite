"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {qualify,isCited}=require("../outreach-qualification");
const {checkApproval,revision}=require("../outreach-domain");
const url="https://example.hu/",queries=["Example Kft Budapest honlap","Example Kft Budapest saját weboldal"],sources=new Set([url]);
const page=async()=>({evidenceText:"Autószerviz Budapesten, honlapunk jelenleg fejlesztés alatt. Nyitás 2026-08-01.",sourceContentHash:"test"});
const candidate=()=>({websiteStatus:"outdated",websiteUrl:url,needReason:"A cég saját oldalán fejlesztés alatt álló honlapot jelöl, ezért weboldalkészítési ajánlat lehet releváns.",evidenceUrl:url,evidenceQuote:"honlapunk jelenleg fejlesztés alatt",issue:"under_construction",searchQueries:queries,foundedOn:"",foundedSourceUrl:"",foundedQuote:""});
test("qualified research accepts concrete quoted website need, not a sector-only lead",async()=>{
  const q=await qualify(candidate(),sources,queries,page);assert.equal(q.version,2);assert.equal(q.newBusiness,false);
  await assert.rejects(()=>qualify({...candidate(),websiteStatus:"adequate"},sources,queries,page),{code:"NO_BUYING_SIGNAL"});
});
test("research rejects invented source quotes, uncited URLs and unexecuted searches",async()=>{
  await assert.rejects(()=>qualify({...candidate(),evidenceQuote:"Az oldal 1998 óta hibás"},sources,queries,page),{code:"UNSUPPORTED_QUALIFICATION"});
  await assert.rejects(()=>qualify(candidate(),new Set(),queries,page),{code:"UNCITED_QUALIFICATION"});
  await assert.rejects(()=>qualify(candidate(),sources,[],page),{code:"SEARCH_CHECKS_REQUIRED"});
  assert.equal((await qualify({...candidate(),searchQueries:["Szolgáltató által átírt keresés"]},sources,queries,page)).searchQueries.length,1);
});
test("citation matching tolerates harmless URL presentation differences",()=>{
  assert.equal(isCited(new Set(["https://example.hu/listing/?utm_source=search#contact"]),"https://EXAMPLE.hu/listing"),true);
  assert.equal(isCited(new Set(["https://example.hu/other"]),"https://example.hu/listing"),false);
});
test("no-site is explicitly a search inference and contradicting known URL is rejected",async()=>{
  const raw={...candidate(),companyName:"Example Kft",websiteStatus:"not_found",websiteUrl:"",issue:"no_site_found",evidenceQuote:"Autószerviz Budapesten"};
  assert.equal((await qualify(raw,sources,queries,page)).websiteStatus,"not_found");
  assert.equal((await qualify({...raw,searchQueries:[queries[0]]},sources,queries,page)).searchQueries.length,1);
  await assert.rejects(()=>qualify({...raw,websiteUrl:url},sources,queries,page),{code:"CONTRADICTORY_QUALIFICATION"});
});
test("no-site source may use server-verified business identity and exact email when an AI quote differs",async()=>{
  const listing="https://aranyoldalak.hu/autoszerelo/budapest/";
  const raw={...candidate(),websiteStatus:"not_found",websiteUrl:"",issue:"no_site_found",evidenceQuote:"Eltérően tördelt idézet",companyName:"Kecse Zsolt Autószerelő",contactEmail:"kecse80@gmail.com"};
  raw.evidenceUrl=listing;
  raw.searchQueries=["Kecse Zsolt Autószerelő Budapest honlap"];
  const fetch=async(_url,recipient)=>{assert.equal(recipient,"kecse80@gmail.com");return {evidenceText:"Kecse Zsolt Autószerelő – kapcsolat: kecse80@gmail.com",sourceContentHash:"verified"};};
  const result=await qualify(raw,new Set([listing]),raw.searchQueries,fetch,new Date(),"no_website",listing);
  assert.equal(result.evidence.verification,"business_identity_and_email");assert.equal(result.evidence.quote,"");
  const other={...raw,companyName:"Másik Műhely",searchQueries:["Másik Műhely Budapest honlap"]};
  await assert.rejects(()=>qualify(other,new Set([listing]),other.searchQueries,fetch,new Date(),"no_website",listing),{code:"UNSUPPORTED_QUALIFICATION"});
});
test("new business priority requires current dated evidence, not an assumption",async()=>{
  const raw={...candidate(),foundedOn:"2026-08-01",foundedSourceUrl:url,foundedQuote:"Nyitás 2026-08-01."};
  assert.equal((await qualify(raw,sources,queries,page,new Date("2026-08-31"))).newBusiness,true);
  for(const date of ["2020-01-01","2027-01-01","2026-02-30"])await assert.rejects(()=>qualify({...raw,foundedOn:date},sources,queries,page,new Date("2026-08-31")),{code:"UNSUPPORTED_NEW_BUSINESS"});
  await assert.rejects(()=>qualify({...raw,foundedOn:"2026-08-02"},sources,queries,page,new Date("2026-08-31")),{code:"UNSUPPORTED_NEW_BUSINESS"});
});
test("copyright year is not a sufficient website defect",async()=>{
  await assert.rejects(()=>qualify({...candidate(),evidenceQuote:"Copyright 2010 Example Kft",issue:"outdated_information"},sources,queries,async()=>({evidenceText:"Copyright 2010 Example Kft"})),{code:"COPYRIGHT_NOT_A_DEFECT"});
});
test("legacy AI drafts cannot bypass qualification by calling approve directly",()=>{
  assert.throws(()=>checkApproval({status:"draft",source:"ai_research"},{}),{code:"QUALIFICATION_REQUIRED"});
});
test("qualification hash is stable across Firestore date serialization and changes with evidence",()=>{
  const row={subject:"Draft",qualification:{version:2,needReason:"Need",checkedAt:new Date()}};
  assert.equal(revision(row),revision({...row,qualification:{...row.qualification,checkedAt:{seconds:123,nanoseconds:0}}}));
  assert.equal(revision(row),revision({...row,qualification:{needReason:"Need",version:2}}));
  assert.notEqual(revision(row),revision({...row,qualification:{...row.qualification,needReason:"Changed"}}));
});
