'use strict';
// Independent first-use and post-driving modal boundary regression.
const assert=require('node:assert/strict');
require('./garage-browser-check.cjs').withBrowser(async browser=>{
  async function storyRoundTrip(label) {
    await browser('click','#story-open');
    await browser('press','Escape');
    const result=JSON.parse(await browser('eval',`({state:document.body.dataset.state,pause:!document.querySelector('#pause').hidden,story:!document.querySelector('#story').hidden,garage:!document.querySelector('#intro').hidden})`));
    console.log(JSON.stringify({label,...result}));
    assert.equal(result.state,'menu',label+': dismissing Story must return to garage, never start an unrequested drive');
    assert.ok(result.garage && !result.pause && !result.story,label+': only garage should remain visible');
  }
  await storyRoundTrip('Fresh first-use Story Escape');
  await browser('click','#drive');
  await browser('press','Escape');
  await browser('click','#garage');
  await storyRoundTrip('Story Escape after driving and returning to garage');
  console.log('Story Escape preserves explicit driving intent on both paths');
});
