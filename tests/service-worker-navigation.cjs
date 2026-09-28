'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../tools/service-worker.template.js'),'utf8').replace('__BUILD_ID__','unit').replace('__SHELL__','["./index.html","./asset.txt"]');
const scope='https://example.test/play/',entry=scope+'index.html';
function fixture({readFail=false,writeFail=false,cached=false}={}){
 const events={},deleted=[],items=new Map();let network=0;
 const cache={async addAll(){},async match(){if(readFail)throw Error('storage denied');return cached?new Response('cached'):undefined;},async put(){if(writeFail)throw Error('quota');}};
 const self={registration:{scope},addEventListener:(n,fn)=>events[n]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 const caches={open:async()=>{if(readFail)throw Error('storage denied');return cache;},keys:async()=>['995-reborn-'+encodeURIComponent(scope)+'-old','995-reborn-'+encodeURIComponent('/play/')+'-old','995-reborn-'+encodeURIComponent('https://example.test/')+'-root-keep','995-reborn-'+encodeURIComponent('/other/')+'-keep','other-app'],delete:async k=>{deleted.push(k);return true;}};
 const context=vm.createContext({self,caches,Request,Response,URL,Set,console,fetch:async()=>{network++;return new Response('network',{headers:{'Content-Type':'text/html'}});}});vm.runInContext(source,context);
 async function request(overrides={}){let answer;events.fetch({request:{url:scope,method:'GET',mode:'navigate',redirect:'manual',...overrides},respondWith:p=>answer=p});return answer;}
 return {events,request,deleted,context,get network(){return network;}};
}
(async()=>{
 let checks=0;
 for(const options of [{readFail:true},{writeFail:true},{}]){
  const f=fixture(options),r=await f.request();assert.equal(await r.text(),'network');assert.equal(f.network,1);checks++;
 }
 const hit=fixture({cached:true});assert.equal(await (await hit.request()).text(),'cached');assert.equal(hit.network,0);checks++;
 const f=fixture();for(const args of [{method:'POST'},{url:'https://elsewhere.test/play/'},{url:'https://example.test/other/'},{url:scope+'unknown.js',mode:'cors'}]){assert.equal(await f.request(args),undefined);checks++;}
 let done;f.events.activate({waitUntil:p=>done=p});await done;assert.equal(f.deleted.length,2);assert.ok(f.deleted.every(k=>k.endsWith('-old')));checks++;
 const redirected=new Response('hello',{status:200,headers:{'Content-Type':'text/html','X-Probe':'preserved'}});Object.defineProperty(redirected,'redirected',{value:true});f.context.probe=redirected;
 const safe=vm.runInContext('navigationResponse(probe)',f.context);assert.equal(safe.redirected,false);assert.equal(safe.headers.get('X-Probe'),'preserved');assert.equal(safe.status,200);assert.equal(await safe.text(),'hello');checks++;
 const normal=new Response('normal');f.context.probe=normal;assert.equal(vm.runInContext('navigationResponse(probe)',f.context),normal);checks++;
 console.log(JSON.stringify({serviceWorkerUnitChecks:checks,result:'passed'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
