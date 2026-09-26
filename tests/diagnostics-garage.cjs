#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const token of ['0.10.0-maine-weather-p013','diagnostic-tests','symptom-list','parts-grid','repair-history','roadside-actions','runDiagnostic','repairFault','roadsideTriage','conditionDrivingInput','DIAGNOSTIC BAY','REBUILD / PRESERVE'])assert.ok(html.includes(token),`Missing diagnostics token: ${token}`);
for(const forbidden of ['North Berwick Grand Prix','Procedural Grand Prix','GRID READY'])assert.ok(!html.includes(forbidden),`Separate-project token leaked: ${forbidden}`);
const core=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).find(code=>code.includes('else root.RebornCore = api'));
assert.ok(core,'Production simulation missing');
const context={module:{exports:{}},console};vm.runInNewContext(core,context,{timeout:10000});const C=context.module.exports;
const migrated=C.validateSave({version:1,settings:{},vehicle:{fuel:45,odometerMiles:1200},roadKnowledge:{},journal:[],stats:{}});
assert.equal(migrated.vehicle.fuel,45);assert.equal(migrated.vehicle.odometerMiles,1200);assert.ok(migrated.vehicle.parts.alternator);assert.ok(migrated.vehicle.faults.alignment.active);assert.equal(migrated.vehicle.faults.alignment.discovered,false);assert.ok(Array.isArray(migrated.serviceHistory));
const dirty=C.validateSave({version:1,settings:{},vehicle:{parts:{alternator:{condition:-20,original:'bad',rebuilds:-2}},faults:{charging:{active:true,severity:5,temporaryUntilMiles:-4}},diagnostics:{checks:-2,lastResults:[{test:'x',result:'y'}]}},serviceHistory:[{kind:'repair',odometerMiles:12,component:'ALT',action:'REBUILD'}],stats:{}});
assert.equal(dirty.vehicle.parts.alternator.condition,0);assert.equal(dirty.vehicle.parts.alternator.original,true);assert.equal(dirty.vehicle.faults.charging.severity,1);assert.equal(dirty.vehicle.faults.charging.temporaryUntilMiles,0);assert.equal(dirty.vehicle.diagnostics.checks,0);assert.equal(dirty.serviceHistory.length,1);
console.log('Diagnostics, fault migration, parts condition and garage history verified.');
