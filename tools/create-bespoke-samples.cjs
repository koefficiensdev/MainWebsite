"use strict";
// One bounded generation for explicitly fictional material. No real order,
// customer, invoice or email is created. Actual AI usage is charged to the
// existing project budget, and the result is written only under ignored ops/.
const fs=require('node:fs'),path=require('node:path');
async function main(){const root=path.resolve(__dirname,'..');process.loadEnvFile(path.join(root,'functions/.env.ovexi-6ef38'));const {secret,lib}=await require('./firebase-client.cjs').client();
  const auth=require(path.join(lib,'auth.js')),account=auth.getProjectDefaultAccount(root),options={project:'ovexi-6ef38',...account};await require(path.join(lib,'requireAuth.js')).requireAuth(options);
  const {OAuth2Client}=require('../functions/node_modules/google-auth-library'),oauth=new OAuth2Client(),token=await auth.getAccessToken(account.tokens.refresh_token,options.authScopes);oauth.setCredentials({access_token:token.access_token});
  const {Firestore}=require('../functions/node_modules/@google-cloud/firestore'),db=new Firestore({projectId:'ovexi-6ef38',authClient:oauth});
  const {payload,assemble}=require('../functions/bespoke-production'),{contentFor}=require('../functions/production-domain'),OpenAI=require('../functions/node_modules/openai'),client=new OpenAI({apiKey:await secret('OPENAI_API_KEY'),maxRetries:0,timeout:840000});
  const examples=[{companyName:'Papírkert – kitalált mintamárka',businessDescription:'Kitalált papírműhely bemutatója: egyedi esküvői meghívók tervezése és személyes egyeztetés. Ez kizárólag bemutató, nem valós vállalkozás.',targetAudience:'Személyes meghívót kereső párok',tone:'Finom, személyes',direction:'Szerkesztőségi, tipográfiai papírhangulat. Aszimmetrikus elrendezés, meleg törtfehér, terrakotta. Egyedi vonalas botanikai rajzok. Ne használj három egyforma szolgáltatáskártyát.'},{companyName:'Hullám Stúdió – kitalált mintamárka',businessDescription:'Kitalált hangstúdió bemutatója: podcastfelvétel és hangvágás előzetes egyeztetéssel. Ez kizárólag bemutató, nem valós vállalkozás.',targetAudience:'Podcastkészítők',tone:'Pontos, lendületes',direction:'Sötét hangtechnikai műhely, élénk lime részletekkel, vízszintes hullámformákkal és idővonalas elrendezéssel. Ne használj papírhangulatot, növényeket vagy általános háromkártyás elrendezést.'}];
  const reports=[];
  try{for(const [index,example] of examples.entries()){
    const order={...example,itemIds:['website-onepage']},content=contentFor(order,{posts:[{title:index?'A saját hangod, tisztán':'Meghívó a ti történetetekhez',body:example.businessDescription,channel:'Instagram',day:1}],services:[]});delete content.accent;
    const budget=require('../functions/ai-budget'),directory=path.join(root,'ops','bespoke-'+(index+1));fs.mkdirSync(directory,{recursive:true});const responsePath=path.join(directory,'provider-response.json');let response,cost;
    if(fs.existsSync(responsePath)){response=JSON.parse(fs.readFileSync(responsePath));cost=budget.estimateUsageMicros(response.usage);}
    else{const reservation=await budget.reserveAiBudget(db,'bespoke-fictional-sample',{...process.env,OPENAI_RESERVATION_USD:'2'});response=await client.responses.stream(payload(order,content,example.direction)).finalResponse();cost=await budget.settleAiBudget(db,reservation,response.usage);fs.writeFileSync(responsePath,JSON.stringify(response));}
    if(response.status!=='completed')throw Error('Incomplete output');
    const artifact=assemble(order,content,JSON.parse(response.output_text));for(const [name,value] of Object.entries(artifact.files))fs.writeFileSync(path.join(directory,name),value);
    const report={fictional:true,estimatedCostUsd:cost/1000000,files:Object.keys(artifact.files),fingerprint:artifact.designFingerprint,concept:artifact.manifest.concept};reports.push(report);fs.writeFileSync(path.join(directory,'sample-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({sample:index+1,files:report.files.length,estimatedCostUsd:report.estimatedCostUsd}));
  }if(reports[0].fingerprint===reports[1].fingerprint)throw Error('Repeated design');}finally{await db.terminate();}

}
main().catch(error=>{console.error('Fictional sample failed: '+String(error.code||error.name||'UNKNOWN')+' '+String(error.message||'').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').slice(0,250));process.exitCode=1;});
