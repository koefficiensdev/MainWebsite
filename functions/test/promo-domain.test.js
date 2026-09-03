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
