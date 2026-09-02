"use strict";
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
if(!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))throw Error('Local emulator required');
const tests=spawnSync(process.execPath,['--test','functions/test/workflow-service.test.js','functions/test/workspace-access.test.js','functions/test/automation-readiness.test.js'],{stdio:'inherit',windowsHide:true});
if(tests.status!==0)process.exit(tests.status||1);
const dir=path.resolve('ops/backups');if(fs.existsSync(dir)){const file=fs.readdirSync(dir).filter(f=>f.endsWith('.ovxb')).sort().at(-1);if(file){const restore=spawnSync(process.execPath,['tools/backup.cjs','restore-emulator',path.join(dir,file)],{stdio:'inherit',windowsHide:true});if(restore.status!==0)process.exit(restore.status||1);}}
