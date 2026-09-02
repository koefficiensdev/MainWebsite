"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const d = require("../outreach-domain"), { approveAndSend } = require("../outreach-service");
function memoryDb() {
  const rows=new Map(), versions=new Map();
  const snap=path=>({exists:rows.has(path),data:()=>structuredClone(rows.get(path))});
  const seed=(path,value)=>{rows.set(path,structuredClone(value));versions.set(path,(versions.get(path)||0)+1);};
  const doc=path=>({path,get:async()=>snap(path),set:async(data,opts)=>seed(path,opts?.merge?{...rows.get(path),...data}:data),update:async data=>{assert(rows.has(path));seed(path,{...rows.get(path),...data});}});
  return {rows,seed,collection:name=>({doc:id=>doc(`${name}/${id}`)}),async runTransaction(fn){
    for(let n=0;n<25;n++){const reads=new Map(),writes=[];const tx={get:async ref=>{assert.equal(writes.length,0);reads.set(ref.path,versions.get(ref.path)||0);return snap(ref.path);},set:(ref,v,opts)=>writes.push([ref.path,v,!!opts?.merge]),create:(ref,v)=>{assert(!rows.has(ref.path));writes.push([ref.path,v,false]);},update:(ref,v)=>writes.push([ref.path,v,true])};
      const result=await fn(tx);if([...reads].some(([p,v])=>(versions.get(p)||0)!==v))continue;
      for(const [p,v,merge]of writes)seed(p,merge?{...rows.get(p),...v}:v);return result;
    }throw Error("conflict");
  }};
}
function fixture(){const db=memoryDb(),row={companyName:"Példa Kft.",recipient:"info@example.hu",subject:"Weboldal egyeztetés",body:"Egy rövid, személyes megkeresés a szolgáltatásról.",companyDescription:"Autószerviz",offer:"Egyeztetés",sourceUrl:"https://example.hu/kapcsolat",emailVerifiedAt:new Date(),status:"draft"},id=d.hash(row.recipient);row.revision=d.revision(row);db.seed(`outreach_messages/${id}`,row);return {db,row,id,item:{id,revision:row.revision,legalBasis:"corporate_role",legalNote:"Céges impresszum és általános kapcsolat ellenőrizve."}};}
test("outreach: email/header validation prevents SMTP injection and lists",()=>{
  for(const value of ["a@b.hu\r\nBcc:evil@b.hu","Name <info@b.hu>","a@b.hu,b@b.hu"])assert.throws(()=>d.email(value));
  assert.throws(()=>d.draftFields({subject:"Hi\r\nCc: x",body:"abcdefghijklmnopqrst"}));
});
test("outreach: SSRF blocks nonpublic URLs/IP ranges and mapped IPv6",()=>{
  for(const url of ["http://example.hu","https://127.0.0.1","https://user:pass@example.hu","https://example.hu:8080","https://host.local"])assert.throws(()=>d.publicUrl(url));
  for(const ip of ["127.0.0.1","10.0.0.1","169.254.169.254","::1","::ffff:127.0.0.1","fc00::1","192.168.0.1"])assert.equal(d.publicIp(ip),false);
  assert.equal(d.publicIp("1.1.1.1"),true);
});
test("outreach: individual/general mailbox requires consent instead of corporate shortcut",()=>{
  const {row,item}=fixture();assert.doesNotThrow(()=>d.checkApproval(row,item));
  const individual={...row,companyName:"Kovács Anna EV",recipient:"anna@gmail.com"};const raw={...item,revision:d.revision(individual)};
  assert.throws(()=>d.checkApproval(individual,raw),{code:"CONSENT_REQUIRED"});
  assert.doesNotThrow(()=>d.checkApproval(individual,{...raw,legalBasis:"consent"}));
});
test("outreach: edits, missing evidence and missing legal review block sending",()=>{
  const {row,item}=fixture();assert.throws(()=>d.checkApproval({...row,body:"Changed"},item),{code:"DRAFT_CHANGED"});
  assert.throws(()=>d.checkApproval({...row,emailVerifiedAt:null},item),{code:"SOURCE_REQUIRED"});
  assert.throws(()=>d.checkApproval(row,{...item,legalNote:""}),{code:"INVALID_TEXT"});
});
test("outreach: concurrent approvals send exactly once with fixed sender and unsubscribe",async()=>{
  const {db,row,item}=fixture();let count=0;
  const transport={sendMail:async mail=>{count++;assert.equal(mail.to,row.recipient);assert.equal(mail.from.address,"info@ovexi.hu");assert.match(mail.text,/LEIRATKOZAS/);return {accepted:[row.recipient]};}};
  const results=await Promise.allSettled([approveAndSend(db,transport,"admin",item),approveAndSend(db,transport,"admin",item)]);
  assert.equal(count,1);assert.equal(results.filter(r=>r.status==="fulfilled").length,1);assert.equal(db.rows.get(`outreach_messages/${item.id}`).status,"sent");
});
test("outreach: ambiguous SMTP acceptance is never retried",async()=>{
  const {db,item}=fixture();let calls=0;const transport={sendMail:async()=>{calls++;throw Error("timeout after DATA");}};
  assert.equal((await approveAndSend(db,transport,"admin",item)).status,"send_unknown");
  await assert.rejects(()=>approveAndSend(db,transport,"admin",item),{code:"NOT_DRAFT"});assert.equal(calls,1);
});
test("outreach: suppression and duplicate company block prior to SMTP",async()=>{
  for(const blocked of ["outreach_suppressions/","outreach_contacts/"]){const {db,row,item}=fixture();db.seed(blocked+d.hash(row.recipient),{createdAt:new Date()});await assert.rejects(()=>approveAndSend(db,{sendMail:()=>assert.fail("must not send")},"admin",item));}
  const {db,row,item}=fixture();db.seed(`outreach_contacts/domain-${d.hash(row.recipient.split("@")[1])}`,{});await assert.rejects(()=>approveAndSend(db,{},"admin",item),{code:"ALREADY_CONTACTED"});
});
test("outreach: daily quota and old source evidence fail closed",async()=>{
  const {db,row,item}=fixture();
  const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Budapest"}).format(new Date());
  db.seed(`outreach_controls/day-${day}`,{count:100});
  await assert.rejects(()=>approveAndSend(db,{},"admin",item),{code:"DAILY_LIMIT"});
  assert.throws(()=>d.checkApproval({...row,emailVerifiedAt:new Date(Date.now()-31*86400000)},item),{code:"SOURCE_EXPIRED"});
});
test("outreach: replies match exact provider message IDs and explicit unsubscribe",()=>{
  const id=d.hash("test");assert.deepEqual(d.replyIds(`<other@x> <ovexi-${id}@ovexi.hu>`),[id]);
  assert.equal(d.replyKind("Re: Offer","LEIRATKOZAS"),"unsubscribe");
  assert.equal(d.replyKind("Re: Offer","Érdekel!\n> LEIRATKOZAS"),"reply");
  assert.equal(d.replyKind("Re: Offer","LEIRATKOZAS","auto-replied"),"automatic");
});
test("outreach: admin controls have matching HTML IDs and server-owned collections",()=>{
  const fs=require("node:fs"),path=require("node:path"),root=path.resolve(__dirname,"../..");
  const ui=fs.readFileSync(path.join(root,"js/outreach-ui.js"),"utf8"),html=fs.readFileSync(path.join(root,"pages/admin.html"),"utf8"),rules=fs.readFileSync(path.join(root,"firestore.rules"),"utf8");
  for(const [,id]of ui.matchAll(/\$\("([^"]+)"\)/g))assert(html.includes(`id="${id}"`),id);
  for(const key of ["outreach_research","outreach_replies","outreach_controls"])assert(rules.includes(`match /${key}/{id} { allow read: if isAdmin(); allow write: if false; }`));
});
test("outreach: inbox only reads matched reply bodies, imports once and suppresses unsubscribe",async()=>{
  const {db,row,id}=fixture();db.seed(`outreach_messages/${id}`,{...row,status:"sent",approvedAt:new Date(),sentAt:new Date()});
  let bodies=0;const header=Buffer.from(`From: info@example.hu\r\nTo: info@ovexi.hu\r\nSubject: Re: Offer\r\nIn-Reply-To: <ovexi-${id}@ovexi.hu>\r\n\r\n`);
  const factory=()=>({mailbox:{uidValidity:1n,uidNext:3},connect:async()=>{},getMailboxLock:async(_path,opts)=>{assert.equal(opts.readOnly,true);return {release(){}};},search:async()=>[1,2],fetchOne:async(uid,fields)=>{if(uid===1){assert(!fields.source);return {headers:Buffer.from("From: unrelated@example.hu\r\nSubject: Private mail\r\n\r\n"),size:200};}if(fields.source){bodies++;return {source:Buffer.concat([header,Buffer.from("LEIRATKOZAS")])};}return {headers:header,size:300};},logout:async()=>{},close(){}});
  const {syncInbox}=require("../outreach-inbox");
  assert.equal((await syncInbox(db,"not-a-secret",factory)).imported,1);assert.equal(bodies,1);
  assert.equal(db.rows.get(`outreach_suppressions/${d.hash(row.recipient)}`).reason,"unsubscribe_reply");
  const state=db.rows.get("outreach_controls/inbox");db.seed("outreach_controls/inbox",{...state,lastAttempt:0,lockUntil:0,cursor:0});
  assert.equal((await syncInbox(db,"not-a-secret",factory)).imported,0);assert.equal(bodies,1);
});
test("outreach: all callable mutations reject missing or ordinary-user auth",async()=>{
  const api=require("../index");
  for(const name of ["researchOutreach","saveOutreachDraft","approveOutreach","suppressOutreach","syncOutreachReplies"]){
    for(const auth of [undefined,{uid:"ordinary",token:{admin:false}}]) await assert.rejects(()=>api[name].run({auth,data:{}}),{code:"permission-denied"});
  }
});
