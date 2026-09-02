"use strict";
// Read-only account readiness, without printing tokens, hashes or user profiles.
const path = require("node:path");
async function main() {
  const lib=process.argv[2];
  if(!lib)throw new Error("Firebase CLI library path required");
  require(path.join(lib,"logger.js")).logger.silent=true;
  const account=require(path.join(lib,"auth.js")).getProjectDefaultAccount(path.resolve(__dirname,".."));
  if(!account)throw new Error("CLI login required");
  await require(path.join(lib,"requireAuth.js")).requireAuth({project:"ovexi-6ef38",...account});
  const {findUser}=require(path.join(lib,"gcp/auth.js"));
  for(const email of ["sandorturai178@gmail.com","info@ovexi.hu"]){
    try{
      const user=await findUser("ovexi-6ef38",email);
      const claims=JSON.parse(user.customAttributes||"{}");
      console.log(JSON.stringify({email,exists:true,admin:claims.admin===true,disabled:user.disabled===true,providers:(user.providerUserInfo||[]).map(p=>p.providerId)}));
    }catch(error){console.log(JSON.stringify({email,status:error.message==="No users found"?"not_found":"check_failed"}));}
  }
}
main().catch(()=>{console.log("Admin access check failed");process.exitCode=1;});
