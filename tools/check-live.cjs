"use strict";
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function main(){
  const files={'/admin':'pages/admin.html','/foglalas':'pages/foglalas.html','/cookie-policy':'pages/cookie-policy.html','/js/admin.js':'js/admin.js','/js/admin-model.js':'js/admin-model.js','/js/production-ui.js':'js/production-ui.js','/js/booking-settings-ui.js':'js/booking-settings-ui.js','/js/artifact-download.js':'js/artifact-download.js','/js/booking-ui.js':'js/booking-ui.js','/js/booking-api.js':'js/booking-api.js'};
  const assets=await Promise.all(Object.entries(files).map(async([url,file])=>{const r=await fetch('https://ovexi.hu'+url,{signal:AbortSignal.timeout(30000)});return {path:url,status:r.status,sha256Matches:digest(new Uint8Array(await r.arrayBuffer()))===digest(fs.readFileSync(path.join(root,file)))};}));
  const denied=await Promise.all(['generateProductionArtifacts','generateProductionCopy','revokeProductionPreview','bookingAdminSaveTenant','retryNotification','bookingCreate'].map(async name=>{const r=await fetch('https://europe-west1-ovexi-6ef38.cloudfunctions.net/'+name,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({data:{}}),signal:AbortSignal.timeout(30000)});return {name,status:r.status,denied:[401,403].includes(r.status)};}));
  const privatePaths=await Promise.all(['/ops/readiness.json','/functions/integration-config.js','/tools/backup.cjs'].map(async url=>{const r=await fetch('https://ovexi.hu'+url,{signal:AbortSignal.timeout(15000)});return {path:url,status:r.status,denied:r.status===404};}));
  const preview=await fetch('https://europe-west1-ovexi-6ef38.cloudfunctions.net/productionPreview',{signal:AbortSignal.timeout(30000)});
  const result={checkedAt:new Date().toISOString(),assets,denied,privatePaths,invalidPreviewStatus:preview.status};
  fs.mkdirSync(path.join(root,'ops'),{recursive:true});fs.writeFileSync(path.join(root,'ops/live-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  if(assets.some(x=>x.status!==200||!x.sha256Matches)||denied.some(x=>!x.denied)||privatePaths.some(x=>!x.denied)||preview.status!==404)process.exitCode=1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
