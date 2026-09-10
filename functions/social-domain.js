"use strict";
const crypto=require('node:crypto');
const PLATFORMS=['instagram','facebook','tiktok','youtube'];
function fail(message,code='invalid-argument'){throw Object.assign(new Error(message),{code});}
function id(value){if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{12,80}$/.test(value))fail('Hibás azonosító.');return value;}
function string(value,max,label){if(typeof value!=='string'||value.length>max)fail(`${label}: túl hosszú vagy hiányzó érték.`);return value.trim();}
function metadata(raw){
 const title=string(raw.title||'',100,'Cím'),description=string(raw.description||'',2200,'Leírás');
 const tags=string(raw.hashtags||'',800,'Hashtagek').split(/[\s,]+/).filter(Boolean).map(x=>x.replace(/^#+/,''));
 if(tags.length>30||tags.some(t=>!/^\p{L}[\p{L}\p{N}_]*$/u.test(t)))fail('Legfeljebb 30 hashtag adható meg; betűvel kezdődjenek, szóköz nélkül.');
 const hashtags=[...new Set(tags)].map(t=>'#'+t).join(' '),content=[description,hashtags].filter(Boolean).join('\n\n');
 if(!content||content.length>2200)fail('A leírás és a hashtagek együtt 1–2200 karakter hosszúak lehetnek.');
 const targets=raw.targets;
 if(!Array.isArray(targets)||!targets.length||targets.length>4||targets.some(t=>!PLATFORMS.includes(t))||new Set(targets).size!==targets.length)fail('Válassz legalább egy célplatformot.');
 if(targets.includes('youtube')&&!title)fail('A YouTube-videóhoz cím is szükséges.');
 const youtubeVisibility=raw.youtubeVisibility||'';
 if(targets.includes('youtube')&&!['public','unlisted','private'].includes(youtubeVisibility))fail('Válaszd ki a YouTube láthatóságát.');
 if(targets.includes('youtube')&&typeof raw.madeForKids!=='boolean')fail('Jelöld, hogy gyermekeknek készült-e a videó.');
 const settings=raw.tiktok||{};
 return {title,description,hashtags,content,targets,youtubeVisibility,madeForKids:raw.madeForKids===true,synthetic:raw.synthetic===true,tiktok:{privacy_level:String(settings.privacy_level||''),allow_comment:settings.allow_comment===true,allow_duet:settings.allow_duet===true,allow_stitch:settings.allow_stitch===true,commercialContentType:['none','brand_organic','brand_content'].includes(settings.commercialContentType)?settings.commercialContentType:'none'}};
}
function video(raw){const size=Number(raw.size),duration=Number(raw.duration),width=Number(raw.width),height=Number(raw.height);if(!Number.isSafeInteger(size)||size<1000||size>500*1024*1024)fail('A videó legfeljebb 500 MB lehet.');if(raw.contentType!=='video/mp4')fail('MP4-videót válassz.');if(!Number.isFinite(duration)||duration<3||duration>180)fail('A közös rövidvideó-feltöltéshez 3–180 másodperces videó szükséges.');if(!Number.isInteger(width)||!Number.isInteger(height)||width<360||height<640||width/height<.54||width/height>.59)fail('Álló, 9:16 arányú videót válassz (például 1080×1920).');return {size,duration,width,height,contentType:'video/mp4',filename:string(raw.filename,180,'Fájlnév')};}
function creatorCheck(meta,asset,info){
 if(info?.creator?.canPostMore!==true)fail('A TikTok-fiók most nem fogadhat új közzétételt.','failed-precondition');
 if(!info.privacyLevels?.some(x=>x.value===meta.tiktok.privacy_level))fail('Frissítsd a TikTok-fiók adatait, és válassz láthatóságot.');
 if(!Number.isFinite(info.postingLimits?.maxVideoDurationSec)||asset.duration>info.postingLimits.maxVideoDurationSec)fail('Ez a videó hosszabb a TikTok-fiók engedélyezett korlátjánál.');
 for(const key of ['allow_comment','allow_duet','allow_stitch'])if(meta.tiktok[key]&&info.postingLimits?.interactionSettings?.[key]?.enabled!==true)fail('Az egyik TikTok-interakció nincs engedélyezve a fiókban.');
 if(!info.commercialContentTypes?.some(x=>x.value===meta.tiktok.commercialContentType))fail('Ez a kereskedelmi tartalomjelölés nem érhető el a TikTok-fiókban.');
 if(meta.tiktok.commercialContentType==='brand_content'&&meta.tiktok.privacy_level==='SELF_ONLY')fail('Fizetett együttműködés nem lehet csak saját magadnak látható.');
}
function payload(meta,asset,accounts){
 if(meta.targets.includes('facebook')&&asset.duration>60)fail('A szolgáltató Facebook Reels kapcsolata legfeljebb 60 másodpercet fogad. Vágd rövidebbre, vagy vedd ki a Facebookot.');
 if(meta.targets.includes('instagram')&&(asset.duration>90||asset.size>300*1024*1024))fail('Az Instagram Reels kapcsolathoz legfeljebb 90 másodperces, 300 MB-os videót válassz.');
 return {content:meta.content,mediaItems:[{type:'video',url:asset.publicUrl}],platforms:meta.targets.map(platform=>{
 const account=accounts.find(a=>a.platform===platform&&a.isActive===true);if(!account)fail(`Nincs csatlakoztatott ${platform}-fiók.`,'failed-precondition');
 const platformSpecificData=platform==='youtube'?{title:meta.title,visibility:meta.youtubeVisibility,madeForKids:meta.madeForKids,containsSyntheticMedia:meta.synthetic}:platform==='facebook'?{contentType:'reel'}:platform==='instagram'?{shareToFeed:true}:{};
 return {platform,accountId:account._id,platformSpecificData};
 }),...(meta.targets.includes('tiktok')?{tiktokSettings:{...meta.tiktok,video_made_with_ai:meta.synthetic,content_preview_confirmed:true,express_consent_given:true}}:{}),publishNow:true};
}
const fingerprint=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function publicPost(post){
 const states=['draft','pending','scheduled','publishing','published','partial','failed','cancelled'];
 return {providerId:id(post._id),providerStatus:states.includes(post.status)?post.status:'pending',platforms:(post.platforms||[]).filter(p=>PLATFORMS.includes(p.platform)).map(p=>({platform:p.platform,status:states.includes(p.status)?p.status:'pending',url:socialUrl(p.platformPostUrl),error:p.error||p.errorMessage?'A platform hibát jelzett. Ellenőrizd a csatlakozást a szolgáltatónál.':null}))};
}
function socialUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['instagram.com','facebook.com','tiktok.com','youtube.com','youtu.be'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h))?u.href:null;}catch{return null;}}
function analytics(raw){return {syncStatus:['synced','pending','partial','unavailable'].includes(raw.syncStatus)?raw.syncStatus:'unavailable',platforms:(raw.platformAnalytics||[]).filter(p=>PLATFORMS.includes(p.platform)).map(p=>({platform:p.platform,syncStatus:p.syncStatus||'unavailable',metrics:Object.fromEntries(['views','likes','comments','shares','impressions','reach','saves'].map(k=>[k,p.syncStatus==='synced'&&typeof p.analytics?.[k]==='number'&&Number.isFinite(p.analytics[k])&&p.analytics[k]>=0?p.analytics[k]:null]))}))};}
module.exports={PLATFORMS,id,metadata,video,creatorCheck,payload,fingerprint,publicPost,analytics,fail};
