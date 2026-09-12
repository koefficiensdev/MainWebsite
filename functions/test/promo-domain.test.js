"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const promo=require("../promo-domain");
const website=[{id:"website-business"}],marketing=[{id:"marketing-mini"}];

test("promo codes normalize and only configured codes are accepted",()=>{
  assert.equal(promo.normalizePromoCode(" ovexi-1ev "),"OVEXI1EV");
  assert.throws(()=>promo.normalizePromoCode("rossz!"),/formátuma/);
  assert.equal(promo.resolvePromotion("ovexi-1ev",website,{PROMO_CODES:"OVEXI1EV,MASIK"}).hostingGb,1);
  assert.throws(()=>promo.resolvePromotion("NINCS",website,{PROMO_CODES:"OVEXI1EV"}),/érvénytelen/);
});

test("first-year infrastructure promotion requires a website package",()=>{
  const result=promo.resolvePromotion("OVEXI1EV",website,{PROMO_CODES:"OVEXI1EV"});
  assert.deepEqual({months:result.months,domainCount:result.domainCount,domainType:result.domainType,cashValue:result.cashValue},{months:12,domainCount:1,domainType:".hu",cashValue:false});
  assert.throws(()=>promo.resolvePromotion("OVEXI1EV",marketing,{PROMO_CODES:"OVEXI1EV"}),/weboldalcsomaggal/);
});

test("managed coupons validate independent domain, hosting and website price benefits",()=>{
  const clean=promo.validateCouponInput({code:" indul-as25 ",name:"Indulási ajánlat",domainYears:"2",hostingYears:3,discountPercent:"25"});
  assert.deepEqual(clean,{code:"INDULAS25",name:"Indulási ajánlat",domainYears:2,hostingYears:3,discountPercent:25});
  const benefit=promo.resolveManagedPromotion("INDULAS25",website,{...clean,active:true},"coupon-hash");
  assert.equal(benefit.couponId,"coupon-hash");assert.match(benefit.label,/2 évre/);assert.match(benefit.label,/25%/);
  assert.throws(()=>promo.resolveManagedPromotion("INDULAS25",marketing,{...clean,active:true},"coupon-hash"),/weboldalcsomaggal/);
  assert.throws(()=>promo.resolveManagedPromotion("INDULAS25",website,{...clean,active:false},"coupon-hash"),/nem aktív/);
});

test("managed percentage discount changes only the one-time website product",()=>{
  const products=[{id:"website-business",price:69990,billing:"once"},{id:"marketing-mini",price:4990,billing:"monthly"}];
  const priced=promo.applyPromotion(products,{discountPercent:25});
  assert.deepEqual(priced.map(item=>item.price),[52493,4990]);
  assert.equal(priced[0].originalPrice,69990);assert.equal(priced[1].originalPrice,undefined);
  assert.throws(()=>promo.validateCouponInput({code:"URES",name:"Üres kupon",domainYears:0,hostingYears:0,discountPercent:0}),/legalább egy/);
  assert.throws(()=>promo.validateCouponInput({code:"TELJES",name:"Teljes kupon",domainYears:0,hostingYears:0,discountPercent:100}),/0 és 99/);
});
