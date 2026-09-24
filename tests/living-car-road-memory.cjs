#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const token of ['vehicle-condition-grid','road-memory-summary','drive-journal','journey-service','journey-refuel',"KeyJ:'journal'",'tickLivingCar','recordRoadKnowledge','ROAD MEMORY','livingCar:{vehicle'])assert.ok(html.includes(token),`Missing Living Car token: ${token}`);
const core=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).find(code=>code.includes('else root.RebornCore = api'));
assert.ok(core,'Production simulation missing');
const context={module:{exports:{}},console};vm.runInNewContext(core,context,{timeout:10000});const C=context.module.exports;
const migrated=C.validateSave({version:1,bestRun:73,settings:{sound:false,weather:'rain'},vehicle:{fuel:19,tires:27,odometerMiles:995.5},roadKnowledge:{'Main Street':{distanceM:3210,entries:4}},journal:[{id:'d1',kind:'drive',miles:3.2,seconds:420,roads:4}],stats:{trips:1,totalMiles:3.2}});
assert.equal(migrated.version,1);assert.equal(migrated.vehicle.fuel,19);assert.equal(migrated.vehicle.tires,27);assert.equal(migrated.vehicle.odometerMiles,995.5);assert.equal(migrated.roadKnowledge['Main Street'].entries,4);assert.equal(migrated.journal.length,1);assert.equal(migrated.settings.autoThrottle,false);
const defaults=C.validateSave(null);assert.equal(defaults.vehicle.fuel,100);assert.equal(defaults.vehicle.body,100);assert.equal(Object.keys(defaults.roadKnowledge).length,0);assert.equal(defaults.journal.length,0);
const world=C.createWorld(),normal=C.createCar(),worn=C.createCar();normal.vx=worn.vx=0;normal.vz=worn.vz=0;worn.enginePower=.5;for(let i=0;i<120;i++){C.stepCar(normal,{throttle:1,brake:0,steer:0},world,C.DT,false);C.stepCar(worn,{throttle:1,brake:0,steer:0},world,C.DT,false);}assert.ok(Math.hypot(normal.vx,normal.vz)>Math.hypot(worn.vx,worn.vz)+1,'Engine condition must affect acceleration');
const empty=C.createCar();empty.fuelAvailable=false;for(let i=0;i<60;i++)C.stepCar(empty,{throttle:1,brake:0,steer:0},world,C.DT,false);assert.ok(Math.hypot(empty.vx,empty.vz)<.1,'Empty fuel state must not accelerate');
console.log('Living Car persistence, road memory and condition-sensitive dynamics verified.');
