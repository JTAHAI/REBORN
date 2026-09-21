#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const value of ['0.5.3-pass008', 'RebornCore', 'RebornStory', 'RebornVehicle', 'RebornRenderer', 'createNorthBerwickWorld', 'data-mode="free"', 'data-mode="run"', 'data-mode="pursuit"', 'data-mode="arena"', 'expanded-map', 'KeyM:\'map\'', '995.reborn.save.v1']) {
  if (!html.includes(value)) throw new Error(`Smoke invariant absent: ${value}`);
}
const world = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'worlds', 'north-berwick', 'world.json'), 'utf8'));
if (world.name !== 'North Berwick, Maine' || world.roads.length < 300 || world.buildings.length < 1000) throw new Error('North Berwick Free Drive asset is incomplete.');
console.log('static gameplay invariants present');
