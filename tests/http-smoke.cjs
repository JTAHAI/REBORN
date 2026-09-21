#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = path.join(root, 'index.html');
if (!fs.existsSync(html) || fs.statSync(html).size < 100000) throw new Error('Runnable static build is missing or unexpectedly small.');
for (const file of ['world.json', 'provenance.json', 'CREDITS.md']) if (!fs.existsSync(path.join(root, 'dist', 'assets', 'worlds', 'north-berwick', file))) throw new Error(`Bundled North Berwick asset missing: ${file}`);
const server = fs.readFileSync(path.join(root, 'tools', 'serve.cjs'), 'utf8');
for (const token of ['text/html; charset=utf-8', 'model/gltf-binary', 'Forbidden']) if (!server.includes(token)) throw new Error(`Static server safeguard absent: ${token}`);
console.log('static server and entrypoint validated');
