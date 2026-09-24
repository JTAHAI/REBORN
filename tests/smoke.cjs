#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const value of ['0.8.0-pass011', 'RebornCore', 'RebornStory', 'RebornVehicle', 'RebornRenderer', 'createNorthBerwickWorld', 'data-mode="free"', 'data-mode="run"', 'data-mode="pursuit"', 'data-mode="arena"', 'expanded-map', 'MAP_ZOOM_MIN', 'mapWheel', 'minimap-zoom-in', 'KeyM:\'map\'', '995.reborn.save.v1', 'driver-eye-v3', 'facades-atlas.webp', 'TOWNPHOTO:22', 'geometries.gableRoof', 'heroBuilding', 'groundTile=640', 'hero_sunroof', 'Vacationland', 'vehicle-condition-grid', 'road-memory-summary', 'drive-journal', "KeyJ:'journal'", 'diagnostic-tests', 'parts-grid', 'repair-history']) {
  if (!html.includes(value)) throw new Error(`Smoke invariant absent: ${value}`);
}
if (html.includes('o.radius=20000')) throw new Error('North Berwick must not render unbounded context meshes.');
const world = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'worlds', 'north-berwick', 'world.json'), 'utf8'));
if (world.format !== 'REBORN_WORLD_V2' || world.runtimeNetworkRequired !== false || world.roads.length < 300 || world.buildings.length < 1000 || world.roadLabels.length < 100 || world.landmarks.length < 11) throw new Error('North Berwick Free Drive asset is incomplete.');
const atlas = fs.readFileSync(path.join(root, 'assets', 'worlds', 'north-berwick', 'facades-atlas.webp'));
if (atlas.length < 100000 || atlas.subarray(0,4).toString('ascii') !== 'RIFF') throw new Error('North Berwick facade atlas is missing or invalid.');
const atlasMeta = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'worlds', 'north-berwick', 'facades-atlas.json'), 'utf8'));
if (atlasMeta.entries.length < 8 || atlasMeta.entries.some(item => !item.author || !item.license || !item.sourcePage)) throw new Error('North Berwick facade attribution manifest is incomplete.');
console.log('static gameplay and North Berwick realism invariants present');
