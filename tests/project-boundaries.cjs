#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const forbidden=[
  "Carpooling to Hell's Arcade",
  'Procedural Grand Prix',
  'North Berwick Grand Prix',
  'Door of Justice',
  'Shoe Horn Cup',
  'Jenkins ATV',
  'LAN HOST',
  'WAN HOST',
  'GRID READY'
];
for(const token of forbidden){
  if(html.includes(token))throw new Error(`Separate-project token leaked into REBORN: ${token}`);
}
for(const file of ['docs/ALTERNATE_GRAND_PRIX_MERGE.md','tests/grand-prix-upgrades.cjs']){
  if(fs.existsSync(path.join(root,file)))throw new Error(`Separate-project file remains in REBORN: ${file}`);
}
for(const mode of ['free','run','pursuit','arena']){
  if(!html.includes(`data-mode="${mode}"`))throw new Error(`Canonical REBORN activity missing: ${mode}`);
}
console.log('REBORN project boundary is clean.');
