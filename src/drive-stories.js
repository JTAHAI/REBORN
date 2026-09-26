// Embedded inside RebornCore. Fictional passenger drives; no runtime dependency.
const DriveStories = (() => {
  'use strict';
  const LIMITS=Object.freeze({history:64,choices:96,roads:48,completed:3,events:16});
  const num=(v,d,min,max)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):d;
  const str=(v,n=160)=>typeof v==='string'?v.slice(0,n):'';
  const known=(map,id)=>typeof id==='string'&&Object.hasOwn(map,id);
  const clock=at=>num(at,0,0,1440001439);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const unique=(items,limit)=>[...new Set((Array.isArray(items)?items:[]).slice(0,limit*4).filter(x=>typeof x==='string'&&x).map(x=>x.slice(0,100)))].slice(0,limit);
  const distance=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.z||0)-(b?.z||0));
  const PASSENGERS=Object.freeze({
    mara:Object.freeze({id:'mara',name:'Mara',role:'Old friend'}),
    eli:Object.freeze({id:'eli',name:'Eli',role:'Neighbor / gearhead'}),
    nora:Object.freeze({id:'nora',name:'Nora',role:'Family friend'})
  });
  const STORIES=Object.freeze([
    Object.freeze({id:'long-way-home',number:'01',title:'The Long Way Home',passenger:'mara',pickup:'allards-market',stops:Object.freeze(['hurd-manor']),safeMph:48,arrivalRadius:42,
      scene:Object.freeze({minuteOfDay:1225,season:'autumn',weather:'rain'}),
      summary:'Pick Mara up near Allard’s. She asks you not to pass the mill. The route—and whether you fill the silence—matters.',
      objective:'Reach Allard’s, listen to what Mara asks, and bring her to Hurd Manor without turning the drive into a race.',
      opening:'Mara is waiting near Allard’s. She did not say why she wants the long way home.',
      boarding:'Thanks for coming. I know it is out of the way, but… not past the mill tonight.',
      destinationLine:'That porch light is enough. You kept your word.',
      route:Object.freeze({avoidNear:'olde-woolen-mill',avoidRoads:Object.freeze(['Canal Street','Canal Street Extension']),safeRoads:Object.freeze(['Elm Street','Main Street','Market Street','High Street'])}),
      prompts:Object.freeze(['mara-route','mara-arrival'])}),
    Object.freeze({id:'last-part',number:'02',title:'The Last Part Before Closing',passenger:'eli',pickup:'cumberland-farms',stops:Object.freeze(['allards-market','riverside-farm-stand']),safeMph:52,arrivalRadius:45,timeBudgetSeconds:300,
      scene:Object.freeze({minuteOfDay:1025,season:'autumn',weather:'overcast'}),
      summary:'Eli has one relay to collect near Allard’s and one handoff at Riverside. Promise speed, promise care, or make no promise at all.',
      objective:'Pick up Eli, make the fictional relay handoff near Allard’s, then reach Riverside with the Jetta—and the promise—in one piece.',
      opening:'Eli is waiting downtown. A friend near Allard’s has the last relay; the handoff at Riverside will not wait forever.',
      boarding:'Two stops. I would rather arrive late than arrive on a tow truck. But I really do need that relay.',
      midLine:'That is it—the relay is in the glovebox. Riverside is the last stop.',
      destinationLine:'Made it. The part, the car, and both of us. That counts.',
      prompts:Object.freeze(['eli-promise','eli-temp'])}),
    Object.freeze({id:'first-snow',number:'03',title:'First Snow',passenger:'nora',pickup:'mary-hurd-academy',stops:Object.freeze(['noble-high-school']),safeMph:40,arrivalRadius:85,timeBudget:75,
      scene:Object.freeze({minuteOfDay:945,season:'winter',weather:'snow'}),
      summary:'Nora needs a ride across town as the first snow begins to stick. Plowed roads are slower. The shortcut is not.',
      objective:'Pick Nora up near Mary Hurd Academy and bring her toward Noble. Choose the road you can actually control in the snow.',
      opening:'Nora is waiting near Mary Hurd Academy. Snow is beginning to cover the colder roads.',
      boarding:'I am not in a hurry. I just want to get there without pretending the road is dry.',
      destinationLine:'We made it. Slow enough to remember the drive instead of the ditch.',
      route:Object.freeze({shortcutRoads:Object.freeze(['Morrells Mill Road','Old County Road','Old Logging Road','Burma Road']),safeRoads:Object.freeze(['High Street','Somersworth Road','Noble Way','Main Street'])}),
      prompts:Object.freeze(['nora-route','nora-call'])})
  ]);
  const STORY_MAP=new Map(STORIES.map(s=>[s.id,s]));
  const PROMPTS=Object.freeze({
    'mara-route':Object.freeze({speaker:'Mara',text:'Can we take the long way? I do not want to see the mill tonight.',choices:Object.freeze([
      Object.freeze({id:'long',label:'Take the long way',effect:'Promise to avoid the mill corridor.',commitment:'avoid-mill',delta:1,line:'Yeah. Elm Street and the long way. Thank you.'}),
      Object.freeze({id:'ask',label:'Ask what she needs',effect:'Listen first, then honor the same route request.',commitment:'avoid-mill',delta:1,line:'Just… not that building. Not tonight. The long way is enough.'}),
      Object.freeze({id:'silence',label:'Stay quiet and listen',effect:'Silence is a choice. You still turn away from the mill.',commitment:'avoid-mill',delta:1,silence:true,line:'You do not ask. She watches the rain and exhales.'})])}),
    'mara-arrival':Object.freeze({speaker:'Mara',text:'You can leave me at the drive—or wait until the porch light comes on.',choices:Object.freeze([
      Object.freeze({id:'wait',label:'Wait for the porch light',effect:'A small commitment at the end of the drive.',delta:2,line:'There it is. Okay. I am good now.'}),
      Object.freeze({id:'drive',label:'Stop at the drive',effect:'A clean, ordinary goodbye.',delta:0,line:'This is fine. Really. Thanks for the ride.'}),
      Object.freeze({id:'silence',label:'Stay until she gets out',effect:'No speech. No rushed departure.',delta:1,silence:true,line:'The door closes softly. The porch light follows.'})])}),
    'eli-promise':Object.freeze({speaker:'Eli',text:'What are you promising me—the clock, or the car?',choices:Object.freeze([
      Object.freeze({id:'safe',label:'The car comes home',effect:'Promise a smooth, mechanically responsible drive.',commitment:'safe',delta:1,line:'Good. A relay is cheaper than another Jetta.'}),
      Object.freeze({id:'fast',label:'We beat the clock',effect:'Promise to finish within five minutes of active driving time.',commitment:'fast',delta:0,line:'Then make the speed boring. No hero stuff.'}),
      Object.freeze({id:'silence',label:'Make no promise',effect:'Let the driving answer instead.',commitment:'neutral',delta:0,silence:true,line:'Eli nods and listens to the engine.'})])}),
    'eli-temp':Object.freeze({speaker:'Eli',text:'If the temperature starts climbing, do we ease off—even if the handoff has to wait?',choices:Object.freeze([
      Object.freeze({id:'ease',label:'Promise to ease off',effect:'Keep throttle gentle if the engine gets hot. No instant repair.',delta:1,care:'ease',line:'Then let the gauge guide your right foot. The handoff can wait.'}),
      Object.freeze({id:'push',label:'Watch the gauge, keep pace',effect:'Your actual throttle and cooling-system condition decide the risk.',delta:0,care:'watch',line:'Okay. I am watching the gauge, not the clock.'}),
      Object.freeze({id:'silence',label:'Listen, make no promise',effect:'No automatic throttle or temperature change.',delta:0,silence:true,care:'neutral',line:'Eli checks the gauge and leaves you to judge the road.'})])}),
    'nora-route':Object.freeze({speaker:'Nora',text:'Main roads or the shortcut? The shortcut will not have seen a plow yet.',choices:Object.freeze([
      Object.freeze({id:'plowed',label:'Stay on the plowed roads',effect:'Promise the wider, treated route.',commitment:'plowed',delta:1,line:'Thank you. Snow rewards patience more than confidence.'}),
      Object.freeze({id:'shortcut',label:'Take the shortcut carefully',effect:'Accept the rougher route and prove you can manage it.',commitment:'shortcut',delta:0,line:'All right. Slow before every shaded corner.'}),
      Object.freeze({id:'silence',label:'Stay quiet and choose caution',effect:'Silence becomes a cautious-route promise.',commitment:'plowed',delta:1,silence:true,line:'You signal for the main road. Nora settles into the seat.'})])}),
    'nora-call':Object.freeze({speaker:'Nora',text:'These roads are getting slick. Should I report the conditions while you concentrate on driving?',choices:Object.freeze([
      Object.freeze({id:'call',label:'Ask Nora to report it',effect:'Passenger reports conditions. First report earns town trust +1.',delta:2,townTrust:1,line:'Done. They know where the slippery stretch is. You keep watching the road.'}),
      Object.freeze({id:'continue',label:'Keep moving, stay alert',effect:'Concentrate on reaching the destination safely.',delta:0,line:'Okay. We will keep our own pace.'}),
      Object.freeze({id:'silence',label:'Let the silence stand',effect:'No report. Your driving remains your choice.',delta:0,silence:true,line:'Nora watches the snow settle on the verge.'})])})
  });
  function relationship(id,raw){const p=PASSENGERS[id],r=raw&&typeof raw==='object'?raw:{};return {id,name:p.name,role:p.role,trust:num(r.trust,50,0,100),rides:Math.floor(num(r.rides,0,0,1e6)),kept:Math.floor(num(r.kept,0,0,1e6)),broken:Math.floor(num(r.broken,0,0,1e6)),silences:Math.floor(num(r.silences,0,0,1e6)),lastOutcome:str(r.lastOutcome,180)};}
  const defaults=()=>({schemaVersion:1,completed:[],active:null,relationships:Object.fromEntries(Object.keys(PASSENGERS).map(id=>[id,relationship(id)])),history:[],choiceHistory:[],supportGranted:[],lastResult:null,revision:0,stats:{started:0,completed:0,abandoned:0,choices:0,silences:0,commitmentsKept:0,commitmentsBroken:0}});
  function sanitizeMetrics(raw){const m=raw&&typeof raw==='object'?raw:{};return {distanceM:num(m.distanceM,0,0,2e7),elapsed:num(m.elapsed,0,0,86400),maxMph:num(m.maxMph,0,0,250),hardBrakes:Math.floor(num(m.hardBrakes,0,0,10000)),roughSeconds:num(m.roughSeconds,0,0,86400),speedingSeconds:num(m.speedingSeconds,0,0,86400),unsafeSeconds:num(m.unsafeSeconds,0,0,86400),bodyStart:num(m.bodyStart,100,0,100),bodyLoss:num(m.bodyLoss,0,0,100),minGrip:num(m.minGrip,1,.1,1),minFuel:num(m.minFuel,100,0,100),boardedAt:num(m.boardedAt,0,0,1440001439),rideSeconds:num(m.rideSeconds,0,0,86400),fuelStart:num(m.fuelStart,100,0,100),fuelUsed:num(m.fuelUsed,0,0,100),strainSeconds:num(m.strainSeconds,0,0,86400)};}
  function sanitizePosition(raw){return raw&&[raw.x,raw.z,raw.yaw].every(Number.isFinite)?{x:num(raw.x,0,-1e6,1e6),z:num(raw.z,0,-1e6,1e6),yaw:num(raw.yaw,0,-Math.PI*4,Math.PI*4)}:null;}
  function sanitizeActive(raw){
    if(!raw||typeof raw!=='object'||!STORY_MAP.has(raw.id))return null;
    const story=STORY_MAP.get(raw.id),phase=raw.phase==='ride'?'ride':'pickup';
    const allowed=story.id==='long-way-home'?['','avoid-mill']:story.id==='last-part'?['','safe','fast','neutral']:['','plowed','shortcut'];
    const seen=unique(raw.seen,story.prompts.length).filter(id=>story.prompts.includes(id));
    let prompt=null;
    if(phase==='ride'&&story.prompts.includes(raw.prompt?.id)){
      const openedAt=clock(raw.prompt.openedAt);
      prompt={id:raw.prompt.id,openedAt,expiresAt:num(raw.prompt.expiresAt,openedAt+12,openedAt,Math.min(1440001439,openedAt+12))};
      if(!seen.includes(prompt.id))seen.push(prompt.id);
    }
    return {id:story.id,phase,stopIndex:phase==='pickup'?0:Math.floor(num(raw.stopIndex,0,0,story.stops.length-1)),passengerAboard:phase==='ride',startedAt:clock(raw.startedAt),promptDue:clock(raw.promptDue),prompt,seen,roads:unique(raw.roads,LIMITS.roads),lastRoad:str(raw.lastRoad,90),commitment:allowed.includes(raw.commitment)?raw.commitment:'',routeViolation:!!raw.routeViolation,routeEvidence:str(raw.routeEvidence,100),shortcutUsed:!!raw.shortcutUsed,relationshipDelta:num(raw.relationshipDelta,0,-30,30),lastPosition:sanitizePosition(raw.lastPosition),metrics:sanitizeMetrics(raw.metrics),brakeLatched:!!raw.brakeLatched,secondPromptReadyAt:clock(raw.secondPromptReadyAt),departureReadyAt:clock(raw.departureReadyAt),careChoice:['ease','watch','neutral'].includes(raw.careChoice)?raw.careChoice:'',feedbackSeen:unique(raw.feedbackSeen,8),lastAt:clock(raw.lastAt),previousWeather:raw.previousWeather&&['dynamic','clear','overcast','rain','heavy-rain','fog','frost','snow','freezing-rain'].includes(raw.previousWeather.mode)?{mode:raw.previousWeather.mode,season:['spring','summer','autumn','winter'].includes(raw.previousWeather.season)?raw.previousWeather.season:'autumn',epoch:Math.floor(num(raw.previousWeather.epoch,0,0,1e6))}:null};
  }
  function sanitize(raw){
    const out=defaults(),v=raw&&typeof raw==='object'?raw:{};
    const done=new Set(unique(v.completed,3));for(const story of STORIES){if(done.has(story.id))out.completed.push(story.id);else break;}
    for(const id of Object.keys(PASSENGERS))out.relationships[id]=relationship(id,v.relationships?.[id]);
    out.active=sanitizeActive(v.active);
    if(out.active&&!canPlay(out,STORIES.findIndex(story=>story.id===out.active.id)))out.active=null;
    out.history=(Array.isArray(v.history)?v.history:[]).slice(0,LIMITS.history).filter(x=>x&&STORY_MAP.has(x.story)).map(x=>({id:str(x.id,90),story:x.story,at:clock(x.at),outcome:str(x.outcome,180),delta:num(x.delta,0,-20,20),passenger:PASSENGERS[STORY_MAP.get(x.story).passenger].name}));
    out.choiceHistory=(Array.isArray(v.choiceHistory)?v.choiceHistory:[]).slice(0,LIMITS.choices).filter(x=>x&&STORY_MAP.has(x.story)&&STORY_MAP.get(x.story).prompts.includes(x.prompt)&&known(PROMPTS,x.prompt)&&PROMPTS[x.prompt].choices.some(c=>c.id===x.choice)).map(x=>({story:x.story,prompt:x.prompt,choice:x.choice,at:clock(x.at),silence:!!PROMPTS[x.prompt].choices.find(c=>c.id===x.choice).silence}));
    out.supportGranted=unique(v.supportGranted,3).filter(id=>id==='nora-call');
    if(v.lastResult&&STORY_MAP.has(v.lastResult.story))out.lastResult={story:v.lastResult.story,title:STORY_MAP.get(v.lastResult.story).title,outcome:str(v.lastResult.outcome,220),delta:num(v.lastResult.delta,0,-20,20),trust:num(v.lastResult.trust,50,0,100),at:clock(v.lastResult.at)};
    out.revision=Math.floor(num(v.revision,0,0,1e9));for(const k of Object.keys(out.stats))out.stats[k]=Math.floor(num(v.stats?.[k],0,0,1e9));return out;
  }
  function canPlay(state,index){return Number.isInteger(index)&&index>=0&&index<STORIES.length&&STORIES.slice(0,index).every(s=>state.completed.includes(s.id));}
  function project(world,id){const landmark=(world?.landmarks||[]).find(l=>l.id===id);if(!landmark||![landmark.x,landmark.z].every(Number.isFinite))return null;let best=null,bestDistance=Infinity;for(const road of world.roads||[]){if(![road.x1,road.z1,road.x2,road.z2].every(Number.isFinite))continue;const dx=road.x2-road.x1,dz=road.z2-road.z1,den=dx*dx+dz*dz||1,t=clamp(((landmark.x-road.x1)*dx+(landmark.z-road.z1)*dz)/den,0,1),x=road.x1+dx*t,z=road.z1+dz*t,d=Math.hypot(x-landmark.x,z-landmark.z);if(d<bestDistance){bestDistance=d;const len=Math.hypot(dx,dz)||1,yaw=Math.atan2(dx/len,-dz/len);best={id,name:landmark.name,x,z,yaw,road:road.name||'North Berwick road',distanceFromLandmark:d};}}return best;}
  class Director{
    constructor(raw,world){this.state=sanitize(raw);this.world=world;this.points=new Map();for(const story of STORIES){this.points.set(story.pickup,project(world,story.pickup));for(const id of story.stops)this.points.set(id,project(world,id));if(story.route?.avoidNear)this.points.set(story.route.avoidNear,project(world,story.route.avoidNear));}this.events=[];this.enabled=false;this.persistAccumulator=0;if(this.state.active?.lastPosition){const b=world?.bounds,p=this.state.active.lastPosition;if(b&&(p.x<b.minX||p.x>b.maxX||p.z<b.minZ||p.z>b.maxZ))this.state.active.lastPosition=null;}}
    story(id=this.state.active?.id){return STORY_MAP.get(id)||null;}
    available(){return STORIES.map((story,index)=>({story,unlocked:canPlay(this.state,index),complete:this.state.completed.includes(story.id)}));}
    point(id){return this.points.get(id)||null;}
    currentTarget(){const a=this.state.active,s=this.story();if(!a||!s)return null;return a.phase==='pickup'?this.point(s.pickup):this.point(s.stops[a.stopIndex]);}
    startPosition(id){const s=STORY_MAP.get(id),p=s&&this.point(s.pickup);if(!p)return null;const back=16;return {x:p.x-Math.sin(p.yaw)*back,z:p.z+Math.cos(p.yaw)*back,yaw:p.yaw};}
    emit(type,data={}){this.events.push({type,...data});if(this.events.length>LIMITS.events)this.events.splice(0,this.events.length-LIMITS.events);}
    say(speaker,text,duration=6){this.emit('line',{speaker,text,duration});}
    note(story,outcome,delta,at){const p=PASSENGERS[story.passenger],id=`ride-${story.id}-${Math.floor(at)}-${this.state.revision}`;this.state.history.unshift({id,story:story.id,at,outcome:str(outcome,180),delta,passenger:p.name});this.state.history.length=Math.min(LIMITS.history,this.state.history.length);}
    begin(id,at=0){const index=STORIES.findIndex(s=>s.id===id);if(!canPlay(this.state,index)||this.state.active)return {ok:false,reason:this.state.active?'Finish or abandon the current passenger drive first.':'This passenger drive is still locked.'};const story=STORIES[index],rel=this.state.relationships[story.passenger];if(![story.pickup,...story.stops].every(id=>this.point(id)))return {ok:false,reason:'A required road anchor is unavailable.'};at=clock(at);this.state.active={id,phase:'pickup',stopIndex:0,passengerAboard:false,startedAt:at,promptDue:0,prompt:null,seen:[],roads:[],lastRoad:'',commitment:'',routeViolation:false,routeEvidence:'',relationshipDelta:0,lastPosition:null,metrics:sanitizeMetrics({bodyStart:100,minGrip:1,minFuel:100}),brakeLatched:false,secondPromptReadyAt:0,departureReadyAt:0,careChoice:'',feedbackSeen:[],shortcutUsed:false,lastAt:at,previousWeather:null};this.state.stats.started++;this.state.revision++;this.say('MOTORWORKS',story.opening,7);this.emit('started',{story:id,scene:story.scene,passenger:rel.name});return {ok:true,story,scene:story.scene};}
    resume(){
      const story=this.story();if(!story)return null;
      this.say(PASSENGERS[story.passenger].name,this.state.active.passengerAboard?'We are still on the same drive. Take your time.':'I am still waiting. No rush—just get here safely.',6);
      if(this.state.active.prompt)this.emitPrompt();
      return {story,position:this.state.active.lastPosition};
    }
    emitPrompt(){const a=this.state.active,p=a&&PROMPTS[a.prompt?.id];if(!a?.prompt||!p)return;this.emit('prompt',{id:a.prompt.id,speaker:p.speaker,text:p.text,choices:p.choices.map((c,index)=>({id:c.id,label:c.label,effect:c.effect,key:String(index+1)})),expiresAt:a.prompt.expiresAt});}
    openPrompt(id,at){
      const a=this.state.active,s=this.story();if(!a||!s||!s.prompts.includes(id)||!known(PROMPTS,id)||!a.passengerAboard||a.prompt||a.seen.includes(id))return false;
      at=clock(at);a.seen.push(id);a.prompt={id,openedAt:at,expiresAt:Math.min(1440001439,at+12)};this.state.revision++;this.emitPrompt();return true;
    }
    choose(choiceId,at,automatic=false){
      const a=this.state.active,p=a&&PROMPTS[a.prompt?.id];if(!a||!p)return {ok:false,reason:'No passenger choice is waiting.'};
      at=clock(at);if(at<a.prompt.openedAt)return {ok:false,reason:'The response clock cannot move backwards.'};
      if(at>=a.prompt.expiresAt){automatic=true;choiceId='silence';}
      let choice=p.choices.find(c=>c.id===choiceId);if(!choice&&automatic)choice=p.choices.find(c=>c.silence);if(!choice)return {ok:false,reason:'That response is unavailable.'};
      const promptId=a.prompt.id;a.relationshipDelta=clamp(a.relationshipDelta+(choice.delta||0),-30,30);if(choice.commitment)a.commitment=choice.commitment;if(choice.care)a.careChoice=choice.care;
      const silent=!!choice.silence;if(silent){this.state.stats.silences++;this.state.relationships[this.story().passenger].silences++;}
      this.state.stats.choices++;this.state.choiceHistory.unshift({story:a.id,prompt:promptId,choice:choice.id,at,silence:silent});this.state.choiceHistory.length=Math.min(LIMITS.choices,this.state.choiceHistory.length);
      let townTrust=choice.townTrust||0;if(townTrust){if(this.state.supportGranted.includes(promptId))townTrust=0;else this.state.supportGranted.push(promptId);}
      a.prompt=null;if(promptId==='mara-arrival')a.departureReadyAt=at+(choice.id==='drive'?.5:3);this.state.revision++;this.say(p.speaker,choice.line,6);this.emit('choice',{choice:choice.id,townTrust,automatic,silence:silent});return {ok:true,choice};
    }
    board(at){const a=this.state.active,s=this.story();if(!a||a.passengerAboard)return;a.passengerAboard=true;a.phase='ride';a.metrics.boardedAt=at;a.promptDue=0;a.secondPromptReadyAt=at+8;this.state.relationships[s.passenger].rides++;this.state.revision++;this.say(PASSENGERS[s.passenger].name,s.boarding,7);this.emit('boarded',{story:s.id,passenger:PASSENGERS[s.passenger].name});this.openPrompt(s.prompts[0],at);}
    trackRoute(ctx){const a=this.state.active,s=this.story();if(!a||!s||!ctx.roadName)return;if(ctx.roadName!==a.lastRoad){a.lastRoad=ctx.roadName;if(!a.roads.includes(ctx.roadName)){a.roads.push(ctx.roadName);a.roads=a.roads.slice(-LIMITS.roads);}}
      if(s.id==='long-way-home'&&a.commitment==='avoid-mill'&&s.route.avoidRoads.includes(ctx.roadName)){const mill=this.point(s.route.avoidNear);if(mill&&distance(ctx.car,mill)<420){a.routeViolation=true;a.routeEvidence=ctx.roadName;}}
      if(s.id==='first-snow'&&s.route.shortcutRoads.includes(ctx.roadName)){a.shortcutUsed=true;if(a.commitment==='plowed'){a.routeViolation=true;a.routeEvidence=ctx.roadName;}}
    }
    metrics(dt,ctx){const a=this.state.active,m=a.metrics,car=ctx.car,s=this.story();m.elapsed=Math.min(86400,m.elapsed+dt);if(a.passengerAboard)m.rideSeconds=Math.min(86400,(m.rideSeconds||0)+dt);m.distanceM=Math.min(2e7,m.distanceM+num(ctx.distanceM,0,0,100));m.fuelUsed=Math.max(m.fuelUsed||0,m.fuelStart-num(ctx.vehicle?.fuel,100,0,100));if(a.careChoice==='ease'&&num(ctx.vehicle?.engineTempC,0,-30,160)>100&&(ctx.input?.throttle||0)>.8)m.strainSeconds=Math.min(86400,(m.strainSeconds||0)+dt);m.maxMph=Math.max(m.maxMph,Math.abs(car.forwardSpeed||0)*2.236936);m.minGrip=Math.min(m.minGrip,num(ctx.grip,1,.1,1));m.minFuel=Math.min(m.minFuel,num(ctx.vehicle?.fuel,100,0,100));m.bodyLoss=Math.max(m.bodyLoss,m.bodyStart-num(ctx.vehicle?.body,100,0,100));if(Math.abs(car.forwardSpeed||0)*2.236936>s.safeMph)m.speedingSeconds+=dt;if(Math.abs(car.lateralSpeed||0)>3.7)m.roughSeconds+=dt;if(num(ctx.grip,1,.1,1)<.58&&Math.abs(car.forwardSpeed||0)>10)m.unsafeSeconds+=dt;const braking=(ctx.input?.brake||0)>.72&&Math.abs(car.forwardSpeed||0)>8;if(braking&&!a.brakeLatched)m.hardBrakes++;a.brakeLatched=braking;}
    maybeSecondPrompt(ctx,at){const a=this.state.active,s=this.story();if(!a||a.prompt||at<a.secondPromptReadyAt)return;if(s.id==='long-way-home'){const target=this.point(s.stops.at(-1));if(target&&distance(ctx.car,target)<260)this.openPrompt('mara-arrival',at);}
      else if(s.id==='last-part'&&a.stopIndex>=1&&((ctx.vehicle?.engineTempC||0)>92||a.metrics.distanceM>550))this.openPrompt('eli-temp',at);
      else if(s.id==='first-snow'&&(a.metrics.distanceM>650||ctx.grip<.65))this.openPrompt('nora-call',at);
    }
    evaluate(story,a,ctx){const m=a.metrics;let delta=a.relationshipDelta,kept=false,broken=false,outcome='Drive completed.';
      if(story.id==='long-way-home'){if(a.commitment==='avoid-mill'&&!a.routeViolation){delta+=4;kept=true;outcome='You honored the long way and kept the mill out of the windshield.';}else if(a.routeViolation){delta-=5;broken=true;outcome='The route passed the mill after Mara asked you not to.';}else{delta+=1;outcome='You got Mara home, but never made a clear route promise.';}if(m.hardBrakes<=1&&m.bodyLoss<1.5)delta+=1;}
      if(story.id==='last-part'){const elapsedDrive=m.rideSeconds;if(a.commitment==='safe'){if(m.hardBrakes<=2&&m.bodyLoss<1.5&&m.unsafeSeconds<4&&(m.strainSeconds||0)<3){delta+=4;kept=true;outcome='Both handoffs were completed without sacrificing the Jetta.';}else{delta-=3;broken=true;outcome='The handoffs were completed, but the promise to protect the car was not.';}}else if(a.commitment==='fast'){if(elapsedDrive<=story.timeBudgetSeconds&&m.bodyLoss<2.5&&m.hardBrakes<=3){delta+=3;kept=true;outcome='You made the fictional window without turning the trip into damage.';}else{delta-=2;broken=true;outcome='The clock promise was missed—or cost the car too much.';}}else{delta+=1;outcome='The relay reached Riverside with no promise except the drive itself.';}}
      if(story.id==='first-snow'){if(a.commitment==='plowed'){if(!a.routeViolation&&m.unsafeSeconds<5&&m.hardBrakes<=2){delta+=5;kept=true;outcome='You stayed with the safer roads and let the snow set the pace.';}else{delta-=4;broken=true;outcome='The drive left the safer route after promising not to.';}}else if(a.commitment==='shortcut'){if(a.shortcutUsed&&m.bodyLoss<1.5&&m.hardBrakes<=2&&m.unsafeSeconds<5){delta+=2;kept=true;outcome='The shortcut worked because you treated it like winter, not a challenge.';}else{delta-=3;broken=true;outcome=a.shortcutUsed?'The shortcut asked more grip than the car had to give.':'You chose the wider roads instead of the promised shortcut.';}}else{delta+=1;outcome='You reached Noble without making the weather a contest.';}}
      return {delta:Math.round(clamp(delta,-12,12)),kept,broken,outcome};
    }
    complete(ctx){const a=this.state.active,s=this.story();if(!a||!s||!a.passengerAboard||a.prompt||a.stopIndex!==s.stops.length-1||!s.prompts.every(id=>a.seen.includes(id))||distance(ctx.car,this.currentTarget())>s.arrivalRadius||Math.hypot(ctx.car?.vx||0,ctx.car?.vz||0)>=1.8||clock(ctx.at)<(a.departureReadyAt||0))return null;const result=this.evaluate(s,a,ctx),rel=this.state.relationships[s.passenger];rel.trust=clamp(rel.trust+result.delta,0,100);if(result.kept){rel.kept++;this.state.stats.commitmentsKept++;}if(result.broken){rel.broken++;this.state.stats.commitmentsBroken++;}rel.lastOutcome=result.outcome;if(!this.state.completed.includes(s.id)){const index=STORIES.findIndex(x=>x.id===s.id);if(STORIES.slice(0,index).every(x=>this.state.completed.includes(x.id)))this.state.completed.push(s.id);}this.state.stats.completed++;this.state.revision++;const at=ctx.at||0;this.note(s,result.outcome,result.delta,at);this.state.lastResult={story:s.id,title:s.title,outcome:result.outcome,delta:result.delta,trust:rel.trust,at};this.say(PASSENGERS[s.passenger].name,result.broken?'We got here. But that was not the drive you promised.':s.destinationLine,7);this.emit('complete',{story:s.id,title:s.title,passenger:rel.name,outcome:result.outcome,delta:result.delta,trust:rel.trust,metrics:{...a.metrics},roads:a.roads.length,startRoad:a.roads[0]||'',endRoad:a.lastRoad||'',kept:result.kept,broken:result.broken,previousWeather:a.previousWeather});this.state.active=null;return result;}
    abort(reason='Passenger drive abandoned',at=0,safeExit=false){const a=this.state.active,s=this.story();if(!a||!s)return null;const rel=this.state.relationships[s.passenger],delta=a.passengerAboard&&!safeExit?-2:0;rel.trust=clamp(rel.trust+delta,0,100);if(a.passengerAboard&&!safeExit){rel.broken++;this.state.stats.commitmentsBroken++;}rel.lastOutcome=reason;this.state.stats.abandoned++;this.state.revision++;this.note(s,reason,delta,at);this.state.lastResult={story:s.id,title:s.title,outcome:reason,delta,trust:rel.trust,at};this.emit('aborted',{story:s.id,passenger:rel.name,outcome:reason,delta,trust:rel.trust,previousWeather:a.previousWeather});this.state.active=null;return {story:s,delta};}
    tick(dt,ctx={}){
      this.enabled=!!ctx.active;const a=this.state.active,s=this.story();
      if(!a||!s||!this.enabled||!Number.isFinite(dt)||dt<=0||![ctx.car?.x,ctx.car?.z,ctx.car?.yaw].every(Number.isFinite))return;
      const at=clock(ctx.at);if(at<a.lastAt)return;a.lastAt=at;a.lastPosition=sanitizePosition(ctx.car)||a.lastPosition;
      this.metrics(Math.min(dt,.1),ctx);this.trackRoute(ctx);
      if(a.prompt&&at>=a.prompt.expiresAt)this.choose('silence',at,true);
      if(a.passengerAboard&&!a.seen.includes(s.prompts[0]))this.openPrompt(s.prompts[0],at);
      const target=this.currentTarget(),speed=Math.hypot(ctx.car.vx||0,ctx.car.vz||0);
      if(target&&distance(ctx.car,target)<=s.arrivalRadius&&speed<1.8){
        if(a.phase==='pickup')this.board(at);
        else if(!a.prompt&&a.stopIndex<s.stops.length-1){a.stopIndex++;a.secondPromptReadyAt=at+3;this.state.revision++;if(s.midLine)this.say(PASSENGERS[s.passenger].name,s.midLine,6);this.emit('stop',{story:s.id,index:a.stopIndex,target:s.stops[a.stopIndex]});}
        else if(!a.prompt){if(!a.seen.includes(s.prompts[1]))this.openPrompt(s.prompts[1],at);else this.complete({...ctx,at});}
      }
      if(this.state.active){this.maybeSecondPrompt(ctx,at);this.feedback(ctx);}
      this.persistAccumulator+=Math.min(dt,.1);if(this.persistAccumulator>=3){this.persistAccumulator=0;this.emit('persist');}
    }
    feedback(ctx){
      const a=this.state.active,s=this.story();if(!a?.passengerAboard||a.prompt)return;
      const candidates=[['route',a.routeViolation,'This is the road we agreed not to take.'],['brakes',a.metrics.hardBrakes>=3,'Please leave a little more room to stop.'],['grip',a.metrics.unsafeSeconds>3,'The road is not giving us that much grip.'],['heat',ctx.vehicle?.engineTempC>110,'We can stop. Getting home includes the car.'],['damage',a.metrics.bodyLoss>2,'Are we all right? Let us take a breath.']];
      for(const [id,ready,line] of candidates)if(ready&&!a.feedbackSeen.includes(id)){a.feedbackSeen.push(id);this.say(PASSENGERS[s.passenger].name,line,7);break;}
    }
    objective(){const a=this.state.active,s=this.story(),target=this.currentTarget();if(!a||!s||!target)return null;const passenger=PASSENGERS[s.passenger],stage=a.phase==='pickup'?'PICKUP '+passenger.name.toUpperCase():a.stopIndex<s.stops.length-1?'STOP '+(a.stopIndex+1)+' OF '+s.stops.length:'DESTINATION';return {story:s.id,number:s.number,title:s.title,passenger:passenger.name,stage,destination:target,detail:stage+' / '+target.name+' · '+target.road,timeRemaining:s.timeBudgetSeconds?Math.max(0,s.timeBudgetSeconds-(a.metrics.rideSeconds||0)):null,progress:a.phase==='pickup'?.08:clamp((a.stopIndex+1)/(s.stops.length+1),.2,.95),prompt:a.prompt?{...a.prompt}:null};}
    takeEvents(){return this.events.splice(0);}
    snapshot(){return {state:JSON.parse(JSON.stringify(this.state)),active:this.state.active?{id:this.state.active.id,phase:this.state.active.phase,stopIndex:this.state.active.stopIndex,commitment:this.state.active.commitment,routeViolation:this.state.active.routeViolation,metrics:{...this.state.active.metrics}}:null,objective:this.objective(),available:this.available().map(x=>({id:x.story.id,unlocked:x.unlocked,complete:x.complete})),events:this.events.length};}
  }
  return Object.freeze({LIMITS,PASSENGERS,STORIES,STORY_MAP,PROMPTS,defaults,sanitize,canPlay,project,Director});
})();
