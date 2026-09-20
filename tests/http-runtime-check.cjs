'use strict';
// Independent real HTTP regression. Never sends crash probes to an existing
// server: this test owns its one child and its ephemeral loopback port.
const assert=require('node:assert/strict');
const http=require('node:http');
const net=require('node:net');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
async function main(){
  const reservation=net.createServer();
  await new Promise((resolve,reject)=>{reservation.once('error',reject);reservation.listen(0,'127.0.0.1',resolve);});
  const port=reservation.address().port;
  await new Promise(resolve=>reservation.close(resolve));
  const child=spawn(process.execPath,[path.join(root,'tools','serve.cjs')],
    {cwd:root,windowsHide:true,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  let stderr=''; child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-3000);});
  const stopped=new Promise(resolve=>child.once('exit',resolve));
  try{
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('Owned server startup exceeded 10 seconds')),10000);
      let output='';
      child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('http://127.0.0.1:'+port)){clearTimeout(timeout);resolve();}});
      child.once('error',error=>{clearTimeout(timeout);reject(error);});
      child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Owned server exited during startup: '+code));});
    });
    const request=url=>new Promise(resolve=>{
      const req=http.get({hostname:'127.0.0.1',port,path:url,timeout:5000},res=>{
        let bytes=0;res.on('data',chunk=>{bytes+=chunk.length;});
        res.on('end',()=>resolve({status:res.statusCode,type:res.headers['content-type'],bytes}));
      });
      req.once('timeout',()=>req.destroy(new Error('HTTP deadline')));
      req.once('error',error=>resolve({error:error.code||error.message}));
    });
    const index=await request('/');
    assert.equal(index.status,200,'Root entrypoint must load');
    assert.match(index.type,/text\/html/);assert.ok(index.bytes>100000);
    assert.equal((await request('/missing-buildroom-http-fixture')).status,404,'Missing file returns 404');
    assert.equal((await request('/..%5cbuildroom-http-denied-fixture')).status,403,'Encoded traversal stays inside the project');
    for(const bad of ['/bad%ZZ','/%E0%A4%A','/%00']){
      const result=await request(bad);console.log(JSON.stringify({path:bad,...result}));
      assert.equal(result.status,400,'Malformed request must return 400 without crashing the owned server: '+bad+'; '+stderr);
      assert.equal((await request('/')).status,200,'Server remains healthy after malformed request');
    }
    console.log('Real HTTP entrypoint, missing file, traversal, malformed URI and post-error health passed');
  }finally{
    if(child.exitCode===null && child.signalCode===null)child.kill();
    let timeout;
    try{await Promise.race([stopped,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Owned server cleanup unconfirmed')),5000);})]);}
    finally{clearTimeout(timeout);}
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
