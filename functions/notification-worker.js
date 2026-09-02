"use strict";
const nodemailer=require('nodemailer');
const {getFirestore}=require('firebase-admin/firestore');
const {onDocumentCreated}=require('firebase-functions/v2/firestore');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {deliver}=require('./mail-delivery');
const configured=require('./integration-config');
const pass=configured.smtpSecretConfigured?defineSecret('SMTP_PASS'):{value:()=>''},secrets=configured.smtpSecretConfigured?[pass]:[];
const copies={information_needed:['További információ szükséges','A munka folytatásához további adatot kérünk.'],preview_ready:['Elkészült az előnézet','Az ellenőrizhető változatot az ügyféltérben találod.'],work_completed:['Elkészült az átadás','Az átadott anyagokat az ügyféltérben találod.'],maintenance_update:['Karbantartási frissítés','Frissítettük a karbantartás állapotát.']};
async function processNotification(ref) {
  const db=getFirestore();let transport;
  await deliver(db,ref,async row=>{
    if(process.env.SMTP_ENABLED!=='true'||!pass.value())throw Object.assign(Error('SMTP missing'),{code:'SMTP_NOT_CONFIGURED'});
    transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||465),secure:Number(process.env.SMTP_PORT||465)===465,auth:{user:process.env.SMTP_USER,pass:pass.value()},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});
    let to,subject,text;
    if(ref.parent.id==='internal_alerts'){to=process.env.ADMIN_EMAIL||'info@ovexi.hu';subject=`OVEXI üzemeltetési jelzés – ${row.title}`;text=`${row.message}\n\nhttps://ovexi.hu/admin`;}
    else if(ref.parent.id==='booking_notifications'){
      const booking=(await db.doc(`booking_tenants/${row.tenantId}/bookings/${row.bookingId}`).get()).data();
      const tenant=(await db.doc(`booking_tenants/${row.tenantId}`).get()).data();
      if(!booking||!tenant)throw Error('Missing booking');
      if(booking.revision!==row.revision)throw Error('Superseded notification');
      to=booking.email;subject=`${row.type==='created'?'Időpont visszaigazolása':row.type==='moved'?'Időpont módosítása':'Foglalási állapot frissítése'} – ${tenant.businessName}`;
      const date=new Date(booking.start).toLocaleString('hu-HU',{timeZone:'Europe/Budapest'});
      text=`Kedves ${booking.name}!\n\n${tenant.businessName}\n${booking.service.name}\nIdőpont: ${date} (magyarországi idő)\nÁllapot: ${{confirmed:'Visszaigazolt',cancelled:'Lemondva',completed:'Teljesítve',no_show:'Nem jelent meg'}[booking.status]}\nÁr: ${booking.service.priceHuf} Ft\n\nAz online lemondási linket a foglalás után a böngészőben tudod elmenteni. Kérdés vagy módosítás: ${tenant.contactEmail||'info@ovexi.hu'}\nEz az értesítés nem fizetési visszaigazolás.`;
    }else{
      const order=(await db.collection('orders').doc(row.orderId).get()).data();if(!order)throw Error('Missing order');
      if(row.type==='internal_customer_request'){const request=(await db.collection('customer_requests').doc(row.requestId).get()).data();to=process.env.ADMIN_EMAIL||'info@ovexi.hu';subject=`Új ügyfélkérés – ${order.orderNumber}`;text=`${order.companyName}\n\n${String(request?.message||'').slice(0,1500)}\n\nhttps://ovexi.hu/admin`;}
      else{const copy=copies[row.type];if(!copy)throw Error('Invalid type');to=order.email;subject=`${copy[0]} – ${order.orderNumber}`;text=`Szia ${order.contactName}!\n\n${copy[1]}\n${row.note||''}\n\nÜgyféltér: https://ovexi.hu/ugyfelter\nAzonosító: ${order.orderNumber}`;}
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to||'')||String(to).endsWith('.invalid'))throw Error('Invalid recipient');
    return {from:process.env.EMAIL_FROM||`OVEXI <${process.env.SMTP_USER}>`,to,replyTo:process.env.ADMIN_EMAIL||'info@ovexi.hu',subject,text:`${text}\n\nOVEXI · info@ovexi.hu`};
  },mail=>transport.sendMail(mail));
  if(ref.parent.id==='booking_notifications'){const row=(await ref.get()).data();if(row){const bookingRef=db.doc(`booking_tenants/${row.tenantId}/bookings/${row.bookingId}`);await db.runTransaction(async tx=>{const booking=(await tx.get(bookingRef)).data();if(booking?.revision===row.revision)tx.update(bookingRef,{notificationStatus:row.status});});}}
}
const opts={secrets,timeoutSeconds:120,maxInstances:2};
exports.processCustomerNotification=onDocumentCreated({...opts,document:'customer_notifications/{id}'},event=>event.data&&processNotification(event.data.ref));
exports.processBookingNotification=onDocumentCreated({...opts,document:'booking_notifications/{id}'},event=>event.data&&processNotification(event.data.ref));
exports.processInternalAlert=onDocumentCreated({...opts,document:'internal_alerts/{id}'},event=>event.data&&processNotification(event.data.ref));
exports.retryNotifications=onSchedule({...opts,maxInstances:1,schedule:'every 30 minutes',timeoutSeconds:300},async()=>{
  const db=getFirestore(),stop=Date.now()+220000;
  for(const name of ['customer_notifications','booking_notifications','internal_alerts'])for(const status of ['pending','retry','sending']){
    const field=status==='sending'?'leaseUntil':'nextAttemptAt';
    const query=db.collection(name).where('status','==',status);
    const snap=await (status==='pending'?query.orderBy('createdAt'):query.where(field,'<=',new Date()).orderBy(field)).limit(10).get();
    for(const doc of snap.docs){if(Date.now()>stop)return;await processNotification(doc.ref);}
  }
});
exports.retryNotification=onCall(opts,async request=>{
  if(request.auth?.token?.admin!==true)throw new HttpsError('permission-denied','Admin access required');
  const {collection,id}=request.data||{};
  if(!['customer_notifications','booking_notifications','internal_alerts'].includes(collection)||!/^[\w-]{1,180}$/.test(id||''))throw new HttpsError('invalid-argument','Invalid notification');
  const db=getFirestore(),ref=db.collection(collection).doc(id);
  await db.runTransaction(async tx=>{const row=(await tx.get(ref)).data();if(!row||!['blocked','retry'].includes(row.status)||row.sendStartedAt)throw new HttpsError('failed-precondition','Csak biztosan el nem küldött értesítés próbálható újra.');tx.update(ref,{status:'retry',nextAttemptAt:new Date(),updatedAt:new Date()});});
  await processNotification(ref);return {status:(await ref.get()).data().status};
});
