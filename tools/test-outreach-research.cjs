"use strict";
// Explicit operator smoke test: creates at most one real draft, NEVER sends email.
const path = require("node:path");
async function main() {
  const lib = process.argv[2], root = path.resolve(__dirname,"..");
  require(path.join(lib,"logger.js")).logger.silent=true;
  const auth = require(path.join(lib,"auth.js")), account=auth.getProjectDefaultAccount(root), options={project:"ovexi-6ef38",...account};
  await require(path.join(lib,"requireAuth.js")).requireAuth(options);
  const backendRequire=require("node:module").createRequire(path.join(root,"functions/index.js"));
  const {initializeApp}=backendRequire("firebase-admin/app");
  initializeApp({projectId:"ovexi-6ef38",credential:{getAccessToken:async()=>{const token=await auth.getAccessToken(account.tokens.refresh_token,options.authScopes);return {access_token:token.access_token,expires_in:1800};}}});
  const {getAuth}=backendRequire("firebase-admin/auth");
  const user=await getAuth().getUserByEmail("info@ovexi.hu");
  if(user.customClaims?.admin!==true)throw Error("ADMIN_REQUIRED");
  process.loadEnvFile(path.join(root,"functions/.env.ovexi-6ef38"));
  const {Firestore}=backendRequire("@google-cloud/firestore");
  const {OAuth2Client}=backendRequire("google-auth-library");
  const oauth=new OAuth2Client();
  const token=await auth.getAccessToken(account.tokens.refresh_token,options.authScopes);
  oauth.setCredentials({access_token:token.access_token});
  const db=new Firestore({projectId:"ovexi-6ef38",authClient:oauth});
  if(process.argv.includes("--inspect")) {
    for(const collection of ["outreach_research","outreach_candidates","outreach_messages","leads"]) {
      const rows=await db.collection(collection).orderBy("createdAt","desc").limit(30).get();
      console.log(JSON.stringify({collection,records:rows.docs.map(doc=>{const r=doc.data();return {id:doc.id,status:r.status,companyName:r.companyName,recipient:r.recipient,sourceUrl:r.sourceUrl,companyDescription:r.companyDescription,offer:r.offer,subject:r.subject,body:r.body,found:r.found,estimatedCostUsd:r.estimatedCostUsd,qualification:r.qualification,website:r.website,reason:r.reason,draft:r.draft,source:r.source};})}));
    }
    await db.terminate();return;
  }
  if(process.argv.includes("--inbox")) {
    const pass=await require(path.join(lib,"gcp/secretManager.js")).accessSecretVersion("ovexi-6ef38","SMTP_PASS","latest");
    console.log(JSON.stringify(await require("../functions/outreach-inbox").syncInbox(db,pass)));
    await db.terminate();return;
  }
  const key=await require(path.join(lib,"gcp/secretManager.js")).accessSecretVersion("ovexi-6ef38","OPENAI_API_KEY","latest");
  const result=await require("../functions/outreach-research").research(db,key,user.uid,{count:1,targetMode:"no_website",criteria:process.env.OUTREACH_SMOKE_CRITERIA||"Magyarországi független helyi szolgáltató, lehetőleg friss nyitással, saját weboldal nélkül, nyilvános üzleti Facebook vagy Instagram profilon közzétett e-mail-címmel.",requestId:require("node:crypto").randomUUID()});
  console.log(JSON.stringify({research:result,emailSent:false}));
  if(result.status!=="done")process.exitCode=1;
  await db.terminate();
}
main().catch(error=>{console.log(JSON.stringify({status:"RESEARCH_SMOKE_FAILED_NO_EMAIL_SENT",code:String(error.code||error.name||"UNKNOWN").replace(/[^a-zA-Z0-9/_-]/g,"").slice(0,80)}));process.exitCode=1;});
