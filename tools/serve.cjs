#!/usr/bin/env node
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary'};
const blockedPrefixes = ['.git', '.env', 'tests', 'tools', 'references', '.sentinel_tmp', 'config'];
const blockedExtensions = ['.7z', '.tar', '.gz', '.zip', '.exe', '.dll', '.pdb', '.bin'];
http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) { res.writeHead(400); return res.end('Bad Request'); }
  if (pathname.includes('\0')) { res.writeHead(400); return res.end('Bad Request'); }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  // Block private paths by segment (case-insensitive)
  const segments = relative.split('/').map(s => s.toLowerCase());
  for (const seg of segments) {
    for (const prefix of blockedPrefixes) {
      if (seg === prefix || seg.startsWith(prefix + '/')) { res.writeHead(403); return res.end('Forbidden'); }
    }
  }
  // Block archives and binaries by extension
  const ext = path.extname(relative).toLowerCase();
  if (blockedExtensions.includes(ext)) { res.writeHead(403); return res.end('Forbidden'); }
  const filename = path.resolve(root, relative);
  // Resolve symlinks/junctions to ensure target is inside root
  let realPath;
  try {
    realPath = fs.realpathSync(filename);
  } catch (e) {
    if (e.code === 'ENOENT') { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(500, {'Content-Type':'text/plain; charset=utf-8'}); return res.end('Server error');
  }
  // Ensure resolved real path is inside canonical real root
  const realRoot = fs.realpathSync(root);
  if (!realPath.startsWith(realRoot + path.sep) && realPath !== realRoot) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filename, (error, data) => {
    if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500, {'Content-Type':'text/plain; charset=utf-8'}); return res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error'); }
    res.writeHead(200, {'Content-Type': mime[path.extname(filename).toLowerCase()] || 'application/octet-stream', 'Cache-Control':'no-store'});
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`99½ REBORN running at http://127.0.0.1:${port}`));
