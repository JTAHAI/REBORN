'use strict';
// Additional independent keyboard boundary, not a replacement for the full journey.
const assert=require('node:assert/strict');
require('./garage-browser-check.cjs').withBrowser(async browser=>{
  await browser('click','#intro-help');
  await browser('press','Shift+Tab');
  const before=JSON.parse(await browser('eval',`({active:document.activeElement.id,hidden:document.querySelector('#pause').hidden})`));
  console.log(JSON.stringify({before}));
  assert.equal(before.active,'resume','Shift+Tab from first setup control must wrap to Resume');
  await browser('press','Escape');
  const after=JSON.parse(await browser('eval',`({active:document.activeElement.id,hidden:document.querySelector('#pause').hidden})`));
  console.log(JSON.stringify({after}));
  assert.ok(after.hidden && after.active==='intro-help','Escape from the settings button must close once and restore the garage control');
  await browser('click','#story-open');
  await browser('press','Escape');
  const story=JSON.parse(await browser('eval',`({state:document.body.dataset.state,pause:!document.querySelector('#pause').hidden,story:!document.querySelector('#story').hidden})`));
  console.log(JSON.stringify({storyEscape:story}));
  assert.ok(!story.pause && ['menu','story'].includes(story.state),'Escape from story must not jump into an unstarted drive or an unrelated pause dialog');
  console.log('Button-focus Escape and story isolation passed');
});
