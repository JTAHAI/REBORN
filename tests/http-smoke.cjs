#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = path.join(root, 'index.html');
if (!fs.existsSync(html) || fs.statSync(html).size < 100000) throw new Error('Runnable static build is missing or unexpectedly small.');
const server = fs.readFileSync(path.join(root, 'tools', 'serve.cjs'), 'utf8');
for (const token of ['text/html; charset=utf-8', 'model/gltf-binary', 'Forbidden']) if (!server.includes(token)) throw new Error(`Static server safeguard absent: ${token}`);
console.log('static server and entrypoint validated');
