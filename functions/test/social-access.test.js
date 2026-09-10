const test=require('node:test'),assert=require('node:assert/strict');
require('firebase-admin/app').initializeApp({projectId:'demo-ovexi-social'});
const {socialMarketing}=require('../social');
test('social endpoint: all actions deny guests and non-admins before database/provider access',async()=>{
 for(const action of ['status','configure','connect','creator','prepare','uploaded','getDraft','edit','publish','refresh']){
  for(const auth of [undefined,{uid:'ordinary',token:{admin:false}}])await assert.rejects(socialMarketing.run({data:{action},auth}),{code:'permission-denied'});
 }
});
