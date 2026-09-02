"use strict";
// One bounded generation for explicitly fictional material. No real order,
// customer, invoice or email is created. Actual AI usage is charged to the
// existing project budget, and the result is written only under ignored ops/.
const fs=require('node:fs'),path=require('node:path');
async function main(){const root=path.resolve(__dirname,'..');process.loadEnvFile(path.join(root,'functions/.env.ovexi-6ef38'));const {secret,lib}=await require('./firebase-client.cjs').client();
  const auth=require(path.join(lib,'auth.js')),account=auth.getProjectDefaultAccount(root),options={project:'ovexi-6ef38',...account};await require(path.join(lib,'requireAuth.js')).requireAuth(options);
  const {OAuth2Client}=require('../functions/node_modules/google-auth-library'),oauth=new OAuth2Client(),token=await auth.getAccessToken(account.tokens.refresh_token,options.authScopes);oauth.setCredentials({access_token:token.access_token});
  const {Firestore}=require('../functions/node_modules/@google-cloud/firestore'),db=new Firestore({projectId:'ovexi-6ef38',authClient:oauth});
  const order={companyName:'Minta Műhely – kitalált bemutató',businessDescription:'Kitalált autószerviz bemutatója. Állapotfelmérést és időszakos karbantartást végez, kizárólag előzetes egyeztetéssel. Nem valódi vállalkozás.',targetAudience:'Helyi autósok',tone:'Közvetlen, tárgyilagos',itemIds:['website-onepage','marketing-mini']};
  const budget=require('../functions/ai-budget'),reservation=await budget.reserveAiBudget(db,'fictional-production-sample',{...process.env,OPENAI_RESERVATION_USD:'1'});
  try{const OpenAI=require('../functions/node_modules/openai'),request=require('../functions/production-copy').payload(order);const response=await new OpenAI({apiKey:await secret('OPENAI_API_KEY'),maxRetries:0,timeout:210000}).responses.create(request);
    const cost=await budget.settleAiBudget(db,reservation,response.usage);if(response.status!=='completed')throw Error('Incomplete output');const copy=JSON.parse(response.output_text),artifact=require('../functions/production-domain').build(order,copy);
    if(artifact.content.posts.length!==8)throw Error('Incorrect post count');const directory=path.join(root,'ops/production-sample');fs.mkdirSync(directory,{recursive:true});for(const [name,value] of Object.entries(artifact.files))fs.writeFileSync(path.join(directory,name),value);fs.writeFileSync(path.join(directory,'sample-report.json'),JSON.stringify({fictional:true,estimatedCostUsd:cost/1000000,missingInformation:copy.missingInformation,files:Object.keys(artifact.files),posts:artifact.content.posts.length},null,2));console.log(JSON.stringify({fictional:true,files:Object.keys(artifact.files).length,posts:artifact.content.posts.length,estimatedCostUsd:cost/1000000,directory}));
  }finally{await db.terminate();}
}
main().catch(error=>{console.error('Fictional sample failed: '+String(error.code||error.name||'UNKNOWN'));process.exitCode=1;});
