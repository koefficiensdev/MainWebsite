"use strict";
const {onSchedule}=require('firebase-functions/v2/scheduler'),{getFirestore}=require('firebase-admin/firestore');
const ephemeral=['customer_sessions','customer_access_limits','customer_request_limits','request_limits','booking_limits'];
// Business records, invoices, consents and customer correspondence are excluded.
exports.cleanupExpiredAccess=onSchedule({schedule:'every 24 hours',maxInstances:1,timeoutSeconds:120},async()=>{
  const db=getFirestore(),now=new Date();let removed=0;
  for(const name of ephemeral){const snap=await db.collection(name).where('expiresAt','<=',now).orderBy('expiresAt').limit(100).get();for(const doc of snap.docs){await db.runTransaction(async tx=>{const row=(await tx.get(doc.ref)).data();if(row?.expiresAt?.toMillis?.()<=now.getTime()){tx.delete(doc.ref);removed++;}});}}
  await db.collection('operations_health').doc('retention').set({removed,status:'healthy',scope:'expired_access_only',checkedAt:now,updatedAt:now,createdAt:now});
});
