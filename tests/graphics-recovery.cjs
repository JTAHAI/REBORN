'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const checks=[
 ['renderer counts context loss/recovery',/contextLosses=0;this\.contextRecoveries=0/],
 ['resource generation changes on every GL rebuild',/this\.contextEpoch=\(this\.contextEpoch\|\|0\)\+1/],
 ['late texture callbacks are generation fenced',/this\.contextLost\|\|epoch!==this\.contextEpoch\|\|!gl\.isTexture\(t\)/],
 ['replay pauses on graphics interruption',/state==='replay'\)pauseMemoryReplay\(\)/],
 ['drive/replay interruption persists best effort',/graphicsInterruption=[\s\S]*?persist\(\);notify\('GRAPHICS INTERRUPTED/],
 ['restore resets camera accumulator and frame clock',/cameraEye=null;cameraTarget=null;accumulator=0;lastFrame=0/],
 ['fatal graphics recovery exposes a local export',/EXPORT CURRENT SESSION/],
 ['snapshot exposes interruption and counters',/interruption:graphicsInterruption/],
];
for(const [name,re] of checks){assert.match(html,re,name);console.log('PASS graphics recovery: '+name);}
console.log(JSON.stringify({graphicsRecoveryChecks:checks.length}));
