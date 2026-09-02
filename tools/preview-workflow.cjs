"use strict";
// Local integration fixture: actual frontend + workflow service, fictional data.
// No cloud connection, SMTP, Stripe or Billingo. Bound to loopback only.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const db=require('./workflow-test-db.cjs')(),d=require('../functions/operations-domain'),service=require('../functions/operations-service');
const id='a'.repeat(64),paidId='b'.repeat(64),token='local-fictional-customer-token',root=path.resolve(__dirname,'..');
db.records.set('booking_tenants/local-demo',{enabled:true,ownerUid:'local-admin',businessName:'Kitalált Szolgáltató',contactEmail:'test@example.invalid',privacyVersion:'test',privacyUrl:'https://example.com/privacy',timeZone:'Europe/Budapest',notificationEmailEnabled:true,services:[{id:'consultation',name:'Konzultáció',durationMinutes:30,priceHuf:6000,active:true}],weeklyHours:Object.fromEntries(Array.from({length:7},(_,i)=>[i,[['09:00','17:00']]])),minNoticeMinutes:0});
const order={orderNumber:'OVX-LOCAL1234',companyName:'Teszt Műhely — kitalált adat',contactName:'Teszt Ügyfél',email:'test@example.invalid',businessDescription:'Kitalált autószerviz a helyi felületpróbához.',targetAudience:'Helyi autósok',currentUrl:'',notes:'',itemIds:['website-onepage'],itemNames:['Weboldal'],status:'needs_review',createdAt:new Date(),updatedAt:new Date(),onceTotal:39990,monthlyTotal:0};
db.records.set(`orders/${id}`,order);db.records.set(`order_workflows/${id}`,{...d.workflowFor(order),orderId:id,orderNumber:order.orderNumber,companyName:order.companyName,createdAt:new Date(),updatedAt:new Date()});
const paidOrder={...order,orderNumber:'OVX-LOCALPAID',companyName:'Fizetett tesztmunka — kitalált adat',status:'paid',paymentStatus:'paid'};
db.records.set(`orders/${paidId}`,paidOrder);db.records.set(`order_workflows/${paidId}`,{...d.workflowFor(paidOrder),orderId:paidId,orderNumber:paidOrder.orderNumber,companyName:paidOrder.companyName,createdAt:new Date(),updatedAt:new Date()});
const sdk=`const request=async(name,data)=>{const r=await fetch('/fixture-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,data})});const v=await r.json();if(!r.ok)throw Object.assign(Error(v.message),{code:'functions/'+v.code});return v;};
export const initializeApp=()=>({}),getFunctions=()=>({}),httpsCallable=(_,name)=>async data=>({data:await request(name,data)});
const user={uid:'local-admin',email:'local@example.invalid',getIdTokenResult:async()=>({claims:{admin:true}})};
export const getAuth=()=>({currentUser:user,authStateReady:async()=>{}}),onAuthStateChanged=(_,cb)=>setTimeout(()=>cb(user),0),signOut=async()=>{},signInWithEmailAndPassword=async()=>{};
export const signInAnonymously=async()=>{},initializeAppCheck=()=>{},ReCaptchaV3Provider=class {};
export const getFirestore=()=>({}),collection=(_,name)=>({name}),doc=(_,name,id)=>({name,id}),query=(value,...args)=>value,orderBy=()=>null,limit=()=>null,startAfter=()=>null,serverTimestamp=()=>new Date();
export const getDocs=async value=>{const rows=await request('list',{collection:value.name});return {docs:rows.map(r=>({id:r.id,data:()=>r}))};};
export const addDoc=async()=>{throw Error('Fixture does not support this action');},updateDoc=async()=>{throw Error('Use the workflow form');};`;
function rows(collection){return [...db.records.entries()].filter(([key])=>key.startsWith(collection+'/')&&key.split('/').length===2).map(([key,value])=>({...value,id:key.split('/')[1]}));}
async function api(name,data){
  if(name==='generateProductionArtifacts'){const result=await require('../functions/production-service').generate(db,data,'local-admin');const row=db.records.get('production_jobs/'+result.id);row.previewUrl='http://127.0.0.1:8879/fixture-preview?job='+result.id;row.marketingUrl=row.previewUrl+'&file=marketing.html';return {...result,previewUrl:row.previewUrl,marketingUrl:row.marketingUrl};}
  const bookingMethods={bookingPublicConfig:'publicConfig',bookingAvailability:'availability',bookingCreate:'createBooking',bookingCancel:'cancelBooking',bookingOwnerDay:'ownerDay',bookingOwnerMove:'ownerMove',bookingOwnerStatus:'ownerStatus',bookingOwnerMoveSlots:'ownerMoveSlots'};
  if(bookingMethods[name])return require('../functions/booking-service')[bookingMethods[name]](db,data,...(name.startsWith('bookingOwner')?['local-admin']:[]));
  if(name==='list')return rows(data.collection);
  if(name==='requestCustomerAccess')return {accepted:true};
  if(name==='backfillOrderWorkflows')return {created:0,nextCursor:null};
  if(name==='getCustomerWorkspace'){
    const current=data.token===token+'-paid'?paidId:id;
    if(![token,token+'-paid'].includes(data.token))throw Object.assign(Error('Invalid fixture token'),{code:'unauthenticated'});
    const o=db.records.get(`orders/${current}`),f=db.records.get(`order_workflows/${current}`);
    return {companyName:o.companyName,orderNumber:o.orderNumber,createdAt:o.createdAt,orderStatusLabel:d.ORDER_LABELS[o.status],paymentStatusLabel:o.paymentStatus==='paid'?'Fizetve':'Nincs visszaigazolt fizetés',maintenanceLabel:'Nincs aktiválva',stageLabel:d.stageLabels[f.stage],steps:f.steps,nextAction:f.nextAction,missing:f.missing,preview:f.preview||null,delivery:f.delivery||null,maintenance:[],brief:{businessDescription:o.businessDescription,targetAudience:o.targetAudience,currentUrl:o.currentUrl,notes:o.notes},briefRevision:o.briefRevision||0,canEditBrief:o.status!=='completed',requests:rows('customer_requests').filter(r=>r.orderId===current).map(r=>({...r,kindLabel:d.REQUEST_KINDS[r.kind],statusLabel:r.status==='resolved'?'Lezárva':'Rögzítve'}))};
  }
  const methods={updateOrderWorkflow:'updateWorkflow',saveOrderPreview:'savePreview',publishOrderDelivery:'publishDelivery',resolveCustomerRequest:'resolveRequest',submitCustomerRequest:'submitRequest',submitCustomerBrief:'submitBrief',decideCustomerPreview:'decidePreview'};
  if(methods[name]){const {token:t,...input}=data;if(['submitCustomerRequest','submitCustomerBrief','decideCustomerPreview'].includes(name)){if(![token,token+'-paid'].includes(t))throw Object.assign(Error('Invalid fixture token'),{code:'unauthenticated'});input.orderId=t===token+'-paid'?paidId:id;}return service[methods[name]](db,input,'local-admin');}
  throw Object.assign(Error('This local fixture cannot send email or charge money.'),{code:'failed-precondition'});
}
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');res.setHeader('Cache-Control','no-store');
  if(url.pathname.startsWith('/sample/')){const name=url.pathname.slice(8);if(!/^[\w.-]+$/.test(name))return res.end();const file=path.join(root,'ops/production-sample',name);if(!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',name.endsWith('.svg')?'image/svg+xml':name.endsWith('.html')?'text/html':'text/plain');return res.end(fs.readFileSync(file));}
  if(url.pathname==='/fixture-preview'){const row=db.records.get('production_jobs/'+url.searchParams.get('job'));const file=url.searchParams.get('file')||'index.html';res.setHeader('Content-Type','text/html');return res.end(row?.files?.[file]||'Missing preview');}
  if(url.pathname==='/js/booking-config.js'){res.setHeader('Content-Type','text/javascript');return res.end('export const BOOKING_CONFIG={liveEnabled:true,appCheckSiteKey:"local-fixture"};');}
  if(url.pathname==='/fixture-sdk.js'){res.setHeader('Content-Type','text/javascript');return res.end(sdk);}
  if(url.pathname==='/fixture-api'&&req.method==='POST'){let text='';for await(const part of req){text+=part;if(text.length>50000){res.writeHead(413);return res.end();}}try{const {name,data}=JSON.parse(text);res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(await api(name,data)));}catch(error){res.writeHead(400,{'Content-Type':'application/json'});return res.end(JSON.stringify({code:error.code||'invalid-argument',message:error.message}));}}
  const mapped={'/':'index.html','/admin':'pages/admin.html','/ugyfelter':'pages/ugyfelter.html','/foglalas':'pages/foglalas.html'}[url.pathname]||url.pathname.slice(1);
  if(!['index.html','pages/admin.html','pages/ugyfelter.html','pages/foglalas.html'].includes(mapped)&&! /^(js|css|assets\/images)\/[\w.-]+$/.test(mapped)){res.writeHead(404);return res.end();}
  const file=path.resolve(root,mapped);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  const ext=path.extname(file),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'}[ext]||'application/octet-stream';res.setHeader('Content-Type',type);
  if(['.js','.html'].includes(ext)){let content=fs.readFileSync(file,'utf8').replace(/https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.5\/firebase-[\w-]+\.js/g,'/fixture-sdk.js');if(ext==='.html')content=content.replace('<body>','<body><div style="padding:12px;background:#fff0be;text-align:center">HELYI TESZT · kitalált adatok · nincs levélküldés vagy fizetés</div>');res.end(content);}else res.end(fs.readFileSync(file));
}).listen(8879,'127.0.0.1',()=>console.log(`Local fixture: http://127.0.0.1:8879/admin | http://127.0.0.1:8879/ugyfelter#token=${token}`));
