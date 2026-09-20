'use strict';
// Independent security regression. All sensitive-looking files below are dummy
// bytes in a disposable fixture; never request actual owner files or backups.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const {spawn} = require('node:child_process');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'reborn-http-private-'));
const root = path.join(fixture, 'site');
function put(relative, data) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, data);
}
async function main() {
  put('tools/serve.cjs', fs.readFileSync(path.join(__dirname, '../tools/serve.cjs')));
  put('index.html', '<!doctype html><title>Isolated public entry</title>');
  put('dist/index.html', '<!doctype html><title>Isolated public build</title>');
  const asset = 'assets/vehicles/jetta-mkiv/volkswagen-bora-jetta-mk4-2005.cc-by-4.0.glb';
  put(asset, 'PUBLIC-FIXTURE-ASSET');
  put('assets/vehicles/jetta-mkiv/CREDITS.md', 'PUBLIC-FIXTURE-CREDITS');
  const privatePaths = ['.git/config', '.env', 'REBORN.7z', '.sentinel_tmp/proof.json',
    'tests/private-fixture.json', 'tools/private-fixture.json', 'references/owner-photo.jpg',
    'assets/.env', 'assets/nested/.git/config', 'config/credentials.json'];
  for (const file of privatePaths) put(file, 'DUMMY-PRIVATE-FIXTURE-NOT-OWNER-DATA');
  const outside = path.join(fixture, 'outside');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'probe.glb'), 'DUMMY-OUTSIDE-FIXTURE');
  fs.symlinkSync(outside, path.join(root, 'assets', 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  fs.symlinkSync(path.join(root, '.git'), path.join(root, 'assets', 'internal-alias'),
    process.platform === 'win32' ? 'junction' : 'dir');
  const reservation = net.createServer();
  await new Promise((resolve,reject)=>{reservation.once('error',reject);reservation.listen(0,'127.0.0.1',resolve);});
  const port = reservation.address().port;
  await new Promise(resolve=>reservation.close(resolve));
  const child = spawn(process.execPath,[path.join(root,'tools/serve.cjs')],
    {cwd:root,windowsHide:true,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',c=>{stderr=(stderr+c).slice(-2000);});
  const stopped = new Promise(resolve=>child.once('exit',resolve));
  try {
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Owned fixture startup timeout')),10000);
      let output='';
      child.stdout.on('data',c=>{output+=c;if(output.includes('http://127.0.0.1:'+port)){clearTimeout(timer);resolve();}});
      child.once('error',e=>{clearTimeout(timer);reject(e);});
      child.once('exit',code=>{clearTimeout(timer);reject(new Error('Fixture exited: '+code+' '+stderr));});
    });
    async function get(url) {
      return new Promise((resolve,reject)=>{
        const req=http.get({hostname:'127.0.0.1',port,path:url,timeout:5000},res=>{
          let body='';res.on('data',c=>{body+=c;});res.once('error',reject);
          res.on('end',()=>resolve({status:res.statusCode,body}));
        });
        req.once('error',reject);req.once('timeout',()=>req.destroy(new Error('HTTP timeout')));
      });
    }
    for (const url of ['/', '/index.html', '/dist/index.html', '/'+asset, '/assets/vehicles/jetta-mkiv/CREDITS.md'])
      assert.equal((await get(url)).status,200,'Public game resource must remain available: '+url);
    const failures=[];
    const aliases = ['/assets/internal-alias/config', '/assets/%2eenv'];
    if (process.platform === 'win32') aliases.push('/.GIT/config', '/TeStS/private-fixture.json',
      '/ReFeReNcEs/owner-photo.jpg');
    for (const url of [...privatePaths.map(p=>'/'+p), '/%2egit/config', '/assets/linked/probe.glb', ...aliases]) {
      const result=await get(url);
      const denied=[403,404].includes(result.status) && !result.body.includes('DUMMY-');
      console.log(JSON.stringify({path:url,status:result.status,privateBytesDenied:denied}));
      if(!denied) failures.push(url+' returned '+result.status);
    }
    assert.equal((await get('/')).status,200,'Server remains healthy after denial');
    assert.deepEqual(failures,[],'Local preview must not expose repository metadata, backups, private references or linked files outside its public root');
    console.log('Real HTTP public resources and private-file/junction isolation passed');
  } finally {
    if(child.exitCode===null && child.signalCode===null)child.kill();
    let timer;
    try { await Promise.race([stopped,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Owned child cleanup unconfirmed')),5000);})]); }
    finally {clearTimeout(timer);}
  }
}
// Keep the small isolated fixture for inspection; no owner-file deletion or
// cleanup traversal across the test junction is attempted.
main().catch(error=>{console.error(error.message);console.error('Fixture: '+fixture);process.exitCode=1;});
