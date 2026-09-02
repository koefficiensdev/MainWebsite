"use strict";

const crypto = require("node:crypto");
const domain = require("./booking-domain");

function tenantRef(db, tenantId) { return db.collection("booking_tenants").doc(domain.id(tenantId)); }
function queueBooking(tx,db,tenant,booking,type,now){
  if(tenant.notificationEmailEnabled!==true)return;
  tx.create(db.collection('booking_notifications').doc(domain.digest(`${booking.tenantId}:${booking.id}:${booking.revision}`)),{tenantId:booking.tenantId,bookingId:booking.id,revision:booking.revision,type,status:'pending',attempts:0,nextAttemptAt:new Date(now),createdAt:new Date(now),updatedAt:new Date(now)});
}
function activeTenant(snapshot) {
  if (!snapshot.exists || snapshot.data().enabled !== true) domain.fail("not-found", "A foglalás jelenleg nem elérhető.");
  const tenant = snapshot.data();
  if (typeof tenant.ownerUid !== "string" || !tenant.ownerUid || typeof tenant.privacyVersion !== "string" || !tenant.privacyVersion.trim()) {
    domain.fail("failed-precondition", "A naptár tulajdonosa vagy adatkezelési beállítása hiányzik.");
  }
  return tenant;
}
function ledgerEntries(snapshot) {
  const entries = snapshot.data()?.entries || [];
  // Fail closed rather than silently advertise availability over corrupt data.
  if (!Array.isArray(entries) || entries.length > 288 || entries.some((entry) => !entry || typeof entry.id !== "string"
    || !Number.isSafeInteger(entry.startMs) || !Number.isSafeInteger(entry.endMs) || entry.endMs <= entry.startMs)) {
    domain.fail("failed-precondition", "A naptár ellenőrzést igényel.");
  }
  return entries;
}

async function availability(db, { tenantId, serviceId, date }, now = Date.now()) {
  domain.dateKey(date); domain.id(serviceId);
  const ref = tenantRef(db, tenantId);
  return db.runTransaction(async (tx) => {
    const [tenant, day] = await Promise.all([tx.get(ref), tx.get(ref.collection("days").doc(date))]);
    const settings = activeTenant(tenant);
    return { timeZone: "Europe/Budapest", slots: domain.availableSlots(settings, serviceId, date, ledgerEntries(day), now)
      .map(({ start, end }) => ({ start, end })) };
  });
}

async function createBooking(db, input, now = Date.now()) {
  const clean = domain.requestInput(input);
  const ref = tenantRef(db, clean.tenantId);
  const bookingId = domain.digest(clean.requestId);
  const bookingRef = ref.collection("bookings").doc(bookingId);
  const dayRef = ref.collection("days").doc(clean.date);
  return db.runTransaction(async (tx) => {
    const [tenantSnapshot, existing, day] = await Promise.all([tx.get(ref), tx.get(bookingRef), tx.get(dayRef)]);
    const tenant = activeTenant(tenantSnapshot);
    if (existing.exists) {
      if (existing.data().fingerprint !== domain.digest(clean)) domain.fail("already-exists", "A kérésazonosító már másik foglaláshoz tartozik.");
      return domain.publicBooking(existing.data());
    }
    const entries = ledgerEntries(day);
    const slot = domain.availableSlots(tenant, clean.serviceId, clean.date, entries, now).find((s) => s.start === clean.start);
    if (!slot) domain.fail("already-exists", "Ez az időpont már nem foglalható. Válassz másikat.");
    const service = domain.config(tenant).services.find((s) => s.id === clean.serviceId);
    const booking = { id: bookingId, tenantId: clean.tenantId, date: clean.date, start: slot.start, end: slot.end,
      startMs: slot.startMs, endMs: slot.endMs, service, status: "confirmed", name: clean.name, email: clean.email,
      cancellationHash: clean.cancellationHash, fingerprint: domain.digest(clean), privacyAcceptedAt: now,
      privacyVersion: tenant.privacyVersion, createdAt: now, updatedAt: now,
      revision: 1, notificationStatus: tenant.notificationEmailEnabled===true?"queued":"disabled" };
    // One shared day document is the serialization point for every service in
    // this single-calendar tenant. Firestore retries conflicting transactions.
    tx.set(dayRef, { entries: [...entries, { id: bookingId, startMs: slot.startMs, endMs: slot.endMs }], updatedAt: now });
    tx.create(bookingRef, booking);
    queueBooking(tx,db,tenant,booking,'created',now);
    return domain.publicBooking(booking);
  });
}

async function cancelBooking(db, { tenantId, bookingId, cancellationToken }, now = Date.now()) {
  const expectedHash = domain.secretHash(cancellationToken);
  const ref = tenantRef(db, tenantId), bookingRef = ref.collection("bookings").doc(domain.id(bookingId));
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(bookingRef);
    const booking = existing.data();
    if (!existing.exists || typeof booking.cancellationHash !== "string" || booking.cancellationHash.length !== expectedHash.length
      || !crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(booking.cancellationHash))) {
      domain.fail("not-found", "A foglalás nem található vagy a lemondási jogosultság érvénytelen.");
    }
    if (booking.status === "cancelled") return { bookingId, status: "cancelled" };
    if (booking.status !== "confirmed" || booking.startMs <= now) domain.fail("failed-precondition", "Ez a foglalás már nem mondható le online.");
    const dayRef = ref.collection("days").doc(domain.dateKey(booking.date));
    const day = await tx.get(dayRef),tenant=(await tx.get(ref)).data()||{};
    const entries = ledgerEntries(day);
    if (!entries.some((entry) => entry.id === bookingId)) domain.fail("failed-precondition", "A naptár ellenőrzést igényel.");
    tx.set(dayRef, { entries: entries.filter((entry) => entry.id !== bookingId), updatedAt: now });
    const next={...booking,status:'cancelled',revision:(booking.revision||0)+1,cancelledAt:now,updatedAt:now,notificationStatus:tenant.notificationEmailEnabled===true?'queued':'disabled'};
    tx.update(bookingRef, next);
    queueBooking(tx,db,tenant,next,'cancelled',now);
    return { bookingId, status: "cancelled" };
  });
}

async function ownerDay(db, { tenantId, date }, uid) {
  if (typeof uid !== "string" || !uid) domain.fail("unauthenticated", "Bejelentkezés szükséges.");
  domain.dateKey(date);
  const ref = tenantRef(db, tenantId);
  return db.runTransaction(async (tx) => {
    const tenant = await tx.get(ref);
    if (!tenant.exists || tenant.data().ownerUid !== uid) domain.fail("permission-denied", "Ehhez a naptárhoz nincs hozzáférésed.");
    const result = await tx.get(ref.collection("bookings").where("date", "==", date).limit(501));
    if (result.docs.length > 500) domain.fail("resource-exhausted", "Ez a nap túl sok bejegyzést tartalmaz; lapozható lekérdezés szükséges.");
    return { bookings: result.docs.map((snapshot) => {
      const booking = snapshot.data();
      return { ...domain.publicBooking(booking), name: booking.name, email: booking.email, notificationStatus: booking.notificationStatus };
    }).sort((a, b) => a.start.localeCompare(b.start)) };
  });
}

async function publicConfig(db, { tenantId }) {
  return db.runTransaction(async tx => {
    const tenant = activeTenant(await tx.get(tenantRef(db, tenantId)));
    const settings = domain.config(tenant);
    let privacyUrl;
    try { privacyUrl = new URL(tenant.privacyUrl); } catch { domain.fail("failed-precondition", "A szolgáltató adatkezelési tájékoztatója még hiányzik."); }
    if (privacyUrl.protocol !== "https:" || privacyUrl.username || privacyUrl.password || typeof tenant.businessName !== "string" || tenant.businessName.trim().length < 2) domain.fail("failed-precondition", "A szolgáltató nyilvános adatai hiányosak.");
    return { businessName: tenant.businessName.trim().slice(0,160), privacyUrl: privacyUrl.href,
      privacyVersion: tenant.privacyVersion, timeZone: settings.timeZone,
      horizonDays: settings.horizonDays, minNoticeMinutes: settings.minNoticeMinutes,
      services: settings.services.filter(s => s.active) };
  });
}

// Owner mutations share idempotency and an optimistic revision. No client-supplied
// identity, price, duration, tenant settings or notification flags are trusted.
async function ownerMutation(db, raw, uid, kind, now) {
  if (typeof uid !== "string" || !uid) domain.fail("unauthenticated", "Bejelentkezés szükséges.");
  const ref = tenantRef(db, raw.tenantId), bookingRef = ref.collection("bookings").doc(domain.id(raw.bookingId));
  if (!Number.isSafeInteger(raw.expectedRevision) || raw.expectedRevision < 0 || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(raw.requestId || "")) domain.fail("invalid-argument", "Érvénytelen módosításazonosító.");
  const clean = { kind, bookingId: raw.bookingId, expectedRevision: raw.expectedRevision };
  if (kind === "move") {
    clean.date = domain.dateKey(raw.date);
    if (typeof raw.start !== "string" || !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(raw.start)) domain.fail("invalid-argument", "Érvénytelen kezdés.");
    clean.start = raw.start;
  } else {
    if (!["completed","no_show","cancelled"].includes(raw.status)) domain.fail("invalid-argument", "Érvénytelen státusz.");
    clean.status = raw.status;
  }
  const fingerprint = domain.digest(clean), operationRef = ref.collection("operations").doc(domain.digest(raw.requestId.toLowerCase()));
  return db.runTransaction(async tx => {
    const [tenantSnapshot, snapshot, previous] = await Promise.all([tx.get(ref), tx.get(bookingRef), tx.get(operationRef)]);
    if (!tenantSnapshot.exists || tenantSnapshot.data().ownerUid !== uid) domain.fail("permission-denied", "Ehhez a naptárhoz nincs hozzáférésed.");
    if (previous.exists) {
      if (previous.data().fingerprint !== fingerprint) domain.fail("already-exists", "Ez a módosításazonosító már más művelethez tartozik.");
      return previous.data().result;
    }
    const booking = snapshot.data();
    if (!snapshot.exists) domain.fail("not-found", "Nincs ilyen foglalás.");
    if ((booking.revision || 0) !== raw.expectedRevision || booking.status !== "confirmed") domain.fail("failed-precondition", "A foglalás megváltozott. Frissítsd a naptárat.");
    const next = { ...booking, revision: (booking.revision || 0) + 1, updatedAt: now, updatedBy: uid };
    if (kind === "move") {
      const tenant = activeTenant(tenantSnapshot);
      if (booking.startMs <= now) domain.fail("failed-precondition", "Megkezdett foglalás nem helyezhető át.");
      const oldRef = ref.collection("days").doc(domain.dateKey(booking.date)), newRef = ref.collection("days").doc(clean.date);
      const oldDay = await tx.get(oldRef), newDay = oldRef.path === newRef.path ? oldDay : await tx.get(newRef);
      const oldEntries = ledgerEntries(oldDay), newEntries = ledgerEntries(newDay).filter(e => e.id !== booking.id);
      if (!oldEntries.some(e => e.id === booking.id)) domain.fail("failed-precondition", "A naptár ellenőrzést igényel.");
      // Keep the duration and price agreed at booking, even after catalogue edits.
      const settings = { ...tenant, services: tenant.services.map(s => s.id === booking.service.id ? { ...booking.service, active: s.active } : s) };
      const slot = domain.availableSlots(settings, booking.service.id, clean.date, newEntries, now).find(s => s.start === clean.start);
      if (!slot) domain.fail("already-exists", "Ez az időpont már nem foglalható.");
      Object.assign(next, { date: clean.date, start: slot.start, end: slot.end, startMs: slot.startMs, endMs: slot.endMs });
      if (oldRef.path !== newRef.path) tx.set(oldRef, { entries: oldEntries.filter(e => e.id !== booking.id), updatedAt: now });
      tx.set(newRef, { entries: [...newEntries, { id: booking.id, startMs: slot.startMs, endMs: slot.endMs }], updatedAt: now });
    } else {
      if (clean.status === "completed" && booking.endMs > now || clean.status === "no_show" && booking.startMs > now) domain.fail("failed-precondition", "Jövőbeli időpont még nem zárható le így.");
      if (clean.status === "cancelled") {
        if (booking.startMs <= now) domain.fail("failed-precondition", "Megkezdett foglalás már nem mondható le.");
        const dayRef = ref.collection("days").doc(domain.dateKey(booking.date)), entries = ledgerEntries(await tx.get(dayRef));
        if (!entries.some(e => e.id === booking.id)) domain.fail("failed-precondition", "A naptár ellenőrzést igényel.");
        tx.set(dayRef, { entries: entries.filter(e => e.id !== booking.id), updatedAt: now });
      }
      Object.assign(next, { status: clean.status });
    }
    next.notificationStatus=tenantSnapshot.data().notificationEmailEnabled===true?'queued':'disabled';
    tx.set(bookingRef, next);
    queueBooking(tx,db,tenantSnapshot.data(),next,kind==='move'?'moved':next.status,now);
    const result = domain.publicBooking(next);
    tx.create(operationRef, { fingerprint, result, createdAt: now, createdBy: uid });
    return result;
  });
}
async function ownerMoveSlots(db, raw, uid, now = Date.now()) {
  if (typeof uid !== "string" || !uid) domain.fail("unauthenticated", "Bejelentkezés szükséges.");
  const ref = tenantRef(db, raw.tenantId), bookingRef = ref.collection("bookings").doc(domain.id(raw.bookingId));
  const date = domain.dateKey(raw.date);
  return db.runTransaction(async tx => {
    const [tenantSnapshot, snapshot, day] = await Promise.all([tx.get(ref), tx.get(bookingRef), tx.get(ref.collection("days").doc(date))]);
    if (!tenantSnapshot.exists || tenantSnapshot.data().ownerUid !== uid) domain.fail("permission-denied", "Ehhez a naptárhoz nincs hozzáférésed.");
    const tenant = activeTenant(tenantSnapshot), booking = snapshot.data();
    if (!snapshot.exists || booking.status !== "confirmed" || booking.startMs <= now) domain.fail("failed-precondition", "Ez a foglalás nem helyezhető át.");
    const settings = { ...tenant, services: tenant.services.map(s => s.id === booking.service.id ? { ...booking.service, active: s.active } : s) };
    return { timeZone: "Europe/Budapest", slots: domain.availableSlots(settings, booking.service.id, date, ledgerEntries(day).filter(e => e.id !== booking.id), now).map(({start,end}) => ({start,end})) };
  });
}
const ownerMove = (db, input, uid, now = Date.now()) => ownerMutation(db, input, uid, "move", now);
const ownerStatus = (db, input, uid, now = Date.now()) => ownerMutation(db, input, uid, "status", now);
async function guestStatus(db,{tenantId,bookingId,cancellationToken}){
  const expected=domain.secretHash(cancellationToken),row=(await tenantRef(db,tenantId).collection('bookings').doc(domain.id(bookingId)).get()).data();
  if(!row||typeof row.cancellationHash!=='string'||row.cancellationHash.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(row.cancellationHash)))domain.fail('not-found','A foglalás nem található vagy a hozzáférési link érvénytelen.');
  return domain.publicBooking(row);
}
module.exports = { availability, createBooking, cancelBooking, guestStatus, ownerDay, publicConfig, ownerMove, ownerStatus, ownerMoveSlots };
