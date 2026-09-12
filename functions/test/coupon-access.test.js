"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {initializeApp,getApps}=require("firebase-admin/app");
if(!getApps().length)initializeApp({projectId:"demo-ovexi-coupons"});
const crypto=require("node:crypto"),{couponAdmin,checkPromoCode,submitOrder}=require("../commerce");

test("coupon admin endpoint rejects guests and ordinary users before database access",async()=>{
  await assert.rejects(couponAdmin.run({data:{action:"list"}}),{code:"permission-denied"});
  await assert.rejects(couponAdmin.run({data:{action:"create",coupon:{}},auth:{uid:"ordinary",token:{admin:false}}}),{code:"permission-denied"});
});

if(process.env.FIRESTORE_EMULATOR_HOST)test("managed coupon is created, previewed and atomically counted on an order",async()=>{
  const auth={uid:"admin",token:{admin:true}},code="EMULATOR25";
  await couponAdmin.run({data:{action:"create",coupon:{code,name:"Emulátoros kupon",domainYears:2,hostingYears:1,discountPercent:25}},auth});
  const preview=await checkPromoCode.run({data:{promoCode:code,itemIds:["website-business","marketing-mini"]}});
  assert.equal(preview.discountPercent,25);assert.equal(preview.onceTotal,52493);assert.equal(preview.monthlyTotal,4990);
  const result=await submitOrder.run({data:{requestId:crypto.randomUUID(),contactName:"Teszt Elek",companyName:"Kupon teszt",email:"coupon@example.invalid",itemIds:["website-business","marketing-mini"],infrastructurePlan:"new",businessDescription:"Emulátorban ellenőrzött kuponos rendelés.",primaryGoal:"Weboldal",termsAccepted:true,operatingCostsAcknowledged:true,businessPurchaseConfirmed:true,hungarianBillingConfirmed:true,promoCode:code},rawRequest:{ip:"127.0.0.1"}});
  assert.match(result.orderNumber,/^OVX-/);
  const list=await couponAdmin.run({data:{action:"list"},auth}),coupon=list.coupons.find(row=>row.code===code);
  assert.equal(coupon.appliedCount,1);assert.equal(coupon.redeemedCount,0);
});
