"use strict";

const { getFirestore } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const domain = require("./booking-domain");
const service = require("./booking-service");

const options = { enforceAppCheck: true, maxInstances: 2, minInstances: 0, timeoutSeconds: 30,
  cors: ["https://ovexi.hu", "https://www.ovexi.hu", "https://ovexi-6ef38.web.app"] };

// Kept disabled until UI, consent, email delivery, emulator and security tests
// are complete. Merely deploying this file must never open public booking.
function assertEnabled(env = process.env) {
  if (env.BOOKING_ENABLED !== "true") throw new HttpsError("failed-precondition", "A foglalórendszer még fejlesztés alatt áll.");
}
async function rateLimit(db, tenantId, uid, now = Date.now()) {
  const hour = Math.floor(now / 3600000);
  const keys = [`global:${hour}`, `tenant:${tenantId}:${hour}`, `user:${uid}:${hour}`];
  const caps = [1000, 300, 60];
  const refs = keys.map((key) => db.collection("booking_limits").doc(domain.digest(key)));
  await db.runTransaction(async (tx) => {
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    if (snapshots.some((snapshot, i) => Number(snapshot.data()?.count || 0) >= caps[i])) domain.fail("resource-exhausted", "Túl sok kérés. Próbáld később.");
    snapshots.forEach((snapshot, i) => tx.set(refs[i], {
      count: Number(snapshot.data()?.count || 0) + 1, expiresAt: new Date(now + 86400000)
    }));
  });
}
function handler(action, database = getFirestore, env = process.env) {
  return async (request) => {
    assertEnabled(env);
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Bejelentkezés szükséges (vendégként is lehetséges).");
    if (Buffer.byteLength(JSON.stringify(request.data || {})) > 4000) throw new HttpsError("invalid-argument", "Túl nagy kérés.");
    try {
      domain.id(request.data?.tenantId);
      const db = database();
      await rateLimit(db, request.data.tenantId, request.auth.uid);
      if (["ownerDay","ownerMove","ownerStatus","ownerMoveSlots"].includes(action)) return await service[action](db, request.data, request.auth.uid);
      return await service[action](db, request.data);
    } catch (error) {
      if (error instanceof domain.BookingError) throw new HttpsError(error.code, error.message);
      // Never return Firestore paths, customer data or cancellation tokens.
      throw new HttpsError("internal", "A foglalás feldolgozása nem sikerült. Ugyanazzal a kérésazonosítóval próbáld újra.");
    }
  };
}
module.exports = { bookingAvailability: onCall(options, handler("availability")),
  bookingCreate: onCall(options, handler("createBooking")), bookingCancel: onCall(options, handler("cancelBooking")),
  bookingPublicConfig: onCall(options, handler("publicConfig")), bookingOwnerMove: onCall(options, handler("ownerMove")),
  bookingOwnerStatus: onCall(options, handler("ownerStatus")),
  bookingOwnerMoveSlots: onCall(options, handler("ownerMoveSlots")),
  bookingOwnerDay: onCall(options, handler("ownerDay")), assertEnabled, handler };

module.exports.bookingAdminSaveTenant=onCall({...options,enforceAppCheck:false},async request=>{
  if(request.auth?.token?.admin!==true)throw new HttpsError('permission-denied','Admin access required');
  if(Buffer.byteLength(JSON.stringify(request.data||{}))>50000)throw new HttpsError('invalid-argument','Túl nagy beállítás.');
  try{await require('firebase-admin/auth').getAuth().getUser(request.data?.settings?.ownerUid);return await require('./booking-settings').save(getFirestore(),request.data,request.auth.uid);}
  catch(error){if(error instanceof domain.BookingError)throw new HttpsError(error.code,error.message);throw new HttpsError('failed-precondition','Ellenőrizd a naptár tulajdonosát és beállításait.');}
});
