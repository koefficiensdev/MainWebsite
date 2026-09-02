"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const domain = require("../booking-domain");
const service = require("../booking-service");

const NOW = Date.parse("2026-08-31T05:00:00Z");
function settings(overrides = {}) {
  return { enabled: true, ownerUid: "owner-a", privacyVersion: "2026-08-31", timeZone: "Europe/Budapest",
    services: [
      { id: "hair", name: "Hajvágás", durationMinutes: 30, priceHuf: 6000, active: true },
      { id: "nails", name: "Műköröm", durationMinutes: 90, priceHuf: 12000, active: true },
      { id: "car", name: "Autódiagnosztika", durationMinutes: 60, priceHuf: 15000, active: true }
    ], weeklyHours: { 1: [["09:00", "12:00"], ["13:00", "17:00"]] }, minNoticeMinutes: 0, ...overrides };
}
function request(overrides = {}) {
  return { tenantId: "demo-a", serviceId: "hair", date: "2026-08-31", start: "2026-08-31T07:00:00.000Z",
    requestId: crypto.randomUUID(), cancellationToken: crypto.randomBytes(32).toString("hex"), name: "Teszt Vendég",
    email: "test@example.invalid", privacyAccepted: true, ...overrides };
}

// Optimistic transactional test double: records read versions and retries on
// conflict. This is not a replacement for a real Firestore emulator test.
function memoryDb() {
  const records = new Map();
  function doc(path) { return { path, id: path.split("/").at(-1), collection: (name) => collection(`${path}/${name}`) }; }
  function collection(path) { return { doc: (name) => doc(`${path}/${name}`), where: (field, op, value) => {
    assert.equal(op, "=="); return { limit: (count) => ({ queryPath: path, field, value, count }) };
  } }; }
  function snapshot(path) {
    const value = records.get(path)?.data;
    return { exists: value !== undefined, id: path.split("/").at(-1), data: () => structuredClone(value) };
  }
  const db = { collection, records, retries: 0,
    seed(path, data) { records.set(path, { data: structuredClone(data), version: (records.get(path)?.version || 0) + 1 }); },
    async runTransaction(fn) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const reads = new Map(), writes = [];
        const tx = {
          async get(ref) {
            assert.equal(writes.length, 0, "Firestore requires all reads before writes");
            if (ref.queryPath) {
              const paths = [...records.keys()].filter((path) => path.startsWith(`${ref.queryPath}/`) && path.split("/").length === ref.queryPath.split("/").length + 1);
              return { docs: paths.filter((path) => records.get(path).data[ref.field] === ref.value).slice(0, ref.count).map((path) => {
                reads.set(path, records.get(path).version); return snapshot(path);
              }) };
            }
            reads.set(ref.path, records.get(ref.path)?.version || 0);
            return snapshot(ref.path);
          },
          set(ref, data) { writes.push({ kind: "set", path: ref.path, data }); },
          create(ref, data) { writes.push({ kind: "create", path: ref.path, data }); },
          update(ref, data) { writes.push({ kind: "update", path: ref.path, data }); }
        };
        const result = await fn(tx);
        if ([...reads].some(([path, version]) => (records.get(path)?.version || 0) !== version)) { db.retries++; continue; }
        for (const write of writes) {
          if (write.kind === "create") assert.equal(records.has(write.path), false);
          if (write.kind === "update") assert.equal(records.has(write.path), true);
          db.seed(write.path, write.kind === "update" ? { ...records.get(write.path).data, ...write.data } : write.data);
        }
        return result;
      }
      throw new Error("Transaction retry limit");
    }
  };
  db.seed("booking_tenants/demo-a", settings());
  return db;
}

test("booking: different professions, durations and server-owned prices share a schedule", () => {
  for (const [serviceId, duration] of [["hair", 30], ["nails", 90], ["car", 60]]) {
    const slots = domain.availableSlots(settings(), serviceId, "2026-08-31", [], NOW);
    assert.ok(slots.length > 0);
    assert.ok(slots.every((slot) => slot.endMs - slot.startMs === duration * 60000));
    assert.ok(slots.every((slot) => domain.localParts(slot.startMs).minute >= 9 * 60));
    assert.ok(slots.every((slot) => domain.localParts(slot.endMs).minute <= 12 * 60 || domain.localParts(slot.startMs).minute >= 13 * 60));
  }
});

test("booking: holidays override weekly hours; closed weekdays have no slots", () => {
  assert.deepEqual(domain.availableSlots(settings({ dateOverrides: { "2026-08-31": [] } }), "hair", "2026-08-31", [], NOW), []);
  assert.deepEqual(domain.availableSlots(settings(), "hair", "2026-09-01", [], NOW), []);
  const slots = domain.availableSlots(settings({ dateOverrides: { "2026-09-01": [["10:00", "11:00"]] } }), "hair", "2026-09-01", [], NOW);
  assert.equal(slots.length, 3);
});

test("booking: past, lead-time and booking horizon are enforced", () => {
  assert.deepEqual(domain.availableSlots(settings(), "hair", "2026-08-24", [], NOW), []);
  assert.deepEqual(domain.availableSlots(settings({ horizonDays: 1 }), "hair", "2026-09-07", [], NOW), []);
  const slots = domain.availableSlots(settings({ minNoticeMinutes: 180 }), "hair", "2026-08-31", [], NOW);
  assert.equal(slots[0].start, "2026-08-31T08:00:00.000Z");
});

test("booking: adjacent intervals are allowed, partial and contained overlaps are rejected", () => {
  const occupied = [{ startMs: Date.parse("2026-08-31T08:00:00Z"), endMs: Date.parse("2026-08-31T09:00:00Z") }];
  const slots = domain.availableSlots(settings(), "hair", "2026-08-31", occupied, NOW);
  assert.ok(slots.some((slot) => slot.endMs === occupied[0].startMs));
  assert.ok(slots.some((slot) => slot.startMs === occupied[0].endMs));
  assert.ok(slots.every((slot) => !domain.overlaps(slot, occupied[0])));
});

test("booking: spring DST gap and appointments crossing the gap are unavailable", () => {
  const slots = domain.availableSlots(settings({ weeklyHours: { 0: [["01:00", "05:00"]] } }), "hair", "2026-03-29", [], Date.parse("2026-03-28T00:00:00Z"));
  assert.ok(slots.length);
  assert.ok(slots.every((slot) => {
    const start = domain.localParts(slot.startMs).minute, end = domain.localParts(slot.endMs).minute;
    return end - start === 30 && !(start >= 120 && start < 180) && !(end >= 120 && end < 180);
  }));
});

test("booking: autumn repeated clock hours cannot be booked ambiguously", () => {
  const slots = domain.availableSlots(settings({ weeklyHours: { 0: [["01:00", "05:00"]] } }), "hair", "2026-10-25", [], Date.parse("2026-10-24T00:00:00Z"));
  assert.ok(slots.length);
  assert.ok(slots.every((slot) => {
    const start = domain.localParts(slot.startMs).minute, end = domain.localParts(slot.endMs).minute;
    return end - start === 30 && !(start >= 120 && start < 180) && !(end >= 120 && end < 180);
  }));
});

test("booking: midnight end is supported without allowing cross-day appointments", () => {
  const slots = domain.availableSlots(settings({ weeklyHours: { 1: [["23:00", "24:00"]] } }), "car", "2026-08-31", [], NOW);
  assert.equal(slots.length, 1);
  assert.equal(slots[0].end, "2026-08-31T22:00:00.000Z");
});

test("booking: invalid calendar dates, config and inactive services fail closed", () => {
  for (const date of ["2026-02-30", "2026-13-01", "2026-00-01", "../../private", "2026-9-1", null]) assert.throws(() => domain.dateKey(date));
  for (const changes of [
    { timeZone: "UTC" }, { weeklyHours: { 1: [["12:00", "09:00"]] } },
    { weeklyHours: { 1: [["09:00", "12:00"], ["11:00", "13:00"]] } },
    { weeklyHours: { 1: [["09:01", "12:00"]] } }, { slotStepMinutes: 0 }, { horizonDays: 9999 },
    { services: [{ ...settings().services[0], durationMinutes: -30 }] },
    { services: [{ ...settings().services[0], priceHuf: 0.2 }] }, { dateOverrides: [] }
  ]) assert.throws(() => domain.config(settings(changes)));
  assert.throws(() => domain.availableSlots(settings({ services: [{ ...settings().services[0], active: false }] }), "hair", "2026-08-31", [], NOW), { code: "not-found" });
});

test("booking: invalid customer, consent, identifiers and cancellation tokens are rejected", () => {
  for (const changes of [{ tenantId: "../demo-a" }, { serviceId: "x/y" }, { requestId: "guessable" }, { cancellationToken: "short" },
    { privacyAccepted: false }, { name: "x" }, { name: "Header\r\nInjection" }, { email: "invalid" }, { start: "2026-08-31T09:00" }]) {
    assert.throws(() => domain.requestInput(request(changes)), { code: "invalid-argument" });
  }
});

test("booking: server calculates duration and price and never exposes guest data or tokens", async () => {
  const db = memoryDb(), input = request({ priceHuf: 1, end: "2099-01-01T00:00:00Z" });
  const saved = await service.createBooking(db, input, NOW);
  assert.equal(saved.service.priceHuf, 6000);
  assert.equal(saved.end, "2026-08-31T07:30:00.000Z");
  for (const key of ["name", "email", "cancellationHash", "cancellationToken", "fingerprint"]) assert.equal(saved[key], undefined);
  const availability = await service.availability(db, input, NOW);
  assert.ok(!JSON.stringify(availability).includes(input.email));
  assert.ok(!JSON.stringify([...db.records]).includes(input.cancellationToken));
});

test("booking: repeated request is idempotent; changed payload with same request ID is rejected", async () => {
  const db = memoryDb(), input = request();
  const first = await service.createBooking(db, input, NOW);
  assert.deepEqual(await service.createBooking(db, input, NOW), first);
  await assert.rejects(service.createBooking(db, { ...input, email: "other@example.invalid" }, NOW), { code: "already-exists" });
  assert.equal(db.records.get("booking_tenants/demo-a/days/2026-08-31").data.entries.length, 1);
});

test("booking: simultaneous competing services cannot reserve the same calendar interval", async () => {
  const db = memoryDb();
  const results = await Promise.allSettled(["hair", "nails", "car"].map((serviceId) => service.createBooking(db, request({ serviceId }), NOW)));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected" && r.reason.code === "already-exists").length, 2);
  assert.ok(db.retries > 0);
});

test("booking: simultaneous retries of one request create exactly one booking", async () => {
  const db = memoryDb(), input = request();
  const results = await Promise.all(Array.from({ length: 5 }, () => service.createBooking(db, input, NOW)));
  assert.ok(results.every((r) => r.bookingId === results[0].bookingId));
  assert.equal(db.records.get("booking_tenants/demo-a/days/2026-08-31").data.entries.length, 1);
});

test("booking: tenants are isolated and owner access cannot cross a tenant boundary", async () => {
  const db = memoryDb();
  db.seed("booking_tenants/demo-b", settings({ ownerUid: "owner-b" }));
  const input = request(), first = await service.createBooking(db, input, NOW);
  await service.createBooking(db, { ...input, tenantId: "demo-b" }, NOW);
  await assert.rejects(service.ownerDay(db, { tenantId: "demo-a", date: input.date }, "owner-b"), { code: "permission-denied" });
  await assert.rejects(service.ownerDay(db, { tenantId: "demo-a", date: input.date }, null), { code: "unauthenticated" });
  const owner = await service.ownerDay(db, { tenantId: "demo-a", date: input.date }, "owner-a");
  assert.equal(owner.bookings.length, 1);
  assert.equal(owner.bookings[0].bookingId, first.bookingId);
  assert.equal(owner.bookings[0].email, input.email);
  assert.equal(owner.bookings[0].cancellationHash, undefined);
});

test("booking: unguessable cancellation, replay safety and release of occupied interval", async () => {
  const db = memoryDb(), input = request();
  const booking = await service.createBooking(db, input, NOW);
  const cancel = { tenantId: input.tenantId, bookingId: booking.bookingId, cancellationToken: input.cancellationToken };
  await assert.rejects(service.cancelBooking(db, { ...cancel, cancellationToken: "f".repeat(64) }, NOW), { code: "not-found" });
  assert.equal((await service.cancelBooking(db, cancel, NOW)).status, "cancelled");
  assert.equal((await service.cancelBooking(db, cancel, NOW)).status, "cancelled");
  assert.equal((await service.createBooking(db, input, NOW)).status, "cancelled", "Retry must not resurrect cancellation");
  const next = await service.createBooking(db, request(), NOW);
  assert.equal(next.status, "confirmed");
});

test("booking: cancellation cannot free another booking, or alter appointments already started", async () => {
  const db = memoryDb(), input = request();
  const booking = await service.createBooking(db, input, NOW);
  const cancel = { tenantId: input.tenantId, bookingId: booking.bookingId, cancellationToken: input.cancellationToken };
  await assert.rejects(service.cancelBooking(db, cancel, Date.parse(booking.start)), { code: "failed-precondition" });
  const next = await service.createBooking(db, request({ start: booking.end }), NOW);
  await service.cancelBooking(db, cancel, NOW);
  assert.deepEqual(db.records.get("booking_tenants/demo-a/days/2026-08-31").data.entries.map((e) => e.id), [next.bookingId]);
});

test("booking: disabled tenants reject new requests but existing guests can still cancel", async () => {
  const db = memoryDb(), input = request();
  const booking = await service.createBooking(db, input, NOW);
  db.seed("booking_tenants/demo-a", settings({ enabled: false }));
  await assert.rejects(service.availability(db, input, NOW), { code: "not-found" });
  await assert.rejects(service.createBooking(db, request(), NOW), { code: "not-found" });
  assert.equal((await service.cancelBooking(db, { ...input, bookingId: booking.bookingId }, NOW)).status, "cancelled");
});

test("booking: malformed day ledger fails closed", async () => {
  const db = memoryDb(), input = request();
  db.seed("booking_tenants/demo-a/days/2026-08-31", { entries: [{ id: "bad", startMs: "not-a-time", endMs: 0 }] });
  await assert.rejects(service.availability(db, input, NOW), { code: "failed-precondition" });
  await assert.rejects(service.createBooking(db, input, NOW), { code: "failed-precondition" });
});

test("booking: callable API is disabled by default before it touches auth or Firestore", async () => {
  const { assertEnabled, handler } = require("../booking");
  assert.throws(() => assertEnabled({}), { code: "failed-precondition" });
  assert.throws(() => assertEnabled({ BOOKING_ENABLED: "false" }), { code: "failed-precondition" });
  assert.doesNotThrow(() => assertEnabled({ BOOKING_ENABLED: "true" }));
  const previous = process.env.BOOKING_ENABLED;
  delete process.env.BOOKING_ENABLED;
  try {
    for (const action of ["availability", "createBooking", "cancelBooking", "ownerDay"]) {
      await assert.rejects(handler(action)({}), { code: "failed-precondition" });
    }
  } finally {
    if (previous === undefined) delete process.env.BOOKING_ENABLED; else process.env.BOOKING_ENABLED = previous;
  }
});

test("booking: owner and privacy version are required before accepting public bookings", async () => {
  for (const change of [{ ownerUid: "" }, { privacyVersion: "" }]) {
    const db = memoryDb();
    db.seed("booking_tenants/demo-a", settings(change));
    await assert.rejects(service.createBooking(db, request(), NOW), { code: "failed-precondition" });
  }
});

test("booking: callable rejects unauthenticated/oversized input before database access", async () => {
  const { handler } = require("../booking");
  const callable = handler("availability", () => { throw new Error("Must not access database"); }, { BOOKING_ENABLED: "true" });
  await assert.rejects(callable({ data: request() }), { code: "unauthenticated" });
  await assert.rejects(callable({ auth: { uid: "guest" }, data: { tenantId: "demo-a", text: "x".repeat(4001) } }), { code: "invalid-argument" });
});

test("booking: all callable operations share per-user, tenant and global request limits", async () => {
  const { handler } = require("../booking");
  const hour = Math.floor(Date.now() / 3600000);
  for (const [key, count] of [[`user:guest:${hour}`, 60], [`tenant:demo-a:${hour}`, 300], [`global:${hour}`, 1000]]) {
    const db = memoryDb();
    db.seed(`booking_limits/${domain.digest(key)}`, { count });
    for (const action of ["availability", "createBooking", "cancelBooking", "ownerDay"]) {
      await assert.rejects(handler(action, () => db, { BOOKING_ENABLED: "true" })({ auth: { uid: "guest" }, data: request() }), { code: "resource-exhausted" });
    }
  }
});

test("booking: unexpected backend errors never leak customer data or internal details", async () => {
  const { handler } = require("../booking");
  const callable = handler("availability", () => { throw new Error("secret@example.invalid internal path"); }, { BOOKING_ENABLED: "true" });
  await assert.rejects(callable({ auth: { uid: "guest" }, data: request() }), (error) => error.code === "internal" && !error.message.includes("secret@example.invalid"));
});

function mutation(booking,overrides={}){return {tenantId:'demo-a',bookingId:booking.bookingId,expectedRevision:booking.revision,requestId:crypto.randomUUID(),...overrides};}
test('booking: public config is an allowlist, with no owner or guest data',async()=>{
  const db=memoryDb();db.seed('booking_tenants/demo-a',settings({businessName:'Teszt Műhely',privacyUrl:'https://example.com/privacy',privateNote:'secret'}));
  const result=await service.publicConfig(db,{tenantId:'demo-a'});
  assert.equal(result.businessName,'Teszt Műhely');assert.equal(result.ownerUid,undefined);assert.equal(result.privateNote,undefined);assert.equal(result.weeklyHours,undefined);
  db.seed('booking_tenants/demo-a',settings({businessName:'Teszt Műhely',privacyUrl:'javascript:alert(1)'}));
  await assert.rejects(service.publicConfig(db,{tenantId:'demo-a'}),{code:'failed-precondition'});
});
test('booking: owner move is atomic across days and preserves agreed duration/price',async()=>{
  const db=memoryDb(),input=request(),booking=await service.createBooking(db,input,NOW);
  db.seed('booking_tenants/demo-a',settings({weeklyHours:{1:[['09:00','17:00']],2:[['09:00','17:00']]},services:settings().services.map(s=>({...s,durationMinutes:120,priceHuf:99999}))}));
  const raw=mutation(booking,{date:'2026-09-01',start:'2026-09-01T07:00:00.000Z'});
  const slots=await service.ownerMoveSlots(db,raw,'owner-a',NOW);assert.equal(Date.parse(slots.slots[0].end)-Date.parse(slots.slots[0].start),1800000);
  const moved=await service.ownerMove(db,raw,'owner-a',NOW);assert.equal(moved.service.priceHuf,6000);assert.equal(moved.end,'2026-09-01T07:30:00.000Z');assert.equal(moved.revision,2);
  assert.equal(db.records.get('booking_tenants/demo-a/days/2026-08-31').data.entries.length,0);assert.equal(db.records.get('booking_tenants/demo-a/days/2026-09-01').data.entries.length,1);
  assert.deepEqual(await service.ownerMove(db,raw,'owner-a',NOW),moved);
  await assert.rejects(service.ownerMove(db,{...raw,start:'2026-09-01T08:00:00.000Z'},'owner-a',NOW),{code:'already-exists'});
  await service.cancelBooking(db,{...input,bookingId:booking.bookingId},NOW);assert.equal(db.records.get('booking_tenants/demo-a/days/2026-09-01').data.entries.length,0);
});
test('booking: unavailable move keeps original reservation and revision intact',async()=>{
  const db=memoryDb(),first=await service.createBooking(db,request(),NOW),other=await service.createBooking(db,request({start:'2026-08-31T08:00:00.000Z'}),NOW);
  await assert.rejects(service.ownerMove(db,mutation(first,{date:first.date,start:other.start}),'owner-a',NOW),{code:'already-exists'});
  const day=await service.ownerDay(db,{tenantId:'demo-a',date:first.date},'owner-a');assert.equal(day.bookings.find(b=>b.bookingId===first.bookingId).start,first.start);assert.equal(day.bookings.find(b=>b.bookingId===first.bookingId).revision,1);
});
test('booking: concurrent moves to one interval permit exactly one winner',async()=>{
  const db=memoryDb(),a=await service.createBooking(db,request(),NOW),b=await service.createBooking(db,request({start:'2026-08-31T08:00:00.000Z'}),NOW);
  const results=await Promise.allSettled([a,b].map(r=>service.ownerMove(db,mutation(r,{date:r.date,start:'2026-08-31T09:00:00.000Z'}),'owner-a',NOW)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(db.records.get('booking_tenants/demo-a/days/2026-08-31').data.entries.length,2);
});
test('booking: owner status blocks other owners, future completion and stale revisions',async()=>{
  const db=memoryDb(),booking=await service.createBooking(db,request(),NOW),raw=mutation(booking,{status:'completed'});
  await assert.rejects(service.ownerStatus(db,raw,'owner-b',NOW),{code:'permission-denied'});
  await assert.rejects(service.ownerStatus(db,raw,'owner-a',NOW),{code:'failed-precondition'});
  await assert.rejects(service.ownerStatus(db,{...raw,status:'paid'},'owner-a',NOW),{code:'invalid-argument'});
  const result=await service.ownerStatus(db,raw,'owner-a',Date.parse(booking.end));assert.equal(result.status,'completed');assert.equal(result.revision,2);
  assert.deepEqual(await service.ownerStatus(db,raw,'owner-a',Date.parse(booking.end)),result);
  await assert.rejects(service.ownerStatus(db,mutation(booking,{status:'cancelled'}),'owner-a',NOW),{code:'failed-precondition'});
  assert.equal(result.email,undefined);assert.equal(result.cancellationHash,undefined);
});
test('booking: owner cancellation releases slot; no-show only after start',async()=>{
  const db=memoryDb(),booking=await service.createBooking(db,request(),NOW);
  await service.ownerStatus(db,mutation(booking,{status:'cancelled'}),'owner-a',NOW);
  assert.equal(db.records.get('booking_tenants/demo-a/days/2026-08-31').data.entries.length,0);
  const next=await service.createBooking(db,request(),NOW),raw=mutation(next,{status:'no_show'});
  await assert.rejects(service.ownerStatus(db,raw,'owner-a',NOW),{code:'failed-precondition'});
  assert.equal((await service.ownerStatus(db,raw,'owner-a',Date.parse(next.start))).status,'no_show');
});
test('booking: new owner operations remain disabled and cannot cross tenant access',async()=>{
  const {handler}=require('../booking'),db=memoryDb(),booking=await service.createBooking(db,request(),NOW);
  for(const action of ['publicConfig','ownerMove','ownerStatus','ownerMoveSlots'])await assert.rejects(handler(action,()=>{throw Error('No DB');},{})({}),{code:'failed-precondition'});
  for(const action of ['ownerMove','ownerMoveSlots'])await assert.rejects(service[action](db,mutation(booking,{date:booking.date,start:booking.start}),'owner-b',NOW),{code:'permission-denied'});
  const slots=await service.ownerMoveSlots(db,mutation(booking,{date:booking.date}),'owner-a',NOW);assert(slots.slots.some(s=>s.start===booking.start));
});
