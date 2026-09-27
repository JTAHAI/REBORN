// Optional driveway story inside the paused Workshop. No timers or repair gates.
const WM=C.WorkshopMemories;
let drivewayStage=-1,drivewayFeedback='',drivewayAside='',drivewayRevision='';
function workshopMemoryState(){save.workshopMemories=WM.sanitize(save.workshopMemories);return save.workshopMemories;}
function workshopMemoryAside(kind){drivewayAside=WM.aside(kind,workshopMemoryState());renderWorkshopMemory();}
function renderWorkshopMemory(focus=false){
 const panel=$('driveway-memory');if(!panel)return;
 const value=workshopMemoryState(),key=JSON.stringify([value,drivewayStage,drivewayFeedback,drivewayAside]);
 if(key===drivewayRevision&&!focus)return;drivewayRevision=key;
 const playing=drivewayStage>=0;panel.dataset.playing=String(playing);const s=WM.scene(Math.max(0,drivewayStage),value.language);
 $('driveway-title').textContent=playing?s.title:'The red intake. The driveway. The language.';
 $('driveway-text').textContent=playing?s.text:'You installed the red AEM intake yourself. The two mounts had other ideas. Revisit the afternoon without reliving the frustration.';
 $('driveway-quote').textContent=playing?s.quote:'Some modifications improve airflow. Others improve your vocabulary.';
 $('driveway-step').textContent=playing?'RECOLLECTION '+(s.stage+1)+' / 3':value.completed?'A MEMORY WORTH KEEPING':'FROM JUSTIN’S DRIVEWAY';
 $('driveway-feedback').textContent=drivewayFeedback;$('driveway-feedback').hidden=!drivewayFeedback;
 $('driveway-aside').textContent=drivewayAside;$('driveway-aside').hidden=!drivewayAside;
 $('driveway-language').checked=value.language==='sailor';$('driveway-asides').checked=value.asides;
 const list=$('driveway-actions');list.replaceChildren();
 const button=(id,label,primary=false)=>{const b=document.createElement('button');b.type='button';b.className=primary?'primary':'secondary';b.dataset.drivewayAction=id;b.textContent=label;list.append(b);};
 if(playing){for(const [i,c] of s.choices.entries())button(c.id,c.label,i===0);if(s.stage<2)button('skip','Skip to the good part');button('close','Back to the workshop');}
 else{button('begin',value.completed?'Remember it again':'Remember the install',true);if(!value.completed)button('skip','Skip to the good part');}
 if(focus){$('driveway-title').focus({preventScroll:true});panel.scrollIntoView({block:'nearest',behavior:'auto'});}
}
function initWorkshopMemory(){
 const workshop=$('ux-panel-workshop');if(!workshop)return;
 const panel=document.createElement('section');panel.id='driveway-memory';panel.className='journey-panel driveway-memory';
 panel.setAttribute('aria-labelledby','driveway-title');
 panel.innerHTML='<div class="driveway-topline"><span class="driveway-red" aria-hidden="true"></span><small id="driveway-step"></small><span class="driveway-tag">OPTIONAL · NO TIMER</span></div><h3 id="driveway-title" tabindex="-1"></h3><p id="driveway-text"></p><blockquote id="driveway-quote"></blockquote><p id="driveway-feedback" role="status" hidden></p><div id="driveway-actions"></div><details class="driveway-options"><summary>Memory options &amp; context</summary><div class="driveway-preferences"><label><input id="driveway-language" type="checkbox"> Sailor vocabulary <small>Stronger language in this story only</small></label><label><input id="driveway-asides" type="checkbox"> Garage asides <small>Occasional quiet callbacks after work</small></label></div><small class="driveway-note">Adapted from Justin’s recollection; dialogue is dramatized. This is a memory, not an installation guide or a new part fitted to your save. Every choice works. Skip or close at any time; no cost, wear, missed reward or repair delay.</small></details><p id="driveway-aside" hidden></p>';
 workshop.prepend(panel);
 panel.addEventListener('click',event=>{const b=event.target.closest('[data-driveway-action]');if(!b||state!=='journey')return;const id=b.dataset.drivewayAction;
  if(id==='begin'){drivewayStage=0;drivewayFeedback='';}
  else if(id==='close'){drivewayStage=-1;drivewayFeedback='';}
  else if(id==='skip'){save.workshopMemories=WM.skip(workshopMemoryState());drivewayStage=2;drivewayFeedback='Both mounts are lined up. We have edited out the driveway’s extended language seminar.';persist();}
  else{const result=WM.choose(drivewayStage,id,workshopMemoryState());if(!result.ok)return;save.workshopMemories=result.state;drivewayStage=result.finished?-1:result.stage;drivewayFeedback=result.feedback;persist();}
  renderWorkshopMemory(true);
 });
 $('driveway-language').addEventListener('change',()=>{workshopMemoryState().language=$('driveway-language').checked?'sailor':'mild';persist();renderWorkshopMemory();});
 $('driveway-asides').addEventListener('change',()=>{workshopMemoryState().asides=$('driveway-asides').checked;if(!save.workshopMemories.asides)drivewayAside='';persist();renderWorkshopMemory();});
 renderWorkshopMemory();
}
