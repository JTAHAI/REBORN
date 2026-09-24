'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');let count=0;
for(const file of ['index.html','dist/index.html']){const text=fs.readFileSync(path.join(root,file),'utf8'),ids=[...text.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file+': duplicate HTML ID');for(const script of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){new vm.Script(script[1],{filename:file});count++;}}
assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),fs.readFileSync(path.join(root,'dist/index.html'),'utf8'));
console.log(count+' inline scripts syntax-checked across source/dist; IDs unique and dist identical.');
