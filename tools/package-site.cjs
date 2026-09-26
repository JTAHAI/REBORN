'use strict';
const {out,release}=require('./build-site.cjs'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const dir=path.resolve(process.env.REBORN_PACKAGE_DIR||path.join(out,'..','packages'));fs.mkdirSync(dir,{recursive:true});
const name=`REBORN-PASS-04-MAINE-WEATHER-${release.sourceCommit.slice(0,7)}-FULL-WEBSITE.zip`;
cp.execFileSync(process.env.PYTHON||(process.platform==='win32'?'python':'python3'),[path.join(__dirname,'zip-static.py'),out,path.join(dir,name)],{stdio:'inherit'});
fs.copyFileSync(path.join(out,'downloads',release.standaloneZip),path.join(dir,release.standaloneZip));
const results=[name,release.standaloneZip].map(n=>({file:n,bytes:fs.statSync(path.join(dir,n)).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,n))).digest('hex')}));
fs.writeFileSync(path.join(dir,'SHA256SUMS.txt'),results.map(x=>x.sha256+'  '+x.file).join('\n')+'\n');
console.log(JSON.stringify({sourceCommit:release.sourceCommit,remainingPasses:4,packages:results},null,2));
