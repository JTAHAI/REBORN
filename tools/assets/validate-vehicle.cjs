#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const identity = JSON.parse(fs.readFileSync(path.join(root, 'assets-source', 'vehicles', 'jetta-mkiv', 'vehicle-identity.json'), 'utf8'));
const required = ['RebornVehicle={objects', 'hero_tire', 'hero_rim', 'hero_windshield', 'hero_sunroof', 'hero_lampbox', 'hero_taillamp', '9855 MD'];
for (const token of required) if (!source.includes(token)) throw new Error(`Vehicle integration missing: ${token}`);
if (source.includes('C.smoothstep')) throw new Error('Vehicle code references an unavailable RebornCore.smoothstep helper.');
if (source.includes("part('hero_skirt'+s)")) throw new Error('Street shell must retain the Mk IV factory rocker; custom side skirts are not evidenced.');
if (identity.runtime.sharedVehicleFunction !== 'RebornVehicle.objects') throw new Error('Vehicle identity manifest does not name the shared runtime path.');
if (!identity.unverified.includes('wheel diameter')) throw new Error('Uncertainty register was weakened.');
if (!fs.existsSync(path.join(root, 'reference', 'factory', 'PROVENANCE.md'))) throw new Error('Factory reference provenance is missing.');
if (!source.includes('volkswagen-bora-jetta-mk4-2005.cc-by-4.0.glb')) throw new Error('Licensed Mk IV GLB loader is missing.');
if (!fs.existsSync(path.join(root, 'assets', 'vehicles', 'jetta-mkiv', 'volkswagen-bora-jetta-mk4-2005.cc-by-4.0.glb'))) throw new Error('Licensed Mk IV GLB is missing.');
if (!fs.existsSync(path.join(root, 'assets', 'vehicles', 'jetta-mkiv', 'CREDITS.md'))) throw new Error('CC BY attribution is missing.');
console.log(`vehicle asset validated: ${identity.asset}`);
