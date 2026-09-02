const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const model=import('../../js/booking-model.js'),NOW=Date.parse('2026-08-31T05:00:00Z');
test('booking UI: demo creates/cancels with replay safety, never using real contacts',async()=>{
  const m=await model,api=m.createDemoApi(NOW),settings=await api.publicConfig(),date=api.defaultDate,serviceId=settings.services[0].id;
  const slot=(await api.availability({serviceId,date})).slots[0];const input={tenantId:'demo',serviceId,date,start:slot.start,name:'Próba Vendég',email:'proba@example.invalid',privacyAccepted:true,requestId:crypto.randomUUID(),cancellationToken:m.secret()};
  await assert.rejects(api.createBooking({...input,email:'actual@example.com'}));const row=await api.createBooking(input);assert.equal((await api.createBooking(input)).bookingId,row.bookingId);
  assert(!(await api.availability({serviceId,date})).slots.some(s=>s.start===slot.start));
  await assert.rejects(api.cancelBooking({...input,bookingId:row.bookingId,cancellationToken:'x'}));
  await api.cancelBooking({...input,bookingId:row.bookingId});assert.equal((await api.createBooking(input)).status,'cancelled');
  assert((await api.availability({serviceId,date})).slots.some(s=>s.start===slot.start));
});
test('booking UI: demo owner moves and stale edits are rejected; metrics are not revenue',async()=>{
  const m=await model,api=m.createDemoApi(NOW),date=api.defaultDate,row=(await api.ownerDay({date})).bookings[0];
  assert.equal(row.cancellationToken,undefined);const slot=(await api.ownerMoveSlots({bookingId:row.bookingId,date})).slots[0];
  const input={bookingId:row.bookingId,date,start:slot.start,requestId:crypto.randomUUID(),expectedRevision:row.revision};const moved=await api.ownerMove(input);assert.equal(moved.revision,2);assert.deepEqual(await api.ownerMove(input),moved);
  await assert.rejects(api.ownerStatus({...input,requestId:crypto.randomUUID(),status:'cancelled'}));
  const past=(await api.ownerDay({date:'2026-08-30'})).bookings[0];const completed=await api.ownerStatus({bookingId:past.bookingId,expectedRevision:past.revision,requestId:crypto.randomUUID(),status:'completed'});
  assert.deepEqual(m.metrics([moved,completed]),{count:1,completed:1,scheduledValue:12000});
});
test('booking UI: Budapest dates, safe text and fragment-only cancellation parsing',async()=>{
  const m=await model;assert.equal(m.dayKey(Date.parse('2026-08-31T22:30:00Z')),'2026-09-01');assert.equal(m.addDays('2026-12-31',1),'2027-01-01');assert.throws(()=>m.addDays('2026-02-30',1));
  assert.equal(m.escapeHtml('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');assert.equal(m.cancellationFragment('#tenant=../bad&booking=abc&token='+'a'.repeat(64)),null);
  assert.equal(m.cancellationFragment('#tenant=valid&booking=abc&token='+'a'.repeat(64)).tenantId,'valid');
});
test('booking UI: live gate closed before Firebase initialization and demo has no persistence/network',async()=>{
  const {liveBookingApi}=await import('../../js/booking-api.js');await assert.rejects(liveBookingApi(),/éles foglalás még nincs megnyitva/);
  const root=path.resolve(__dirname,'../..'),modelCode=fs.readFileSync(path.join(root,'js/booking-model.js'),'utf8'),ui=fs.readFileSync(path.join(root,'js/booking-ui.js'),'utf8'),html=fs.readFileSync(path.join(root,'pages/foglalas.html'),'utf8');
  assert.doesNotMatch(modelCode,/fetch\(|localStorage|sessionStorage|firebase/);assert.match(ui,/pending=\{tenantId/);assert.match(ui,/history.replaceState/);assert.match(html,/no-referrer/);assert.match(html,/nem rögzít valódi foglalást/);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const [,id] of ui.matchAll(/\$\('([^']+)'\)/g))if(id!=='moveForm')assert(ids.includes(id),`Missing id ${id}`);
});
