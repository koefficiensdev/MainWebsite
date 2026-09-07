const ms=value=>value?.toMillis?value.toMillis():value?.seconds!=null?Number(value.seconds)*1000:new Date(value||0).getTime();
const day=value=>{const time=ms(value);return Number.isFinite(time)?new Date(time).toLocaleDateString('sv-SE',{timeZone:'Europe/Budapest'}):'';};
const countBy=(rows,keyFn)=>{const map=new Map();for(const row of rows){const key=keyFn(row)||'Ismeretlen';map.set(key,(map.get(key)||0)+1);}return [...map].sort((a,b)=>b[1]-a[1]);};
export function deviceType(event){const ua=String(event.userAgent||'');const width=Number(event.screenW||event.viewportW||0);if(/ipad|tablet/i.test(ua)||(/android/i.test(ua)&&!/mobile/i.test(ua)))return'Tablet';if(/mobile|iphone|android/i.test(ua)||width&&width<700)return'Mobil';return'Asztali gép';}
export function browserName(event){const ua=String(event.userAgent||'');if(/Edg\//.test(ua))return'Edge';if(/OPR\//.test(ua))return'Opera';if(/Firefox\//.test(ua))return'Firefox';if(/Chrome\//.test(ua))return'Chrome';if(/Safari\//.test(ua))return'Safari';return'Egyéb';}
export function sourceName(value){const source=String(value||'direct');if(source==='direct')return'Közvetlen';if(source==='google_organic')return'Google kereső';if(source==='bing_organic')return'Bing kereső';if(source==='google_ads')return'Google Ads';if(source==='meta_ads')return'Meta hirdetés';if(source==='social')return'Közösségi oldal';if(source==='internal')return'Belső oldal';if(source.startsWith('utm:'))return source.slice(4);if(source.startsWith('referral:'))return source.slice(9);return source;}
export function analyzeAnalytics(input,from='',to=''){
  const rows=(input||[]).filter(row=>{const d=day(row.createdAt);return d&&(!from||d>=from)&&(!to||d<=to);});
  const views=rows.filter(row=>row.eventType==='page_view'),sessionIds=new Set(rows.map(row=>row.sessionId).filter(Boolean));
  const firstViewBySession=new Map();for(const row of [...views].sort((a,b)=>ms(a.createdAt)-ms(b.createdAt)))if(row.sessionId&&!firstViewBySession.has(row.sessionId))firstViewBySession.set(row.sessionId,row);
  const sessionViews=new Map(),duration=new Map();for(const row of views)sessionViews.set(row.sessionId,(sessionViews.get(row.sessionId)||0)+1);for(const row of rows.filter(r=>r.eventType==='session_engagement'))duration.set(row.sessionId,Math.max(duration.get(row.sessionId)||0,Number.parseInt(row.value,10)||0));
  const clicks=rows.filter(row=>row.eventType==='click'),conversionTypes=['proposal_submitted','order_submitted'];
  const conversions=rows.filter(row=>conversionTypes.includes(row.eventType));
  const shortSessions=[...sessionIds].filter(id=>(sessionViews.get(id)||0)<=1&&(duration.get(id)||0)<10&&!rows.some(r=>r.sessionId===id&&['click','add_to_cart',...conversionTypes].includes(r.eventType))).length;
  const durations=[...duration.values()],averageDuration=durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length):0;
  const scrollSet=threshold=>new Set(rows.filter(r=>r.eventType==='scroll_depth'&&Number.parseInt(r.value,10)>=threshold).map(r=>r.sessionId).filter(Boolean)).size;
  const pathViews=countBy(views,r=>r.pagePath||'/').map(([label,value])=>({label,value,sessions:new Set(views.filter(x=>(x.pagePath||'/')===label).map(x=>x.sessionId)).size}));
  const sources=countBy([...firstViewBySession.values()],r=>sourceName(r.source)).map(([label,value])=>({label,value}));
  const referrers=countBy([...firstViewBySession.values()].filter(r=>r.referrer),r=>{try{return new URL(r.referrer).hostname.replace(/^www\./,'');}catch{return'';}}).map(([label,value])=>({label,value}));
  const devices=countBy([...firstViewBySession.values()],deviceType).map(([label,value])=>({label,value}));
  const browsers=countBy([...firstViewBySession.values()],browserName).map(([label,value])=>({label,value}));
  const targets=countBy(clicks,r=>r.value||r.target||'Ismeretlen').map(([label,value])=>({label,value}));
  const trends=countBy(views,r=>day(r.createdAt)).sort((a,b)=>a[0].localeCompare(b[0])).map(([label,value])=>({label,value}));
  const eventSessions=type=>new Set(rows.filter(r=>r.eventType===type).map(r=>r.sessionId).filter(Boolean)).size;
  return {rows,metrics:{events:rows.length,sessions:sessionIds.size,views:views.length,conversions:conversions.length,conversionRate:sessionIds.size?conversions.length/sessionIds.size*100:0,averageDuration,shortRate:sessionIds.size?shortSessions/sessionIds.size*100:0,scroll50:scrollSet(50),scroll75:scrollSet(75)},pages:pathViews,sources,referrers,devices,browsers,targets,trends,funnel:[{label:'Látogató',value:sessionIds.size},{label:'Legalább 30 mp',value:[...duration.values()].filter(v=>v>=30).length},{label:'CTA-kattintás',value:new Set(clicks.map(r=>r.sessionId).filter(Boolean)).size},{label:'Kosárba tette',value:eventSessions('add_to_cart')},{label:'Ajánlat / rendelés',value:new Set(conversions.map(r=>r.sessionId).filter(Boolean)).size}]};
}
