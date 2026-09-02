"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {assemble,generate,clean}=require('../bespoke-production'),{contentFor}=require('../production-domain'),memory=require('../../tools/workflow-test-db.cjs');
const order={companyName:'Egyedi Teszt',businessDescription:'Egy kitalált, teszteléshez használt műhely.',itemIds:['website-onepage'],status:'needs_review',briefRevision:0,orderNumber:'OVX-TEST'};
const content=contentFor(order,{posts:[]});
function design(color='navy'){return {concept:'A műhely személyes munkafolyamatához tervezett, egyedi oldalszerkezet.',decisions:['Olvasható betűméret'],missingInformation:[],pages:['index.html','marketing.html'].map(filename=>({filename,title:'Teszt',body:'<main><h1>Egyedi Teszt</h1><a href="https://attacker.invalid">Tiltott</a><script>alert(1)</script></main>',css:`body{color:${color}}@media(max-width:600px){main{padding:20px}}`})),creatives:[]};}
test('bespoke: generated HTML is sanitized; remote links, scripts, SVG handlers and CSS loads cannot survive',()=>{
  const artifact=assemble(order,content,design());assert.doesNotMatch(artifact.files['index.html'],/<script|https:\/\/attacker/);assert.match(artifact.files['index.html'],/Content-Security-Policy/);assert.equal(artifact.manifest.generator,'ovexi-bespoke-v1');
  assert.doesNotMatch(clean('<svg onload="x"><image href="https://x"/><foreignObject><script>x</script></foreignObject><rect fill="url(https://x)"/></svg>',true),/onload|image|foreignObject|script|https/);
  for(const unsafe of ['@import "https://x";','p{background:url(https://x)}','p{background:u\\72l(x)}','p{color:red}</style><script>x</script>']){const d=design();d.pages[0].css=unsafe;assert.throws(()=>assemble(order,content,d));}
  const missing=design();missing.pages.pop();assert.throws(()=>assemble(order,content,missing));
});
test('bespoke: concurrent retry calls one provider; completed design is durable and identical designs are rejected',async()=>{
  const db=memory(),orderId=crypto.randomBytes(32).toString('hex');await db.collection('orders').doc(orderId).set(order);let calls=0,finish;const wait=new Promise(r=>finish=r);const provider={create:async()=>{calls++;await wait;return {status:'completed',output_text:JSON.stringify(design()),usage:{input_tokens:10,output_tokens:10}};}};const raw={orderId,requestId:crypto.randomUUID(),briefRevision:0};const first=generate(db,raw,'admin','fake',provider);await Promise.race([first,new Promise(async resolve=>{while(!calls)await new Promise(r=>setTimeout(r,1));resolve();})]);await assert.rejects(generate(db,raw,'admin','fake',provider),{code:'unavailable'});finish();const result=await first;assert.deepEqual(await generate(db,raw,'admin','fake',provider),result);assert.equal(calls,1);
  await assert.rejects(generate(db,{...raw,requestId:crypto.randomUUID()},'admin','fake',provider),/ismétel/);assert.equal(calls,2);
});
test('bespoke: partial AI output never falls back to a template and is not silently retried',async()=>{
  const db=memory(),orderId=crypto.randomBytes(32).toString('hex');await db.collection('orders').doc(orderId).set(order);let calls=0;const provider={create:async()=>{calls++;return {status:'incomplete',output_text:'{}',usage:{output_tokens:10}};}};const raw={orderId,requestId:crypto.randomUUID(),briefRevision:0};await assert.rejects(generate(db,raw,'admin','fake',provider));await assert.rejects(generate(db,raw,'admin','fake',provider));assert.equal(calls,1);const rows=await db.collection('production_jobs').get();assert.equal(rows.docs[0].data().files,undefined);
});
test('booking: guest status requires the cancellation secret and returns no contact identity',async()=>{
  const db=memory(),token=crypto.randomBytes(32).toString('hex'),domain=require('../booking-domain'),service=require('../booking-service');await db.doc('booking_tenants/tenant/bookings/booking').set({id:'booking',cancellationHash:domain.secretHash(token),service:{name:'Teszt'},name:'Private Name',email:'private@example.invalid',status:'cancelled',start:'2026-09-03T08:00:00.000Z'});
  await assert.rejects(service.guestStatus(db,{tenantId:'tenant',bookingId:'booking',cancellationToken:crypto.randomBytes(32).toString('hex')}),{code:'not-found'});const row=await service.guestStatus(db,{tenantId:'tenant',bookingId:'booking',cancellationToken:token});assert.equal(row.status,'cancelled');assert.equal(row.email,undefined);assert.equal(row.name,undefined);assert.equal(row.cancellationHash,undefined);
});
