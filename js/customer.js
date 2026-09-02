import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {getFunctions,httpsCallable} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";
import {safeStorage,reliableAction,escapeHtml as e,safeLink,dateLabel as date} from './customer-model.js?v=20260902-1';
const app=initializeApp({apiKey:"AIzaSyBakBKouiEi2KaMUD1a_lB0SHPzUqNiMsw",authDomain:"ovexi-6ef38.firebaseapp.com",projectId:"ovexi-6ef38",storageBucket:"ovexi-6ef38.firebasestorage.app",messagingSenderId:"370083022451",appId:"1:370083022451:web:4e3ba562d07641fcef4c06"});
const functions=getFunctions(app,"europe-west1"),$=id=>document.getElementById(id),store=safeStorage(()=>sessionStorage);
const call=async(name,data)=>(await httpsCallable(functions,name)(data)).data;
let token='',workspace=null,actions={},epoch=0,loading=false,activeOrder='';
function readToken(){const incoming=new URLSearchParams(location.hash.slice(1)).get('token');if(incoming){history.replaceState(null,'',location.pathname);store.set('ovexi_customer_token',incoming);}return incoming||store.get('ovexi_customer_token')||'';}
const link=(url,label)=>safeLink(url)?`<a class="material-link" href="${e(safeLink(url))}" target="_blank" rel="noopener noreferrer">${e(label)} ↗</a>`:'<p>A hivatkozás nem elérhető. Kérj segítséget az OVEXI-től.</p>';
function showAccess(message=''){
  ++epoch;token='';workspace=null;activeOrder='';actions={};store.remove('ovexi_customer_token');
  $('workspace').hidden=true;$('accessPanel').hidden=false;$('accessStatus').textContent=message;$('logoutButton').disabled=false;
  for(const id of ['requestForm','briefForm','decisionForm'])$(id).reset();
  for(const id of ['companyName','orderMeta','statusGrid','workflowSteps','nextAction','previewContent','deliveryContent','requestHistory','maintenanceHistory'])$(id).textContent='';
}
function lock(form,locked){for(const field of form.elements)field.disabled=locked;}
function pendingForm(name,id){const action=actions[name],form=$(id),pending=action?.pending;lock(form,Boolean(pending));if(pending){for(const [key,value] of Object.entries(name==='brief'?pending.brief:pending)){const field=form.elements.namedItem(key);if(field)field.value=value;}}form.querySelector('button[type="submit"]').disabled=Boolean(action?.busy);}
function render(w){
  if(activeOrder!==w.orderNumber){activeOrder=w.orderNumber;actions=Object.fromEntries(['request','brief','decision'].map(name=>[name,reliableAction(store,`ovexi_workspace_${w.orderNumber}_${name}_v1`)]));}
  workspace=w;$('accessPanel').hidden=true;$('workspace').hidden=false;
  $('companyName').textContent=w.companyName||'Igény';$('orderMeta').textContent=`${w.orderNumber} · beérkezett: ${date(w.createdAt)}`;$('stageBadge').textContent=w.stageLabel;
  $('statusGrid').innerHTML=[['Igény',w.orderStatusLabel],['Fizetés',w.paymentStatusLabel],['Karbantartás',w.maintenanceLabel]].map(([a,b])=>`<article class="metric"><span>${e(a)}</span><strong>${e(b)}</strong></article>`).join('');
  $('workflowSteps').innerHTML=(w.steps||[]).map(s=>`<div class="timeline-item ${s.done?'is-done':''}"><div><strong>${e(s.label)}</strong><span>${e(s.note)}</span></div></div>`).join('');$('nextAction').textContent=w.nextAction;
  $('briefSection').hidden=!w.canEditBrief;
  if(!actions.brief.pending&&!$('briefForm').dataset.dirty)for(const [key,value] of Object.entries(w.brief||{}))$('briefForm').elements.namedItem(key).value=value;
  $('missingFields').textContent=w.missing?.length?`Még pontosítandó: ${w.missing.join(', ')}.`:'A szükséges alapadatok rendelkezésre állnak.';
  const p=w.preview,decision=p?.decision;
  $('previewContent').innerHTML=p?`<p class="eyebrow">${e(p.version)}. változat · ${e(date(p.publishedAt))}</p><h3>${e(p.title)}</h3>${link(p.url,'Előnézet megnyitása')}<p class="preserve">${e(p.note)}</p>${decision?`<p class="callout">${e({approved:'Ezt a változatot jóváhagytad.',changes_requested:'Módosítást kértél ehhez a változathoz.',brief_changed:'A brief módosult; új előnézet szükséges.'}[decision.status]||'Döntés rögzítve')} · ${e(date(decision.decidedAt))}</p><p class="preserve">${e(decision.note)}</p>`:''}`:'<p>Az előnézet elkészülése után itt nézheted át az anyagokat.</p>';
  $('decisionForm').hidden=(!p||Boolean(decision)||!w.canEditBrief)&&!actions.decision.pending;
  $('deliveryContent').innerHTML=w.delivery?`<p>Átadva: ${e(date(w.delivery.publishedAt))}</p><div class="material-list">${w.delivery.files.map(f=>link(f.url,f.label)).join('')}</div><h3>Átadási útmutató</h3><p class="preserve">${e(w.delivery.instructions)}</p>`:'<p>A végleges anyagok az ügyféljóváhagyás és az átadási feltételek rendezése után jelennek meg.</p>';
  $('maintenanceHistory').innerHTML=(w.maintenance||[]).map(r=>`<div class="request-row"><strong>${e(r.label)} · ${e(r.healthStatus)}</strong><small>${e(r.status)}${r.lastCheck?` · ${date(r.lastCheck.checkedAt)}`:''}</small></div>`).join('')||'<p>Nincs ehhez az igényhez aktivált karbantartási figyelés.</p>';
  $('requestHistory').innerHTML=(w.requests||[]).map(r=>`<div class="request-row"><strong>${e(r.kindLabel)}</strong><small>${date(r.createdAt)} · ${e(r.statusLabel)}</small><p class="preserve">${e(r.message)}</p>${r.reply?`<div class="reply"><strong>OVEXI válasza · ${date(r.resolvedAt)}</strong><p class="preserve">${e(r.reply)}</p></div>`:''}</div>`).join('')||'<p>Még nincs beküldött kérés.</p>';
  $('historyNote').textContent=w.hasMoreRequests?'A legutóbbi 20 kérés látható. Korábbi ügyben írj az OVEXI-nek.':'';
  for(const [name,id] of [['request','requestForm'],['brief','briefForm'],['decision','decisionForm']]){pendingForm(name,id);if(actions[name].pending)$(name+'Status').textContent='Egy korábbi mentés eredménye bizonytalan. A gomb ugyanazt a kérést ellenőrzi újra.';}
}
async function refresh(){
  if(!token)return showAccess();if(loading)return;loading=true;const ticket=epoch;$('refreshWorkspace').disabled=true;
  try{const w=await call('getCustomerWorkspace',{token});if(ticket!==epoch)return;render(w);$('workspaceStatus').textContent='';}
  catch(error){if(ticket!==epoch)return;if(error.code==='functions/unauthenticated')showAccess('A belépési link lejárt vagy érvénytelen. Kérj újat.');else{const message='Az adatok most nem tölthetők be. A belépési linked megmaradt; próbáld újra.';$('workspaceStatus').textContent=message;$('accessStatus').textContent=message;$('retryAccess').hidden=false;}}
  finally{loading=false;$('refreshWorkspace').disabled=false;}
}
$('accessForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;try{await call('requestCustomerAccess',Object.fromEntries(new FormData(form)));form.reset();$('accessStatus').textContent='Ha az adatok egyeznek, néhány percen belül elküldjük a belépési linket.';}catch{$('accessStatus').textContent='A kérés most nem sikerült. Próbáld később, vagy írj az info@ovexi.hu címre.';}finally{button.disabled=false;}});
function installAction(name,formId,endpoint,input,success){
  $(formId).addEventListener('submit',async event=>{
    event.preventDefault();if(!workspace||!token||actions[name].busy)return;
    const action=actions[name],form=event.currentTarget,status=$(name+'Status'),ticket=epoch;
    let values;try{values=action.pending||input(Object.fromEntries(new FormData(form)));}catch(error){status.textContent=error.message;return;}
    lock(form,true);$('logoutButton').disabled=true;status.textContent='Mentés…';
    try{await action.send(values,payload=>call(endpoint,{...payload,token}));if(ticket!==epoch)return;form.reset();delete form.dataset.dirty;status.textContent=success;await refresh();}
    catch(error){if(ticket!==epoch)return;status.textContent=action.pending?'A mentés eredménye bizonytalan. Ugyanazzal a tartalommal próbáld újra.':error.message||'A mentés sikertelen. Frissítsd az adatokat.';if(error.code==='functions/unauthenticated')showAccess('Kérj új belépési linket. A függő kérésed ugyanennél az igénynél folytatható.');}
    finally{if(ticket===epoch){pendingForm(name,formId);$('logoutButton').disabled=false;}}
  });
}
installAction('request','requestForm','submitCustomerRequest',v=>v,'A kérésedet rögzítettük.');
installAction('brief','briefForm','submitCustomerBrief',brief=>({brief,briefRevision:workspace.briefRevision}),'A pontosított adatokat elmentettük.');
installAction('decision','decisionForm','decideCustomerPreview',v=>{if(v.decision==='changes_requested'&&v.note.trim().length<5)throw Error('Írd le a kért módosítást legalább 5 karakterrel.');return {...v,previewVersion:workspace.preview.version};},'A döntésedet rögzítettük.');
$('briefForm').addEventListener('input',()=>{$('briefForm').dataset.dirty='true';});
$('logoutButton').addEventListener('click',()=>showAccess('Sikeresen kiléptél.'));$('refreshWorkspace').addEventListener('click',refresh);$('retryAccess').addEventListener('click',refresh);
window.addEventListener('beforeunload',event=>{if(Object.values(actions).some(x=>x.pending||x.busy)){event.preventDefault();event.returnValue='';}});
token=readToken();refresh();
