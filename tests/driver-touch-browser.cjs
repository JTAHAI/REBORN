'use strict';
// Browser pointer input with an isolated touch-capability fixture. Not real-device certification.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
require('./garage-browser-check.cjs').withBrowser(async browser=>{
 const inspect=async code=>JSON.parse(await browser('eval',code));
 // Fullscreen exit is asynchronous and may restore the previous viewport after
 // click() returns. Observe completion before resizing; do not sample mid-exit.
 const until=async (expression,label)=>{
  const end=Date.now()+10000;
  while(Date.now()<end){if(await inspect(expression))return;await browser('wait','100');}
  const state=await inspect(`({width:innerWidth,height:innerHeight,fullscreen:!!document.fullscreenElement,scene:REBORN.snapshot().appState,touch:document.body.classList.contains('touch'),portrait:matchMedia('(orientation:portrait)').matches,guard:getComputedStyle(document.getElementById('rotate-device')).display})`);
  assert.fail(label+': '+JSON.stringify(state));
 };
 await browser('click','#drive');
 assert.equal(await inspect(`document.body.classList.contains('touch')`),true);
 assert.equal(await inspect(`REBORN.snapshot().car.speed`),0);
 await browser('click','#ux-dismiss-tip');
 const rects=await inspect(`Array.from(document.querySelectorAll('#drive-stick,#transform-button,#touch-controls .camera,#touch-controls .boost,#touch-controls .drift,#pulse-button,#minimap')).map(e=>({id:e.id||e.className,r:e.getBoundingClientRect().toJSON()}))`);
 assert.equal(rects.length,7);assert.ok(rects.every(e=>e.r.width>=44&&e.r.height>=44&&e.r.left>=0&&e.r.right<=844&&e.r.top>=0&&e.r.bottom<=390),JSON.stringify(rects));
 for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i].r,b=rects[j].r;assert.ok(Math.min(a.right,b.right)<=Math.max(a.left,b.left)||Math.min(a.bottom,b.bottom)<=Math.max(a.top,b.top),'Overlapping controls: '+rects[i].id+' / '+rects[j].id);}
 const stick=rects.find(e=>e.id==='drive-stick').r,x=Math.round(stick.x+stick.width/2),y=Math.round(stick.y+stick.height*.22);
 await browser('mouse','move',String(x),String(y));await browser('mouse','down');await browser('wait','700');await browser('mouse','up');
 assert.ok(await inspect(`REBORN.snapshot().car.speed>0`),'Stick up must accelerate');
 assert.equal(await inspect(`document.getElementById('drive-stick').classList.contains('active')`),false);
 assert.equal(await inspect(`document.getElementById('drive-stick').getAttribute('aria-valuenow')`),'0');
 await browser('click','#minimap');assert.equal(await inspect(`REBORN.snapshot().appState`),'map');
 await browser('click','#map-resume');await browser('click','#pause-button');
 assert.equal(await inspect(`document.activeElement.id`),'sound-setting');await browser('press','Shift+Tab');assert.equal(await inspect(`document.activeElement.id`),'ux-close-settings');await browser('press','Tab');assert.equal(await inspect(`document.activeElement.id`),'sound-setting');
 await browser('click','#recover');assert.equal(await inspect(`REBORN.snapshot().appState`),'play');assert.equal(await inspect(`REBORN.snapshot().car.speed`),0);
 console.log('Landscape touch controls, manual throttle/release, map, focus loop and recovery passed.');
 // The native browser driver cannot resize a fullscreen window into portrait.
 // Leave fullscreen through the actual settings button before testing the guard.
 if(await inspect(`!!document.fullscreenElement`)){await browser('click','#pause-button');await browser('click','#ux-fullscreen');await until(`!document.fullscreenElement`,'Fullscreen exit did not complete');await browser('click','#ux-close-settings');}
 await until(`!document.fullscreenElement && REBORN.snapshot().appState==='play'`,'Drive must be resumed outside fullscreen before resizing');
 await browser('set','viewport','390','844');
 await until(`innerWidth===390 && innerHeight===844 && matchMedia('(orientation:portrait)').matches`,'Portrait viewport did not settle');
 console.log('PORTRAIT_STATE',await inspect(`({width:innerWidth,height:innerHeight,fullscreen:!!document.fullscreenElement,scene:REBORN.snapshot().appState,touch:document.body.classList.contains('touch'),guard:getComputedStyle(document.getElementById('rotate-device')).display})`));
 // Physical rotation pauses through the production orientation handler. Some
 // desktop drivers emit only resize; exercise the same handler in that case.
 // Paused portrait menus must stay usable instead of sitting behind the guard.
 if(await inspect(`REBORN.snapshot().appState`)==='play'){
  assert.equal(await inspect(`getComputedStyle(document.getElementById('rotate-device')).display!=='none'`),true);
  await browser('eval',`window.dispatchEvent(new Event('orientationchange'))`);
 }
 await until(`REBORN.snapshot().appState==='pause'`,'Portrait rotation must pause the drive');
 assert.equal(await inspect(`document.getElementById('pause').hidden`),false);
 assert.equal(await inspect(`getComputedStyle(document.getElementById('rotate-device')).display`),'none');
 const frozen=await inspect(`({time:REBORN.snapshot().time,town:REBORN.snapshot().town.minuteOfDay,speed:REBORN.snapshot().car.speed})`);
 await browser('wait','400');
 assert.deepEqual(await inspect(`({time:REBORN.snapshot().time,town:REBORN.snapshot().town.minuteOfDay,speed:REBORN.snapshot().car.speed})`),frozen);
 // Resume through the real settings action, not a direct runtime-state write.
 // The guard is required while driving; it is intentionally absent in menus.
 await browser('click','#ux-close-settings');
 await until(`REBORN.snapshot().appState==='play'`,'Portrait resume must use the normal drive state');
 assert.equal(await inspect(`getComputedStyle(document.getElementById('rotate-device')).display!=='none'`),true);
 await browser('set','viewport','844','390');
 await until(`innerWidth===844 && innerHeight===390`,'Landscape viewport did not settle');
 assert.equal(await inspect(`getComputedStyle(document.getElementById('rotate-device')).display`),'none');
 assert.deepEqual(await inspect(`REBORN.snapshot().errors`),[]);console.log('Touch-emulated browser passed: stationary spawn, non-overlapping landscape controls, stick acceleration/release, tap minimap pause, dialog focus loop, recovery, portrait pause/frozen clocks, accessible menus and resumed driving guard.');
},{initScript:fs.readFileSync(path.join(__dirname,'driver-touch-init.js'),'utf8'),viewport:[844,390]});
