'use strict';
// Independent acceptance. Real browser controls, read-only DOM observations;
// no injected game state and no production edits. Not physical touch evidence.
const assert = require('node:assert/strict');
const readState = `(() => ({state:document.body.dataset.state,
  pause:!document.querySelector('#pause').hidden,
  garage:!document.querySelector('#intro').hidden,
  active:document.activeElement.id,
  recover:!document.querySelector('#recover').hidden,
  returnToGarage:!document.querySelector('#garage').hidden,
  speed:document.querySelector('#speed').textContent}))()`;
require('./garage-browser-check.cjs').withBrowser(async browser => {
  for (const [width,height] of [[1366,900],[844,390]]) {
    await browser('set','viewport',String(width),String(height));
    await browser('snapshot','-i');
    await browser('click','#drive');
    await browser('snapshot','-i');
    await browser('click','#pause-button');
    await browser('snapshot','-i');
    const paused=JSON.parse(await browser('eval',readState));
    assert.equal(paused.state,'pause');
    assert.equal(paused.active,'auto-setting','Pause should focus the first setting');
    assert.ok(paused.recover && paused.returnToGarage,'Driving recovery actions must be available');
    await browser('press','Shift+Tab');
    await browser('snapshot','-i');
    assert.equal(JSON.parse(await browser('eval',readState)).active,'reset-progress','Reverse focus wraps to the final accessible driving action');
    await browser('press','Tab');
    await browser('snapshot','-i');
    assert.equal(JSON.parse(await browser('eval',readState)).active,'auto-setting','Forward focus wraps back inside dialog');
    await browser('click','#recover');
    await browser('snapshot','-i');
    const recovered=JSON.parse(await browser('eval',readState));
    assert.equal(recovered.state,'play','Recover must return to the road');
    assert.equal(recovered.pause,false);
    assert.equal(recovered.garage,false);
    assert.equal(Number(recovered.speed),0,'Recovery with neutral input must not accelerate');
    await browser('click','#pause-button');
    await browser('snapshot','-i');
    await browser('click','#garage');
    await browser('snapshot','-i');
    const garage=JSON.parse(await browser('eval',readState));
    assert.equal(garage.state,'menu');
    assert.equal(garage.active,'drive','Returning to garage restores useful keyboard focus');
    await browser('click','#intro-help');
    await browser('snapshot','-i');
    const menuSettings=JSON.parse(await browser('eval',readState));
    assert.equal(menuSettings.recover,false,'Garage settings must not recover an inactive drive');
    assert.equal(menuSettings.returnToGarage,false);
    await browser('press','Escape');
    await browser('snapshot','-i');
    assert.equal(JSON.parse(await browser('eval',readState)).state,'menu');
    console.log(JSON.stringify({viewport:[width,height],paused,recovered,garage,
      result:'PASS',physicalTouchTested:false}));
  }
});
