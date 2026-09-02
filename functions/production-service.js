"use strict";
const crypto=require('node:crypto'),{build}=require('./production-domain');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const fail=(code,message)=>{throw Object.assign(Error(message),{code});};
async function generate(db,raw,uid) {
  if(!/^[a-f0-9]{64}$/.test(raw.orderId||'')||!/^[a-f0-9-]{36}$/.test(raw.requestId||'')||!Number.isSafeInteger(raw.briefRevision))fail('invalid-argument','Hibás gyártási kérés.');
  const id=hash(`${raw.orderId}:${raw.requestId}`),ref=db.collection('production_jobs').doc(id),orderRef=db.collection('orders').doc(raw.orderId),fingerprint=hash(JSON.stringify({raw,uid}));
  const token=crypto.randomBytes(32).toString('base64url');
  return db.runTransaction(async tx=>{
    const [old,snapshot]=await Promise.all([tx.get(ref),tx.get(orderRef)]);
    if(old.exists){if(old.data().fingerprint!==fingerprint)fail('already-exists','Az azonosító más tartalomhoz tartozik.');return {accepted:true,id,previewUrl:old.data().previewUrl,marketingUrl:old.data().marketingUrl};}
    if(!snapshot.exists)fail('not-found','Nincs ilyen rendelés.');
    const order=snapshot.data();if(['completed','cancelled'].includes(order.status))fail('failed-precondition','Lezárt rendelés.');
    if(Number(order.briefRevision||0)!==raw.briefRevision)fail('aborted','Megváltozott az ügyfél briefje. Frissíts.');
    const artifact=build(order,raw.content||{});if(Buffer.byteLength(JSON.stringify(artifact))>600000)fail('invalid-argument','Túl nagy anyag.');
    const previewUrl=`https://europe-west1-ovexi-6ef38.cloudfunctions.net/productionPreview?job=${id}&token=${token}`;
    const marketingUrl=previewUrl+'&file=marketing.html';
    tx.create(ref,{orderId:raw.orderId,orderNumber:order.orderNumber,companyName:order.companyName,status:'draft_ready',fingerprint,briefRevision:raw.briefRevision,createdBy:uid,createdAt:new Date(),updatedAt:new Date(),tokenHash:hash(token),previewUrl,marketingUrl,...artifact});
    return {accepted:true,id,previewUrl,marketingUrl};
  });
}
module.exports={generate,hash};
