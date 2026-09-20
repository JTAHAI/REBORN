'use strict';
// Independent real-browser journey. Only ordinary browser clicks/keys are sent;
// DOM evaluation reads layout/focus, never writes application state or storage.
const assert=require('node:assert/strict');
require('./garage-browser-check.cjs').withBrowser(async browser=>{
  for(const [width,height] of [[1366,900],[844,390],[390,844]]) {
    await browser('set','viewport',String(width),String(height));
    await browser('click','#intro-help');
    const opened=JSON.parse(await browser('eval',`(()=>{const p=document.querySelector('#pause'),r=document.querySelector('#pause-title').getBoundingClientRect();return {open:!p.hidden,scrollTop:p.scrollTop,headingTop:r.top,headingBottom:r.bottom,height:innerHeight,focusInside:p.contains(document.activeElement),active:document.activeElement.id}})()`));
    console.log(JSON.stringify({viewport:[width,height],...opened}));
    assert.ok(opened.open&&opened.focusInside,'Settings must open with keyboard focus inside');
    assert.ok(opened.headingTop>=0&&opened.headingBottom<=height,'Settings must open at its heading, not scroll directly to its last button');
    assert.ok(opened.scrollTop<=1,'Settings must open at the beginning');
    for(let i=0;i<9;i++) {
      await browser('press','Tab');
      assert.equal(JSON.parse(await browser('eval',`document.querySelector('#pause').contains(document.activeElement)`)),true,'Keyboard focus escaped the settings dialog');
    }
    await browser('press','Escape');
    const closed=JSON.parse(await browser('eval',`({hidden:document.querySelector('#pause').hidden,active:document.activeElement.id})`));
    console.log(JSON.stringify({viewport:[width,height],closed}));
    assert.ok(closed.hidden&&closed.active==='intro-help','Escape must return to the originating garage control');
  }
  console.log('Settings opening, keyboard containment and Escape return passed at three viewports');
});
