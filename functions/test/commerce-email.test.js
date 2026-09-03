"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {buildCommerceEmail}=require("../commerce-email");
const order={contactName:'Teszt <script>alert(1)</script>',orderNumber:'OVX-TEST-123',onceTotal:39990,monthlyTotal:5990,infrastructurePlan:'new',
  products:[{name:'Egylapos weboldal',price:39990,billing:'once'},{name:'Karbantartás Basic',price:5990,billing:'monthly'}]};

test("commerce email is branded, useful and escapes customer data",()=>{
  const mail=buildCommerceEmail("payment_received",order);
  assert.match(mail.subject,/Sikeres fizetés – OVX-TEST-123/);
  assert.match(mail.text,/OVX-TEST-123/);
  assert.match(mail.html,/Ügyféltér megnyitása/);
  assert.match(mail.html,/Teszt &lt;script&gt;/);assert.doesNotMatch(mail.html,/<script>alert/);
});

test("commerce email itemises the cart and separates once from monthly totals",()=>{
  const mail=buildCommerceEmail("order_received",order);
  for(const output of [mail.text,mail.html]){
    assert.match(output,/Egylapos weboldal/);assert.match(output,/Karbantartás Basic/);
    assert.match(output,/39\s?990 Ft/);assert.match(output,/5\s?990 Ft/);
  }
  assert.match(mail.text,/Egyszeri díj: 39\s?990 Ft/);assert.match(mail.text,/Havi díj: 5\s?990 Ft \/ hó/);
  assert.match(mail.text,/Új domain és tárhely szükséges/);assert.match(mail.html,/Domain és tárhely/);
  assert.match(mail.html,/Ami most következik/);
});

test("commerce email omits a total block that does not apply",()=>{
  const mail=buildCommerceEmail("order_received",{...order,monthlyTotal:0,products:[order.products[0]]});
  assert.doesNotMatch(mail.text,/Havi díj/);assert.doesNotMatch(mail.html,/Havi díj összesen/);
});
test("commerce email confirms the non-cash first-year infrastructure promotion",()=>{
  const promoted={...order,promoCode:"OVEXI1EV",promotion:{id:"first-year-domain-hosting",code:"OVEXI1EV",label:"Az első 12 hónap standard .hu domain- és 1 GB webtárhelydíját az OVEXI vállalja."}};
  const mail=buildCommerceEmail("payment_received",promoted);
  for(const output of [mail.text,mail.html]){assert.match(output,/OVEXI1EV/);assert.match(output,/első 12 hónap/);}
});

test("every commerce email type stays branded and actionable",()=>{
  for(const type of ["order_received","payment_received","payment_failed","subscription_cancelled"]){
    const mail=buildCommerceEmail(type,order);
    assert.match(mail.html,/OVEXI/);assert.match(mail.html,/https:\/\/ovexi\.hu\/ugyfelter/);
    assert.match(mail.text,/Ami most következik/);assert.ok(mail.subject.endsWith("– OVX-TEST-123"));
  }
});
