'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const screenshots=process.env.REBORN_SCREENSHOTS || path.join(require('node:os').tmpdir(),'reborn-pass04-screenshots');fs.mkdirSync(screenshots,{recursive:true});
require('./garage-browser-check.cjs').withBrowser(async browser=>{
 const inspect=async code=>JSON.parse(await browser('eval',code));
 await browser('set','viewport','1366','900');await browser('click','#drive');
 assert.equal(await inspect('REBORN.snapshot().weather.enabled'),true);
 assert.equal(await inspect('REBORN.snapshot().car.speed'),0);
 for(const [season,kind] of [['winter','snow'],['spring','fog'],['summer','heavy-rain'],['winter','freezing-rain'],['autumn','rain']]){
  await browser('press','Escape');await browser('select','#town-season-setting',season);await browser('select','#town-weather-setting',kind);
  const time=await inspect('REBORN.snapshot().weather.cursor');await browser('wait','250');assert.equal(await inspect('REBORN.snapshot().weather.cursor'),time,'Weather changes while paused');
  await browser('press','Escape');await browser('wait','1000');const w=await inspect('REBORN.snapshot().weather');assert.equal(w.current.kind,kind);assert.equal(w.season,season);
  assert.ok(w.zoneCount>50);assert.ok(w.props<=144);assert.equal(await inspect('document.getElementById("weather-chip").hidden'),false);
  assert.deepEqual(await inspect('REBORN.snapshot().errors'),[]);
  await browser('screenshot',path.join(screenshots,kind+'.png'));
 }
 await browser('eval',"window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp',key:'ArrowUp',bubbles:true}))");
 await browser('eval',`new Promise((resolve,reject)=>{const start=performance.now();const timer=setInterval(()=>{if(REBORN.snapshot().weather.observations>0){clearInterval(timer);resolve(true);}else if(performance.now()-start>20000){clearInterval(timer);reject(new Error('No observed surface after sustained throttle'));}},150);})`);await browser('eval',"window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowUp',key:'ArrowUp',bubbles:true}))");
 assert.ok(await inspect('REBORN.snapshot().car.speed>0'),'Must drive through wet leaves');assert.ok(await inspect('REBORN.snapshot().weather.observations>0'),'Moving creates surface memory');
 await browser('press','j');await browser('click','#ux-tab-town');assert.ok((await inspect('document.getElementById("weather-memory").textContent')).length>10);await browser('screenshot',path.join(screenshots,'weather-ledger.png'));
 const time=await inspect('REBORN.snapshot().weather.cursor');await browser('wait','500');assert.equal(await inspect('REBORN.snapshot().weather.cursor'),time);
 await browser('press','Escape');await browser('press','m');assert.equal(await inspect('REBORN.snapshot().appState'),'map');await browser('screenshot',path.join(screenshots,'weather-map.png'));await browser('press','Escape');
 await browser('press','Escape');await browser('uncheck','#weather-wipers');await browser('press','Escape');await browser('reload');await browser('click','#drive');
 assert.equal(await inspect('REBORN.snapshot().weather.mode'),'rain');assert.ok(await inspect('REBORN.snapshot().weather.observations>0'));
 await browser('press','Escape');assert.equal(await inspect('document.getElementById("weather-wipers").checked'),false);await browser('click','#garage');
 for(const mode of ['run','pursuit','arena']){
  await browser('click','[data-mode="'+mode+'"]');await browser('click','#drive');assert.equal(await inspect('REBORN.snapshot().weather.enabled'),false);await browser('wait','250');assert.equal(await inspect('document.getElementById("weather-chip").hidden'),true);await browser('press','Escape');await browser('click','#garage');
 }
 assert.deepEqual(await inspect('REBORN.snapshot().errors'),[]);console.log('Weather browser acceptance: five climates, rendered road dressing, paused time, drive observations, ledger/map, reload persistence, wipers, and mode isolation passed.');
});
