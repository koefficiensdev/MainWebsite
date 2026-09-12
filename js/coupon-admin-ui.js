const escape=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
const date=value=>value?new Date(value).toLocaleString("hu-HU",{timeZone:"Europe/Budapest",dateStyle:"short",timeStyle:"short"}):"—";
const errorText=error=>String(error?.message||"A művelet nem sikerült.").replace(/^Firebase:\s*/i,"").slice(0,260);

export function installCouponAdmin({call,isAdmin,notify}){
  const root=document.getElementById("couponAdmin"),form=document.getElementById("couponForm"),list=document.getElementById("couponList"),status=document.getElementById("couponStatus"),metrics=document.getElementById("couponMetrics");
  let rows=[],loading=false;
  if(!root||!form||!list||!status||!metrics)return {load:async()=>{},reset(){}};

  function render(){
    const redeemed=rows.reduce((sum,row)=>sum+Number(row.redeemedCount||0),0),applied=rows.reduce((sum,row)=>sum+Number(row.appliedCount||0),0);
    metrics.innerHTML=`<div class="metric"><span>Aktív kuponok</span><strong>${rows.filter(row=>row.active).length}</strong><small>Jelenleg beváltható</small></div><div class="metric"><span>Sikeres beváltások</span><strong>${redeemed}</strong><small>Stripe által visszaigazolt vásárlás</small></div><div class="metric"><span>Alkalmazott rendelések</span><strong>${applied}</strong><small>Beküldött, kupont használó rendelések</small></div>`;
    if(loading){list.innerHTML='<div class="empty">Kuponok betöltése…</div>';return;}
    list.innerHTML=rows.map(row=>{
      const benefits=[row.domainYears?`${row.domainYears} év domain`:"",row.hostingYears?`${row.hostingYears} év tárhely`:"",row.discountPercent?`${row.discountPercent}% weboldalkedvezmény`:""].filter(Boolean).join(" · ");
      return `<article class="record-card"><div class="record-top"><div><span class="badge ${row.active?"":"warning"}">${row.active?"Aktív":"Inaktív"}</span><h3>${escape(row.code)}</h3><p>${escape(row.name)} · Létrehozva: ${escape(date(row.createdAt))}</p></div><div class="record-total">${Number(row.redeemedCount||0)} beváltás<br><span class="muted">${Number(row.appliedCount||0)} rendelésben alkalmazva</span></div></div><div class="record-details"><div><strong>Kedvezmények</strong>${escape(benefits)}</div><div><strong>Sikeres vásárlás</strong>${Number(row.redeemedCount||0)} alkalom</div><div><strong>Utolsó módosítás</strong>${escape(date(row.updatedAt))}</div></div><div class="record-actions"><button type="button" class="${row.active?"secondary":""}" data-coupon-toggle="${escape(row.code)}" data-next-active="${row.active?"false":"true"}">${row.active?"Kupon kikapcsolása":"Kupon aktiválása"}</button></div></article>`;
    }).join("")||'<div class="empty">Még nincs adminból létrehozott kupon.</div>';
  }

  async function load(){
    if(!isAdmin())return;loading=true;render();status.textContent="";
    try{const result=await call({action:"list"});rows=Array.isArray(result.coupons)?result.coupons:[];}
    catch(error){status.textContent=errorText(error);}
    finally{loading=false;render();}
  }

  form.addEventListener("submit",async event=>{
    event.preventDefault();if(!isAdmin())return;
    const button=form.querySelector('[type="submit"]'),values=Object.fromEntries(new FormData(form));
    const coupon={code:values.code,name:values.name,domainYears:Number(values.domainYears),hostingYears:Number(values.hostingYears),discountPercent:Number(values.discountPercent)};
    button.disabled=true;status.textContent="Kupon létrehozása…";
    try{await call({action:"create",coupon});form.reset();status.textContent="";notify("A kupon létrejött és azonnal használható.");await load();}
    catch(error){status.textContent=errorText(error);}
    finally{button.disabled=false;}
  });

  list.addEventListener("click",async event=>{
    const button=event.target.closest("[data-coupon-toggle]");if(!button||!isAdmin())return;
    const active=button.dataset.nextActive==="true",code=button.dataset.couponToggle;
    if(!confirm(`${active?"Aktiválod":"Kikapcsolod"} a(z) ${code} kupont?`))return;
    button.disabled=true;status.textContent="Kupon állapotának mentése…";
    try{await call({action:"setActive",code,active});status.textContent="";notify(active?"A kupon aktív.":"A kupon kikapcsolva.");await load();}
    catch(error){status.textContent=errorText(error);button.disabled=false;}
  });

  render();
  return {load,reset(){rows=[];loading=false;form.reset();status.textContent="";render();}};
}
