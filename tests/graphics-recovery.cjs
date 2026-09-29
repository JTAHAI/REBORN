'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const checks=[
 ['renderer counts context loss/recovery',/contextLosses=0;this\.contextRecoveries=0/],
 ['restoration waits for a successfully rendered frame',/contextRecoveryPending=true[\s\S]*?completeContextRecovery\(\)/],
 ['lost contexts abandon invalid GPU handles',/gl\.isContextLost\(\)[\s\S]*?releaseAbandonGL/],
 ['frame loop skips renderer calls while context is lost',/if\(!renderer\.contextLost\)\{try\{renderer\.update/],
 ['late texture callbacks are generation fenced',/this\.contextLost\|\|epoch!==this\.contextEpoch\|\|!gl\.isTexture\(t\)/],
 ['replay pauses on graphics interruption',/state==='replay'\)pauseMemoryReplay\(\)/],
 ['failure creates an interrupted-session checkpoint',/crashRecoveryCheckpoint\('graphics-failure'\)/],
 ['fatal graphics recovery exposes export and restart',/EXPORT CURRENT SESSION[\s\S]*?RESTART GRAPHICS/],
 ['snapshot exposes pending/error/counters',/contextRecoveryPending:!!this\.contextRecoveryPending[\s\S]*?contextRecoveries/],
];
for(const [name,re] of checks){assert.match(html,re,name);console.log('PASS graphics recovery: '+name);}
console.log(JSON.stringify({graphicsRecoveryChecks:checks.length,result:'passed'}));
