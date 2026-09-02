"use strict";
const domain=require('./booking-domain');
function validate(raw){
  domain.config(raw);
  for(const [key,min,max] of [['ownerUid',1,128],['businessName',2,160],['privacyVersion',3,80]])if(typeof raw[key]!=='string'||raw[key].trim().length<min||raw[key].length>max)domain.fail('invalid-argument',`Hiányzó beállítás: ${key}`);
  let privacy;try{privacy=new URL(raw.privacyUrl);}catch{domain.fail('invalid-argument','HTTPS adatkezelési tájékoztató szükséges.');}
  if(privacy.protocol!=='https:'||privacy.username||privacy.password)domain.fail('invalid-argument','HTTPS adatkezelési tájékoztató szükséges.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.contactEmail||''))domain.fail('invalid-argument','Kapcsolattartási e-mail szükséges.');
  const result=Object.fromEntries(['ownerUid','businessName','privacyVersion','privacyUrl','contactEmail','timeZone','services','weeklyHours','dateOverrides','slotStepMinutes','minNoticeMinutes','horizonDays','enabled','notificationEmailEnabled'].filter(key=>raw[key]!==undefined).map(key=>[key,raw[key]]));
  for(const field of ['weeklyHours','dateOverrides'])result[field]=Object.fromEntries(Object.entries(raw[field]||{}).map(([day,ranges])=>[day,ranges.map(range=>Array.isArray(range)?{start:range[0],end:range[1]}:{start:range.start,end:range.end})]));
  return result;
}
async function save(db,raw,uid){
  domain.id(raw.tenantId);if(!Number.isSafeInteger(raw.revision)||raw.revision<0)domain.fail('invalid-argument','Verzió szükséges.');const config=validate(raw.settings||{}),ref=db.collection('booking_tenants').doc(raw.tenantId);
  return db.runTransaction(async tx=>{const old=(await tx.get(ref)).data();if(Number(old?.revision||0)!==raw.revision)domain.fail('failed-precondition','A naptár beállítása megváltozott.');if(old&&old.ownerUid!==config.ownerUid)domain.fail('failed-precondition','Tulajdonosváltás külön migrációt igényel.');tx.set(ref,{...config,revision:raw.revision+1,createdAt:old?.createdAt||new Date(),updatedAt:new Date(),updatedBy:uid});return {accepted:true,revision:raw.revision+1};});
}
module.exports={validate,save};
