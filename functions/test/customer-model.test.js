const test=require('node:test'),assert=require('node:assert/strict');
const model=import('../../js/customer-model.js');
function memory(){const map=new Map();return {get:k=>map.get(k)||null,set:(k,v)=>map.set(k,v),remove:k=>map.delete(k)};}
test('customer: network failure and reload preserve exact payload and ID, even after changed form input',async()=>{
  const {reliableAction}=await model,store=memory();let saved;const first=reliableAction(store,'order-a');
  await assert.rejects(first.send({message:'Eredeti kérdés'},async p=>{saved=p;throw Error('timeout');}));
  const next=reliableAction(store,'order-a');await next.send({message:'Új szöveg'},async p=>{assert.deepEqual(p,saved);return {accepted:true};});assert.equal(next.pending,null);assert.equal(store.get('order-a'),null);
});
test('customer: storage failure and duplicate clicks do not duplicate a successful mutation',async()=>{
  const {reliableAction,safeStorage}=await model,action=reliableAction(safeStorage(()=>{throw Error('disabled');}),'x');let done;
  const running=action.send({kind:'question'},()=>new Promise(resolve=>{done=resolve;}));await assert.rejects(action.send({},()=>{}),{code:'busy'});done({accepted:true});await running;assert.equal(action.pending,null);
});
test('customer: stale revision permits correction; unauthenticated outcome keeps pending action for re-login',async()=>{
  const {reliableAction}=await model,action=reliableAction(memory(),'order-b');
  await assert.rejects(action.send({},async()=>{throw {code:'functions/unauthenticated'};}));assert.ok(action.pending);
  await assert.rejects(action.send({},async()=>{throw {code:'functions/aborted'};}));assert.equal(action.pending,null);
});
test('customer: Firestore callable timestamps and material links render safely',async()=>{
  const {dateLabel,safeLink,escapeHtml}=await model;assert.notEqual(dateLabel({_seconds:1788307200}), '—');assert.equal(safeLink('javascript:alert(1)'),'');assert.equal(safeLink('https://user:pass@example.com'),'');assert.equal(escapeHtml('<img src=x>'),'&lt;img src=x&gt;');
});
