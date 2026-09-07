"use strict";
const {onSchedule}=require('firebase-functions/v2/scheduler'),{getFirestore}=require('firebase-admin/firestore');
const ephemeral=['customer_sessions','customer_access_limits','customer_request_limits','request_limits','booking_limits'];
// Business records, invoices, consents and customer correspondence are excluded.
exports.cleanupExpiredAccess=onSchedule({schedule:'every 24 hours',maxInstances:1,timeoutSeconds:120},async()=>{
  const db=getFirestore(),now=new Date();let removed=0,removedAnalytics=0;
  for(const name of ephemeral){const snap=await db.collection(name).where('expiresAt','<=',now).orderBy('expiresAt').limit(100).get();for(const doc of snap.docs){await db.runTransaction(async tx=>{const row=(await tx.get(doc.ref)).data();if(row?.expiresAt?.toMillis?.()<=now.getTime()){tx.delete(doc.ref);removed++;}});}}
  const analyticsCutoff=new Date(now);analyticsCutoff.setUTCMonth(analyticsCutoff.getUTCMonth()-14);
  for(let page=0;page<10;page++){const snap=await db.collection('analytics_events').where('createdAt','<=',analyticsCutoff).orderBy('createdAt').limit(100).get();if(snap.empty)break;const batch=db.batch();snap.docs.forEach(doc=>batch.delete(doc.ref));await batch.commit();removedAnalytics+=snap.size;if(snap.size<100)break;}
  await db.collection('operations_health').doc('retention').set({removed,removedAnalytics,analyticsCutoff,status:'healthy',scope:'expired_access_and_14_month_analytics',checkedAt:now,updatedAt:now,createdAt:now});
});
