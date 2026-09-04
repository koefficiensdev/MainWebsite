import {httpsCallable} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";
import {escapeHtml as e,safeUrl,outreachReady,outreachBlockedReason} from "./admin-model.js?v=20260831-4";
export function installOutreach({functions,getData,isAdmin,refresh,messageRows,formatDate,badge,sourceEmpty}) {
  const $=id=>document.getElementById(id), selected=new Set(), reviews=new Map(); let busy=false;
  const call=(name,data,timeout=300000)=>httpsCallable(functions,name,{timeout})(data);
  const links=url=>safeUrl(url)?`<a href="${e(safeUrl(url))}" target="_blank" rel="noopener noreferrer">Forrás megnyitása ↗</a>`:"Nincs forrás";
  const eligible=outreachReady;
  function qualificationCard(r){
    const q=r.qualification;
    if(!q||q.version!==2)return '<p class="error-note">Korábbi kutatás: nincs igazolt weboldaligény. Ez a piszkozat az új célzási feltételekkel nem küldhető.</p>';
    const evidenceText=q.evidence?.quote?`„${e(q.evidence.quote)}”`:q.evidence?.verification==="business_identity_and_email"?"A cégnév és a pontos e-mail a forrásoldalon szerveresen ellenőrizve.":"Nincs ellenőrizhető részlet.";
    return `<section class="surface"><span class="badge">${q.newBusiness?"Friss vállalkozás · elsőbbség":"Weboldaligény"}</span> <span class="badge">${q.websiteStatus==="not_found"?"Saját weboldal nem található a keresésben":"Konkrét weboldalhiányosság"}</span><h4>Miért lehet potenciális vevő?</h4><p>${e(q.needReason)}</p><p class="small">AI-előszűrés, nem bizonyított vásárlási szándék. ${q.websiteStatus==="not_found"?"A keresés eredménytelensége nem bizonyítja, hogy nincs weboldala.":"A hiányosságot jóváhagyás előtt ellenőrizd."}</p><details><summary>Bizonyítékok és keresési ellenőrzések</summary><p>${links(q.evidence?.url)} · ${evidenceText}</p>${q.websiteUrl?`<p>Vizsgált honlap: ${links(q.websiteUrl)}</p>`:""}${q.newBusiness?`<p>Alapítás / indulás: ${e(q.foundedOn)} · ${links(q.foundedEvidence?.url)} · „${e(q.foundedEvidence?.quote)}”</p>`:""}<p>Ellenőrzés: ${formatDate(q.checkedAt)}</p><ul>${(q.searchQueries||[]).map(query=>`<li>${e(query)}</li>`).join("")}</ul></details></section>`;
  }
  function counts(){const n=messageRows().filter(r=>selected.has(r.id)&&eligible(r)).length;$("approveMessages").textContent=`Kijelöltek jóváhagyása és elküldése (${n})`;$("approveMessages").disabled=busy||!n||n>10;}
  function render(){
    if(!isAdmin()){selected.clear();reviews.clear();$("outreachActionStatus").textContent="";$("researchStatus").textContent="";}
    const data=getData();
    const reasonLabels={INVALID_EMAIL:"A talált e-mail formátuma nem volt egyértelmű",UNCITED_SOURCE:"A forrás URL-je nem volt visszaigazolható",UNCITED_QUALIFICATION:"A minősítés forrása nem volt visszaigazolható",SEARCH_CHECKS_REQUIRED:"Hiányzott a két cégenkénti ellenőrző keresés",UNSUPPORTED_QUALIFICATION:"A megadott bizonyíték nem volt megtalálható a forrásban",EMAIL_NOT_ON_SOURCE:"Az e-mail nem szerepelt a forrásoldalon",SOURCE_UNAVAILABLE:"A forrásoldal nem volt letölthető",OWN_WEBSITE_CONTACT_SOURCE:"Saját weboldal volt a kapcsolat forrása",EMAIL_DOMAIN_HAS_WEBSITE:"Az e-mail domainjén weboldal működik",EXISTING_WEBSITE_EXCLUDED:"Saját weboldalt találtunk",CONTRADICTORY_QUALIFICATION:"Ellentmondó weboldaladat"};
    $("researchJobs").innerHTML=(data.outreach_research||[]).slice(0,10).map(r=>{const reasons=Object.entries(r.excludedReasons||{}).map(([key,value])=>`${reasonLabels[key]||key}: ${value}`).join(" · ");const activity=r.searchToolCalls!=null?` · Webes keresések: ${e(r.searchToolCalls)} · Források: ${e(r.citedSourceCount||0)}`:"";return `<div class="compact-row"><div><strong>${e(r.criteria)}</strong><p>${r.targetMode==="no_website"?"Weboldal nélküli":"Korábbi / megújítási keresés"} · Kért: ${e(r.count)} · Átadott jelöltek: ${e(r.examinedCandidates||0)} · Elkészült: ${e(r.found||0)}${activity} · ${formatDate(r.createdAt)}${r.estimatedCostUsd!=null?` · Becsült API-költség: ${Number(r.estimatedCostUsd).toFixed(3)} USD`:""}</p>${reasons?`<p class="small">Kihagyás okai: ${e(reasons)}</p>`:""}<p>${e(r.errorCode||"")}</p></div>${badge(r.status)}</div>`;}).join("");
    $("messagesList").innerHTML=messageRows().sort((a,b)=>Number(Boolean(b.qualification?.newBusiness))-Number(Boolean(a.qualification?.newBusiness))).map(r=>{
      const review=reviews.get(r.id)||{revision:r.revision,legalBasis:"",legalNote:""};
      if(review.revision!==r.revision){selected.delete(r.id);reviews.delete(r.id);}
      const editable=eligible(r);
      return `<article class="record-card" data-message="${e(r.id)}"><div class="record-top"><div>${badge(r.status)}<h3>${e(r.companyName)}</h3><p>${e(r.recipient)} · ${formatDate(r.sentAt||r.createdAt)}</p></div>${editable?`<label class="outreach-check"><input type="checkbox" data-select-message="${e(r.id)}" ${selected.has(r.id)?"checked":""}>Kijelölés</label>`:""}</div><div class="record-details"><div><strong>Mit csinál a cég?</strong><p>${e(r.companyDescription||"—")}</p></div><div><strong>A javasolt ajánlat</strong><p>${e(r.offer||"—")}</p></div><div><strong>Kapcsolat forrása</strong>${links(r.sourceUrl)}<p>E-mail ellenőrizve: ${formatDate(r.emailVerifiedAt)}</p></div></div>${qualificationCard(r)}<h4>${e(r.subject)}</h4><p class="preserve">${e(r.body)}</p><details><summary>Küldő, leiratkozás és napló</summary><p>Turai Sándor Attila EV · OVEXI · info@ovexi.hu<br>https://ovexi.hu · Adatkezelés: https://ovexi.hu/adatkezeles<br>Ha nem kér több megkeresést, válaszoljon: LEIRATKOZAS. A tiltást díjmentesen rögzítjük.</p><p>Küldésazonosító: ${e(r.providerMessageId||"—")}<br>Jóváhagyás: ${formatDate(r.approvedAt)}<br>Hibakód: ${e(r.errorCode||"—")}</p></details>${editable?`<div class="field-grid"><label>Megkeresés ellenőrzött alapja<select data-review-basis="${e(r.id)}"><option value="">Válassz ellenőrzés után</option><option value="corporate_role" ${review.legalBasis==="corporate_role"?"selected":""}>Jogi személy általános céges címe</option><option value="consent" ${review.legalBasis==="consent"?"selected":""}>Dokumentált előzetes hozzájárulás</option></select></label><label>Bizonyíték / ellenőrzés leírása<input data-review-note="${e(r.id)}" value="${e(review.legalNote)}" minlength="20" maxlength="1000" placeholder="Pl. céges impresszum URL, vagy hozzájárulás dátuma és helye"></label></div><p class="small">Küldés: 1. Ellenőrizd a levelet és a forrást. 2. Add meg fent a megkeresés alapját és bizonyítékát. 3. Kattints alább a „Jóváhagyom és elküldöm” gombra. Még egy címzettenkénti összefoglalót látsz a végleges küldés előtt.</p><button type="button" class="secondary" data-edit-outreach="${e(r.id)}">Levél szerkesztése</button>`:""} ${editable?`<button type="button" data-send-outreach="${e(r.id)}">Jóváhagyom és elküldöm ezt a levelet</button>`:`<p class="error-note">${e(outreachBlockedReason(r))}</p>`} <button type="button" class="secondary" data-suppress-outreach="${e(r.id)}">Címzett tiltása</button>${r.status==="send_unknown"||r.status==="sending"?'<p class="error-note">Ne küldd újra: a szolgáltató már átvehette. Ellenőrizni kell a postaládát / szolgáltatói naplót.</p>':""}</article>`;
    }).join("")||sourceEmpty("outreach_messages","Nincs küldésre kész jelölt ebben a nézetben. Indíts új kutatást fent. A régi piszkozatokat a „Régi / nem minősített” szűrő alatt találod; ezekhez nincs küldés.");
    $("repliesList").innerHTML=(data.outreach_replies||[]).map(r=>`<article class="record-card"><span class="badge">${r.kind==="unsubscribe"?"Leiratkozás · tiltva":r.kind==="automatic"?"Automatikus válasz":"Válasz · további megkeresés szünetel"}</span><h4>${e(r.companyName)} · ${e(r.subject)}</h4><p>${e(r.recipient)} · ${formatDate(r.receivedAt||r.createdAt)}</p><details><summary>Válaszlevél megnyitása</summary><p class="preserve">${e(r.body)}</p><p>Eredeti megkeresés: ${e(data.outreach_messages?.find(m=>m.id===r.messageId)?.subject||r.messageId)}</p></details></article>`).join("")||sourceEmpty("outreach_replies","Még nincs összerendelt válasz. Csak az itt jóváhagyott megkeresésekre érkező, levélazonosítóval kapcsolható válaszok jelennek meg; egyéb levelek a webmailben maradnak.");
    counts();
  }
  $("messagesList").addEventListener("input",event=>{
    const el=event.target, id=el.dataset.reviewBasis||el.dataset.reviewNote||el.dataset.selectMessage;
    if(!id)return; const row=getData().outreach_messages.find(r=>r.id===id);if(!row)return;
    const value=reviews.get(id)||{revision:row.revision,legalBasis:"",legalNote:""};
    if(el.dataset.reviewBasis)value.legalBasis=el.value;
    if(el.dataset.reviewNote)value.legalNote=el.value;
    reviews.set(id,value);
    if(el.dataset.selectMessage){if(el.checked)selected.add(id);else selected.delete(id);} counts();
  });
  $("researchForm").addEventListener("submit",async event=>{
    event.preventDefault();if(!isAdmin()||busy)return;const button=event.currentTarget.querySelector('button[type="submit"]'),raw=Object.fromEntries(new FormData(event.currentTarget));
    busy=true;button.disabled=true;counts();$("researchStatus").textContent="Kutatás folyamatban… ez több percig tarthat. Nem küldünk levelet.";
    try{const result=(await call("researchOutreach",{...raw,requestId:crypto.randomUUID()},540000)).data;$("researchStatus").textContent=result.status==="done"?`${result.found} új piszkozat elkészült. ${result.skipped||0} nem ellenőrizhető / ismételt találat kihagyva. Levél nem ment ki.`:`A kutatás nem fejeződött be: ${result.errorCode||result.status}.`;}
    catch(error){$("researchStatus").textContent=`Nem sikerült visszaigazolni a kutatást. Frissítsd a naplót, mielőtt újraindítod. ${error.message||""}`;}
    finally{busy=false;button.disabled=false;await refresh();counts();}
  });
  async function approveRows(rows){
    if(busy||!isAdmin())return;
    rows=rows.filter(eligible);
    const items=rows.map(r=>({id:r.id,...reviews.get(r.id)}));
    if(!items.length||items.length>10)return;
    if(items.some(r=>!r.legalBasis||!r.revision||String(r.legalNote||"").trim().length<20)){$("outreachActionStatus").textContent="Mindegyik kijelölt levélnél add meg az ellenőrzött megkeresési alapot és legalább 20 karakteres bizonyítékleírást.";$("outreachActionStatus").scrollIntoView({behavior:"smooth",block:"center"});return;}
    if(!confirm(`Az alábbi ${items.length} levelet MOST elküldjük az info@ovexi.hu címről:\n\n${rows.map(r=>`${r.companyName} <${r.recipient}> — ${r.subject}`).join("\n")}\n\nEllenőrizted a teljes leveleket és a megkereshetőséget?`))return;
    busy=true;counts();$("outreachActionStatus").textContent="Jóváhagyás és küldés folyamatban. Ne indítsd újra.";
    try{const {results}=(await call("approveOutreach",{items})).data;$("outreachActionStatus").textContent=results.map(r=>`${rows.find(x=>x.id===r.id)?.recipient||r.id}: ${r.status==="sent"?"a levelezőszerver átvette":r.status==="send_unknown"?"bizonytalan eredmény, nincs újraküldés":`nem küldve (${r.errorCode})`}`).join("\n");for(const r of results)selected.delete(r.id);}
    catch(error){$("outreachActionStatus").textContent=`A küldés eredménye nem igazolható. Frissítsd a naplót, ne küldd újra ellenőrzés nélkül. ${error.message||""}`;}
    finally{busy=false;await refresh();counts();}
  }
  $("approveMessages").addEventListener("click",()=>approveRows(messageRows().filter(r=>selected.has(r.id))));
  $("messagesList").addEventListener("click",async event=>{
    const el=event.target.closest("button");if(!el||busy||!isAdmin())return;
    if(el.dataset.sendOutreach){const row=getData().outreach_messages.find(r=>r.id===el.dataset.sendOutreach);if(row){el.disabled=true;try{await approveRows([row]);}finally{el.disabled=false;}}return;}
    if(el.dataset.editOutreach){const row=getData().outreach_messages.find(r=>r.id===el.dataset.editOutreach);if(!row)return;const form=$("outreachEditForm");form.dataset.recordId=row.id;form.dataset.revision=row.revision;form.elements.subject.value=row.subject;form.elements.body.value=row.body;form.querySelector(".status").textContent="";form.hidden=false;form.elements.subject.focus();return;}
    if(el.dataset.suppressOutreach&&confirm("Tiltsuk le a címzett további megkeresését? Ez nem von vissza már elindult levelet.")){el.disabled=true;try{await call("suppressOutreach",{id:el.dataset.suppressOutreach});selected.delete(el.dataset.suppressOutreach);await refresh();}catch{$("outreachActionStatus").textContent="A tiltás nem sikerült; próbáld újra.";}finally{el.disabled=false;}}
  });
  $("outreachEditForm").addEventListener("submit",async event=>{
    event.preventDefault();if(!isAdmin()||busy)return;const form=event.currentTarget,button=form.querySelector('[type="submit"]');button.disabled=true;
    try{await call("saveOutreachDraft",{id:form.dataset.recordId,revision:form.dataset.revision,...Object.fromEntries(new FormData(form))});selected.delete(form.dataset.recordId);reviews.delete(form.dataset.recordId);form.hidden=true;await refresh();}catch(error){form.querySelector(".status").textContent=error.message||"Mentés sikertelen.";}finally{button.disabled=false;}
  });
  $("syncReplies").addEventListener("click",async event=>{
    if(!isAdmin())return;const button=event.currentTarget;button.disabled=true;$("inboxStatus").textContent="Válaszok ellenőrzése…";
    try{const r=(await call("syncOutreachReplies",{})).data;$("inboxStatus").textContent=r.status==="done"?`${r.imported} új válasz. ${r.more?"További levelek várnak feldolgozásra; a következő kör folytatja.":"Szinkron kész."}`:r.status==="busy"?"Már futott / fut szinkron; egy perc múlva újra indítható.":"A postaládaszinkron sikertelen. A webmailben továbbra is ellenőrizheted a válaszokat.";await refresh();}catch{$("inboxStatus").textContent="Szinkronizálás sikertelen.";}finally{button.disabled=false;}
  });
  return {render};
}
