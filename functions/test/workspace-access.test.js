"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {initializeApp}=require('firebase-admin/app');initializeApp({projectId:'demo-ovexi-workflow'});
const endpoints=require('../operations');
test('workspace endpoints: every admin mutation rejects guests and ordinary users',async()=>{
  for(const name of ['updateOrderWorkflow','saveOrderPreview','publishOrderDelivery','resolveCustomerRequest','backfillOrderWorkflows']){
    await assert.rejects(endpoints[name].run({data:{}}),{code:'permission-denied'});
    await assert.rejects(endpoints[name].run({data:{},auth:{uid:'ordinary',token:{admin:false}}}),{code:'permission-denied'});
  }
});
test('workspace endpoints: missing or malformed customer links are rejected before database access',async()=>{
  for(const name of ['getCustomerWorkspace','submitCustomerRequest','submitCustomerBrief','decideCustomerPreview'])await assert.rejects(endpoints[name].run({data:{token:'invalid'}}),{code:'unauthenticated'});
});
if(process.env.FIRESTORE_EMULATOR_HOST)test('workspace emulator: customer cannot select another order; expired links and anonymous reads fail',async()=>{
  const {getFirestore}=require('firebase-admin/firestore'),db=getFirestore(),d=require('../operations-domain');
  const own=crypto.randomBytes(32).toString('hex'),other=crypto.randomBytes(32).toString('hex'),token=crypto.randomBytes(32).toString('base64url');
  const order={orderNumber:'OVX-SECURITY1234',companyName:'Security test',itemIds:['website-basic'],status:'needs_review',businessDescription:'Test service description',targetAudience:'Test',createdAt:new Date()};
  for(const id of [own,other]){await db.collection('orders').doc(id).set(order);await db.collection('order_workflows').doc(id).set({...d.workflowFor(order),createdAt:new Date()});}
  const session=db.collection('customer_sessions').doc();await session.set({tokenHash:d.hash(token),orderId:own,expiresAt:new Date(Date.now()+60000),lastUsedAt:new Date()});
  await endpoints.submitCustomerRequest.run({data:{token,orderId:other,requestId:crypto.randomUUID(),kind:'question',message:'Which order receives this?'}});
  assert.equal((await db.collection('customer_requests').where('orderId','==',own).get()).size,1);assert.equal((await db.collection('customer_requests').where('orderId','==',other).get()).size,0);
  const view=await endpoints.getCustomerWorkspace.run({data:{token,orderId:other}});assert.equal(view.orderNumber,order.orderNumber);assert.equal(view.requests.length,1);
  const response=await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-ovexi-workflow/databases/(default)/documents/order_workflows/${own}`);assert.equal(response.status,403);
  await session.set({tokenHash:d.hash(token),orderId:own,expiresAt:new Date(Date.now()-1000)});
  await assert.rejects(endpoints.getCustomerWorkspace.run({data:{token}}),{code:'unauthenticated'});
});
