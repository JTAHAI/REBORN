#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const world = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'worlds', 'north-berwick', 'world.json'), 'utf8'));
const landmarkIds = new Set(world.landmarks.map(item => item.id));
for (const id of ['town-office-police','cumberland-farms','fire-department','hurd-manor','olde-woolen-mill','allards-market','mary-hurd-academy','hannaford','pratt-whitney','noble-high-school','riverside-farm-stand']) {
  if (!landmarkIds.has(id)) throw new Error(`Missing North Berwick landmark: ${id}`);
  if (!html.includes(`id==='${id}'`)) throw new Error(`Missing authored hero landmark renderer: ${id}`);
}
for (const token of ['frontYaw','orientedFootprints:true','contextGeometry','nb_water','nb_forests','nb_farmland','parkingRows','wireCount<260','remoteTexture']) {
  if (!html.includes(token)) throw new Error(`Realism pipeline invariant absent: ${token}`);
}
if ((world.openContext?.waterPolygons?.length || 0) < 100 || (world.openContext?.forests?.length || 0) < 20 || (world.props?.utilityPoles?.length || 0) < 1000) throw new Error('Open North Berwick context is incomplete.');

const requiredReferenceFiles = [
  'reference/north-berwick/ATLAS_SOURCE_MANIFEST.json',
  'reference/north-berwick/SELECTED_ATTRIBUTION.md',
  'reference/north-berwick/CONTACT_SHEET.jpg'
];
for (const relative of requiredReferenceFiles) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full) || fs.statSync(full).size < 500) throw new Error(`North Berwick reference evidence missing: ${relative}`);
}
console.log('North Berwick driver-eye realism pipeline present');
