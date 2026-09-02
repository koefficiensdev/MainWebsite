"use strict";

const crypto = require("node:crypto");
const ZONE = "Europe/Budapest";
const MINUTE = 60000;
const DAY = 86400000;
const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23"
});

class BookingError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function fail(code, message) { throw new BookingError(code, message); }
function id(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) fail("invalid-argument", "Érvénytelen azonosító.");
  return value;
}
function dateKey(value) {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value)
    || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    fail("invalid-argument", "Érvénytelen dátum.");
  }
  return value;
}
function localParts(epoch) {
  const parts = Object.fromEntries(formatter.formatToParts(epoch).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}
function timeMinute(value) {
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value)) fail("invalid-argument", "Érvénytelen nyitvatartási idő.");
  const [hour, minute] = value.split(":").map(Number);
  if (minute % 5) fail("invalid-argument", "Az időpontok ötperces egységekben adhatók meg.");
  return hour * 60 + minute;
}
function ranges(value) {
  if (!Array.isArray(value) || value.length > 12) fail("invalid-argument", "Érvénytelen nyitvatartás.");
  const result = value.map((range) => {
    // Firestore forbids directly nested arrays. Persist intervals as objects;
    // accept legacy array input only at the validation boundary.
    if(range&&!Array.isArray(range)&&typeof range==='object')range=[range.start,range.end];
    if (!Array.isArray(range) || range.length !== 2) fail("invalid-argument", "Érvénytelen időtartomány.");
    const start = timeMinute(range[0]), end = timeMinute(range[1]);
    if (start >= end) fail("invalid-argument", "Az időtartomány vége a kezdete után legyen.");
    return { start, end };
  }).sort((a, b) => a.start - b.start);
  if (result.some((r, i) => i && result[i - 1].end > r.start)) fail("invalid-argument", "Átfedő nyitvatartás.");
  return result;
}
function config(raw) {
  if (!raw || raw.timeZone !== ZONE || !Array.isArray(raw.services) || !raw.services.length || raw.services.length > 50) {
    fail("failed-precondition", "A foglalási beállítások hiányosak.");
  }
  const services = raw.services.map((service) => {
    id(service.id);
    if (typeof service.name !== "string" || service.name.trim().length < 2 || service.name.length > 120
      || !Number.isSafeInteger(service.durationMinutes) || service.durationMinutes < 5 || service.durationMinutes > 480 || service.durationMinutes % 5
      || !Number.isSafeInteger(service.priceHuf) || service.priceHuf < 0 || service.priceHuf > 10000000) {
      fail("failed-precondition", "Érvénytelen szolgáltatásbeállítás.");
    }
    return { id: service.id, name: service.name.trim(), durationMinutes: service.durationMinutes, priceHuf: service.priceHuf, active: service.active === true };
  });
  if (new Set(services.map((s) => s.id)).size !== services.length) fail("failed-precondition", "Ismételt szolgáltatásazonosító.");
  const week = {};
  for (let day = 0; day < 7; day++) week[day] = ranges(raw.weeklyHours?.[day] || []);
  const overrides = {};
  if (raw.dateOverrides && (typeof raw.dateOverrides !== "object" || Array.isArray(raw.dateOverrides))) fail("failed-precondition", "Érvénytelen kivételes nyitvatartás.");
  if (Object.keys(raw.dateOverrides || {}).length > 366) fail("failed-precondition", "Túl sok nyitvatartási kivétel.");
  for (const [date, hours] of Object.entries(raw.dateOverrides || {})) overrides[dateKey(date)] = ranges(hours);
  const slotStepMinutes = raw.slotStepMinutes ?? 15;
  const minNoticeMinutes = raw.minNoticeMinutes ?? 120;
  const horizonDays = raw.horizonDays ?? 60;
  if (![5, 10, 15, 20, 30, 60].includes(slotStepMinutes) || !Number.isInteger(minNoticeMinutes) || minNoticeMinutes < 0 || minNoticeMinutes > 43200
    || !Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 180) fail("failed-precondition", "Érvénytelen foglalási időkorlát.");
  return { timeZone: ZONE, services, week, overrides, slotStepMinutes, minNoticeMinutes, horizonDays };
}

// Iterate real instants, not the server's local timezone. Missing and repeated
// Budapest clock times are deliberately unavailable in this first release.
function dayTimeline(date) {
  const midnight = Date.parse(`${dateKey(date)}T00:00:00Z`);
  const times = new Map();
  for (let epoch = midnight - 4 * 3600000; epoch <= midnight + 28 * 3600000; epoch += 5 * MINUTE) {
    const local = localParts(epoch);
    if (local.date !== date) continue;
    times.set(local.minute, [...(times.get(local.minute) || []), epoch]);
  }
  // 24:00 is the next local midnight, usable only as an interval end.
  const next = new Date(midnight + DAY).toISOString().slice(0, 10);
  for (let epoch = midnight + 20 * 3600000; epoch <= midnight + 28 * 3600000; epoch += 5 * MINUTE) {
    const local = localParts(epoch);
    if (local.date === next && local.minute === 0) times.set(1440, [epoch]);
  }
  return times;
}
function overlaps(a, b) { return a.startMs < b.endMs && b.startMs < a.endMs; }
function availableSlots(raw, serviceId, date, occupied = [], now = Date.now()) {
  const settings = config(raw);
  dateKey(date);
  const service = settings.services.find((s) => s.id === id(serviceId) && s.active);
  if (!service) fail("not-found", "A szolgáltatás nem foglalható.");
  const today = localParts(now).date;
  const dayDistance = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY;
  if (dayDistance < 0 || dayDistance > settings.horizonDays) return [];
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const hours = settings.overrides[date] ?? settings.week[weekday];
  if (!hours.length) return [];
  const timeline = dayTimeline(date), slots = [];
  for (const range of hours) {
    for (let minute = range.start; minute + service.durationMinutes <= range.end; minute += settings.slotStepMinutes) {
      const starts = timeline.get(minute);
      if (starts?.length !== 1) continue;
      const startMs = starts[0], endMs = startMs + service.durationMinutes * MINUTE;
      // Reject appointments spanning a DST jump, including ambiguous endpoints.
      let continuous = true;
      for (let offset = 0; offset <= service.durationMinutes; offset += 5) {
        const actual = timeline.get(minute + offset);
        if (actual?.length !== 1 || actual[0] !== startMs + offset * MINUTE) { continuous = false; break; }
      }
      if (!continuous || startMs < now + settings.minNoticeMinutes * MINUTE || occupied.some((entry) => overlaps({ startMs, endMs }, entry))) continue;
      slots.push({ startMs, endMs, start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() });
    }
  }
  return slots;
}
function secretHash(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) fail("invalid-argument", "Érvénytelen foglalási titok.");
  return crypto.createHash("sha256").update(value).digest("hex");
}
function requestInput(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("invalid-argument", "Érvénytelen foglalás.");
  id(raw.tenantId); id(raw.serviceId); dateKey(raw.date);
  if (typeof raw.requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(raw.requestId)) fail("invalid-argument", "Érvénytelen kérésazonosító.");
  if (typeof raw.start !== "string" || !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(raw.start) || !Number.isFinite(Date.parse(raw.start))) fail("invalid-argument", "Érvénytelen kezdési idő.");
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  if (name.length < 2 || name.length > 100 || /[\r\n\x00-\x1f]/.test(name) || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("invalid-argument", "Ellenőrizd a nevet és az e-mail-címet.");
  if (raw.privacyAccepted !== true) fail("invalid-argument", "Az adatkezelési tájékoztató elfogadása szükséges.");
  return { tenantId: raw.tenantId, serviceId: raw.serviceId, date: raw.date, start: raw.start,
    requestId: raw.requestId.toLowerCase(), name, email, cancellationHash: secretHash(raw.cancellationToken), privacyAccepted: true };
}
function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function publicBooking(booking) {
  return { bookingId: booking.id, date: booking.date, start: booking.start, end: booking.end, status: booking.status,
    service: booking.service, revision: booking.revision || 0, notificationStatus:booking.notificationStatus||'disabled', timeZone: ZONE };
}
module.exports = { BookingError, fail, id, dateKey, localParts, config, availableSlots, overlaps, secretHash, requestInput, digest, publicBooking };
