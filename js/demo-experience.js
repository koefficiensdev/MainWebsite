// All demo interactions are ephemeral; no network requests or personal data storage.
const dialog=document.createElement('dialog');
dialog.className='demo-detail';dialog.setAttribute('aria-label','Bemutató munkalap');
document.body.append(dialog);
function details(title,description,action,onAction){
  dialog.replaceChildren();
  const close=document.createElement('button');close.className='dialog-close';close.textContent='×';close.setAttribute('aria-label','Bezárás');close.onclick=()=>dialog.close();
  const meta=document.createElement('p');meta.className='dialog-meta';meta.textContent='OVEXI INTERAKTÍV MINTA · FIKTÍV ADATOK';
  const heading=document.createElement('h2');heading.textContent=title;
  const body=document.createElement('p');body.textContent=description;
  const result=document.createElement('p');result.setAttribute('role','status');
  dialog.append(close,meta,heading,body);
  if(action){const button=document.createElement('button');button.className='dialog-action';button.textContent=action;button.onclick=()=>{result.textContent=onAction();button.disabled=true;button.textContent='Kész a bemutatóban ✓';};dialog.append(button);}
  dialog.append(result);dialog.showModal();
}
for(const el of document.querySelectorAll('[data-form-result],[data-salon-result],[data-summary-result],[data-approve-status]'))el.setAttribute('role','status');
document.querySelector('[data-approve]')?.addEventListener('click',()=>{
  const cols=document.querySelectorAll('.board-column');
  const card=cols[1]?.querySelector('article');
  if(card){card.querySelector('em').textContent='Ügyfél jóváhagyta · ütemezhető';cols[2].append(card);cols[1].querySelector('h3 b').textContent='0';cols[2].querySelector('h3 b').textContent='3';}
  document.querySelector('.quote small').textContent='Ajánlat elfogadva · 42 800 Ft';
  const stages=document.querySelector('.stage-labels');if(stages)stages.innerHTML='<span>Igény</span><span>Átvizsgálás</span><span>Elfogadva</span><strong>Ütemezés</strong>';
});
document.querySelector('[data-garage-form]')?.addEventListener('submit',()=>{
  const form=document.querySelector('[data-garage-form]');
  if(!form.checkValidity())return;
  const col=document.querySelector('.board-column'),card=document.createElement('article'),title=document.createElement('strong'),note=document.createElement('span');
  title.textContent=form.querySelector('input').value;note.textContent=form.querySelector('textarea').value;
  card.append(title,note);col.append(card);col.querySelector('h3 b').textContent=String(col.querySelectorAll('article').length);
  form.querySelector('[data-form-result]').textContent='A fiktív igény megjelent a Műhely nézete → Új igények oszlopban. A műhely dönt a következő lépésről.';
});
const approval=document.querySelector('[data-calendar-approve]');
if(approval){const fresh=approval.cloneNode(true);approval.replaceWith(fresh);fresh.onclick=()=>details('Festés + vágás · új vendégkérés','Kívánt változás: természetes, meleg barna árnyalat és fazonfrissítés. Tervezett idő: 150 perc, 10:30–13:00. A bemutató naptárban ez a sáv szabad; az időpont csak a szalon döntése után végleges.','Időpont jóváhagyása',()=>{const card=fresh.closest('article');card.className='confirmed';card.querySelector('small').textContent='Szalon által jóváhagyva · 10:30–13:00';fresh.textContent='Részletek';return 'Az időpont véglegesként megjelent a bemutató naptárban. Valódi értesítést nem küldtünk.';});}
const dayHeading=document.querySelector('.cal-head strong');
if(dayHeading){let day=8;document.querySelectorAll('.cal-head button').forEach((button,index)=>button.onclick=()=>{day+=index?1:-1;const date=new Date(2026,8,day);dayHeading.textContent=date.toLocaleDateString('hu-HU',{month:'long',day:'numeric',weekday:'long'}).toUpperCase();document.querySelectorAll('.cal-row').forEach(row=>row.hidden=day!==8);let empty=document.querySelector('.calendar-empty');if(!empty){empty=document.createElement('p');empty.className='calendar-empty';empty.textContent='Erre a napra nincs fiktív foglalás. A bemutató kérései szeptember 8-án láthatók.';document.querySelector('.calendar').append(empty);}empty.hidden=day===8;});}
document.querySelector('[data-salon-form]')?.addEventListener('submit',()=>{const service=document.querySelector('[data-service].active');if(!service)return;const result=document.querySelector('[data-salon-result]');result.textContent=`${service.dataset.service}: a szalon átnézésére vár. A kérés még nem végleges időpont.`;});
for(const card of document.querySelectorAll('.day-board article')){
  card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`${card.querySelector('b').textContent} munkalap megnyitása`);
  const open=()=>details(card.querySelector('b').textContent,`${card.querySelector('section span').textContent}. Állapot: ${card.querySelector('em').textContent}. A szakember a helyszíni ellenőrzés és szükséges egyeztetés után indítja a munkát.`,'Munka indítása a demóban',()=>{card.querySelector('em').textContent='Folyamatban';return 'A munkalap állapota frissült a mai listában.';});
  card.onclick=open;card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}};
}
document.querySelectorAll('.side-nav button').forEach((button,index)=>{button.onclick=()=>{document.querySelectorAll('.side-nav button').forEach(b=>b.classList.toggle('active',b===button));if(index===0||index===2){document.querySelector('.workspace-top h2').textContent=index===0?'Mai munkaközpont':'Mai kiszállások';document.querySelector('[data-day-board]').scrollIntoView({block:'nearest'});}else details(button.textContent.trim(),index===1?'Az új igénylapok a szakember átnézésére várnak. Próbáld ki a fenti hibafelmérőt: az összefoglalóban megjelenik a feladattípus és a sürgősség.':index===3?'A demóban két ajánlat vár ügyféldöntésre. Elfogadás előtt a munka nem indul el.':'Ebben a fiktív napi nézetben nincs lezárt munka.');};});
for(const el of document.querySelectorAll('.hero-copy,.hero-text,.field-hero>div:first-child'))el.classList.add('demo-enter');
