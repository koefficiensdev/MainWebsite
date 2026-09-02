"use strict";
const crypto = require('node:crypto');
const millis = value => value?.toMillis?.() ?? (value instanceof Date ? value.getTime() : Number(value || 0));
// Retry only when SMTP demonstrably did not accept the message. A Message-ID
// alone does not make SMTP idempotent; a lost DATA response needs reconciliation.
function failure(error, attempts = 1) {
  const rejected = Number(error?.responseCode) >= 400 && Number(error?.responseCode) < 600;
  const beforeData = ['CONN','EHLO','HELO','STARTTLS','AUTH','MAIL FROM','RCPT TO'].includes(error?.command);
  const safe = rejected || beforeData || ['EAUTH','EDNS','ECONNECTION'].includes(error?.code);
  return { status: safe ? (attempts >= 5 ? 'failed' : 'retry') : 'send_unknown',
    errorCode: safe ? 'smtp_not_accepted' : 'smtp_result_uncertain',
    nextAttemptAt: new Date(Date.now() + Math.min(86400000, 60000 * 2 ** attempts)), sendStartedAt: safe ? null : new Date() };
}
async function deliver(db, ref, build, send, now = Date.now()) {
  const owner = crypto.randomUUID();
  const row = await db.runTransaction(async tx => {
    const value = (await tx.get(ref)).data();
    if (!value || !['pending','retry','sending'].includes(value.status)) return null;
    if (millis(value.leaseUntil) > now || millis(value.nextAttemptAt) > now) return null;
    if (value.sendStartedAt || value.status==='sending'&&!value.leaseOwner) { tx.update(ref, {status:'send_unknown',errorCode:'worker_interrupted_after_send_started',updatedAt:new Date(now)}); return null; }
    tx.update(ref, {status:'sending',leaseOwner:owner,leaseUntil:new Date(now+150000),attempts:Number(value.attempts||0)+1,updatedAt:new Date(now)});
    return {...value,attempts:Number(value.attempts||0)+1};
  });
  if (!row) return;
  const finish = patch => db.runTransaction(async tx => {
    const current=(await tx.get(ref)).data();
    if(current?.leaseOwner===owner)tx.update(ref,{...patch,leaseUntil:new Date(0),updatedAt:new Date()});
  });
  let mail;
  try { mail=await build(row); }
  catch(error) { await finish({status:error?.code==='SMTP_NOT_CONFIGURED'?'blocked':'failed',errorCode:error?.code==='SMTP_NOT_CONFIGURED'?'smtp_not_configured':'message_configuration_invalid'});return; }
  await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.leaseOwner!==owner)throw Error('Lease lost');tx.update(ref,{sendStartedAt:new Date()});});
  let result;
  try { result=await send({...mail,messageId:`<${ref.parent?.id||'notification'}-${ref.id}@ovexi.hu>`}); }
  catch(error){await finish(failure(error,row.attempts));return;}
  if(Array.isArray(result?.accepted)&&result.accepted.length===0){await finish({status:'failed',errorCode:'smtp_recipient_rejected',sendStartedAt:null});return;}
  // A failed database write here deliberately leaves sendStartedAt set.
  await finish({status:'sent',sentAt:new Date(),errorCode:'',providerAccepted:true});
}
module.exports={failure,deliver,millis};
