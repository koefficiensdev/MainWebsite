"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const memory=require('../../tools/workflow-test-db.cjs'),production=require('../production-service'),{build}=require('../production-domain'),mail=require('../mail-delivery'),monitor=require('../site-monitor'),booking=require('../booking-service');
let createDb=memory;
if(process.env.FIRESTORE_EMULATOR_HOST){const {initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');const app=initializeApp({projectId:'demo-ovexi-workflow'},'automation-readiness');createDb=()=>getFirestore(app);}
test('production: text, CSS, links and spreadsheet content cannot inject executable markup',()=>{
  const result=build({companyName:'<script>alert(1)</script>',businessDescription:'Megadott cégbemutatás.',itemIds:['website-onepage']},{headline:'<img src=x onerror=alert(1)>',posts:[{title:'=SUM(A1)',body:'Valós tények',day:1}]});
  assert.match(result.files['index.html'],/&lt;img/);assert.doesNotMatch(result.files['index.html'],/<script|onerror="/);assert.match(result.files['tartalomnaptar.csv'],/'=SUM/);assert(!result.files['index.html'].includes('mailto:'));
  assert.throws(()=>build({companyName:'Teszt',businessDescription:'Cégbemutatás'},{accent:'red;}body{display:none'}));assert.throws(()=>build({companyName:'Teszt',businessDescription:'Cégbemutatás'},{contactUrl:'javascript:alert(1)'}));
  for(const f of result.manifest.files)assert.equal(crypto.createHash('sha256').update(result.files[f.name]).digest('hex'),f.sha256);
});
test('production: concurrent identical requests persist one immutable artifact; edited replay and stale brief fail',async()=>{
  const db=createDb(),id=crypto.randomBytes(32).toString('hex'),ref=db.collection('orders').doc(id),order={companyName:'Kitalált Műhely',businessDescription:'Kitalált bemutató vállalkozás.',orderNumber:'OVX-DEMO',briefRevision:2,status:'needs_review'};await ref.set(order);
  const request={orderId:id,requestId:crypto.randomUUID(),briefRevision:2},results=await Promise.all([production.generate(db,request,'admin'),production.generate(db,request,'admin')]);assert.deepEqual(results[0],results[1]);
  const job=(await db.collection('production_jobs').doc(results[0].id).get()).data();assert(job.files['index.html']);assert.equal((await ref.get()).data().paymentStatus,undefined);
  await assert.rejects(production.generate(db,{...request,content:{headline:'Másik cím'}},'admin'),{code:'already-exists'});
  await assert.rejects(production.generate(db,{...request,requestId:crypto.randomUUID(),briefRevision:1},'admin'),{code:'aborted'});
});
test('mail: connection failure is retryable; lost DATA response requires manual reconciliation',()=>{
  assert.equal(mail.failure({code:'ECONNECTION'}).status,'retry');assert.equal(mail.failure({command:'DATA',responseCode:451}).status,'retry');assert.equal(mail.failure({command:'DATA',code:'ETIMEDOUT'}).status,'send_unknown');assert.equal(mail.failure({command:'CONN'},5).status,'failed');
});
test('mail: duplicate worker delivery sends once and accepted mail is never retried',async()=>{
  const db=createDb(),ref=db.collection('customer_notifications').doc(crypto.randomUUID());await ref.set({status:'pending',attempts:0,nextAttemptAt:new Date(0)});let calls=0;
  const send=async()=>{calls++;return {accepted:['test@example.invalid']};};await Promise.all([mail.deliver(db,ref,async()=>({to:'test@example.invalid'}),send),mail.deliver(db,ref,async()=>({to:'test@example.invalid'}),send)]);
  assert.equal(calls,1);assert.equal((await ref.get()).data().status,'sent');await mail.deliver(db,ref,async()=>({}),send);assert.equal(calls,1);
});
test('mail: worker crash after send marker is recovered as unknown without sending again',async()=>{
  const db=createDb(),ref=db.collection('customer_notifications').doc(crypto.randomUUID());await ref.set({status:'sending',sendStartedAt:new Date(1),leaseUntil:new Date(1)});let calls=0;await mail.deliver(db,ref,async()=>({}),async()=>calls++);assert.equal(calls,0);assert.equal((await ref.get()).data().status,'send_unknown');
});
test('monitor: 404, redirect loops, private redirect targets and expiring TLS are failures',async()=>{
  assert.equal(monitor.classify(404,'').ok,false);assert.equal(monitor.classify(200,new Date(Date.now()+86400000).toUTCString()).errorCode,'certificate_expiring');
  assert.equal((await monitor.probe('https://example.com',async()=>({status:404}))).httpStatus,404);
  const loop=await monitor.probe('https://example.com',async()=>({status:302,location:'/again'}));assert.equal(loop.ok,false);assert.equal(loop.errorCode,'TOO_MANY_REDIRECTS');
  let calls=0;const unsafe=await monitor.probe('https://example.com',async()=>{calls++;return {status:302,location:'https://127.0.0.1/'};});assert.equal(unsafe.ok,false);assert.equal(calls,1);
  const good=await monitor.probe('https://example.com',async url=>url.pathname==='/'?{status:301,location:'/ready'}:{status:200});assert.equal(good.ok,true);assert.equal(good.redirects,1);
});
test('booking: concurrent reservations claim one slot and queue one notification; cancellation restores availability',async()=>{
  const db=createDb(),tenantId='test-'+crypto.randomBytes(8).toString('hex'),ref=db.collection('booking_tenants').doc(tenantId),now=Date.parse('2026-09-02T04:00:00Z');
  await ref.set(require('../booking-settings').validate({enabled:true,ownerUid:'owner',businessName:'Minta Naptár',contactEmail:'test@example.invalid',privacyVersion:'test',privacyUrl:'https://example.com/privacy',timeZone:'Europe/Budapest',notificationEmailEnabled:true,services:[{id:'service',name:'Konzultáció',durationMinutes:30,priceHuf:1000,active:true}],weeklyHours:{3:[['09:00','12:00']]},minNoticeMinutes:0}));
  const raw={tenantId,serviceId:'service',date:'2026-09-02',start:'2026-09-02T07:00:00.000Z',name:'Minta Vendég',email:'test@example.invalid',privacyAccepted:true,requestId:crypto.randomUUID(),cancellationToken:crypto.randomBytes(32).toString('hex')};
  const results=await Promise.allSettled([booking.createBooking(db,raw,now),booking.createBooking(db,{...raw,requestId:crypto.randomUUID()},now)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const notes=await db.collection('booking_notifications').where('tenantId','==',tenantId).get();assert.equal(notes.size,1);const winner=results.find(r=>r.status==='fulfilled').value;
  await assert.rejects(booking.ownerDay(db,{tenantId,date:raw.date},'intruder'),{code:'permission-denied'});
  await booking.cancelBooking(db,{tenantId,bookingId:winner.bookingId,cancellationToken:raw.cancellationToken},now);assert((await booking.availability(db,raw,now)).slots.some(s=>s.start===raw.start));
  assert.equal((await db.collection('booking_notifications').where('tenantId','==',tenantId).get()).size,2);
});
test('backup: encrypted values round trip and tampered archives fail authentication',()=>{
  const {encrypt,decrypt}=require('../../tools/backup.cjs'),key=crypto.randomBytes(32),sample={documents:[{path:'orders/test',fields:{amount:{integerValue:'123'},created:{timestampValue:'2026-09-02T00:00:00Z'}}}]};const archive=encrypt(sample,key);assert.deepEqual(decrypt(archive,key),sample);const tampered=JSON.parse(archive);tampered.tag=crypto.randomBytes(16).toString('base64');assert.throws(()=>decrypt(JSON.stringify(tampered),key));assert.throws(()=>decrypt(archive,crypto.randomBytes(32)));
});
test('production AI: completion and incomplete output are durable; retries do not call the provider twice',async()=>{
  const db=memory(),orderId=crypto.randomBytes(32).toString('hex'),order={companyName:'Minta Cég',businessDescription:'Kitalált szervizvállalkozás.',itemIds:['marketing-mini'],briefRevision:0,status:'needs_review'};await db.collection('orders').doc(orderId).set(order);
  const content={headline:'Minta Cég',description:order.businessDescription,services:[],posts:Array.from({length:8},(_,i)=>({title:'Téma '+i,body:'Megadott üzleti tények.',day:i+1,channel:'Facebook'})),blogs:[],emailDrafts:[],missingInformation:['Kapcsolat']};let calls=0;const provider={create:async()=>{calls++;return {status:'completed',output_text:JSON.stringify(content),usage:{input_tokens:100,output_tokens:100}};}};
  const raw={orderId,requestId:crypto.randomUUID(),briefRevision:0};const {createCopy}=require('../production-copy');const first=await createCopy(db,'test',raw,'admin',provider);assert.equal(first.content.posts.length,8);assert.deepEqual(await createCopy(db,'test',raw,'admin',provider),first);assert.equal(calls,1);
  const incomplete={...raw,requestId:crypto.randomUUID()};await assert.rejects(createCopy(db,'test',incomplete,'admin',{create:async()=>({status:'incomplete',output_text:'{}',usage:{output_tokens:5}})}),{code:'failed-precondition'});await assert.rejects(createCopy(db,'test',incomplete,'admin',provider));assert.equal(calls,1);
});
