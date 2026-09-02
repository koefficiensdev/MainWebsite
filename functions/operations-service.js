"use strict";

const d = require("./operations-domain");
const fail = (code,message) => { throw Object.assign(new Error(message), {code}); };
const editable = order => { if (["cancelled","completed"].includes(order.status)) fail("failed-precondition","A lezárt vagy lemondott igény nem módosítható."); };

// The operation receipt and all state changes commit together. Replays return
// the original result even after later edits; changed payloads cannot reuse an ID.
async function mutate(db, raw, actor, action, apply) {
  const {orderId,requestId} = d.mutationInput(raw);
  const orderRef=db.collection("orders").doc(orderId), flowRef=db.collection("order_workflows").doc(orderId);
  const receiptRef=flowRef.collection("operations").doc(requestId);
  const fingerprint=d.hash(JSON.stringify({action,actor,raw}));
  return db.runTransaction(async tx=>{
    const [receipt,orderSnap,flowSnap]=await Promise.all([tx.get(receiptRef),tx.get(orderRef),tx.get(flowRef)]);
    if(receipt.exists){if(receipt.data().fingerprint!==fingerprint)fail("already-exists","Ezzel az azonosítóval más tartalom került mentésre.");return receipt.data().result;}
    if(!orderSnap.exists)fail("not-found","Az igény nem található.");
    const order=orderSnap.data(),flow={...d.workflowFor(order),...flowSnap.data()},now=new Date();
    if(actor==="admin" && d.revisionInput(raw)!==flow.revision)fail("aborted","A munka közben megváltozott. Frissítsd az adatokat.");
    const mutationWindow=Math.floor(now.getTime()/3600000),mutationCount=flow.mutationWindow===mutationWindow?Number(flow.mutationCount||0):0;
    if(actor==="customer"&&mutationCount>=40)fail("resource-exhausted","Túl sok módosítás. Próbáld később.");
    const result=await apply({tx,order,flow,now,orderRef,flowRef});
    if(actor==="customer")tx.update(flowRef,{mutationWindow,mutationCount:mutationCount+1});
    tx.create(receiptRef,{action,actor,fingerprint,result,createdAt:now});
    return result;
  });
}
function saveFlow(tx,ref,flow,patch,now,order){
  tx.set(ref,{...flow,orderId:ref.id,orderNumber:order.orderNumber,companyName:order.companyName,
    createdAt:flow.createdAt||now,...patch,revision:flow.revision+1,updatedAt:now});
}
function stepsFor(flow,patch){return flow.steps.map(step=>({...step,done:Object.hasOwn(patch,step.id)?patch[step.id]:step.done}));}

async function updateWorkflow(db,raw,uid){
  if(!d.WORKFLOW_STAGES.includes(raw.stage))fail("invalid-argument","Érvénytelen munkaszakasz.");
  const nextAction=String(raw.nextAction||"").trim();
  if(nextAction.length<3||nextAction.length>500)fail("invalid-argument","Add meg a következő lépést (3–500 karakter).");
  if(!Array.isArray(raw.steps)||raw.steps.length>20||raw.steps.some(x=>typeof x.done!=="boolean"))fail("invalid-argument","Érvénytelen ellenőrzőlista.");
  return mutate(db,raw,"admin","workflow",async({tx,order,flow,now,flowRef,orderRef})=>{
    const pending=await tx.get(db.collection("customer_requests").where("orderId","==",raw.orderId).where("status","==","new"));
    editable(order);
    if(raw.stage==="completed")fail("failed-precondition","Az átadást az átadási anyagok közzétételével zárd le.");
    if(raw.stage==="production"&&order.paymentStatus!=="paid")fail("failed-precondition","Fizetés előtt az Előkészítés szakasz használható.");
    if(raw.stage==="review"&&(!flow.preview||flow.preview.decision))fail("failed-precondition","Előbb tegyél közzé egy új előnézetet.");
    if(new Set(raw.steps.map(x=>x.id)).size!==raw.steps.length||raw.steps.some(x=>!flow.steps.some(s=>s.id===x.id)))fail("invalid-argument","Ismeretlen ellenőrzőpont.");
    const steps=flow.steps.map(step=>{
      const change=raw.steps.find(x=>x.id===step.id);
      if(["intake","customer-review","delivery"].includes(step.id)){
        if(change&&change.done!==step.done)fail("failed-precondition","Ezt az állapotot a rögzített esemény határozza meg.");
        return step;
      }
      return {...step,done:change?change.done:step.done};
    });
    saveFlow(tx,flowRef,flow,{steps,stage:raw.stage,stageLabel:d.stageLabels[raw.stage],nextAction,updatedBy:uid,reviewRequired:false,attentionRequired:!pending.empty},now,order);
    // Keep the commercial status conservative while payment is pending.
    if(raw.stage==="production")tx.update(orderRef,{status:"in_production",updatedAt:now});
    return {accepted:true};
  });
}
async function savePreview(db,raw,uid){
  const preview=d.previewInput(raw);
  return mutate(db,raw,"admin","preview",async({tx,order,flow,now,flowRef})=>{
    const pending=await tx.get(db.collection("customer_requests").where("orderId","==",raw.orderId).where("status","==","new"));
    editable(order);
    const value={...preview,version:Number(flow.preview?.version||0)+1,publishedAt:now,publishedBy:uid,decision:null};
    saveFlow(tx,flowRef,flow,{preview:value,stage:"review",stageLabel:d.stageLabels.review,reviewRequired:false,attentionRequired:!pending.empty,
      steps:stepsFor(flow,{"customer-review":false,"delivery":false}),nextAction:"Nézd át az előnézetet, majd hagyd jóvá vagy kérj módosítást."},now,order);
    tx.create(flowRef.collection("previews").doc(String(value.version)),value);
    return {accepted:true,version:value.version};
  });
}
async function decidePreview(db,raw){
  if(!["approved","changes_requested"].includes(raw.decision)||!Number.isSafeInteger(raw.previewVersion))fail("invalid-argument","Érvénytelen döntés.");
  const note=String(raw.note||"").trim();
  if(note.length>1500||(raw.decision==="changes_requested"&&note.length<5))fail("invalid-argument","Írd le a kért módosítást (5–1500 karakter).");
  return mutate(db,raw,"customer","decision",({tx,order,flow,now,flowRef})=>{
    editable(order);
    if(!flow.preview||flow.preview.version!==raw.previewVersion||flow.preview.decision)fail("aborted","Az előnézet vagy a döntés megváltozott. Frissítsd az oldalt.");
    const approved=raw.decision==="approved";
    tx.set(flowRef.collection("previews").doc(String(flow.preview.version)),{...flow.preview,decision:{status:raw.decision,note,decidedAt:now}});
    saveFlow(tx,flowRef,flow,{preview:{...flow.preview,decision:{status:raw.decision,note,decidedAt:now}},attentionRequired:true,reviewRequired:true,
      stage:approved?"ready":"preparation",stageLabel:d.stageLabels[approved?"ready":"preparation"],
      steps:stepsFor(flow,{"customer-review":approved}),nextAction:approved?"Az előnézetet jóváhagytad. Az OVEXI egyezteti a végleges átadás feltételeit.":"A módosítási kérést rögzítettük. Az OVEXI elkészíti a következő változatot."},now,order);
    return {accepted:true};
  });
}
async function publishDelivery(db,raw,uid){
  const delivery=d.deliveryInput(raw);
  return mutate(db,raw,"admin","delivery",async({tx,order,flow,now,flowRef,orderRef})=>{
    const pending=await tx.get(db.collection("customer_requests").where("orderId","==",raw.orderId).where("status","==","new"));
    if(!pending.empty)fail("failed-precondition","Átadás előtt válaszold meg a nyitott ügyfélkéréseket.");
    editable(order);
    if(order.paymentStatus!=="paid")fail("failed-precondition","A végleges átadáshoz igazolt fizetés szükséges. Az előnézet fizetés nélkül is használható.");
    if(flow.preview?.decision?.status!=="approved")fail("failed-precondition","A jelenlegi előnézet ügyféljóváhagyása szükséges.");
    if(flow.steps.some(s=>!["delivery","customer-review"].includes(s.id)&&!s.done))fail("failed-precondition","Előbb zárd le az előkészítési ellenőrzőpontokat.");
    saveFlow(tx,flowRef,flow,{delivery:{...delivery,previewVersion:flow.preview.version,publishedAt:now,publishedBy:uid},stage:"completed",stageLabel:d.stageLabels.completed,
      steps:stepsFor(flow,{delivery:true}),nextAction:"Az átadási anyagok és az útmutató lent elérhetők.",attentionRequired:false},now,order);
    tx.update(orderRef,{status:"completed",updatedAt:now});
    return {accepted:true};
  });
}
async function submitRequest(db,raw){
  const input=d.requestInput(raw);
  return mutate(db,raw,"customer","request",async({tx,order,flow,now,flowRef})=>{
    const window=Math.floor(now.getTime()/3600000),count=flow.requestWindow===window?Number(flow.requestCount||0):0;
    if(count>=20)fail("resource-exhausted","Túl sok kérés. Kérjük, próbáld később.");
    const id=d.hash(`${raw.orderId}:${raw.requestId}`);
    tx.create(db.collection("customer_requests").doc(id),{orderId:raw.orderId,...input,status:"new",createdAt:now,updatedAt:now});
    saveFlow(tx,flowRef,flow,{attentionRequired:true,lastCustomerRequestAt:now,requestWindow:window,requestCount:count+1},now,order);
    tx.create(db.collection("customer_notifications").doc(`request-${id}`),{orderId:raw.orderId,type:"internal_customer_request",requestId:id,status:"pending",attempts:0,nextAttemptAt:now,createdAt:now,updatedAt:now});
    return {accepted:true};
  });
}
async function submitBrief(db,raw){
  const brief=d.briefInput(raw.brief);
  return mutate(db,raw,"customer","brief",({tx,order,flow,now,flowRef,orderRef})=>{
    editable(order);
    if(raw.briefRevision!==Number(order.briefRevision||0))fail("aborted","A brief megváltozott. Töltsd újra az adatokat.");
    const missing=d.workflowFor({...order,...brief}).missing;
    // Preserve original price, contact identity, consent and submission fingerprint.
    tx.update(orderRef,{...brief,briefRevision:Number(order.briefRevision||0)+1,updatedAt:now});
    saveFlow(tx,flowRef,flow,{missing,attentionRequired:true,reviewRequired:true,nextAction:"A pontosított adatokat az OVEXI ellenőrzi.",
      stage:missing.length?"waiting_customer":"intake",stageLabel:d.stageLabels[missing.length?"waiting_customer":"intake"],
      preview:flow.preview?{...flow.preview,decision:{status:"brief_changed",note:"A brief módosult; új előnézet szükséges.",decidedAt:now}}:null,
      steps:stepsFor(flow,{"customer-review":false})},now,order);
    return {accepted:true};
  });
}
async function resolveRequest(db,raw,uid){
  const reply=String(raw.reply||"").trim();
  if(!/^[a-f0-9]{64}$/.test(raw.customerRequestId||"")||reply.length<3||reply.length>1500)fail("invalid-argument","Adj meg egy ügyfélnek látható választ (3–1500 karakter).");
  return mutate(db,raw,"admin","resolve",async({tx,order,flow,now,flowRef})=>{
    const ref=db.collection("customer_requests").doc(raw.customerRequestId),snap=await tx.get(ref);
    if(!snap.exists||snap.data().orderId!==raw.orderId)fail("not-found","A kérés nem ehhez az igényhez tartozik.");
    if(snap.data().status==="resolved")fail("aborted","A kérést már megválaszolták.");
    const requests=await tx.get(db.collection("customer_requests").where("orderId","==",raw.orderId).where("status","==","new"));
    tx.update(ref,{status:"resolved",reply,resolvedBy:uid,resolvedAt:now,updatedAt:now});
    saveFlow(tx,flowRef,flow,{attentionRequired:requests.docs.some(x=>x.id!==ref.id)||flow.reviewRequired===true},now,order);
    return {accepted:true};
  });
}
module.exports={updateWorkflow,savePreview,decidePreview,publishDelivery,submitRequest,submitBrief,resolveRequest};
