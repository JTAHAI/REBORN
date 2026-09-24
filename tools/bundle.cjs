#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.rmSync(out, {recursive:true, force:true});
fs.mkdirSync(out, {recursive:true});
fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
const vehicleSource = path.join(root, 'assets', 'vehicles', 'jetta-mkiv');
const vehicleOut = path.join(out, 'assets', 'vehicles', 'jetta-mkiv');
fs.mkdirSync(vehicleOut, {recursive:true});
for (const file of ['volkswagen-bora-jetta-mk4-2005.cc-by-4.0.glb', 'CREDITS.md']) fs.copyFileSync(path.join(vehicleSource, file), path.join(vehicleOut, file));
const worldSource = path.join(root, 'assets', 'worlds', 'north-berwick');
const worldOut = path.join(out, 'assets', 'worlds', 'north-berwick');
fs.mkdirSync(worldOut, {recursive:true});
for (const file of ['world.json', 'provenance.json', 'CREDITS.md', 'facades-atlas.webp', 'facades-atlas.json']) fs.copyFileSync(path.join(worldSource, file), path.join(worldOut, file));
console.log('Static Build 009 written to dist/ with licensed vehicle, North Berwick world data, and attributed facade atlas.');
