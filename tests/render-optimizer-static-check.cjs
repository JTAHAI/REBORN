'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('dist/index.html','utf8');
for (const [name, text] of [
 ['version','0.37.0-render-optimizer-p040'],
 ['optimizer marker','shadow-bloom-scheduler-v1'],
 ['bloom cadence','bloomCadence'],
 ['probe cadence','probeCadence'],
 ['shadow cadence','shadowCadence'],
 ['adaptive LOD v2','adaptive-lod-v2']
]) { assert.ok(html.includes(text), name); console.log('PASS render optimizer: '+name); }
