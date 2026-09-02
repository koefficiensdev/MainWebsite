"use strict";

const crypto = require("node:crypto");
const dns = require("node:dns").promises;
const https = require("node:https");
const nodemailer = require("nodemailer");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const configured = require("./integration-config");
const domain = require("./operations-domain");
const service = require("./operations-service");
const { publicUrl, publicIp } = require("./outreach-domain");

const db = getFirestore();
const smtpPass = configured.smtpSecretConfigured ? defineSecret("SMTP_PASS") : { value:()=>"" };
const smtpSecrets = configured.smtpSecretConfigured ? [smtpPass] : [];
const cors = ["https://ovexi.hu","https://www.ovexi.hu","https://ovexi-6ef38.web.app"];
const customerCall = { cors, timeoutSeconds:30, maxInstances:2 };
const adminCall = { cors, timeoutSeconds:60, maxInstances:2 };
const admin = request => { if (request.auth?.token?.admin !== true) throw new HttpsError("permission-denied","Admin access required"); };
const validToken = value => typeof value === "string" && /^[A-Za-z0-9_-]{40,60}$/.test(value);

function transport() {
  if (process.env.SMTP_ENABLED !== "true" || !smtpPass.value()) throw new Error("SMTP_NOT_CONFIGURED");
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({ host:process.env.SMTP_HOST, port, secure:port===465, auth:{ user:process.env.SMTP_USER, pass:smtpPass.value() }, connectionTimeout:10000, greetingTimeout:10000, socketTimeout:20000 });
}
async function workflow(orderId, order) {
  const ref=db.collection("order_workflows").doc(orderId), value=domain.workflowFor(order);
  try { await ref.create({ orderId, orderNumber:order.orderNumber, companyName:order.companyName, ...value, createdAt:new Date(), updatedAt:new Date() }); }
  catch(error){ if(error.code!==6) throw error; }
}
exports.initializeOrderWorkflow = onDocumentCreated({document:"orders/{orderId}",maxInstances:2},async event=>{if(event.data)await workflow(event.params.orderId,event.data.data());});

async function sessionFor(rawToken) {
  if (!validToken(rawToken)) throw new HttpsError("unauthenticated","Invalid access link");
  const tokenHash=domain.hash(rawToken), snap=await db.collection("customer_sessions").where("tokenHash","==",tokenHash).limit(1).get();
  if(snap.empty) throw new HttpsError("unauthenticated","Invalid access link");
  const session=snap.docs[0].data(), expires=session.expiresAt?.toMillis?.()||new Date(session.expiresAt).getTime();
  if(session.revokedAt||!Number.isFinite(expires)||expires<=Date.now()) throw new HttpsError("unauthenticated","Expired access link");
  return { ...session, ref:snap.docs[0].ref };
}
exports.requestCustomerAccess = onCall({ ...customerCall, secrets:smtpSecrets },async request=>{
  let input;try{input=domain.accessInput(request.data);}catch{throw new HttpsError("invalid-argument","Invalid access request");}
  const now=new Date(),window=Math.floor(now.getTime()/3600000),ip=String(request.rawRequest?.ip||"unknown"),limitRefs=[
    db.collection("customer_access_limits").doc(domain.hash(`ip:${ip}:${window}`)),
    db.collection("customer_access_limits").doc(domain.hash(`email:${input.email}:${window}`)),
    db.collection("customer_access_limits").doc(`global-${window}`)
  ];
  await db.runTransaction(async tx=>{const docs=await Promise.all(limitRefs.map(ref=>tx.get(ref)));if(docs.some((s,i)=>Number(s.data()?.count||0)>=(i===2?100:3)))throw new HttpsError("resource-exhausted","Too many requests");docs.forEach((s,i)=>tx.set(limitRefs[i],{count:Number(s.data()?.count||0)+1,expiresAt:new Date(now.getTime()+86400000)}));});
  const orders=await db.collection("orders").where("orderNumber","==",input.orderNumber).limit(1).get();
  const orderDoc=orders.docs[0],order=orderDoc?.data();
  if(!order||String(order.email||"").trim().toLowerCase()!==input.email)return {accepted:true};
  const raw=domain.token(),sessionRef=db.collection("customer_sessions").doc();
  await sessionRef.set({tokenHash:domain.hash(raw),orderId:orderDoc.id,emailHash:domain.hash(input.email),createdAt:now,expiresAt:new Date(now.getTime()+86400000),lastUsedAt:now});
  try{
    await transport().sendMail({from:process.env.EMAIL_FROM||`OVEXI <${process.env.SMTP_USER}>`,to:order.email,replyTo:process.env.ADMIN_EMAIL||"info@ovexi.hu",subject:`Belépés az OVEXI ügyféltérbe – ${order.orderNumber}`,text:`Szia ${order.contactName}!\n\nEzen a linken 24 órán át érheted el a rendelésed állapotát és küldhetsz kérést:\nhttps://ovexi.hu/ugyfelter#token=${encodeURIComponent(raw)}\n\nHa nem te kérted, hagyd figyelmen kívül ezt a levelet.\n\nOVEXI · info@ovexi.hu`,messageId:`<customer-access-${sessionRef.id}@ovexi.hu>`});
    await sessionRef.update({emailStatus:"sent",sentAt:new Date()});
  }catch{await sessionRef.update({emailStatus:"send_unknown",updatedAt:new Date()});throw new HttpsError("unavailable","Access email unavailable");}
  return {accepted:true};
});

exports.getCustomerWorkspace = onCall(customerCall,async request=>{
  const session=await sessionFor(request.data?.token),orderSnap=await db.collection("orders").doc(session.orderId).get();
  if(!orderSnap.exists)throw new HttpsError("not-found","Order missing");
  const order=orderSnap.data(),[flowSnap,requestSnap,maintenanceSnap]=await Promise.all([
    db.collection("order_workflows").doc(session.orderId).get(),
    db.collection("customer_requests").where("orderId","==",session.orderId).orderBy("createdAt","desc").limit(21).get(),
    db.collection("maintenance_sites").where("orderId","==",session.orderId).limit(20).get()
  ]);
  const flow=flowSnap.data()||domain.workflowFor(order),requests=requestSnap.docs.map(x=>x.data()).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)).slice(0,20);
  const lastUsed=session.lastUsedAt?.toMillis?.()||new Date(session.lastUsedAt).getTime();if(!Number.isFinite(lastUsed)||Date.now()-lastUsed>15*60000)await session.ref.update({lastUsedAt:new Date()}).catch(()=>{});
  const maintenance=maintenanceSnap.docs.map(x=>x.data()),active=maintenance.filter(x=>x.status==="active");
  return {companyName:String(order.companyName||"").slice(0,120),orderNumber:order.orderNumber,createdAt:order.createdAt,
    brief:Object.fromEntries(["businessDescription","targetAudience","currentUrl","notes"].map(key=>[key,String(order[key]||"")])),briefRevision:Number(order.briefRevision||0),
    canEditBrief:!["completed","cancelled"].includes(order.status),missing:domain.workflowFor(order).missing,hasMoreRequests:requestSnap.size>20,
    preview:flow.preview?{title:flow.preview.title,url:flow.preview.url,note:flow.preview.note,version:flow.preview.version,publishedAt:flow.preview.publishedAt,decision:flow.preview.decision}:null,
    delivery:flow.delivery?{files:flow.delivery.files,instructions:flow.delivery.instructions,publishedAt:flow.delivery.publishedAt}:null,
    orderStatusLabel:domain.ORDER_LABELS[order.status]||"Feldolgozás alatt",paymentStatusLabel:order.paymentStatus==="paid"?"Fizetve":"Nincs visszaigazolt fizetés",
    maintenanceLabel:active.length?`${active.length} aktív ellenőrzés`:maintenance.length?"Szüneteltetve":"Nincs aktiválva",stageLabel:domain.stageLabels[flow.stage]||"Feldolgozás alatt",
    steps:(flow.steps||[]).slice(0,20).map(x=>({label:String(x.label||"").slice(0,120),note:String(x.note||"").slice(0,240),done:x.done===true})),nextAction:String(flow.nextAction||"").slice(0,500),
    maintenance:maintenance.map(x=>({label:String(x.label||"").slice(0,120),status:x.status==="active"?"Aktív":"Szüneteltetve",healthStatus:x.healthStatus==="online"?"Elérhető":x.healthStatus==="down"?"Hibát jelez":x.healthStatus==="warning"?"Ellenőrzendő":"Még nincs mérés",lastCheck:x.lastCheck?{ok:x.lastCheck.ok===true,httpStatus:Number(x.lastCheck.httpStatus||0),latencyMs:Number(x.lastCheck.latencyMs||0),checkedAt:x.lastCheck.checkedAt}:null})),
    requests:requests.map(x=>({kindLabel:domain.REQUEST_KINDS[x.kind]||"Kérés",message:String(x.message||"").slice(0,1500),reply:String(x.reply||"").slice(0,1500),resolvedAt:x.resolvedAt||null,statusLabel:x.status==="resolved"?"Lezárva":"Rögzítve",createdAt:x.createdAt}))};
});

// Session-scoped operations: an order ID supplied by a customer is never trusted.
function operationError(error) {
  if (error instanceof HttpsError) return error;
  const codes = ["invalid-argument","already-exists","aborted","failed-precondition","not-found","resource-exhausted"];
  if (codes.includes(error.code)) return new HttpsError(error.code,error.message);
  if (/^INVALID_|^UNSAFE_|^PRIVATE_|^URL_|^TEXT_/.test(error.message)) return new HttpsError("invalid-argument","Ellenőrizd a mezőket és a HTTPS hivatkozásokat.");
  console.error("Workspace operation failed",{code:error.code||"unknown"});
  return new HttpsError("internal","A művelet eredménye nem ellenőrizhető. Ugyanazt a kérést próbáld újra.");
}
function workspaceEndpoint(method,isCustomer=false) {
  return onCall(isCustomer?customerCall:adminCall,async request=>{
    if(Buffer.byteLength(JSON.stringify(request.data||{}))>24000)throw new HttpsError("invalid-argument","Túl nagy kérés.");
    try {
      if(isCustomer){const session=await sessionFor(request.data?.token);const {token,...input}=request.data;return await service[method](db,{...input,orderId:session.orderId});}
      admin(request);return await service[method](db,request.data,request.auth.uid);
    }catch(error){throw operationError(error);}
  });
}
exports.submitCustomerRequest=workspaceEndpoint("submitRequest",true);
exports.submitCustomerBrief=workspaceEndpoint("submitBrief",true);
exports.decideCustomerPreview=workspaceEndpoint("decidePreview",true);
exports.updateOrderWorkflow=workspaceEndpoint("updateWorkflow");
exports.saveOrderPreview=workspaceEndpoint("savePreview");
exports.publishOrderDelivery=workspaceEndpoint("publishDelivery");
exports.resolveCustomerRequest=workspaceEndpoint("resolveRequest");
exports.backfillOrderWorkflows=onCall(adminCall,async request=>{
  admin(request);
  const cursor=String(request.data?.cursor||"");
  if(cursor&&!/^[a-f0-9]{64}$/.test(cursor))throw new HttpsError("invalid-argument","Invalid cursor");
  let query=db.collection("orders").orderBy("__name__").limit(101);
  if(cursor)query=query.startAfter(cursor);
  const snap=await query.get();const orders=snap.docs.slice(0,100);let created=0;
  for(const order of orders){const ref=db.collection("order_workflows").doc(order.id);if(!(await ref.get()).exists){await workflow(order.id,order.data());created++;}}
  return {created,checked:orders.length,nextCursor:snap.size>100?orders.at(-1).id:null};
});

exports.queueCustomerNotification = onCall(adminCall,async request=>{
  admin(request);let input;try{input=domain.notificationInput(request.data);}catch{throw new HttpsError("invalid-argument","Invalid notification");}
  const order=await db.collection("orders").doc(input.orderId).get();if(!order.exists)throw new HttpsError("not-found","Order missing");
  const flow=(await db.collection("order_workflows").doc(input.orderId).get()).data();
  if(input.type==="preview_ready"&&!flow?.preview)throw new HttpsError("failed-precondition","Előbb tedd elérhetővé az előnézetet.");
  if(input.type==="work_completed"&&(!flow?.delivery||flow.stage!=="completed"))throw new HttpsError("failed-precondition","Előbb fejezd be az átadást.");
  const id=domain.hash(`${input.orderId}:${input.type}:${String(request.data?.requestId||crypto.randomUUID())}`),ref=db.collection("customer_notifications").doc(id);
  await ref.create({...input,status:"pending",attempts:0,nextAttemptAt:new Date(),createdAt:new Date(),updatedAt:new Date(),createdBy:request.auth.uid});return {queued:true,id};
});

exports.createMaintenanceSite = onCall(adminCall,async request=>{admin(request);let input;try{input=domain.maintenanceInput(request.data);}catch{throw new HttpsError("invalid-argument","Invalid maintenance site");}const ref=db.collection("maintenance_sites").doc();await ref.set({...input,status:"active",frequencyHours:24,nextCheckAt:new Date(),lastChecks:[],createdAt:new Date(),updatedAt:new Date(),createdBy:request.auth.uid});return {id:ref.id};});
exports.setMaintenanceStatus = onCall(adminCall,async request=>{admin(request);const id=String(request.data?.siteId||""),status=String(request.data?.status||"");if(!/^[A-Za-z0-9_-]{1,100}$/.test(id)||!["active","paused"].includes(status))throw new HttpsError("invalid-argument","Invalid maintenance update");await db.collection("maintenance_sites").doc(id).update({status,nextCheckAt:status==="active"?new Date():new Date(Date.now()+365*86400000),updatedAt:new Date()});return {updated:true};});

async function checkSite(ref,value){
  const claimed=await db.runTransaction(async tx=>{const row=(await tx.get(ref)).data();if(!row||row.checkLeaseUntil?.toMillis?.()>Date.now())return false;tx.update(ref,{checkLeaseUntil:new Date(Date.now()+45000)});return true;});
  if(!claimed)return {busy:true};
  const result=await require('./site-monitor').probe(value.url);
  await db.runTransaction(async tx=>{
    const current=(await tx.get(ref)).data();
    const failureCount=result.ok?0:Number(current.consecutiveFailures||0)+1;
    const healthStatus=result.ok?'online':failureCount>=2?'down':'warning';
    const revision=Number(current.checkRevision||0)+1;
    tx.update(ref,{lastCheck:result,lastChecks:[result,...(current.lastChecks||[])].slice(0,30),consecutiveFailures:failureCount,healthStatus,checkRevision:revision,checkLeaseUntil:new Date(0),nextCheckAt:new Date(Date.now()+Number(current.frequencyHours||24)*3600000),updatedAt:new Date()});
    if(healthStatus!==current.healthStatus&&(healthStatus!=='online'||['warning','down'].includes(current.healthStatus))){
      tx.create(db.collection('internal_alerts').doc(domain.hash(ref.id+':'+revision)),{title:healthStatus==='online'?'Weboldal helyreállt':'Weboldal ellenőrzést igényel',message:String(current.label)+' · '+current.url+' · HTTP '+result.httpStatus+' · '+result.errorCode,status:'pending',attempts:0,nextAttemptAt:new Date(),createdAt:new Date(),updatedAt:new Date()});
    }
  });return result;
}
exports.runMaintenanceCheck = onCall({ ...adminCall, timeoutSeconds:60 },async request=>{admin(request);const id=String(request.data?.siteId||"");if(!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw new HttpsError("invalid-argument","Invalid site");const ref=db.collection("maintenance_sites").doc(id),snap=await ref.get();if(!snap.exists)throw new HttpsError("not-found","Site missing");return checkSite(ref,snap.data());});
exports.scheduledMaintenanceChecks = onSchedule({schedule:"every 6 hours",timeoutSeconds:300,maxInstances:1},async()=>{const snap=await db.collection("maintenance_sites").where("status","==","active").where("nextCheckAt","<=",new Date()).orderBy("nextCheckAt").limit(10).get();for(const site of snap.docs)await checkSite(site.ref,site.data());});

exports.operationsHealth = onSchedule({schedule:"every 60 minutes",timeoutSeconds:120,maxInstances:1},async()=>{
  const healthRef=db.collection("operations_health").doc("current"),previous=await healthRef.get();let backfilled=0;
  let backfillComplete=previous.data()?.workflowBackfillComplete===true,cursor=previous.data()?.workflowBackfillCursor||'';
  if(!backfillComplete){let query=db.collection('orders').orderBy('__name__').limit(101);if(cursor)query=query.startAfter(cursor);const orders=await query.get();for(const order of orders.docs.slice(0,100)){await workflow(order.id,order.data());backfilled++;cursor=order.id;}backfillComplete=orders.size<=100;}
  const [tasks,flows,sites]=await Promise.all([db.collection("commerce_tasks").where("status","in",["blocked","needs_review","retry"]).limit(100).get(),db.collection("order_workflows").where("attentionRequired","==",true).limit(100).get(),db.collection("maintenance_sites").where("healthStatus","in",["warning","down"]).limit(100).get()]);
  const signature=domain.hash(JSON.stringify({tasks:tasks.docs.map(s=>s.id+':'+s.data().status+':'+s.data().errorCode).sort(),flows:flows.docs.map(s=>s.id).sort(),sites:sites.docs.map(s=>s.id+':'+s.data().healthStatus).sort()}));
  if(signature!==previous.data()?.alertSignature&&(tasks.size||sites.size||previous.data()?.status==='attention')){
    const ref=db.collection('internal_alerts').doc(domain.hash('health:'+signature+':'+new Date().toISOString().slice(0,10)));
    try{await ref.create({title:'Üzemeltetési összesítés',message:'Ellenőrizendő feladatok: '+tasks.size+'; ügyfélmunkák: '+flows.size+'; weboldaljelzések: '+sites.size+'. Részletek az adminfelületen.',status:'pending',attempts:0,nextAttemptAt:new Date(),createdAt:new Date(),updatedAt:new Date()});}catch(error){if(error.code!==6)throw error;}
  }
  const now=new Date();await healthRef.set({taskAlerts:tasks.size,customerRequests:flows.size,maintenanceAlerts:sites.size,status:tasks.size||flows.size||sites.size?"attention":"healthy",checkedAt:now,updatedAt:now,createdAt:previous.data()?.createdAt||now,workflowBackfillComplete:backfillComplete,workflowBackfillCursor:cursor,workflowBackfilled:backfilled,alertSignature:signature});
});
