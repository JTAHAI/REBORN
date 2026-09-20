'use strict';
// Independent player-journey acceptance. It never modifies production files.
const assert = require('node:assert/strict');
const readSettings = `(() => ({autoThrottle:document.querySelector('#auto-setting').checked,sound:document.querySelector('#sound-setting').checked,weather:document.querySelector('#weather-setting').value,quality:document.querySelector('#quality-setting').value,reducedMotion:document.querySelector('#motion-setting').checked}))()`;

require('./garage-browser-check.cjs').withBrowser(async browser => {
  await browser('click', '#intro-help');
  await browser('snapshot', '-i');
  const defaults = JSON.parse(await browser('eval', readSettings));

  await browser('click', '#sound-setting');
  await browser('select', '#weather-setting', 'clear');
  await browser('select', '#quality-setting', 'low');
  assert.notDeepEqual(JSON.parse(await browser('eval', readSettings)), defaults, 'Fixture did not leave first-run defaults before reset');

  await browser('click', '#reset-progress');
  assert.equal(JSON.parse(await browser('eval', `document.querySelector('#reset-progress').textContent`)), 'CONFIRM RESET?', 'First reset click must request confirmation');
  await browser('click', '#reset-progress');
  assert.equal(JSON.parse(await browser('eval', `document.body.dataset.state`)), 'menu', 'Confirmed reset must return safely to the garage');
  assert.equal(JSON.parse(await browser('eval', `!document.querySelector('#intro').hidden`)), true, 'Garage must be visible after reset');
  assert.deepEqual(JSON.parse(await browser('eval', `({save:localStorage.getItem('995.reborn.save.v1'),story:localStorage.getItem('995.reborn.story.v1')})`)), {save:null, story:null}, 'Reset must clear only the documented REBORN storage records');

  await browser('click', '#intro-help');
  assert.deepEqual(JSON.parse(await browser('eval', readSettings)), defaults, 'Reset must restore the app\'s first-run settings in memory');
  console.log(JSON.stringify({localProgressReset:'PASS',defaults,confirmation:'inline',storageKeys:['995.reborn.save.v1','995.reborn.story.v1']}));
});
