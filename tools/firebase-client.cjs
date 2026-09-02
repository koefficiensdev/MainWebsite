"use strict";
const path=require('node:path');
async function client(){
  const lib=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib');
  require(path.join(lib,'logger.js')).logger.silent=true;
  const auth=require(path.join(lib,'auth.js')),account=auth.getProjectDefaultAccount(path.resolve(__dirname,'..'));
  if(!account)throw Error('Firebase CLI bejelentkezés szükséges.');
  const options={project:'ovexi-6ef38',...account};await require(path.join(lib,'requireAuth.js')).requireAuth(options);
  const {Client}=require(path.join(lib,'apiv2.js'));
  return {client:new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'}),secret:async name=>require(path.join(lib,'gcp/secretManager.js')).accessSecretVersion('ovexi-6ef38',name,'latest'),lib};
}
module.exports={client};
