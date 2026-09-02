export function safeStorage(getStorage){return {get(key){try{return getStorage().getItem(key);}catch{return null;}},set(key,value){try{getStorage().setItem(key,value);return true;}catch{return false;}},remove(key){try{getStorage().removeItem(key);}catch{}}};}
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function dateLabel(value){const seconds=value?.seconds??value?._seconds;const ms=typeof seconds==='number'?seconds*1000:new Date(value).getTime();return Number.isFinite(ms)?new Date(ms).toLocaleString('hu-HU',{timeZone:'Europe/Budapest',dateStyle:'medium',timeStyle:'short'}):'—';}
export function reliableAction(store,key){
  let pending=null,busy=false;
  try{const saved=JSON.parse(store.get(key)||'null');if(saved&&/^[a-f0-9-]{36}$/i.test(saved.requestId)&&typeof saved==='object'&&!saved.token)pending=saved;}catch{}
  return {get pending(){return pending?structuredClone(pending):null;},get busy(){return busy;},
    async send(input,call){
      if(busy)throw Object.assign(Error('A mentés már folyamatban van.'),{code:'busy'});
      if(!pending){pending={...structuredClone(input),requestId:crypto.randomUUID()};store.set(key,JSON.stringify(pending));}
      busy=true;
      try{const result=await call(structuredClone(pending));if(result?.accepted!==true)throw Error('Nincs ellenőrizhető visszaigazolás.');pending=null;store.remove(key);return result;}
      catch(error){if(['functions/invalid-argument','functions/failed-precondition','functions/aborted','functions/already-exists','functions/resource-exhausted'].includes(error.code)){pending=null;store.remove(key);}throw error;}
      finally{busy=false;}
    }
  };
}
