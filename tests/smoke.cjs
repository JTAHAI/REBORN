#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const value of ['0.5.3-pass008', 'RebornCore', 'RebornStory', 'RebornVehicle', 'RebornRenderer', 'data-mode="free"', 'data-mode="run"', 'data-mode="pursuit"', 'data-mode="arena"', '995.reborn.save.v1']) {
  if (!html.includes(value)) throw new Error(`Smoke invariant absent: ${value}`);
}
console.log('static gameplay invariants present');
