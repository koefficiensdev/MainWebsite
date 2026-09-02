"use strict";
// Only extends the existing TEST webhook. Does not enable checkout, create a
// payment, change an endpoint URL or access a live Stripe key.
async function main(){const {secret}=await require('./firebase-client.cjs').client(),key=await secret('STRIPE_SECRET_KEY');if(!key.startsWith('sk_test_'))throw Error('Test key required');
  const Stripe=require('../functions/node_modules/stripe'),stripe=new Stripe(key,{maxNetworkRetries:0,timeout:15000});const expected='https://europe-west1-ovexi-6ef38.cloudfunctions.net/stripeWebhook';const endpoints=(await stripe.webhookEndpoints.list({limit:100})).data.filter(e=>e.url===expected&&e.livemode===false);
  if(endpoints.length!==1)throw Error('Exactly one known test endpoint required');const endpoint=endpoints[0],needed=require('../functions/commerce-domain').SUPPORTED_EVENTS;
  const events=endpoint.enabled_events.includes('*')?['*']:[...new Set([...endpoint.enabled_events,...needed])];
  if(process.argv.includes('--apply'))await stripe.webhookEndpoints.update(endpoint.id,{enabled_events:events});
  const current=await stripe.webhookEndpoints.retrieve(endpoint.id);console.log(JSON.stringify({testOnly:true,changed:process.argv.includes('--apply'),missingEvents:current.enabled_events.includes('*')?[]:needed.filter(e=>!current.enabled_events.includes(e)),paymentCreated:false}));
}
main().catch(()=>{console.error('Test webhook configuration failed; check exact endpoint and permissions.');process.exitCode=1;});
