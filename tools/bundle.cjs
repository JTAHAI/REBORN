#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.rmSync(out, {recursive:true, force:true});
fs.mkdirSync(out, {recursive:true});

for (const file of ['index.html', 'manifest.webmanifest', 'sw.js', '_headers']) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}

const iconSource = path.join(root, 'assets');
const iconOut = path.join(out, 'assets');
fs.mkdirSync(iconOut, {recursive:true});
for (const file of ['icon-192.png', 'icon-512.png']) {
  fs.copyFileSync(path.join(iconSource, file), path.join(iconOut, file));
}

const vehicleSource = path.join(root, 'assets', 'vehicles', 'jetta-mkiv');
const vehicleOut = path.join(out, 'assets', 'vehicles', 'jetta-mkiv');
fs.mkdirSync(vehicleOut, {recursive:true});
for (const file of ['volkswagen-bora-jetta-mk4-2005.cc-by-4.0.glb', 'CREDITS.md']) {
  fs.copyFileSync(path.join(vehicleSource, file), path.join(vehicleOut, file));
}

const worldSource = path.join(root, 'assets', 'worlds', 'north-berwick');
const worldOut = path.join(out, 'assets', 'worlds', 'north-berwick');
fs.mkdirSync(worldOut, {recursive:true});
for (const file of ['world.json', 'provenance.json', 'CREDITS.md', 'facades-atlas.webp', 'facades-atlas.json']) {
  fs.copyFileSync(path.join(worldSource, file), path.join(worldOut, file));
}
console.log('Static REBORN Grand Prix merge written to dist/ with PWA shell, licensed vehicle, and North Berwick assets.');
