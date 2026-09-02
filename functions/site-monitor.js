"use strict";
const https=require('node:https'),dns=require('node:dns').promises;
const {publicUrl,publicIp}=require('./outreach-domain');
function classify(status,validTo,now=Date.now()) {
  const expiry=Date.parse(validTo||'');
  const errorCode=status>=500?'server_error':status>=400?'http_client_error':status>=300?'redirect_unresolved':status<200?'invalid_response':Number.isFinite(expiry)&&expiry-now<14*86400000?'certificate_expiring':'';
  return {ok:!errorCode,httpStatus:status,errorCode,certificateValidTo:validTo||''};
}
async function request(url) {
  const addresses=await dns.lookup(url.hostname,{all:true,verbatim:true});
  if(!addresses.length||addresses.some(a=>!publicIp(a.address)))throw Error('PRIVATE_OR_MISSING_DNS');
  const selected=addresses[0];
  return new Promise((resolve,reject)=>{
    const req=https.get(url,{headers:{'user-agent':'OVEXI-Monitor/2.0','accept-encoding':'identity'},lookup:(_host,opts,cb)=>opts?.all?cb(null,[selected]):cb(null,selected.address,selected.family)},res=>{
      const result={status:res.statusCode||0,location:res.headers.location,validTo:res.socket.getPeerCertificate?.().valid_to||''};
      res.destroy();resolve(result);
    });
    const timer=setTimeout(()=>req.destroy(Error('TIMEOUT')),8000);req.on('close',()=>clearTimeout(timer));req.on('error',reject);
  });
}
async function probe(raw,fetch=request,now=Date.now) {
  const start=now();let url,redirects=0;
  try {
    url=publicUrl(raw);
    while(true){const response=await fetch(url);if([301,302,303,307,308].includes(response.status)&&response.location){if(redirects++>=3)throw Error('TOO_MANY_REDIRECTS');url=publicUrl(new URL(response.location,url).href);continue;}
      return {...classify(response.status,response.validTo,now()),finalUrl:url.href,redirects,latencyMs:now()-start,checkedAt:new Date(now())};}
  }catch(error){return {ok:false,httpStatus:0,latencyMs:now()-start,checkedAt:new Date(now()),errorCode:/^[A-Z_]+$/.test(error.message)?error.message:'connection_failed'};}
}
module.exports={classify,probe};
