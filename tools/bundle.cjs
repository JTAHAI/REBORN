#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.mkdirSync(out, {recursive:true});
fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
const vehicleSource = path.join(root, 'assets', 'vehicles', 'jetta-mkiv');
const vehicleOut = path.join(out, 'assets', 'vehicles', 'jetta-mkiv');
fs.mkdirSync(vehicleOut, {recursive:true});
for (const file of ['volkswagen-bora-jetta-mk4-2005.cc-by-4.0.glb', 'CREDITS.md']) fs.copyFileSync(path.join(vehicleSource, file), path.join(vehicleOut, file));
console.log('Static build written to dist/index.html with licensed vehicle assets.');
