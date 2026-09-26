// Execute in a dedicated agent-browser test session; uses existing UI controls.
(async()=>{
 const click=id=>document.getElementById(id).click(),wait=()=>new Promise(r=>setTimeout(r,650)),results=[];
 const garage=()=>{if(REBORN.snapshot().appState==='play')click('pause-button');if(REBORN.snapshot().appState==='pause')click('garage');};
 garage();
 for(const mode of ['free','run','pursuit','arena']){document.querySelector('[data-mode='+mode+']').click();click('drive');await wait();const s=REBORN.snapshot();if(s.mode!==mode||s.appState!=='play'||s.errors.length)throw Error('Mode failed: '+mode);const before=s.town.minuteOfDay;await wait();if(mode!=='free'&&REBORN.snapshot().town.minuteOfDay!==before)throw Error('Town leaked into '+mode);results.push({mode,state:s.appState,errors:s.errors});garage();}
 click('story-open');click('story-launch');await wait();const s=REBORN.snapshot();if(s.appState!=='play'||!s.story.active||s.errors.length)throw Error('Story failed: '+JSON.stringify(s.story));results.push({mode:'story',state:s.appState,errors:s.errors});garage();return results;
})();
