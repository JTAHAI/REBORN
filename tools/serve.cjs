#!/usr/bin/env node
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary'};
http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) { res.writeHead(400); return res.end('Bad Request'); }
  if (pathname.includes('\0')) { res.writeHead(400); return res.end('Bad Request'); }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filename = path.resolve(root, relative);
  if (!filename.startsWith(root + path.sep) && filename !== root) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filename, (error, data) => {
    if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500, {'Content-Type':'text/plain; charset=utf-8'}); return res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error'); }
    res.writeHead(200, {'Content-Type': mime[path.extname(filename).toLowerCase()] || 'application/octet-stream', 'Cache-Control':'no-store'});
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`99½ REBORN running at http://127.0.0.1:${port}`));
