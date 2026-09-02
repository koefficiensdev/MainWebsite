"use strict";
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),violations=[];let files=0;
const secretPatterns=[/sk_(?:live|test)_[A-Za-z0-9]{20,}/,/sk-proj-[A-Za-z0-9_-]{25,}/,/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','.firebase','ops'].includes(item.name)||item.name.startsWith('.env')||/\.log$/.test(item.name))continue;const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(/\.(?:[cm]?js|json|html|md|rules|yml|ps1|txt)$/.test(file)){files++;const body=fs.readFileSync(file,'utf8');if(secretPatterns.some(re=>re.test(body)))violations.push(path.relative(root,file));}}}
walk(root);const config=JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8'));for(const name of ['ops/**','functions/**','tools/**','docs/**'])if(!config.hosting.ignore.includes(name))violations.push('Hiányzó hosting-kizárás: '+name);
console.log(JSON.stringify({checkedFiles:files,secretValuesPrinted:false,violations}));if(violations.length)process.exitCode=1;
