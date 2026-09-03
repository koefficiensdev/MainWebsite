import {getProduct} from './catalog.js?v=20260903-6';
export function safeStorage(getStorage){return {get(key){try{return getStorage().getItem(key);}catch{return null;}},set(key,value){try{getStorage().setItem(key,value);return true;}catch{return false;}},remove(key){try{getStorage().removeItem(key);}catch{}}};}
export function cleanCart(ids){if(!Array.isArray(ids))return [];const result=[];for(const id of ids){const product=getProduct(id);if(!product||product.availability==='retired'||result.includes(id))continue;if(['website','marketing','maintenance'].includes(product.category)){const old=result.findIndex(x=>getProduct(x).category===product.category);if(old>=0)result.splice(old,1);}result.push(id);}return result.slice(0,12);}
export function normalizeWebUrl(input){
  let value=String(input||'').trim().replace(/\\/g,'/');
  if(!value)return '';
  value=value.replace(/^(https?):\/+(?=[^/])/i,'$1://');
  if(!/^[a-z][a-z0-9+.-]*:/i.test(value))value=`https://${value}`;
  let url;try{url=new URL(value);}catch{throw Error('Érvénytelen webcím. Példa: ovexi.hu');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!url.hostname.includes('.'))throw Error('Érvénytelen webcím. Példa: ovexi.hu');
  url.hostname=url.hostname.replace(/\.$/,'');
  return url.href;
}
export function orderInput(raw){
  const out={itemIds:cleanCart(raw.itemIds)};
  if(!out.itemIds.length)throw Error('A kosár üres.');
  for(const [key,min,max,label] of [['contactName',2,80,'kapcsolattartó neve'],['companyName',2,120,'cégnév'],['email',5,160,'e-mail-cím'],['phone',0,32,'telefonszám'],['businessDescription',10,1200,'vállalkozás leírása (legalább 10 karakter)'],['primaryGoal',2,80,'elsődleges cél'],['targetAudience',0,300,'célcsoport'],['currentUrl',0,300,'webcím'],['tone',0,80,'hangnem'],['notes',0,1600,'megjegyzés']]){
    const value=String(raw[key]||'').replace(/\s+/g,' ').trim();if(value.length<min||value.length>max)throw Error(`Ellenőrizd ezt a mezőt: ${label}.`);out[key]=value;
  }
  out.email=out.email.toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))throw Error('Érvénytelen e-mail-cím.');
  out.currentUrl=normalizeWebUrl(out.currentUrl);
  if(out.itemIds.some(id=>id.startsWith('maintenance-')||['quick-audit','external-audit'].includes(id))&&!out.currentUrl)throw Error('Add meg a vizsgálandó vagy karbantartandó webcímet.');
  const hasWebsite=out.itemIds.some(id=>id.startsWith('website-'));
  const infrastructurePlan=String(raw.infrastructurePlan||'').trim();
  if(hasWebsite&&!['existing','domain_only','new','guidance'].includes(infrastructurePlan))throw Error('Válaszd ki, hogy állsz a domainnel és a tárhellyel.');
  out.infrastructurePlan=hasWebsite?infrastructurePlan:'not_applicable';
  if(raw.termsAccepted!==true||raw.operatingCostsAcknowledged!==true||raw.businessPurchaseConfirmed!==true||raw.hungarianBillingConfirmed!==true)throw Error('Fogadd el a feltételeket, és erősítsd meg az üzleti célú vásárlást, valamint a magyar számlázási címet.');
  return {...out,termsAccepted:true,operatingCostsAcknowledged:true,businessPurchaseConfirmed:true,hungarianBillingConfirmed:true,marketingConsent:raw.marketingConsent===true};
}
const PENDING='ovexi_pending_request_v1',RECEIPT='ovexi_last_receipt_v1';
export function submissionManager(store){
  let pending=null,busy=false,receipt=null;
  try{const saved=JSON.parse(store.get(PENDING)||'null');if(saved&&/^[a-f0-9-]{36}$/i.test(saved.requestId))pending={...orderInput(saved),requestId:saved.requestId};}catch{}
  try{const saved=JSON.parse(store.get(RECEIPT)||'null');if(saved&&/^OVX-[A-Z0-9-]{5,80}$/.test(saved.orderNumber))receipt={orderNumber:saved.orderNumber,emailQueued:saved.emailQueued===true};}catch{}
  return {
    get pending(){return pending?structuredClone(pending):null;},get busy(){return busy;},get receipt(){return receipt;},
    async send(raw,send){
      if(busy)throw Object.assign(Error('A beküldés már folyamatban van.'),{code:'busy'});
      if(!pending){pending={...orderInput(raw),requestId:crypto.randomUUID()};store.set(PENDING,JSON.stringify(pending));}
      busy=true;
      try{
        const result=await send(structuredClone(pending));
        if(!result||!/^OVX-[A-Z0-9-]{5,80}$/.test(result.orderNumber||''))throw Error('A szerver visszaigazolása nem ellenőrizhető.');
        // The server acknowledgment is authoritative. Storage failure must never
        // turn an accepted order into a failed submission or a new request.
        receipt={orderNumber:result.orderNumber,emailQueued:result.emailQueued===true};pending=null;
        store.remove(PENDING);store.set(RECEIPT,JSON.stringify(receipt));return result;
      }catch(error){
        // These server errors are guaranteed to happen before order creation.
        if(['functions/invalid-argument','functions/resource-exhausted'].includes(error.code)){pending=null;store.remove(PENDING);}
        throw error;
      }finally{busy=false;}
    }
  };
}
