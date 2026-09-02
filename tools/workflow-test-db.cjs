"use strict";
// Atomic local test double. Transactions serialize and forbid reads after writes.
module.exports=function memoryDb(){
  const records=new Map();let queue=Promise.resolve();
  const snapshot=ref=>({id:ref.id,ref,exists:records.has(ref.path),data:()=>structuredClone(records.get(ref.path))});
  function doc(path){return {path,id:path.split('/').at(-1),collection:name=>collection(`${path}/${name}`),get:async()=>snapshot(doc(path)),set:async value=>records.set(path,structuredClone(value)),update:async value=>records.set(path,{...structuredClone(records.get(path)),...structuredClone(value)})};}
  function collection(path,filters=[]){return {path,limit:()=>collection(path,filters),doc:id=>doc(`${path}/${id}`),where:(field,op,value)=>{if(op!=='==')throw Error('Unsupported query');return collection(path,[...filters,[field,value]]);},get:async()=>query(path,filters),filters};}
  function query(path,filters){const docs=[...records.keys()].filter(key=>key.startsWith(path+'/')&&key.split('/').length===path.split('/').length+1).map(key=>snapshot(doc(key))).filter(s=>filters.every(([field,value])=>s.data()[field]===value));return {docs,size:docs.length,empty:!docs.length};}
  return {records,collection,async runTransaction(fn){
    let release;const prior=queue;queue=new Promise(resolve=>{release=resolve;});await prior;const writes=[];
    try{const result=await fn({get:async ref=>{if(writes.length)throw Error('Read after write');return ref.filters?query(ref.path,ref.filters):snapshot(ref);},create:(ref,value)=>writes.push(['create',ref,value]),set:(ref,value,options)=>writes.push([options?.merge?'merge':'set',ref,value]),update:(ref,value)=>writes.push(['update',ref,value])});
      const next=new Map(records);for(const [kind,ref,value] of writes){if(kind==='create'&&next.has(ref.path))throw Object.assign(Error('Already exists'),{code:6});if(kind==='update'&&!next.has(ref.path))throw Error('Missing document');next.set(ref.path,structuredClone(['update','merge'].includes(kind)?{...next.get(ref.path),...value}:value));}records.clear();for(const [key,value] of next)records.set(key,value);return result;
    }finally{release();}
  }};
};
