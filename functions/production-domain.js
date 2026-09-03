"use strict";
const crypto=require('node:crypto');
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function requirements(ids){const packs={'marketing-mini':{posts:8,blogs:0,emails:0},'marketing-start':{posts:12,blogs:0,emails:0},'marketing-pro':{posts:20,blogs:2,emails:0},'marketing-max':{posts:30,blogs:4,emails:2},'marketing-launch':{posts:10,blogs:0,emails:0},'marketing-month':{posts:16,blogs:0,emails:0},'marketing-campaign':{posts:12,blogs:0,emails:2}};return ids.reduce((sum,id)=>{const p=packs[id];return p?{posts:sum.posts+p.posts,blogs:sum.blogs+p.blogs,emails:sum.emails+p.emails}:sum;},{posts:0,blogs:0,emails:0});}
function text(value,max=2000){if(typeof value!=='string'||value.length>max)throw Object.assign(Error('Túl hosszú vagy hibás tartalom.'),{code:'invalid-argument'});return value.trim();}
function contentFor(order,input={}) {
  const company=text(order.companyName||'',160),description=text(input.description??order.businessDescription??'',4000);
  if(company.length<2||description.length<10)throw Object.assign(Error('A cégnév és legalább tíz karakteres bemutatás szükséges.'),{code:'failed-precondition'});
  const headline=text(input.headline??company,160),contactUrl=text(input.contactUrl??'',500);
  if(contactUrl){const url=new URL(contactUrl);if(url.protocol!=='https:'||url.username||url.password)throw Object.assign(Error('HTTPS kapcsolat szükséges.'),{code:'invalid-argument'});}
  if(input.accent&&!/^#[a-f0-9]{6}$/i.test(input.accent))throw Object.assign(Error('Hibás szín.'),{code:'invalid-argument'});
  const services=(input.services||[]);if(!Array.isArray(services)||services.length>12)throw Object.assign(Error('Legfeljebb 12 szolgáltatás adható meg.'),{code:'invalid-argument'});
  const posts=input.posts||[
    {title:`Bemutatkozik: ${company}`,body:description,channel:'Facebook',day:1},
    {title:`Ismerd meg: ${company}`,body:description,channel:'Instagram',day:8},
    {title:'Kérdésed van?',body:`Tudj meg többet a(z) ${company} szolgáltatásairól.`,channel:'Facebook',day:15},
    {title:'Beszéljünk az igényedről',body:`${company}\n${description}`,channel:'Instagram',day:22}
  ];
  if(!Array.isArray(posts)||posts.length>80)throw Object.assign(Error('Legfeljebb 80 bejegyzés adható meg.'),{code:'invalid-argument'});
  const articles=(value,max)=>{if(!Array.isArray(value)||value.length>max)throw Object.assign(Error('Hibás cikklista.'),{code:'invalid-argument'});return value.map(p=>({title:text(p.title,160),body:text(p.body,12000)}));};
  return {company,headline,description,contactUrl,accent:input.accent||'#116457',
    services:services.map(s=>({title:text(s.title,120),description:text(s.description,1000)})),blogs:articles(input.blogs||[],8),emailDrafts:articles(input.emailDrafts||[],8),
    posts:posts.map((p,i)=>({title:text(p.title,160),body:text(p.body,4000),channel:text(p.channel||'Facebook',50),day:Number.isInteger(p.day)&&p.day>=1&&p.day<=31?p.day:i+1}))};
}
const css=`*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f6f5f0;color:#18322b;font:18px/1.65 system-ui,sans-serif}a{color:inherit}header,main,footer{max-width:1120px;margin:auto;padding:28px}header{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}header a{text-decoration:none;font-weight:700}.hero{padding:80px 0 68px;max-width:850px}h1{font-size:clamp(40px,7vw,86px);line-height:1.05;letter-spacing:-.045em;margin:20px 0 30px;overflow-wrap:anywhere}h2{font-size:34px;line-height:1.2}h3{font-size:24px;line-height:1.3}.eyebrow{font-size:13px;letter-spacing:.15em;text-transform:uppercase}.lead{font-size:22px;white-space:pre-line;overflow-wrap:anywhere}.button{display:inline-block;background:var(--accent);color:white;padding:14px 24px;border-radius:8px;text-decoration:none;margin:20px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px}article{padding:28px;background:white;border:1px solid #d9e2dc;border-radius:16px;overflow-wrap:anywhere}article p{white-space:pre-line}.band{padding:36px;border-radius:16px;background:#e4eee6;margin:40px 0}footer{border-top:1px solid #d9e2dc;font-size:14px}.draft{font-size:13px;background:#e5eadf;padding:10px 28px;text-align:center}a:focus-visible{outline:3px solid #b06708;outline-offset:5px}@media(max-width:600px){header,main,footer{padding:20px}.hero{padding:35px 0}.band{padding:24px}.lead{font-size:19px}}`;
function page(title,body,c){return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="description" content="${e(c.description.slice(0,160))}"><title>${e(title)}</title><style>:root{--accent:${c.accent}}${css}</style></head><body><div class="draft">Ellenőrizhető változat · közzététel előtt jóváhagyás szükséges</div>${body}</body></html>`;}
const csvCell=v=>'"'+String(/^[\s]*[=+@\-]/.test(String(v))?'\''+v:v).replace(/"/g,'""')+'"';
function build(order,input={}) {
  const c=contentFor(order,input),files={};
  files['index.html']=page(c.headline,`<header><a href="#">${e(c.company)}</a><a href="#bemutatkozas">Bemutatkozás</a>${c.services.length?'<a href="#szolgaltatasok">Szolgáltatások</a>':''}</header><main><section class="hero" id="bemutatkozas"><span class="eyebrow">${e(c.company)}</span><h1>${e(c.headline)}</h1><p class="lead">${e(c.description)}</p>${c.contactUrl?`<a class="button" href="${e(c.contactUrl)}" rel="noopener noreferrer">Kapcsolatfelvétel</a>`:''}</section>${c.services.length?`<section id="szolgaltatasok"><h2>Szolgáltatások</h2><div class="grid">${c.services.map(s=>`<article><h3>${e(s.title)}</h3><p>${e(s.description)}</p></article>`).join('')}</div></section>`:''}${c.contactUrl?`<section class="band"><h2>Beszéljünk az igényedről</h2><a class="button" href="${e(c.contactUrl)}" rel="noopener noreferrer">Elérhetőségek</a></section>`:''}</main><footer>${e(c.company)}</footer>`,c);
  files['marketing.html']=page(`${c.company} – tartalomterv`,`<header><strong>${e(c.company)}</strong><span>Marketinganyagok · szerkeszthető változat</span></header><main><h1>Tartalomterv</h1><p>A napok javasolt sorrendet jelölnek. A szövegek a megadott cégbemutatásból készültek; a publikálás és a csatornafiókok összekötése külön lépés.</p><div class="grid">${c.posts.map(p=>`<article><div style="width:100%">${creative(c,p,1080).replace('width="1080" height="1080"','width="100%" height="auto"')}</div><span class="eyebrow">${p.day}. nap · ${e(p.channel)}</span><h2>${e(p.title)}</h2><p>${e(p.body)}</p></article>`).join('')}</div>${c.blogs.map(p=>`<article><h2>${e(p.title)}</h2><p>${e(p.body)}</p></article>`).join('')}${c.emailDrafts.map(p=>`<article><span class="eyebrow">Hírlevéltervezet</span><h2>${e(p.title)}</h2><p>${e(p.body)}</p></article>`).join('')}</main>`,c);
  if((order.itemIds||[]).some(id=>['website-business','website-pro'].includes(id))){
    const nav=`<header><a href="index.html">${e(c.company)}</a><a href="rolunk.html">Rólunk</a><a href="szolgaltatasok.html">Szolgáltatások</a><a href="kapcsolat.html">Kapcsolat</a></header>`;
    files['index.html']=files['index.html'].replace(/<header>[\s\S]*?<\/header>/,nav);
    files['rolunk.html']=page(`${c.company} – rólunk`,`${nav}<main><h1>Rólunk</h1><p class="lead">${e(c.description)}</p></main>`,c);
    files['szolgaltatasok.html']=page(`${c.company} – szolgáltatások`,`${nav}<main><h1>Szolgáltatások</h1><div class="grid">${c.services.map(s=>`<article><h2>${e(s.title)}</h2><p>${e(s.description)}</p></article>`).join('')}</div></main>`,c);
    files['kapcsolat.html']=page(`${c.company} – kapcsolat`,`${nav}<main><h1>Kapcsolat</h1>${c.contactUrl?`<a class="button" href="${e(c.contactUrl)}">Kapcsolatfelvétel</a>`:'<p>A nyilvános elérhetőségek egyeztetésre várnak.</p>'}</main>`,c);
  }
  files['tartalomnaptar.csv']='\ufeff'+[['Nap','Csatorna','Cím','Szöveg','Állapot'],...c.posts.map(p=>[p.day,p.channel,p.title,p.body,'Jóváhagyásra vár'])].map(r=>r.map(csvCell).join(';')).join('\r\n');
  files['content.json']=JSON.stringify(c,null,2);
  for(const [kind,list] of [['blog',c.blogs],['hirlevel',c.emailDrafts]])list.forEach((item,i)=>{files[`${kind}-${i+1}.txt`]=item.title+'\n\n'+item.body;});
  c.posts.forEach((post,i)=>{for(const height of [1080,1350])files[`kreativ-${i+1}-${height}.svg`]=creative(c,post,height);});
  const missing=[];if(!c.contactUrl)missing.push('Nyilvános kapcsolatfelvételi URL');if(!c.services.length)missing.push('Végleges szolgáltatáslista és leírások');
  const needed=requirements(order.itemIds||[]);if(c.posts.length<needed.posts||c.blogs.length<needed.blogs||c.emailDrafts.length<needed.emails)missing.push(`A csomag teljes tartalma: ${needed.posts} poszt, ${needed.blogs} blog, ${needed.emails} e-mail; jelenleg ${c.posts.length}/${c.blogs.length}/${c.emailDrafts.length} készült.`);
  if((order.itemIds||[]).some(id=>['website-shop','website-pro','website-business'].includes(id)))missing.push('A kiválasztott csomag további oldalainak, üzleti moduljának vagy webshopjának egyedi specifikációja és megvalósítása');
  missing.push('Ügyfél által jóváhagyott tartalom és jogi oldalak','Végleges domain/tárhely és publikálási döntés');
  const manifest={schemaVersion:1,kind:'static-draft',generator:'ovexi-template-v1',files:Object.entries(files).map(([name,value])=>({name,bytes:Buffer.byteLength(value),sha256:crypto.createHash('sha256').update(value).digest('hex')})),missing,quality:{htmlEscaped:true,scripts:false,externalAssets:false,responsive:true}};
  files['manifest.json']=JSON.stringify(manifest,null,2);
  return {content:c,files,manifest};
}
function creative(c,post,height){
  function lines(value,width,count){const words=value.split(/\s+/),out=[''];for(const word of words){if(out.at(-1).length+word.length>width)out.push('');out[out.length-1]+=(out.at(-1)?' ':'')+word;}return out.slice(0,count);}
  const title=lines(post.title,23,4),body=lines(post.body,42,5),company=lines(c.company,40,2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}" role="img" aria-label="${e(post.title)}"><rect width="1080" height="${height}" fill="#f6f5f0"/><rect x="0" y="0" width="24" height="${height}" fill="${c.accent}"/><circle cx="1020" cy="${height-80}" r="260" fill="${c.accent}" opacity=".10"/><g font-family="Arial,sans-serif" fill="#18322b">${company.map((line,i)=>`<text x="85" y="${95+i*30}" font-size="25">${e(line)}</text>`).join('')}${title.map((line,i)=>`<text x="85" y="${250+i*85}" font-size="68" font-weight="700">${e(line)}</text>`).join('')}${body.map((line,i)=>`<text x="85" y="${650+i*47}" font-size="34">${e(line)}</text>`).join('')}<text x="85" y="${height-80}" font-size="24">${e(post.channel)}</text></g></svg>`;
}
module.exports={build,contentFor,requirements};
