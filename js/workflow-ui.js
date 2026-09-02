import {escapeHtml as e,safeLink,reliableAction,safeStorage,dateLabel as date} from './customer-model.js?v=20260902-1';
const stages={intake:'Feldolgozás alatt',waiting_customer:'Ügyféladatokra vár',ready:'Egyeztetve',preparation:'Előkészítés',production:'Készül',review:'Előnézet jóváhagyásra vár',completed:'Átadva',paused:'Szüneteltetve'};
const decisions={approved:'Jóváhagyva',changes_requested:'Módosítást kér',brief_changed:'Brief módosult'};
const $=id=>document.getElementById(id);
const input=(label,name,value='',extra='')=>`<label>${label}<input name="${name}" value="${e(value)}" ${extra}></label>`;
const area=(label,name,value='',extra='')=>`<label>${label}<textarea name="${name}" rows="3" ${extra}>${e(value)}</textarea></label>`;
const link=url=>safeLink(url)?`<a href="${e(safeLink(url))}" target="_blank" rel="noopener noreferrer">Hivatkozás megnyitása ↗</a>`:'';

export function installWorkflows({getData,isAdmin,identity,getEpoch,call,refresh,notify}){
  const drafts=new Map(),actions=new Map(),store=safeStorage(()=>sessionStorage);
  let backfillCursor=null;
  const keyFor=form=>`${identity()}:${form.dataset.order}:${form.dataset.action}:${form.dataset.customerRequest||''}`;
  const actionFor=form=>{const key=keyFor(form);if(!actions.has(key))actions.set(key,reliableAction(store,`ovexi_admin_${key}`));return actions.get(key);};
  function shell(action,flow,body,label,extra=''){return `<form data-workflow-form data-action="${action}" data-order="${e(flow.id)}" data-revision="${flow.revision}" ${extra}>${body}<button type="submit">${label}</button><p class="status" role="status"></p></form>`;}
  function render(){
    const data=getData();
    $('workflowList').innerHTML=(data.order_workflows||[]).map(flow=>{
      const order=data.orders.find(x=>x.id===flow.orderId),paid=order?.paymentStatus==='paid',closed=['completed','cancelled'].includes(order?.status),p=flow.preview;
      const checklist=flow.steps.map(step=>`<label class="workflow-step"><input type="checkbox" name="step:${e(step.id)}" ${step.done?'checked':''} ${['intake','customer-review','delivery'].includes(step.id)?'disabled':''}><span><strong>${e(step.label)}</strong><small>${e(step.note)}</small></span></label>`).join('');
      const state=`<label>Munkaszakasz<select name="stage">${Object.entries(stages).filter(([v])=>v!=='completed').map(([v,label])=>`<option value="${v}" ${v===flow.stage?'selected':''} ${v==='production'&&!paid?'disabled':''}>${label}</option>`).join('')}</select></label>`;
      return `<article class="record-card"><div class="record-top"><div><span class="badge">${e(stages[flow.stage]||flow.stage)}</span><h3>${e(flow.companyName)}</h3><p>${e(flow.orderNumber)} · ${date(flow.updatedAt)}</p></div><span class="badge ${flow.attentionRequired?'warning':''}">${flow.attentionRequired?'Ellenőrzést igényel':'Nyilvántartva'}</span></div><p><strong>Fizetés:</strong> ${paid?'Igazolt fizetés':'Nincs igazolt fizetés'} · <strong>Következő lépés:</strong> ${e(flow.nextAction)}</p>${flow.missing?.length?`<p class="error-note">Pontosítandó: ${flow.missing.map(e).join(', ')}</p>`:''}
      ${closed?'<p>A munka lezárt; az anyagok és döntések megőrződnek.</p>':shell('workflow',flow,`<div class="workflow-checklist">${checklist}</div><div class="field-grid">${state}${input('Következő ügyfélteendő','nextAction',flow.nextAction,'required minlength="3" maxlength="500"')}</div>`,'Munkafolyamat mentése')}
      <details><summary>Előnézet és ügyféljóváhagyás</summary>${p?`<p><strong>${e(p.title)}</strong> · ${p.version}. változat · ${e(decisions[p.decision?.status]||'Válaszra vár')}</p>${link(p.url)}<p class="preserve">${e(p.decision?.note||p.note)}</p>`:'<p>Még nincs közzétett előnézet.</p>'}
      ${closed?'':shell('preview',flow,input('Előnézet címe','title',p?.title,'required minlength="3" maxlength="120"')+input('Előnézet HTTPS hivatkozása','url',p?.url,'type="url" required')+area('Mit ellenőrizzen az ügyfél?','note',p?.note,'maxlength="2000"')+'<p class="small">Új változat közzététele új ügyféljóváhagyást igényel. E-mail külön küldhető.</p>','Új előnézet közzététele')}
      </details><details><summary>Végleges átadási anyagok</summary>${flow.delivery?`<p>Átadva: ${date(flow.delivery.publishedAt)}</p><p class="preserve">${e(flow.delivery.instructions)}</p>${flow.delivery.files.map(f=>`<p>${e(f.label)} · ${link(f.url)}</p>`).join('')}`:shell('delivery',flow,area('Fájlok / oldalak: soronként megnevezés | HTTPS hivatkozás','files','','required placeholder="Forráskód | https://…"')+area('Átadási útmutató','instructions','','required minlength="10" maxlength="4000"')+`<p class="small">Átadás előtt minden feladatnak késznek kell lennie, és a jelenlegi előnézet jóváhagyása szükséges. ${paid?'':'Az átadás igazolt fizetésig zárva marad.'}</p>`,'Átadási anyagok közzététele és lezárás',!paid||closed?'data-unavailable="true"':'')}
      </details><div class="record-actions"><button type="button" data-notify-order="${e(flow.orderId)}" data-notify-type="information_needed">Információkérés e-mail</button><button type="button" data-notify-order="${e(flow.orderId)}" data-notify-type="preview_ready" ${!p?'disabled':''}>Előnézet e-mail</button><button type="button" data-notify-order="${e(flow.orderId)}" data-notify-type="work_completed" ${!flow.delivery?'disabled':''}>Átadás e-mail</button></div></article>`;
    }).join('')||'<p>Még nincs betöltött munkafolyamat. A fenti gombbal pótolhatod a régi igényekhez.</p>';
    $('customerRequestList').innerHTML=(data.customer_requests||[]).map(row=>{
      const flow=data.order_workflows.find(x=>x.orderId===row.orderId),order=data.orders.find(x=>x.id===row.orderId);
      return `<article class="request-row"><h4>${e(order?.companyName||row.orderId)} · ${e({question:'Kérdés',content:'Tartalom / adat',change:'Módosítási kérés',maintenance:'Karbantartás'}[row.kind]||row.kind)}</h4><p>${date(row.createdAt)}</p><p class="preserve">${e(row.message)}</p>${row.status==='resolved'?`<p><strong>OVEXI válasza</strong></p><p class="preserve">${e(row.reply||'Korábban lezárt kérés; válaszszöveg nincs rögzítve.')}</p>`:flow?shell('resolve',flow,area('Ügyfélnek látható válasz','reply','','required minlength="3" maxlength="1500"'),'Válasz mentése és kérés lezárása',`data-customer-request="${e(row.id)}"`):'<p>A válaszhoz töltsd be a kapcsolódó munkafolyamatot.</p>'}</article>`;
    }).join('')||'<p>Még nincs betöltött ügyfélkérés.</p>';
    document.querySelectorAll('[data-workflow-form]').forEach(form=>{
      const draft=drafts.get(keyFor(form));if(draft){if(draft.revision)form.dataset.revision=draft.revision;for(const [name,value] of Object.entries(draft.values)){const field=form.elements.namedItem(name);if(field){if(field.type==='checkbox')field.checked=value;else field.value=value;}}form.closest('details')?.setAttribute('open','');}
      const action=actionFor(form);if(action.pending){const p=action.pending;for(const [name,value] of Object.entries(p)){const field=form.elements.namedItem(name);if(field)field.value=name==='files'?value.map(f=>`${f.label} | ${f.url}`).join('\n'):value;}for(const step of p.steps||[]){const field=form.elements.namedItem(`step:${step.id}`);if(field)field.checked=step.done;}form.querySelector('.status').textContent='Függő mentés: a gomb az eredeti tartalmat ellenőrzi újra.';form.closest('details')?.setAttribute('open','');}
      for(const field of form.elements)if(action.pending||form.dataset.unavailable)field.disabled=true;
      if(!form.dataset.unavailable)form.querySelector('button').disabled=action.busy;
    });
  }
  $('customersPanel').addEventListener('input',event=>{const form=event.target.closest('[data-workflow-form]');if(!form)return;const values=Object.fromEntries(new FormData(form));form.querySelectorAll('input[type="checkbox"]').forEach(f=>{values[f.name]=f.checked;});drafts.set(keyFor(form),{revision:form.dataset.revision,values});});
  $('customersPanel').addEventListener('submit',async event=>{
    const form=event.target.closest('[data-workflow-form]');if(!form)return;event.preventDefault();if(!isAdmin()||form.dataset.unavailable)return;
    const owner=identity(),ticket=getEpoch(),action=actionFor(form);if(action.busy)return;
    const kind=form.dataset.action,values=Object.fromEntries(new FormData(form)),raw={orderId:form.dataset.order,revision:Number(form.dataset.revision)};
    let endpoint;
    if(kind==='workflow'){endpoint='updateOrderWorkflow';Object.assign(raw,values,{steps:[...form.querySelectorAll('input[type="checkbox"]:not(:disabled)')].map(f=>({id:f.name.slice(5),done:f.checked}))});for(const key of Object.keys(raw))if(key.startsWith('step:'))delete raw[key];}
    if(kind==='preview'){endpoint='saveOrderPreview';Object.assign(raw,values);}
    if(kind==='delivery'){endpoint='publishOrderDelivery';Object.assign(raw,{instructions:values.instructions,files:String(values.files||'').split('\n').filter(x=>x.trim()).map(line=>{const pos=line.indexOf('|');return {label:pos<0?'':line.slice(0,pos).trim(),url:pos<0?'':line.slice(pos+1).trim()};})});}
    if(kind==='resolve'){endpoint='resolveCustomerRequest';Object.assign(raw,{reply:values.reply,customerRequestId:form.dataset.customerRequest});}
    const status=form.querySelector('.status');for(const f of form.elements)f.disabled=true;status.textContent='Mentés…';
    try{await action.send(raw,payload=>call(endpoint,payload));if(owner!==identity()||ticket!==getEpoch())return;drafts.delete(keyFor(form));notify('Mentve. Az ügyfél az ügyféltérben látja a változást.');await refresh();}
    catch(error){if(owner!==identity()||ticket!==getEpoch())return;if(error.code==='functions/aborted'){const draft=drafts.get(keyFor(form));if(draft)draft.revision=null;}status.textContent=action.pending?'Bizonytalan eredmény. A gomb ugyanazt a mentést ellenőrzi újra.':error.message||'A mentés sikertelen. Frissítsd az adatokat.';}
    finally{if(owner===identity()&&ticket===getEpoch()){for(const f of form.elements)if(!f.name.startsWith('step:')||!['step:intake','step:customer-review','step:delivery'].includes(f.name))f.disabled=Boolean(action.pending);form.querySelector('button').disabled=false;}}
  });
  window.addEventListener('beforeunload',event=>{if([...actions.values()].some(a=>a.pending||a.busy)){event.preventDefault();event.returnValue='';}});
  return {render,reset(){drafts.clear();actions.clear();backfillCursor=null;},async backfill(){const r=await call('backfillOrderWorkflows',{cursor:backfillCursor});backfillCursor=r.nextCursor;$('backfillWorkflows').textContent=backfillCursor?'Következő 100 igény ellenőrzése':'Hiányzó munkafolyamatok létrehozása';await refresh();notify(`${r.created} munkafolyamat létrehozva.${backfillCursor?' További igények ellenőrizhetők.':''}`);}};
}
