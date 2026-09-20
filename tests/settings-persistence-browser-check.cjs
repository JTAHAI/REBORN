'use strict';
// Independent acceptance: isolated origin/session, ordinary UI input only.
// Never seeds storage, changes game state through eval, or alters production.
const assert = require('node:assert/strict');
const readSettings = `(() => ({autoThrottle:document.querySelector('#auto-setting').checked,sound:document.querySelector('#sound-setting').checked,weather:document.querySelector('#weather-setting').value,quality:document.querySelector('#quality-setting').value,reducedMotion:document.querySelector('#motion-setting').checked}))()`;
require('./garage-browser-check.cjs').withBrowser(async browser => {
  await browser('set','viewport','390','844');
  await browser('snapshot','-i');
  await browser('click','#intro-help');
  await browser('snapshot','-i');
  const initial = JSON.parse(await browser('eval',readSettings));
  for (const id of ['auto-setting','sound-setting','motion-setting']) {
    await browser('click','#'+id);
    await browser('snapshot','-i');
  }
  await browser('select','#weather-setting','clear');
  await browser('snapshot','-i');
  await browser('select','#quality-setting','low');
  const expected = {...initial,autoThrottle:!initial.autoThrottle,sound:!initial.sound,
    reducedMotion:!initial.reducedMotion,weather:'clear',quality:'low'};
  assert.deepEqual(JSON.parse(await browser('eval',readSettings)),expected,'UI settings did not change');
  const url = await browser('get','url');
  await browser('open',url);
  await browser('snapshot','-i');
  await browser('click','#intro-help');
  await browser('snapshot','-i');
  assert.deepEqual(JSON.parse(await browser('eval',readSettings)),expected,'Settings lost after page reload');
  await browser('press','Escape');
  await browser('set','viewport','844','390');
  await browser('snapshot','-i');
  await browser('click','#drive');
  await browser('snapshot','-i');
  await browser('press','Escape');
  await browser('snapshot','-i');
  assert.deepEqual(JSON.parse(await browser('eval',readSettings)),expected,'Drive changed saved preferences');
  assert.equal(JSON.parse(await browser('eval',`!document.querySelector('#pause').hidden`)),true,'Drive settings did not open');
  await browser('press','Escape');
  assert.equal(JSON.parse(await browser('eval',`document.body.dataset.state`)),'play','Settings did not resume the drive');
  console.log(JSON.stringify({settingsPersistence:'PASS',settings:expected,viewports:[[390,844],[844,390]],physicalTouchTested:false}));
});
