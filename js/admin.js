import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {addDoc,collection,doc,getDocs,getFirestore,limit,orderBy,query,serverTimestamp,startAfter,updateDoc} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {getFunctions,httpsCallable} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";
import {STATUS_LABELS as labels,SOURCE_NAMES,outreachReady,escapeHtml as e,safeUrl,dateMs,dayKey,inPeriod,money,providerSent,summarize,validateCampaign,validateExpense,csv} from "./admin-model.js?v=20260902-2";
import {installBookingSettings} from "./booking-settings-ui.js?v=20260902-2";
import {installProduction} from "./production-ui.js?v=20260902-2";
import {installWorkflows} from "./workflow-ui.js?v=20260902-1";
import {installOutreach} from "./outreach-ui.js?v=20260831-4";

const app=initializeApp({apiKey:"AIzaSyBakBKouiEi2KaMUD1a_lB0SHPzUqNiMsw",authDomain:"ovexi-6ef38.firebaseapp.com",projectId:"ovexi-6ef38",storageBucket:"ovexi-6ef38.firebasestorage.app",messagingSenderId:"370083022451",appId:"1:370083022451:web:4e3ba562d07641fcef4c06"});
const auth=getAuth(app),db=getFirestore(app),functions=getFunctions(app,"europe-west1");
const $=id=>document.getElementById(id),sources=Object.keys(SOURCE_NAMES);
let data={},states={},epoch=0,currentPanel="overview",isAdmin=false,toastTimer;
const taskKinds={order_received:"Igény visszaigazolása",payment_received:"Fizetési visszaigazolás",payment_failed:"Fizetési hiba értesítése",subscription_cancelled:"Lemondás visszaigazolása",invoice:"Számlázás"};
const stageLabels={intake:"Feldolgozás alatt",waiting_customer:"Ügyféladatokra vár",ready:"Indításra kész",production:"Készül",review:"Ügyfél-jóváhagyásra vár",completed:"Elkészült",paused:"Szüneteltetve"};
const requestKinds={question:"Kérdés",content:"Tartalom / adat",change:"Módosítási kérés",maintenance:"Karbantartási kérés"};
const notificationKinds={information_needed:"Információkérés",preview_ready:"Előnézet elkészült",work_completed:"Munka elkészült",maintenance_update:"Karbantartási frissítés",internal_customer_request:"Belső ügyfélkérés-jelzés"};
const expenseKinds={advertising:"Hirdetés",hosting:"Tárhely / domain",ai:"AI-használat",invoicing:"Számlázó",email:"E-mail",other:"Egyéb"};
const badge=value=>`<span class="badge ${["failed","bounced","blocked","needs_review","retry"].includes(value)?"warning":""}">${e(labels[value]||value||"Ismeretlen")}</span>`;
const empty=message=>`<div class="empty">${e(message)}</div>`;
const formatDate=value=>{const ms=dateMs(value);return Number.isFinite(ms)?new Date(ms).toLocaleString("hu-HU",{timeZone:"Europe/Budapest",dateStyle:"short",timeStyle:"short"}):"—";};
const link=(url,text)=>safeUrl(url)?`<a href="${e(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${e(text||url)} ↗</a>`:e(text||url||"—");
const options=(values,current)=>values.map(v=>`<option value="${e(v)}"${current===v?" selected":""}>${e(labels[v]||v)}</option>`).join("");
function resetData(){data=Object.fromEntries(sources.map(key=>[key,[]]));states=Object.fromEntries(sources.map(key=>[key,{status:"idle",more:false,cursor:null}]));}
resetData();
const outreach=installOutreach({functions,getData:()=>data,isAdmin:()=>isAdmin,refresh:()=>Promise.all(["outreach_messages","outreach_research","outreach_replies"].map(key=>loadSource(key))),messageRows,formatDate,badge,sourceEmpty});
const workflows=installWorkflows({getData:()=>({...data,order_workflows:search(periodRows("order_workflows")),customer_requests:search(periodRows("customer_requests"))}),isAdmin:()=>isAdmin,identity:()=>auth.currentUser?.uid||"",getEpoch:()=>epoch,call:async(name,payload)=>(await httpsCallable(functions,name,{timeout:310000})(payload)).data,refresh:()=>Promise.all(["orders","order_workflows","customer_requests"].map(key=>loadSource(key))),notify:showToast});
const production=installProduction({getData:()=>data,identity:()=>auth.currentUser?.uid||'',call:async(name,payload)=>(await httpsCallable(functions,name,{timeout:310000})(payload)).data,refresh:()=>Promise.all(['production_jobs','production_copy_jobs','order_workflows'].map(key=>loadSource(key))),notify:showToast});
const bookingSettings=installBookingSettings({getData:()=>data,identity:()=>auth.currentUser?.uid||'',call:async(name,payload)=>(await httpsCallable(functions,name)(payload)).data,refresh:()=>loadSource('booking_tenants'),notify:showToast});
onAuthStateChanged(auth,async user=>{
  production.reset();bookingSettings.reset();
  workflows.reset();
  const ticket=++epoch;isAdmin=false;resetData();
  $("dashboardSection").hidden=true;$("loginSection").hidden=false;$("logoutButton").hidden=true;$("adminEmail").textContent="";
  document.querySelectorAll(".editor").forEach(form=>{form.reset();form.hidden=true;delete form.dataset.recordId;});
  render();
  if(!user)return;
  try{
    const token=await user.getIdTokenResult(true);
    if(ticket!==epoch)return;
    if(token.claims.admin!==true)throw new Error("Ehhez a fiókhoz nincs adminjogosultság.");
    isAdmin=true;$("loginStatus").textContent="";$("loginForm").reset();$("loginSection").hidden=true;$("dashboardSection").hidden=false;$("logoutButton").hidden=false;$("adminEmail").textContent=user.email;
    await loadData();
  }catch(error){if(ticket!==epoch)return;$("loginStatus").textContent=error.message||"Sikertelen belépés.";await signOut(auth);}
});
$("loginForm").addEventListener("submit",async event=>{event.preventDefault();const button=event.currentTarget.querySelector("button"),values=new FormData(event.currentTarget);button.disabled=true;$("loginStatus").textContent="";try{await signInWithEmailAndPassword(auth,String(values.get("email")).trim(),String(values.get("password")));}catch{$("loginStatus").textContent="Sikertelen belépés. Ellenőrizd az adatokat és az adminfiókot.";}finally{button.disabled=false;}});
$("logoutButton").addEventListener("click",()=>signOut(auth).catch(()=>showToast("A kijelentkezés nem sikerült. Próbáld újra.")));
$("refreshButton").addEventListener("click",loadData);
async function loadSource(key,append=false,ticket=epoch){
  if(!isAdmin||ticket!==epoch)return;
  states[key].status="loading";render();
  try{
    const constraints=[orderBy("createdAt","desc")];
    if(append&&states[key].cursor)constraints.push(startAfter(states[key].cursor));
    constraints.push(limit(201));
    const snapshot=await getDocs(query(collection(db,key),...constraints));
    if(ticket!==epoch||!isAdmin)return;
    const docs=snapshot.docs.slice(0,200),records=docs.map(item=>({...item.data(),id:item.id}));
    data[key]=append?[...data[key],...records]:records;
    states[key]={status:"ready",more:snapshot.docs.length>200,cursor:docs.at(-1)||null};
  }catch{if(ticket!==epoch)return;states[key].status="error";if(!append)data[key]=[];}
  if(ticket===epoch)render();
}
async function loadData(){
  if(!isAdmin)return;const ticket=++epoch;resetData();$("refreshButton").disabled=true;$("lastUpdated").textContent="Adatok betöltése…";
  await Promise.all(sources.map(key=>loadSource(key,false,ticket)));
  if(ticket!==epoch)return;
  $("refreshButton").disabled=false;$("lastUpdated").textContent=`Frissítve: ${formatDate(Date.now())} · Budapest időzóna · kézi frissítés`;render();
}
function periodRows(key,dateField="createdAt"){return (data[key]||[]).filter(r=>inPeriod(r[dateField],$("dateFrom").value,$("dateTo").value));}
function search(rows){const term=$("globalSearch").value.trim().toLocaleLowerCase("hu");return term?rows.filter(row=>JSON.stringify(row).toLocaleLowerCase("hu").includes(term)):rows;}
function messageRows(){const filter=$("messageFilter").value;return search((data.outreach_messages||[]).filter(r=>inPeriod(r.sentAt||r.createdAt,$("dateFrom").value,$("dateTo").value)&&(filter==="all"||filter==="ready"&&outreachReady(r)||filter==="unqualified"&&r.status==="draft"&&!outreachReady(r)||r.status===filter)));}
function sourceEmpty(key,message){return empty(states[key].status==="error"?"Az adatforrás nem érhető el. Frissíts, vagy ellenőrizd a jogosultságot.":states[key].status==="loading"?"Betöltés…":message);}
function render(){
  const from=$("dateFrom").value,to=$("dateTo").value;
  if(from&&to&&from>to){$("coverageNote").textContent="A kezdő dátum nem lehet későbbi a záró dátumnál.";return;}
  const summary=summarize(data,from,to);
  $("coverageNote").textContent="Összesítések a betöltött rekordokra és a dátumszűrőre. A szöveges keresés csak a listákat szűri. "+sources.map(key=>`${SOURCE_NAMES[key]}: ${data[key].length}${states[key].more?"+":""}${states[key].status!=="ready"?" ("+(states[key].status==="error"?"hiba":states[key].status==="loading"?"betöltés":"nincs betöltve")+")":""}`).join(" · ")+". A + jelű listák régebbi adatai külön betölthetők; createdAt nélküli régi rekordok nem szerepelnek.";
  $("sourceErrors").innerHTML=sources.filter(key=>states[key].status==="error").map(key=>`<p class="error-note">${e(SOURCE_NAMES[key])}: a lekérés sikertelen. Az összesítés hiányos, nem nulla aktivitást jelent.</p>`).join("");
  const value=(key,v)=>states[key].status==="ready"?v:"—";
  $("metricGrid").innerHTML=[["Beérkezett rendelések",value("orders",summary.orders),"Szűrt időszakban"],["Aktív munkák",value("orders",summary.active),"Fizetve / készül / jóváhagyás"],["Elküldött hirdető e-mailek",value("outreach_messages",summary.sent),"Csak szolgáltatói visszaigazolással"],["Ellenőrizendő feladatok",value("commerce_tasks",summary.attention),"Minden betöltött időszakból"]].map(metric).join("");
  $("attentionList").innerHTML=(data.commerce_tasks||[]).filter(r=>["blocked","needs_review","retry"].includes(r.status)).slice(0,5).map(r=>`<div class="compact-row"><div><strong>${e(taskKinds[r.type]||r.type)}</strong><p>${e(r.errorCode||"Ellenőrizd a részleteket")}</p></div>${badge(r.status)}</div>`).join("")||sourceEmpty("commerce_tasks","Nincs ellenőrzésre váró feladat a betöltött naplóban.");
  const leads=periodRows("leads"),max=Math.max(1,leads.length);
  $("pipeline").innerHTML=["researched","approved","contacted","replied","won","do_not_contact"].map(status=>{const count=leads.filter(r=>r.status===status).length;return `<div class="pipeline-row"><span>${e(labels[status])}</span><strong>${states.leads.status==="ready"?count:"—"}</strong><div class="bar-track"><span style="width:${count/max*100}%"></span></div></div>`;}).join("");
  $("recentOrders").innerHTML=summary.ordersList.slice(0,5).map(r=>`<div class="compact-row"><div><strong>${e(r.companyName||"—")}</strong><p>${e(r.orderNumber||r.id)} · ${formatDate(r.createdAt)}</p></div>${badge(r.status)}</div>`).join("")||sourceEmpty("orders","Még nincs rendelés ebben az időszakban.");
  $("integrations").innerHTML=[["Rendelések","orders","Rögzített igények; a lista nem fizetési bizonyíték."],["Tranzakciós e-mail","commerce_tasks","A „kész” feladat nem igazolja a postaládába érkezést."],["Hirdető e-mailek","outreach_messages","Külön jóváhagyás után küldhető. Válaszok: Rackhost IMAP; nincs automatikus válaszadás."],["Hirdetési csatornák","campaigns","Meta / Google Ads kapcsolat nincs bekötve. Kézi nyilvántartás."],["Számlázás","payments","Számlaállapot a fizetési naplóban; Billingo aktiválás még szükséges."],["AI-gyártás","production_jobs","Szerkeszthető szöveg, HTML, kreatív és tartalomnaptár. A publikálás külön jóváhagyás."]].map(([name,key,note])=>`<article class="integration"><span class="small">${states[key].status==="ready"?"Napló elérhető":"Állapot nem ellenőrizhető"}</span><h3>${name}</h3><p>${note}</p></article>`).join("");
  renderOrders();renderMessages();renderCampaigns(summary);renderFinance(summary);renderLeads();renderCustomers();renderMaintenance();renderOperations();
  document.querySelectorAll("[data-more]").forEach(button=>{const state=states[button.dataset.more];button.hidden=!state.more;button.disabled=state.status==="loading";});
}
function metric([title,total,note]){return `<article class="metric"><span>${e(title)}</span><strong>${e(total)}</strong><small>${e(note)}</small></article>`;}
function renderOrders(){
  const filter=$("orderFilter").value,rows=search(periodRows("orders")).filter(r=>filter==="all"||r.status===filter);
  $("ordersList").innerHTML=rows.map(r=>`<article class="record-card"><div class="record-top"><div>${badge(r.status)}<h3>${e(r.companyName||"—")}</h3><p>${e(r.orderNumber||r.id)} · ${formatDate(r.createdAt)}</p></div><div class="record-total">${money(r.onceTotal)}<br><span class="muted">${money(r.monthlyTotal)} / hó</span></div></div><div class="record-details"><div><strong>Kapcsolat</strong>${e(r.contactName)}<br>${e(r.email)}<br>${e(r.phone)}</div><div><strong>Csomagok</strong>${(Array.isArray(r.itemNames)?r.itemNames:[]).map(e).join("<br>")}<p>Fizetés: ${e(r.paymentStatus||"Nincs visszaigazolva")}<br>Számla: ${e(r.invoiceStatus||"Nincs")}</p></div><div><strong>Brief</strong>${e(r.businessDescription)}<p>${e(r.primaryGoal)} · ${e(r.tone)}</p></div></div><details><summary>Teljes brief és további adatok</summary><p>Célközönség: ${e(r.targetAudience||"—")}</p><p>Meglévő oldal: ${link(r.currentUrl)}</p><p>Megjegyzés: ${e(r.notes||"—")}</p><p>Egyeztetés oka: ${e(r.reviewReason||"—")}</p></details><div class="record-actions"><label>Igény besorolása<select data-status-select="${e(r.id)}" data-type="orders">${options([...new Set([r.status,"new","needs_review","qualified","cancelled"])],r.status)}</select></label><button data-save-status="${e(r.id)}" data-type="orders" type="button">Besorolás mentése</button><button type="button" data-go="customers">Munkafolyamat és előnézet →</button></div></article>`).join("")||sourceEmpty("orders","Nincs a szűrésnek megfelelő rendelés.");
}
function renderMessages(){ outreach.render(); }
function renderCampaigns(summary){
  const previous=$("expenseCampaign").value;
  $("expenseCampaign").innerHTML='<option value="">Nem kampányköltség</option>'+data.campaigns.map(r=>`<option value="${e(r.id)}">${e(r.name)}</option>`).join("");$("expenseCampaign").value=previous;
  $("campaignsList").innerHTML=search(data.campaigns).map(r=>{
    const totals={HUF:0,EUR:0,USD:0};summary.expenses.filter(x=>x.campaignId===r.id).forEach(x=>{if(Object.hasOwn(totals,x.currency))totals[x.currency]+=Number(x.amountMinor||0)/100;});
    const spent=Object.entries(totals).filter(([,value])=>value).map(([currency,value])=>money(value,currency)).join(" + ")||money(0);
    return `<article class="record-card"><div class="record-top"><div><span class="badge">${e(r.platform)}</span> ${badge(r.status)}<h3>${e(r.name)}</h3><p>Kézi kampánynyilvántartás · ${formatDate(r.createdAt)}</p></div><button class="secondary" type="button" data-edit-campaign="${e(r.id)}">Szerkesztés</button></div><div class="record-details"><div><strong>Céloldal</strong>${link(r.destination)}</div><div><strong>Tervezett havi keret</strong>${money(Number(r.budgetMinor||0)/100)}</div><div><strong>Rögzített költés · szűrt időszak</strong>${states.expenses.status==="ready"?e(spent):"Nem ellenőrizhető"}</div></div><p class="preserve">${e(r.creative||"Nincs megadott hirdetésszöveg.")}</p></article>`;
  }).join("")||sourceEmpty("campaigns","Még nincs rögzített kampány. Adj meg csatornát, céloldalt, hirdetésszöveget és tervezett keretet.");
}
function renderFinance(summary){
  $("financeMetrics").innerHTML=[["Visszaigazolt éles fizetések",states.payments.status==="ready"?money(summary.paidValue):"—","Visszatérítések levonása nélkül"],...Object.entries(summary.costs).map(([currency,value])=>[`Rögzített költség · ${currency}`,states.expenses.status==="ready"?money(value,currency):"—","Kézi tételek, szűrt időszak"])].map(metric).join("");
  $("expensesList").innerHTML=search(summary.expenses).map(r=>`<div class="compact-row"><div><strong>${e(r.label)}</strong><p>${e(expenseKinds[r.category]||r.category)} · ${e(r.incurredOn)} · Kézi rögzítés</p></div><strong>${money(r.amountMinor/100,r.currency)}</strong><button class="secondary" type="button" data-edit-expense="${e(r.id)}">Javítás</button></div>`).join("")||sourceEmpty("expenses","Nincs rögzített költség. Ez nem jelenti azt, hogy a szolgáltatóknál nincs díj.");
  $("paymentsList").innerHTML=search(periodRows("payments")).map(r=>`<div class="compact-row"><div><strong>${e(r.orderId||r.id)}</strong><p>${formatDate(r.createdAt)} · ${r.livemode===true?"Éles":"Teszt / nem igazolt éles"} · Számla: ${e(r.invoiceStatus||"Ismeretlen")}</p></div>${badge(r.status)}</div>`).join("")||sourceEmpty("payments","Még nincs fizetési esemény. A rendelési igény önmagában nem fizetés.");
}
function renderLeads(){
  const rows=search(periodRows("leads")),legacy=rows.filter(r=>r.source==="researched_csv"),manual=rows.filter(r=>r.source!=="researched_csv");
  const card=r=>`<article class="record-card"><h3>${e(r.companyName)}</h3><p>${link(r.website)}</p><p class="small">Kézi / régi nyilvántartás · nem küldésre jóváhagyott jelölt</p><p>${e(r.reason)}</p><details><summary>Korábbi szöveg és kapcsolat</summary><p>${e(r.contact)}</p><p class="preserve">${e(r.draft||"Nincs korábbi szöveg.")}</p></details><label>Kézi státusz<select data-status-select="${e(r.id)}" data-type="leads">${options(["researched","approved","contacted","replied","won","do_not_contact"],r.status)}</select></label><button type="button" data-save-status="${e(r.id)}" data-type="leads">Kézi státusz mentése · nem küldés</button></article>`;
  const ready=search((data.outreach_messages||[]).filter(outreachReady));
  $("leadsList").innerHTML=`<section class="surface"><h3>Új kutatásból származó jelöltek (${ready.length})</h3><p>A levél ellenőrzése és elküldése a Hirdető e-mailek alatt történik. A kézi státuszváltás nem küld levelet.</p>${ready.map(r=>`<article class="compact-row"><div><strong>${e(r.companyName)}</strong><p>${e(r.qualification.needReason)}</p></div><button type="button" data-open-prospect="${e(r.id)}">Levél és küldés →</button></article>`).join("")||sourceEmpty("outreach_messages","Jelenleg nincs új, minősített jelölt. A régi importált cégek nem helyettesítik a kutatás találatait.")}</section>${manual.map(card).join("")}<details class="surface"><summary>Régi importált lista (${legacy.length}) · nem küldhető, nincs újraminősítve</summary><p>Ezek a korábbi célzási feltételekkel összegyűjtött cégek. Megőriztük őket, de nem kerülnek a küldési sorba.</p>${legacy.map(card).join("")}</details>`;
}
function renderCustomers(){workflows.render();}
function renderMaintenance(){
  const previous=$("maintenanceOrder").value;$("maintenanceOrder").innerHTML='<option value="">Nincs kapcsolva</option>'+data.orders.map(row=>`<option value="${e(row.id)}">${e(row.orderNumber)} · ${e(row.companyName)}</option>`).join("");$("maintenanceOrder").value=previous;
  $("maintenanceList").innerHTML=search(data.maintenance_sites).map(site=>{const check=site.lastCheck||{},history=Array.isArray(site.lastChecks)?site.lastChecks.slice(0,8):[];return `<article class="record-card"><div class="record-top"><div>${badge(site.healthStatus||site.status)}<h3>${e(site.label)}</h3><p>${link(site.url)} · 24 óránként</p></div>${badge(site.status)}</div><div class="record-details"><div><strong>Utolsó ellenőrzés</strong>${formatDate(check.checkedAt)}</div><div><strong>HTTP / válaszidő</strong>${e(check.httpStatus||"—")} · ${Number.isFinite(check.latencyMs)?e(check.latencyMs)+" ms":"—"}</div><div><strong>Egymást követő hibák</strong>${e(site.consecutiveFailures||0)}</div></div><div class="record-actions"><button type="button" data-check-site="${e(site.id)}">Ellenőrzés most</button><button class="secondary" type="button" data-site-status="${e(site.id)}" data-next-status="${site.status==="active"?"paused":"active"}">${site.status==="active"?"Szüneteltetés":"Aktiválás"}</button>${site.orderId?`<button class="secondary" type="button" data-notify-order="${e(site.orderId)}" data-notify-type="maintenance_update">Ügyfél értesítése</button>`:""}</div>${history.length?`<details><summary>Utolsó ellenőrzések</summary>${history.map(row=>`<p>${formatDate(row.checkedAt)} · ${row.ok?"elérhető":"hiba"} · HTTP ${e(row.httpStatus||"—")} · ${e(row.latencyMs||0)} ms ${row.errorCode?"· "+e(row.errorCode):""}</p>`).join("")}</details>`:""}</article>`;}).join("")||sourceEmpty("maintenance_sites","Még nincs figyelt weboldal. Csak aktív karbantartási ügyfélhez adj hozzá webcímet.");
}
function renderOperations(){
  const health=data.operations_health.find(row=>row.id==="current")||data.operations_health[0];$("operationsHealth").innerHTML=health?`<div class="section-heading"><h3>Rendszerállapot</h3>${badge(health.status)}</div><div class="record-details"><div><strong>Automatizálási hibák</strong>${e(health.taskAlerts||0)}</div><div><strong>Új ügyfélkérések</strong>${e(health.customerRequests||0)}</div><div><strong>Karbantartási riasztások</strong>${e(health.maintenanceAlerts||0)}</div></div><p class="small muted">Utolsó automatikus ellenőrzés: ${formatDate(health.checkedAt)}</p>`:sourceEmpty("operations_health","A rendszerállapot első óránkénti ellenőrzése még nem futott le.");
  $("commerceTasks").innerHTML=search(periodRows("commerce_tasks")).map(r=>`<article class="record-card"><div class="record-top"><div><h3>${e(taskKinds[r.type]||r.type)}</h3><p>${formatDate(r.createdAt)} · Próbálkozások: ${e(r.attempts||0)}</p></div>${badge(r.status)}</div><p>Rendelés: ${e(data.orders.find(o=>o.id===r.orderId)?.orderNumber||r.orderId||"—")}</p><p>Hibakód: ${e(r.errorCode||"—")} · Következő próba: ${formatDate(r.nextAttemptAt)}</p>${["retry","blocked"].includes(r.status)&&r.errorCode!=="synthetic_test_no_delivery"?`<button class="secondary" type="button" data-retry-task="${e(r.id)}">Ellenőrzés utáni újrapróbálás</button>`:""}</article>`).join("")||sourceEmpty("commerce_tasks","Nincs automatizálási feladat ebben az időszakban.");
  production.render();bookingSettings.render();
  $("notificationList").innerHTML=search([...(data.customer_notifications||[]).map(r=>({...r,collection:"customer_notifications"})),...(data.internal_alerts||[]).map(r=>({...r,collection:"internal_alerts"})),...(data.booking_notifications||[]).map(r=>({...r,collection:"booking_notifications"}))]).map(row=>`<div class="compact-row"><div><strong>${e(notificationKinds[row.type]||row.title||row.type)}</strong><p>${e(data.orders.find(x=>x.id===row.orderId)?.orderNumber||row.orderId)} · ${formatDate(row.createdAt)}</p></div>${badge(row.status)}${["blocked","retry"].includes(row.status)?`<button type="button" data-retry-notification="${e(row.id)}" data-notification-collection="${e(row.collection)}">Újrapróbálás</button>`:""}</div>`).join("")||sourceEmpty("customer_notifications","Még nincs ügyfélértesítés.");
}
function navigate(panel){currentPanel=panel;document.querySelectorAll("[data-panel]").forEach(el=>el.hidden=el.dataset.panel!==panel);document.querySelectorAll("[data-admin-tab]").forEach(button=>{const active=button.dataset.adminTab===panel;button.classList.toggle("is-active",active);if(active){button.setAttribute("aria-current","page");$("pageTitle").textContent=button.querySelector("span").textContent;}else button.removeAttribute("aria-current");});}
document.querySelectorAll("[data-admin-tab]").forEach(button=>button.addEventListener("click",()=>navigate(button.dataset.adminTab)));
document.querySelectorAll("[data-go]").forEach(button=>button.addEventListener("click",()=>navigate(button.dataset.go)));
$("filterForm").addEventListener("submit",event=>event.preventDefault());
for(const id of ["dateFrom","dateTo","globalSearch","orderFilter","messageFilter"])$(id).addEventListener("input",render);
$("clearFilters").addEventListener("click",()=>{$("filterForm").reset();$("orderFilter").value="all";$("messageFilter").value="all";render();});
document.querySelectorAll("[data-more]").forEach(button=>button.addEventListener("click",()=>loadSource(button.dataset.more,true)));
document.querySelectorAll("[data-open-form]").forEach(button=>button.addEventListener("click",()=>openForm(button.dataset.openForm)));
document.querySelectorAll("[data-close-form]").forEach(button=>button.addEventListener("click",()=>{$(button.dataset.closeForm).hidden=true;}));
function openForm(id,record){
  const form=$(id);form.reset();form.querySelector(".status").textContent="";delete form.dataset.recordId;
  if(record){form.dataset.recordId=record.id;for(const [key,value] of Object.entries(record)){const field=form.elements.namedItem(key);if(field)field.value=value;}if(id==="campaignForm")form.elements.budget.value=record.budgetMinor/100;if(id==="expenseForm")form.elements.amount.value=record.amountMinor/100;}
  else if(id==="expenseForm")form.elements.incurredOn.value=dayKey(Date.now());
  form.hidden=false;form.querySelector("input")?.focus();
}
for(const [formId,key] of [["campaignForm","campaigns"],["expenseForm","expenses"],["leadForm","leads"]]){
  $(formId).addEventListener("submit",async event=>{
    event.preventDefault();if(!isAdmin)return;const form=event.currentTarget,button=form.querySelector('[type="submit"]'),ticket=epoch;
    button.disabled=true;form.querySelector(".status").textContent="";
    try{
      const raw=Object.fromEntries(new FormData(form));let clean;
      if(key==="campaigns")clean=validateCampaign(raw);
      else if(key==="expenses")clean=validateExpense(raw,data.campaigns.map(r=>r.id));
      else{clean={};for(const [field,max] of [["companyName",120],["website",300],["channel",80],["contact",200],["reason",1000],["draft",2000]])clean[field]=String(raw[field]||"").trim().slice(0,max);if(clean.companyName.length<2||clean.reason.length<2||(clean.website&&!safeUrl(clean.website)))throw new Error("Ellenőrizd a cégnevet, a relevanciát és a webcímet.");Object.assign(clean,{status:"researched",source:"manual_admin"});}
      const stamp={updatedAt:serverTimestamp()};
      if(form.dataset.recordId)await updateDoc(doc(db,key,form.dataset.recordId),{...clean,...stamp});
      else await addDoc(collection(db,key),{...clean,...stamp,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});
      if(ticket!==epoch)return;form.reset();form.hidden=true;delete form.dataset.recordId;showToast("Elmentve. Küldést vagy hirdetést nem indítottunk.");await loadSource(key);
    }catch(error){if(ticket===epoch)form.querySelector(".status").textContent=error.code?"Nem sikerült menteni. Ellenőrizd a jogosultságot és a kapcsolatot.":error.message;}
    finally{button.disabled=false;}
  });
}
$("maintenanceForm").addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]'),values=Object.fromEntries(new FormData(form));button.disabled=true;form.querySelector(".status").textContent="";try{await httpsCallable(functions,"createMaintenanceSite")(values);form.reset();form.hidden=true;showToast("A napi ellenőrzést aktiváltuk.");await loadSource("maintenance_sites");}catch{form.querySelector(".status").textContent="Nem sikerült aktiválni. Csak nyilvános HTTPS webcím használható.";}finally{button.disabled=false;}});
$("dashboardSection").addEventListener("click",async event=>{
  const button=event.target.closest("button");if(!button||!isAdmin)return;
  if(button.dataset.openProspect){$("messageFilter").value="ready";navigate("outreach");renderMessages();[...document.querySelectorAll("[data-message]")].find(el=>el.dataset.message===button.dataset.openProspect)?.scrollIntoView({behavior:"smooth",block:"start"});return;}
  if(button.dataset.editCampaign)return openForm("campaignForm",data.campaigns.find(r=>r.id===button.dataset.editCampaign));
  if(button.dataset.editExpense)return openForm("expenseForm",data.expenses.find(r=>r.id===button.dataset.editExpense));
  const ticket=epoch;
  try{
    if(button.dataset.saveStatus){
      const key=button.dataset.type,id=button.dataset.saveStatus;
      const select=[...document.querySelectorAll("[data-status-select]")].find(el=>el.dataset.statusSelect===id&&el.dataset.type===key);
      button.disabled=true;await updateDoc(doc(db,key,id),{status:select.value,updatedAt:serverTimestamp()});if(ticket===epoch){await loadSource(key);showToast("Státusz mentve.");}
    }else if(button.dataset.generateDraft){
      if(!confirm("AI-tervezet készülhet, ami API-költséggel jár. Ez nem küldi el a levelet. Folytatod?"))return;
      button.disabled=true;await httpsCallable(functions,"generateLeadDraft")({leadId:button.dataset.generateDraft});if(ticket===epoch){await loadSource("leads");showToast("Tervezet elkészült; nem küldtük el.");}
    }else if(button.dataset.retryTask){
      const row=data.commerce_tasks.find(r=>r.id===button.dataset.retryTask);
      const order=data.orders.find(r=>r.id===row?.orderId);
      if(!order){showToast("Előbb töltsd be a kapcsolódó rendelést az ellenőrzéshez.");return;}
      if(!confirm(`Feladat: ${taskKinds[row.type]||row.type}\nRendelés: ${order.orderNumber||order.id}\nCímzett: ${order.email||"ismeretlen"}\nÚjrapróbálás tényleges e-mailt vagy számlázási műveletet indíthat. Folytatod?`))return;
      button.disabled=true;await httpsCallable(functions,"retryCommerceTask")({taskId:row.id});if(ticket===epoch)await loadSource("commerce_tasks");
    }else if(button.id==="backfillWorkflows"){
      button.disabled=true;await workflows.backfill();
    }else if(button.dataset.notifyOrder){
      const order=data.orders.find(row=>row.id===button.dataset.notifyOrder);if(!order)return showToast("A kapcsolódó rendelés nincs betöltve.");if(!confirm(`Valódi e-mail küldése: ${order.email}\nTípus: ${notificationKinds[button.dataset.notifyType]}\nFolytatod?`))return;button.disabled=true;await httpsCallable(functions,"queueCustomerNotification")({orderId:order.id,type:button.dataset.notifyType,requestId:crypto.randomUUID()});showToast("Az e-mail a küldési sorba került.");setTimeout(()=>loadSource("customer_notifications"),1200);
    }else if(button.dataset.checkSite){
      button.disabled=true;await httpsCallable(functions,"runMaintenanceCheck")({siteId:button.dataset.checkSite});if(ticket===epoch){await loadSource("maintenance_sites");showToast("Az ellenőrzés lefutott.");}
    }else if(button.dataset.siteStatus){
      button.disabled=true;await httpsCallable(functions,"setMaintenanceStatus")({siteId:button.dataset.siteStatus,status:button.dataset.nextStatus});if(ticket===epoch)await loadSource("maintenance_sites");
    }
  }catch{if(ticket===epoch)showToast("A művelet sikertelen. Ellenőrizd a jogosultságot és a beállításokat.");}
  finally{button.disabled=false;}
});
$("exportMessages").addEventListener("click",()=>{
  const rows=messageRows();if(!isAdmin||states.outreach_messages.status!=="ready"||!rows.length)return showToast("Nincs exportálható küldési napló.");
  const text=csv([["Cég","Címzett","Tárgy","Állapot","Küldés ideje","Visszaigazolt","Kampány"],...rows.map(r=>[r.companyName,r.recipient,r.subject,labels[r.status]||r.status,formatDate(r.sentAt),providerSent(r)?"igen":"nem",r.campaignId])]);
  const url=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download="ovexi-megkeresesek.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
function showToast(message){clearTimeout(toastTimer);$("adminToast").textContent=message;$("adminToast").hidden=false;toastTimer=setTimeout(()=>$("adminToast").hidden=true,4500);}

document.getElementById('notificationList').addEventListener('click',async event=>{const b=event.target.closest('[data-retry-notification]');if(!b||!isAdmin)return;if(!confirm('Újrapróbálod a biztosan el nem küldött értesítést?'))return;b.disabled=true;try{await httpsCallable(functions,'retryNotification')({collection:b.dataset.notificationCollection,id:b.dataset.retryNotification});await loadSource(b.dataset.notificationCollection);}catch(error){showToast(error.message||'Sikertelen újrapróbálás.');}finally{b.disabled=false;}});
