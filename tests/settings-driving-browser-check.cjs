'use strict';
// Independent regression: browser input and read-only DOM observations only.
const assert = require('node:assert/strict');
require('./garage-browser-check.cjs').withBrowser(async browser => {
  await browser('set', 'viewport', '1366', '900');
  await browser('click', '#drive');
  await browser('press', 'Escape');
  const paused = JSON.parse(await browser('eval', `({visible:!document.querySelector('#pause').hidden,focusInside:document.querySelector('#pause').contains(document.activeElement)})`));
  console.log(JSON.stringify({drivingEscape:paused}));
  assert.ok(paused.visible && paused.focusInside, 'Escape from driving must pause once, not immediately resume through a second handler');
  await browser('press', 'Escape');
  assert.equal(JSON.parse(await browser('eval', `document.querySelector('#pause').hidden`)), true, 'Second Escape resumes driving');
  const resumed = JSON.parse(await browser('eval', `({state:document.body.dataset.state,garage:!document.querySelector('#intro').hidden})`));
  console.log(JSON.stringify({afterResumeEscape:resumed}));
  assert.equal(resumed.state,'play','Escape from a driving pause must return to play, not menu; Story dismissal and driving resume require different destinations');
  assert.equal(resumed.garage,false,'Resuming a drive must not expose the garage');
  await browser('click', '#pause-button');
  await browser('click', '#weather-setting');
  await browser('press', 'Escape');
  if (!JSON.parse(await browser('eval', `document.querySelector('#pause').hidden`))) await browser('press', 'Escape');
  assert.equal(JSON.parse(await browser('eval', `document.querySelector('#pause').hidden`)), true, 'Escape from an active settings control returns to driving');
  assert.equal(JSON.parse(await browser('eval', `document.body.dataset.state`)), 'play', 'Closing driving settings preserves the active drive');
  console.log('Real browser driving pause/resume and settings controls passed');
});
