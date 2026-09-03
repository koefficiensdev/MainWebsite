"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const d=require('../operations-domain'),service=require('../operations-service'),memoryDb=require('../../tools/workflow-test-db.cjs');
let dbFactory=memoryDb;
if(process.env.FIRESTORE_EMULATOR_HOST){
  const {initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
  initializeApp({projectId:'demo-ovexi-workflow'},'workflow-test');
  dbFactory=()=>getFirestore(require('firebase-admin/app').getApp('workflow-test'));
}
async function fixture(){const db=dbFactory(),id=crypto.randomBytes(32).toString('hex');const order={orderNumber:'OVX-TEST1234',companyName:'Teszt Műhely',itemIds:['website-basic'],businessDescription:'Kitalált tesztvállalkozás.',targetAudience:'Helyi ügyfelek',email:'test@example.invalid',status:'needs_review',requestFingerprint:'original'};
  await db.collection('orders').doc(id).set(order);await db.collection('order_workflows').doc(id).set({...d.workflowFor(order),orderId:id,orderNumber:order.orderNumber,companyName:order.companyName});
  const flow=async()=>(await db.collection('order_workflows').doc(id).get()).data();
  return {db,id,order,flow,input:async extra=>({orderId:id,requestId:crypto.randomUUID(),revision:(await flow()).revision,...extra})};
}
const preview={title:'Első terv',url:'https://example.com/preview',note:'Ellenőrizd a szolgáltatásokat.'};
test('workflow: unpaid preparation works, production and delivery remain closed',async()=>{
  const f=await fixture();await service.updateWorkflow(f.db,await f.input({stage:'preparation',nextAction:'Az előnézet készül.',steps:[]}), 'admin');assert.equal((await f.flow()).stage,'preparation');
  await assert.rejects(service.updateWorkflow(f.db,await f.input({stage:'production',nextAction:'Készül a munka.',steps:[]}),'admin'),{code:'failed-precondition'});
  await service.savePreview(f.db,await f.input(preview),'admin');
  await service.decidePreview(f.db,await f.input({previewVersion:1,decision:'approved',note:''}));
  await assert.rejects(service.publishDelivery(f.db,await f.input({files:[{label:'Anyag',url:'https://example.com/files'}],instructions:'Átadási útmutató.'}),'admin'),{code:'failed-precondition'});
  assert.equal((await f.flow()).preview.decision.status,'approved');assert.equal((await f.db.collection('orders').doc(f.id).get()).data().paymentStatus,undefined);
});
test('workflow: concurrent previews cannot overwrite a stale revision; retry recovers exact result',async()=>{
  const f=await fixture(),a=await f.input(preview),b=await f.input({...preview,title:'Második terv'});
  const results=await Promise.allSettled([service.savePreview(f.db,a,'admin'),service.savePreview(f.db,b,'admin')]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.find(x=>x.status==='rejected').reason.code,'aborted');
  const original=results[0].status==='fulfilled'?a:b;assert.deepEqual(await service.savePreview(f.db,original,'admin'),{accepted:true,version:1});
  await assert.rejects(service.savePreview(f.db,{...original,title:'Más tartalom'},'admin'),{code:'already-exists'});
});
test('workflow: approval belongs to an immutable preview version and new brief invalidates it',async()=>{
  const f=await fixture();await service.savePreview(f.db,await f.input(preview),'admin');
  const first=await f.input({previewVersion:1,decision:'approved',note:''});await service.decidePreview(f.db,first);
  await service.savePreview(f.db,await f.input({...preview,title:'Új előnézet'}),'admin');
  await assert.rejects(service.decidePreview(f.db,await f.input({previewVersion:1,decision:'approved',note:''})),{code:'aborted'});
  assert.equal((await f.flow()).preview.decision,null);await service.decidePreview(f.db,await f.input({previewVersion:2,decision:'approved',note:''}));
  await service.submitBrief(f.db,await f.input({briefRevision:0,brief:{businessDescription:'Frissített cégbemutatás.',targetAudience:'Más ügyfélkör',currentUrl:'',notes:''}}));
  assert.equal((await f.flow()).preview.decision.status,'brief_changed');assert.equal((await f.db.collection('orders').doc(f.id).get()).data().requestFingerprint,'original');
});
test('workflow: request replay creates one request and one notification; reply is customer-visible',async()=>{
  const f=await fixture(),raw=await f.input({kind:'question',message:'Mikor lesz kész az első változat?'});
  await Promise.all([service.submitRequest(f.db,raw),service.submitRequest(f.db,raw)]);
  let requests=await f.db.collection('customer_requests').where('orderId','==',f.id).get();assert.equal(requests.size,1);
  assert.equal((await f.db.collection('customer_notifications').where('orderId','==',f.id).get()).size,1);
  await assert.rejects(service.submitRequest(f.db,{...raw,message:'Más kérdés'}),{code:'already-exists'});
  await service.resolveRequest(f.db,await f.input({customerRequestId:requests.docs[0].id,reply:'Pénteken küldjük az előnézetet.'}),'admin');
  requests=await f.db.collection('customer_requests').where('orderId','==',f.id).get();assert.equal(requests.docs[0].data().reply,'Pénteken küldjük az előnézetet.');assert.equal((await f.flow()).attentionRequired,false);
});
test('workflow: final handoff needs current approval, completed work and payment; changes commit atomically',async()=>{
  const f=await fixture();await f.db.collection('orders').doc(f.id).set({...f.order,paymentStatus:'paid',onceTotal:69990,initialPaymentId:'pay_123'});
  const delivery={files:[{label:'Forráscsomag',url:'https://example.com/files.zip'}],instructions:'Töltsd le és őrizd meg a forráscsomagot.'};
  await assert.rejects(service.publishDelivery(f.db,await f.input(delivery),'admin'),{code:'failed-precondition'});
  await service.savePreview(f.db,await f.input(preview),'admin');await service.decidePreview(f.db,await f.input({previewVersion:1,decision:'approved',note:''}));
  await service.updateWorkflow(f.db,await f.input({stage:'ready',nextAction:'Átadásra előkészítve.',steps:(await f.flow()).steps.filter(x=>!['intake','customer-review','delivery'].includes(x.id)).map(x=>({id:x.id,done:true}))}),'admin');
  const raw=await f.input(delivery);await service.publishDelivery(f.db,raw,'admin');assert.deepEqual(await service.publishDelivery(f.db,raw,'admin'),{accepted:true});
  assert.equal((await f.flow()).stage,'completed');assert.equal((await f.flow()).delivery.previewVersion,1);assert.equal((await f.db.collection('orders').doc(f.id).get()).data().status,'completed');
  assert.equal((await f.db.collection('commerce_tasks').doc('final-pay_123').get()).data().type,'final_invoice');
});
test('workflow: unrelated request, fabricated approval checkbox and unsafe links are rejected',async()=>{
  const f=await fixture(),other=await fixture();
  await assert.rejects(service.savePreview(f.db,await f.input({...preview,url:'javascript:alert(1)'}),'admin'));
  await assert.rejects(service.updateWorkflow(f.db,await f.input({stage:'ready',nextAction:'Előkészítve.',steps:[{id:'customer-review',done:true}]}),'admin'),{code:'failed-precondition'});
  const request=await other.input({kind:'question',message:'Más ügyfél kérdése.'});await service.submitRequest(other.db,request);
  await assert.rejects(service.resolveRequest(f.db,await f.input({customerRequestId:d.hash(`${other.id}:${request.requestId}`),reply:'Válasz másik ügynek.'}),'admin'),{code:'not-found'});
});
