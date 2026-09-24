#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

for (const token of [
  'GRAND_PRIX_GATE_NAMES', 'TOWN HALL START', 'OLDE WOOLEN MILL', 'CUMBERLAND CORNER',
  'WILLIAM HILL FIRE STATION', 'HANNAFORD RUN', 'NOBLE WAY', 'PRATT & WHITNEY STRAIGHT',
  'RIVERSIDE FARMSTAND', 'HOME STRAIGHT', 'buildGrandPrixRoadPath', 'renderRouteGuides',
  'initGrandPrixRivals', 'tickGrandPrixRivals', 'tickGrandPrixCountdown', 'tickGrandPrixArcade',
  'updateGrandPrixHUD', 'grandPrixPosition', 'routeTurnMeta', 'race-position', 'race-score',
  'draft-bar', 'grandPrixBoostPads', 'grandPrixMudslides', 'rollover', 'beforeinstallprompt',
  'requestFullscreen', 'wakeLock', 'navigator.vibrate'
]) assert.ok(html.includes(token), `Alternate upgrade not retained: ${token}`);

assert.match(html, /class="mode-card selected" data-mode="free" aria-pressed="true"/);
assert.ok(html.includes("let state='menu',selected='free'"), 'Free Drive must remain the default mode.');
assert.ok(html.includes("autoThrottle:false"), 'Auto-throttle must default off.');
assert.ok(html.includes("this.driveTouch>0") && html.includes("this.driveTouch<0"), 'Touch stick must provide down and up arrow behavior.');
assert.ok(html.includes('4-WAY STICK · UP THROTTLE · DOWN BRAKE / REVERSE'));
assert.ok(!html.includes('One-thumb cruise'));
assert.ok(!html.includes('Cruise holds throttle'));
assert.ok(!html.includes("if(touch)settings.autoThrottle=true"));
assert.ok(!html.includes("Carpooling to Hell's Arcade"));
assert.ok(!html.includes('Door of Justice'));
assert.ok(!html.includes('Eight robed mouths'));
assert.ok(html.includes("play:'single'"), 'Stable public build must migrate to Solo mode.');
assert.ok(html.includes('.experimental-hidden'), 'Unsupported alternate experiments must remain off the public surface.');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.name, '99½ REBORN');
assert.equal(manifest.display, 'fullscreen');
assert.ok(manifest.icons.some(icon => icon.sizes === '512x512'));
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const asset of ['index.html','manifest.webmanifest','world.json','volkswagen-bora-jetta-mk4-2005.cc-by-4.0.glb']) assert.ok(sw.includes(asset), `Offline cache missing ${asset}`);
const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
assert.ok(headers.includes('Content-Security-Policy'));
assert.ok(headers.includes('Permissions-Policy'));
for (const file of ['assets/icon-192.png','assets/icon-512.png']) assert.ok(fs.statSync(path.join(root,file)).size > 1000, `PWA icon missing: ${file}`);
console.log('Curated alternate Grand Prix upgrades are present without regressing REBORN identity or controls.');
