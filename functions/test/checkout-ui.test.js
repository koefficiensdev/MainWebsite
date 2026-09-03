const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const model=import('../../js/checkout-model.js');
const raw=()=>({itemIds:['website-onepage'],contactName:'Teszt Kapcsolat',companyName:'Minta Cég',email:'test@example.invalid',businessDescription:'Fiktív teszt vállalkozás leírása.',primaryGoal:'Több ajánlatkérés',termsAccepted:true,operatingCostsAcknowledged:true,businessPurchaseConfirmed:true});
function memory(){const map=new Map();return {map,get:key=>map.get(key)||null,set:(key,value)=>{map.set(key,value);return true;},remove:key=>map.delete(key)};}
const result={orderNumber:'OVX-TEST-123ABC',status:'received',emailQueued:true};
test('checkout: cart restores only valid unique products and one plan per category',async()=>{
  const {cleanCart}=await model;assert.deepEqual(cleanCart(['website-onepage','website-business','website-business','marketing-mini','marketing-pro','marketing-launch','maintenance-basic','maintenance-plus','quick-audit','bad']),['website-business','marketing-pro','marketing-launch','maintenance-plus','quick-audit']);assert.deepEqual(cleanCart({}),[]);
});
test('checkout: short and mistyped website addresses are normalized',async()=>{
  const {normalizeWebUrl,orderInput}=await model;
  assert.equal(normalizeWebUrl('ovexi.hu'),'https://ovexi.hu/');
  assert.equal(normalizeWebUrl('https:\\\\ovexi.hu.'),'https://ovexi.hu/');
  assert.equal(orderInput({...raw(),itemIds:['quick-audit'],currentUrl:'ovexi.hu'}).currentUrl,'https://ovexi.hu/');
  assert.throws(()=>orderInput({...raw(),itemIds:['quick-audit'],currentUrl:''}),/webcímet/);
});
test('checkout: standalone marketing and maintenance pass the server contract',async()=>{
  const {orderInput}=await model,{validateOrder}=require('../commerce-domain');
  for(const itemIds of [['marketing-mini'],['maintenance-basic'],['marketing-launch'],['website-onepage','marketing-start','maintenance-basic']]){
    const input={...orderInput({...raw(),itemIds}),requestId:crypto.randomUUID()};assert.deepEqual(validateOrder(input).itemIds,itemIds);
  }
});
test('checkout: frontend rejects invalid brief, consent and dangerous URL before submission',async()=>{
  const {orderInput}=await model;for(const change of [{contactName:'x'},{companyName:'x'},{businessDescription:'rövid'},{email:'wrong'},{termsAccepted:false},{operatingCostsAcknowledged:false},{businessPurchaseConfirmed:false},{currentUrl:'javascript:alert(1)'},{currentUrl:'https://user:pass@example.com'}])assert.throws(()=>orderInput({...raw(),...change}));
});
test('checkout: uncertain request survives reload and retries same ID and frozen payload',async()=>{
  const {submissionManager}=await model,store=memory(),first=submissionManager(store);let sent;
  await assert.rejects(first.send(raw(),async input=>{sent=input;throw Error('timeout');}));
  const resumed=submissionManager(store);assert.equal(resumed.pending.requestId,sent.requestId);
  assert.deepEqual(await resumed.send({...raw(),email:'changed@example.invalid'},async input=>{assert.deepEqual(input,sent);return result;}),result);
  assert.equal(resumed.pending,null);assert.equal(resumed.receipt.orderNumber,result.orderNumber);assert.equal(store.get('ovexi_pending_request_v1'),null);
  assert(!store.get('ovexi_last_receipt_v1').includes('test@example.invalid'));
});
test('checkout: duplicate clicks cannot submit concurrently',async()=>{
  const {submissionManager}=await model,flow=submissionManager(memory());let release,calls=0;
  const running=flow.send(raw(),()=>{calls++;return new Promise(resolve=>{release=resolve;});});
  await assert.rejects(flow.send(raw(),()=>{calls++;return result;}),{code:'busy'});release(result);await running;assert.equal(calls,1);
});
test('checkout: browser storage failure never changes an accepted request into failure',async()=>{
  const {safeStorage,submissionManager}=await model;const store=safeStorage(()=>{throw Error('Storage disabled');});const flow=submissionManager(store);
  assert.deepEqual(await flow.send(raw(),async()=>result),result);assert.equal(flow.pending,null);assert.equal(flow.receipt.orderNumber,result.orderNumber);
});
test('checkout: validation failure permits corrected data; ambiguous or malformed response retains ID',async()=>{
  const {submissionManager}=await model,flow=submissionManager(memory());let previous;
  await assert.rejects(flow.send(raw(),async p=>{previous=p.requestId;throw Object.assign(Error('invalid'),{code:'functions/invalid-argument'});}));assert.equal(flow.pending,null);
  await assert.rejects(flow.send(raw(),async p=>{assert.notEqual(p.requestId,previous);return {status:'received'};}));assert(flow.pending);
});
test('checkout: no direct order write fallback, server receipt ID and hidden demo navigation',()=>{
  const root=path.resolve(__dirname,'../..'),main=fs.readFileSync(path.join(root,'js/main.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),admin=fs.readFileSync(path.join(root,'pages/admin.html'),'utf8');
  assert.doesNotMatch(main,/addDoc\(collection\(db,\s*"orders"/);assert.match(main,/logAnalytics\("order_submitted",result.orderNumber\)/);assert.match(main,/event.key==='Tab'/);assert.match(html,/id="orderReceipt"/);assert.match(html,/businessPurchaseConfirmed/);assert.match(main,/Megrendelem és tovább a fizetéshez/);assert.doesNotMatch(admin,/class="module-preview"/);
});
test('checkout: cookie choice can be reopened and analytics excludes query/hash data',()=>{
  const root=path.resolve(__dirname,'../..'),main=fs.readFileSync(path.join(root,'js/main.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),policy=fs.readFileSync(path.join(root,'pages/cookie-policy.html'),'utf8');
  assert.match(main,/getElementById\('openCookieSettings'\)/);assert.match(html,/id="openCookieSettings"/);assert.doesNotMatch(main,/pageUrl: location.href/);assert.match(policy,/ovexi_pending_request_v1/);assert.doesNotMatch(policy,/#contact|#services/);
});
