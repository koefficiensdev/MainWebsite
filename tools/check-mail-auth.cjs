"use strict";
// Reads only authentication headers of messages sent by the project's own
// address, in read-only mode. No bodies, passwords or unrelated mail are logged.
async function main(){const {secret}=await require('./firebase-client.cjs').client(),client=require('../functions/outreach-inbox').inboxClient(await secret('SMTP_PASS'));try{await client.connect();await client.mailboxOpen('INBOX',{readOnly:true});const ids=(await client.search({from:'info@ovexi.hu'},{uid:true})).slice(-5),selectors=new Set();let signed=0,authPass=0;
  for(const id of ids){const row=await client.fetchOne(id,{headers:['dkim-signature','authentication-results']},{uid:true}),headers=row?.headers?.toString('utf8')||'';if(/dkim-signature:/i.test(headers)){signed++;const selector=headers.replace(/\r?\n\s+/g,' ').match(/\bs=([a-zA-Z0-9_-]+)/);if(selector)selectors.add(selector[1]);}if(/dkim=pass/i.test(headers))authPass++;}
  const dns=require('node:dns').promises,results=[];for(const selector of selectors){try{results.push({selector,published:(await dns.resolveTxt(selector+'._domainkey.ovexi.hu')).flat().some(s=>s.includes('p='))});}catch{results.push({selector,published:false});}}
  console.log(JSON.stringify({readOnly:true,bodiesRead:0,ownMessagesChecked:ids.length,dkimSigned:signed,dkimPass:authPass,selectors:results}));
}finally{await client.logout().catch(()=>client.close());}}
main().catch(()=>{console.error('Mail authentication headers unavailable; no message sent.');process.exitCode=1;});
