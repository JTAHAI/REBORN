// Authored, optional recollections. A story choice never changes mechanical state.
const WorkshopMemories = (() => {
  'use strict';
  const ID = 'red-aem-driveway';
  const defaults = () => ({schemaVersion:1, completed:false, language:'mild', asides:true});
  function sanitize(raw) {
    const v = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    return {schemaVersion:1, completed:v.completed===true, language:v.language==='sailor'?'sailor':'mild', asides:v.asides!==false};
  }
  const stages = Object.freeze([
    {
      title:'One driveway. Two mounting points.',
      text:'A red AEM cold-air intake. Installed alone, in the driveway. One mounting point underneath the engine. The other on the other side. In hindsight, this was an excellent test of vocabulary.',
      quote:'It is a pipe. How much of a personality can a pipe possibly have?',
      choices:[['optimist','“This will be a quick job.”'],['toolbox','Give the toolbox a confident nod.']]
    },
    {
      title:'The first mount fits. Naturally.',
      text:'Get one mounting point lined up and the other develops travel plans. Go around to the other side, line that one up, and the first one immediately files for independence.',
      quote:'You two are on the same car. Act like it.',
      choices:[['negotiate','Negotiate with both mounts.'],['sailor','Expand the driveway vocabulary.']]
    },
    {
      title:'Alignment, eventually. Dignity, mostly.',
      text:'Both mounts finally agree to exist in the same universe. The red intake is in. No cheering crowd, no pit crew. Just you, the Jetta, and the quiet satisfaction of having done it yourself.',
      quote:'The intake got cold air. The driveway got hot language.',
      choices:[['keep','Keep this memory.']]
    }
  ]);
  const responses = Object.freeze({
    optimist:'Famous last words. The driveway would like a written estimate.',
    toolbox:'The toolbox says nothing. It has seen this confidence before.',
    negotiate:'Both mounts have been invited to a very small peace conference.',
    sailor:'The mounting points remain unmoved. Your vocabulary does not.'
  });
  function scene(stage=0, language='mild') {
    const index=Number.isInteger(stage)?Math.max(0,Math.min(2,stage)):0, s=stages[index];
    return {...s, stage:index, choices:s.choices.map(([id,label])=>({id,label})),
      quote:language==='sailor'&&index===1?'Line up, you little bastards. You are literally on the same fucking car.':s.quote};
  }
  function choose(stage, id, raw) {
    const s=scene(stage), choice=s.choices.find(c=>c.id===id);
    if(!choice)return {ok:false,stage:s.stage,state:sanitize(raw),feedback:''};
    const state=sanitize(raw),finished=s.stage===2;
    if(finished)state.completed=true;
    return {ok:true,stage:Math.min(2,s.stage+1),state,finished,feedback:finished?'Memory kept. Pride restored. Vocabulary permanently upgraded.':responses[id]||''};
  }
  function skip(raw) { const state=sanitize(raw);state.completed=true;return state; }
  const asides=Object.freeze({
    visual:'A look around first. Still easier than negotiating with that red intake.',
    charging:'Electricity gets a test. The intake mounts only ever got a stern talking-to.',
    cooling:'Coolant gets checked. The driveway vocabulary remains at operating temperature.',
    chassis:'Alignment: a word that still brings back that AEM afternoon.',
    brakes:'Stopping power checked. Some driveway sentences had no brakes at all.',
    drivetrain:'A proper test. “It looks lined up from this side” is not a diagnostic method.',
    repair:'One job sorted. Unlike that intake, this one did not need a peace treaty.',
    service:'A little care for the car. No mounting-point diplomacy required today.'
  });
  function aside(kind, raw) { const s=sanitize(raw);return s.completed&&s.asides?(asides[kind]||asides.repair):''; }
  return Object.freeze({ID,defaults,sanitize,scene,choose,skip,aside});
})();
