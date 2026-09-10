"use strict";
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {getFirestore}=require('firebase-admin/firestore');
const crypto=require('node:crypto');
const d=require('./social-domain');
const {provider}=require('./social-provider');
const db=getFirestore(),configRef=db.doc('social_private/provider');
const options={cors:['https://ovexi.hu','https://www.ovexi.hu','https://ovexi-6ef38.web.app'],timeoutSeconds:300,maxInstances:2};
const stamp=()=>new Date();
async function config(){const c=(await configRef.get()).data();if(!c?.key||!c.profileId)d.fail('A publikálási szolgáltató még nincs csatlakoztatva.','failed-precondition');return c;}
async function accounts(c){const result=await provider(c.key)(`/accounts?profileId=${encodeURIComponent(c.profileId)}&status=connected`);return (result.accounts||[]).filter(a=>d.PLATFORMS.includes(a.platform)&&a.isActive===true);}
const safeAccounts=rows=>rows.map(a=>({_id:a._id,platform:a.platform,username:String(a.username||a.displayName||a.platform),isActive:a.isActive}));
async function ownPost(id){const ref=db.collection('social_posts').doc(d.id(id)),snap=await ref.get();if(!snap.exists)d.fail('A videótervezet nem található.','not-found');return {ref,post:snap.data()};}
async function syncPost(ref,row,c){
 if(!row.providerId)return;
 const api=provider(c.key),data=await api(`/posts/${encodeURIComponent(row.providerId)}`),post=d.publicPost(data.post||data);
 const change={...post,status:post.providerStatus,lastSyncAt:stamp(),updatedAt:stamp()};
  if(['published','partial'].includes(post.providerStatus))try{change.analytics=d.analytics(await api(`/analytics?postId=${encodeURIComponent(row.providerId)}`));change.analyticsAt=stamp();change.analyticsError=null;}catch{change.analyticsError='A statisztikák jelenleg nem érhetők el; a korábbi értékek megmaradtak.';}
 await ref.update(change);
}
async function dispatch(request){
 if(request.auth?.token?.admin!==true)throw new HttpsError('permission-denied','Adminjogosultság szükséges.');
 const raw=request.data||{},uid=request.auth.uid;
 if(raw.action==='status'){
  const c=(await configRef.get()).data(),snap=await db.collection('social_posts').orderBy('createdAt','desc').limit(60).get();
  let rows=[],connectionError=null;
  if(c?.key)try{rows=safeAccounts(await accounts(c));}catch(error){connectionError=error.message;}
  return {configured:Boolean(c?.key),profileId:c?.profileId||null,accounts:rows,connectionError,posts:snap.docs.map(s=>{const p=s.data();return {id:s.id,title:p.metadata.title,description:p.metadata.description,hashtags:p.metadata.hashtags,targets:p.metadata.targets,status:p.status,platforms:p.platforms||[],analytics:p.analytics||null,analyticsError:p.analyticsError||null,createdAt:p.createdAt.toDate().toISOString(),analyticsAt:p.analyticsAt?.toDate().toISOString()||null,error:p.error||null,providerId:p.providerId||null};})};
 }
 if(raw.action==='configure'){
  if(typeof raw.key!=='string'||raw.key.length<16||raw.key.length>512)d.fail('Érvényes szolgáltatói API-kulcs szükséges.');
  const profileId=d.id(raw.profileId),api=provider(raw.key.trim()),profiles=await api('/profiles');
  if(!(profiles.profiles||[]).some(p=>p._id===profileId))d.fail('Ez a profil nem tartozik a kulcshoz.');
  const current=(await configRef.get()).data();if(current?.profileId&&current.profileId!==profileId)d.fail('Másik profilra váltás előtt a meglévő közzétételeket egyeztetni kell.');
  await configRef.set({key:raw.key.trim(),profileId,updatedAt:stamp(),updatedBy:uid});return {configured:true};
 }
 const c=await config(),api=provider(c.key);
 if(raw.action==='getDraft'){
  const {ref,post}=await ownPost(raw.id);if(post.status!=='draft')d.fail('Csak tervezet szerkeszthető.');return {id:ref.id,metadata:post.metadata,video:post.asset,videoUrl:post.asset.publicUrl};
 }
 if(raw.action==='edit'){
  const metadata=d.metadata(raw.metadata),ref=db.collection('social_posts').doc(d.id(raw.id));
  await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists||snap.data().status!=='draft')d.fail('A küldés már elindult, vagy a feltöltés nem teljes. Válassz újra videót, ha a feltöltés megszakadt.');tx.update(ref,{metadata,updatedAt:stamp()});});return {id:ref.id,status:'draft'};
 }
 if(raw.action==='connect'){
  if(!d.PLATFORMS.includes(raw.platform))d.fail('Ismeretlen platform.');
  const result=await api(`/connect/${raw.platform}?profileId=${encodeURIComponent(c.profileId)}&redirect_url=${encodeURIComponent('https://ovexi.hu/admin?social=connected')}`);
  const url=new URL(result.authUrl);if(url.protocol!=='https:')d.fail('Hibás kapcsolódási URL.');return {url:url.href};
 }
 if(raw.action==='creator'){
  const rows=await accounts(c),account=rows.find(a=>a.platform==='tiktok');if(!account)d.fail('A TikTok-fiók még nincs csatlakoztatva.');
  return api(`/accounts/${encodeURIComponent(account._id)}/tiktok/creator-info?mediaType=video`);
 }
 if(raw.action==='prepare'){
  const asset=d.video(raw.video),metadata=d.metadata(raw.metadata),rows=await accounts(c);
  // Validate every chosen target before generating an upload URL.
  d.payload(metadata,{...asset,publicUrl:'https://media.zernio.com/placeholder.mp4'},rows);
  const id=crypto.randomUUID(),result=await api('/media/presign',{method:'POST',body:{filename:`ovexi-${id}.mp4`,contentType:'video/mp4',size:asset.size}});
  const publicUrl=new URL(result.publicUrl),uploadUrl=new URL(result.uploadUrl);
  if(publicUrl.protocol!=='https:'||!['media.zernio.com','media.getlate.dev'].includes(publicUrl.hostname)||uploadUrl.protocol!=='https:')d.fail('Nem ellenőrizhető szolgáltatói feltöltési cím.');
  await db.collection('social_posts').doc(id).create({metadata,asset:{...asset,publicUrl:publicUrl.href},status:'uploading',createdBy:uid,createdAt:stamp(),updatedAt:stamp(),expiresAt:new Date(Date.now()+55*60000)});
  return {id,uploadUrl:uploadUrl.href};
 }
 if(raw.action==='uploaded'){
  const {ref,post}=await ownPost(raw.id);if(post.status==='draft')return {id:ref.id,status:'draft'};
  if(post.status!=='uploading'||post.expiresAt.toMillis()<Date.now())d.fail('A feltöltés lejárt; indíts új feltöltést.');
  const response=await fetch(post.asset.publicUrl,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok||Number(response.headers.get('content-length'))!==post.asset.size||!response.headers.get('content-type')?.startsWith('video/mp4'))d.fail('A feltöltött videó mérete vagy típusa nem egyezik.');
  await db.runTransaction(async tx=>{const current=await tx.get(ref);if(current.data()?.status!=='uploading')d.fail('A feltöltés állapota közben megváltozott. Frissítsd a listát.');tx.update(ref,{status:'draft',updatedAt:stamp()});});return {id:ref.id,status:'draft'};
 }
 if(raw.action==='publish'){
  if(raw.approved!==true)d.fail('A videó és szöveg előnézetét jóvá kell hagyni.');
  const {ref,post}=await ownPost(raw.id);
  if(post.status!=='draft')return {id:ref.id,status:post.status};
  if(Date.now()-post.createdAt.toMillis()>6*86400000)d.fail('A tervezet ideiglenes videótárhelye lejárt. Válaszd ki és töltsd fel újra a videót.','failed-precondition');
  const rows=await accounts(c),body=d.payload(post.metadata,post.asset,rows);
  if(post.metadata.targets.includes('tiktok')){const a=rows.find(a=>a.platform==='tiktok');d.creatorCheck(post.metadata,post.asset,await api(`/accounts/${encodeURIComponent(a._id)}/tiktok/creator-info?mediaType=video`));}
  // Freeze payload and claim once. Unknown outcomes are never blindly retried.
  const claimed=await db.runTransaction(async tx=>{const current=await tx.get(ref);if(current.data().status!=='draft')return false;if(d.fingerprint(current.data().metadata)!==d.fingerprint(post.metadata))d.fail('A tervezet közben megváltozott. Nyisd meg újra, és ellenőrizd.');tx.update(ref,{status:'publishing',requestId:ref.id,payloadHash:d.fingerprint(body),approvedBy:uid,approvedAt:stamp(),updatedAt:stamp()});return true;});
  if(!claimed)return {id:ref.id,status:'publishing'};
  try{
   const result=await api('/posts',{method:'POST',body,requestId:ref.id}),value=d.publicPost(result.post||result.existingPost||{});
   await ref.update({...value,status:value.providerStatus,updatedAt:stamp()});return {id:ref.id,status:value.providerStatus};
  }catch(error){
   if(error.existingPostId)try{const value=d.publicPost((await api(`/posts/${encodeURIComponent(d.id(error.existingPostId))}`)).post);await ref.update({...value,status:value.providerStatus,updatedAt:stamp()});return {id:ref.id,status:value.providerStatus};}catch{}
   await ref.update({status:'needs_review',error:'A küldés eredményét a szolgáltatónál ellenőrizni kell. Nem indítunk újabb feltöltést, így elkerüljük a duplikált posztot.',updatedAt:stamp()});return {id:ref.id,status:'needs_review'};
  }
 }
 if(raw.action==='refresh'){
  const {ref,post}=await ownPost(raw.id);
  if(post.lastSyncAt&&Date.now()-post.lastSyncAt.toMillis()<60000)return {status:post.status};
  await syncPost(ref,post,c);return {refreshed:true};
 }
 d.fail('Ismeretlen művelet.');
}
exports.socialMarketing=onCall(options,async request=>{try{return await dispatch(request);}catch(error){if(error instanceof HttpsError)throw error;throw new HttpsError(['invalid-argument','failed-precondition','not-found','unavailable'].includes(error.code)?error.code:'internal',error.code?error.message:'A művelet nem sikerült. Próbáld újra később.');}});
exports.syncSocialMarketing=onSchedule({schedule:'every 60 minutes',timeoutSeconds:300,maxInstances:1},async()=>{
 const c=(await configRef.get()).data();if(!c?.key)return;
 const snap=await db.collection('social_posts').orderBy('createdAt','desc').limit(60).get();
 const deadline=Date.now()+240000,docs=[...snap.docs].sort((a,b)=>(a.data().lastSyncAt?.toMillis()||0)-(b.data().lastSyncAt?.toMillis()||0));
 for(const doc of docs){if(Date.now()>deadline)break;const row=doc.data();if(row.status==='publishing'&&!row.providerId&&Date.now()-row.updatedAt.toMillis()>10*60000){await doc.ref.update({status:'needs_review',error:'A küldés közben megszakadt a kapcsolat. Ellenőrizd a szolgáltatói naplót.'});continue;}if(!row.providerId||Date.now()-row.createdAt.toMillis()>30*86400000)continue;try{await syncPost(doc.ref,row,c);}catch{ /* Next scheduled read retries; publishing is never retried here. */ }}
});
