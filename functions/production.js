"use strict";
const {getFirestore}=require('firebase-admin/firestore');
const {onCall,onRequest,HttpsError}=require('firebase-functions/v2/https');
const {generate,hash}=require('./production-service');
const options={timeoutSeconds:60,maxInstances:2,cors:['https://ovexi.hu','https://www.ovexi.hu','https://ovexi-6ef38.web.app']};
const aiKey=require('firebase-functions/params').defineSecret('OPENAI_API_KEY');
exports.generateProductionCopy=onCall({...options,timeoutSeconds:300,secrets:[aiKey]},async request=>{
  if(request.auth?.token?.admin!==true)throw new HttpsError('permission-denied','Admin access required');
  if(Buffer.byteLength(JSON.stringify(request.data||{}))>50000)throw new HttpsError('invalid-argument','Túl nagy kérés.');
  try{return await require('./production-copy').createCopy(getFirestore(),aiKey.value(),request.data||{},request.auth.uid);}catch(error){throw new HttpsError(['invalid-argument','failed-precondition','already-exists','aborted','unavailable'].includes(error.code)?error.code:'internal',error.code?error.message:'Az AI-művelet eredménye ellenőrzést igényel.');}
});
exports.generateProductionArtifacts=onCall(options,async request=>{
  if(request.auth?.token?.admin!==true)throw new HttpsError('permission-denied','Admin access required');
  if(Buffer.byteLength(JSON.stringify(request.data||{}))>100000)throw new HttpsError('invalid-argument','Túl nagy kérés.');
  try{return await generate(getFirestore(),request.data||{},request.auth.uid);}catch(error){throw new HttpsError(['invalid-argument','failed-precondition','already-exists','aborted','not-found'].includes(error.code)?error.code:'internal',error.code?error.message:'A gyártás eredménye bizonytalan; ugyanazt a kérést próbáld újra.');}
});
exports.productionPreview=onRequest({timeoutSeconds:30,maxInstances:2,cors:false},async(req,res)=>{
  res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; sandbox allow-popups allow-popups-to-escape-sandbox"});
  if(req.method!=='GET')return res.status(405).send('Method not allowed');
  const {job,token}=req.query,file=req.query.file||'index.html';
  if(typeof job!=='string'||!/^[a-f0-9]{64}$/.test(job)||typeof token!=='string'||!/^[\w-]{43}$/.test(token)||!['index.html','marketing.html','rolunk.html','szolgaltatasok.html','kapcsolat.html'].includes(file))return res.status(404).send('Az előnézet nem érhető el.');
  const row=(await getFirestore().collection('production_jobs').doc(job).get()).data();
  if(!row||row.revokedAt||row.tokenHash!==hash(token)||!row.files?.[file])return res.status(404).send('Az előnézet nem érhető el.');
  const html=row.files[file].replace(/href="(index|rolunk|szolgaltatasok|kapcsolat)\.html"/g,(_all,name)=>`href="?job=${job}&amp;token=${token}&amp;file=${name}.html"`);
  return res.type('html').send(html);
});
exports.revokeProductionPreview=onCall(options,async request=>{
  if(request.auth?.token?.admin!==true)throw new HttpsError('permission-denied','Admin access required');
  if(!/^[a-f0-9]{64}$/.test(request.data?.jobId||''))throw new HttpsError('invalid-argument','Invalid job');
  await getFirestore().collection('production_jobs').doc(request.data.jobId).update({revokedAt:new Date(),updatedAt:new Date()});return {revoked:true};
});
