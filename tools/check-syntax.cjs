"use strict";
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
let failed=false,count=0;
for(const dir of ['js','functions','tools'])walk(dir);
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){if(item.name==='node_modules'||item.name.startsWith('.'))continue;const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(/\.(?:c|m)?js$/.test(file)){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});count++;if(result.status!==0){failed=true;console.error(result.stderr);}}}}
console.log(`${count} JavaScript fájl ellenőrizve.`);if(failed)process.exitCode=1;
