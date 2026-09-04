"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {composeProspectDraft}=require("../outreach-copy");
const {qualify,isBusinessProfile,checkEmailWebsite}=require("../outreach-qualification");
const {emailCandidates}=require("../outreach-source");
const model=import("../../js/admin-model.js");
test("new outreach copy is short plain Hungarian without unsupported promises or translated jargon",()=>{
  for(const websiteStatus of ["not_found","outdated"]){
    const d=composeProspectDraft({companyName:"Teszt Műhely"},{websiteStatus});
    assert.match(d.subject,/Teszt Műhely/);assert(d.body.split(/\s+/).length<=110);
    assert.match(d.body,/69\s990 Ft/);assert.match(d.body,/fenntartás külön fizetendő/);
    assert.doesNotMatch(d.body,/landing|konverz|szállítás|díjmentes|garantál|növeli|hárompontos|foglalás/i);
    if(websiteStatus==="not_found")assert.match(d.body,/ha van, elnézést/);
  }
});
test("no-website mode cannot return a company with an old existing site",async()=>{
  await assert.rejects(()=>qualify({websiteStatus:"outdated"},new Set(),[],undefined,new Date(),"no_website"),{code:"EXISTING_WEBSITE_EXCLUDED"});
  await assert.rejects(()=>qualify({websiteStatus:"not_found"},new Set(),[],undefined,new Date(),"no_website","https://company.hu/contact"),{code:"OWN_WEBSITE_CONTACT_SOURCE"});
  assert.equal(isBusinessProfile("https://company.hu"),false);
  assert.equal(isBusinessProfile("https://www.facebook.com/BusinessProfile"),true);
  assert.equal(isBusinessProfile("https://aranyoldalak.hu/autoszerelo/budapest/"),true);
  assert.equal(isBusinessProfile("https://budapest.cylex.hu/ceg-info/pelda-123.html"),true);
  assert.equal(isBusinessProfile("https://facebook.com.evil.hu/Business"),false);
  assert.equal(isBusinessProfile("https://evil-aranyoldalak.hu/company"),false);
});
test("old imported/unqualified drafts cannot appear among send-ready prospects",async()=>{
  const {outreachReady,outreachBlockedReason}=await model;
  assert.equal(outreachReady({status:"draft",source:"researched_csv"}),false);
  assert.equal(outreachReady({status:"draft",qualification:{version:2},emailVerifiedAt:new Date()}),false);
  assert.match(outreachBlockedReason({status:"draft"}),/Régi vagy nem minősített/);
  assert.equal(outreachReady({status:"draft",qualification:{version:2,targetMode:"no_website"},emailVerifiedAt:new Date()}),true);
});

test("custom email website is a conservative exclusion; failed fetch is not absence proof",async()=>{
  await assert.rejects(()=>checkEmailWebsite("info@company.hu",async()=>({})),{code:"EMAIL_DOMAIN_HAS_WEBSITE"});
  const checked=[];
  await assert.rejects(()=>checkEmailWebsite("info@company.hu",async url=>{checked.push(url);if(!url.includes("www."))throw Error("unavailable");return {};}),{code:"EMAIL_DOMAIN_HAS_WEBSITE"});
  assert.equal(checked.length,2);
  assert.equal(await checkEmailWebsite("business@gmail.com",async()=>{throw Error("must not fetch mail provider");}),"shared_mail_provider");
  assert.equal(await checkEmailWebsite("info@company.hu",async()=>{throw Error("unavailable");}),"inconclusive_human_review_required");
});
test("source verification extracts common public email obfuscation without guessing",()=>{
  assert.deepEqual(emailCandidates("Írjon: varga@ gmail.com vagy iroda kukac pelda pont hu"),["varga@gmail.com","iroda@pelda.hu"]);
  assert.deepEqual(emailCandidates("nincs itt cím"),[]);
});
test("send affordance is per-message and calls the same confirmed approval path",()=>{
  const fs=require("node:fs"),path=require("node:path"),root=path.resolve(__dirname,"../..");
  const ui=fs.readFileSync(path.join(root,"js/outreach-ui.js"),"utf8"),admin=fs.readFileSync(path.join(root,"js/admin.js"),"utf8"),html=fs.readFileSync(path.join(root,"pages/admin.html"),"utf8");
  assert.match(ui,/data-send-outreach=/);assert.match(ui,/await approveRows\(\[row\]\)/);assert.match(ui,/if\(!confirm\(/);
  assert.match(html,/name="targetMode"><option value="no_website"/);
  assert.match(html,/id="messageFilter"><option value="ready"/);
  assert.match(admin,/<details class="surface"><summary>Régi importált lista/);
  assert.match(admin,/data-open-prospect=/);
});
test("research UI follows a server-side job instead of presenting processing as a failure",()=>{
  const fs=require("node:fs"),path=require("node:path"),root=path.resolve(__dirname,"../..");
  const ui=fs.readFileSync(path.join(root,"js/outreach-ui.js"),"utf8");
  assert.match(ui,/if\(result\.status==="processing"\)result=await followResearch\(requestId\)/);
  assert.match(ui,/A kutatás a háttérben folytatódik/);
  assert.doesNotMatch(ui,/A kutatás nem fejeződött be: \$\{result/);
});
