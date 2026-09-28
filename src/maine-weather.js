// Pure, deterministic game-weather model. Embedded inside RebornCore.
// These are authored game coefficients, NOT surveyed conditions or forecasts.
const MaineWeather = (() => {
  'use strict';
  const LIMITS = Object.freeze({zones:256, observations:160, history:32, catchUpSteps:288, props:144});
  const min=Math.min,max=Math.max;
  const STEP = 5; // town minutes; independent of display framerate
  const SEASONS = Object.freeze(['spring','summer','autumn','winter']);
  const KINDS = Object.freeze(['clear','overcast','rain','heavy-rain','fog','frost','snow','sleet','freezing-rain','thaw']);
  const LABELS = Object.freeze({clear:'Clear skies',overcast:'Overcast',rain:'Rain','heavy-rain':'Heavy rain',fog:'River fog',frost:'Frost',snow:'Snow',sleet:'Sleet','freezing-rain':'Freezing rain',thaw:'Thaw'});
  const HAZARDS = Object.freeze(['dry','wet','puddles','wet-leaves','snow','packed-snow','slush','black-ice','frost']);
  const SURFACE_LABELS = Object.freeze({dry:'Dry pavement',wet:'Wet pavement',puddles:'Standing water','wet-leaves':'Wet leaves',snow:'Unplowed snow','packed-snow':'Packed snow',slush:'Slush','black-ice':'Black ice',frost:'Frost'});
  const num=(v,d,a,b)=>typeof v==='number'&&Number.isFinite(v)?max(a,min(b,v)):d;
  const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
  const safeName=n=>typeof n==='string'&&n.length>0&&n.length<=90&&!['__proto__','prototype','constructor'].includes(n);
  const own=(o,k)=>o&&Object.prototype.hasOwnProperty.call(o,k);
  function hash(text){let h=2166136261;for(const c of String(text))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
  function random(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),a|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  const emptyZone=()=>({wet:0,puddle:0,snow:0,packed:0,slush:0,ice:0,leaves:0,salt:0,bank:0,lastService:-1});
  const unitFields=['wet','puddle','snow','packed','slush','ice','leaves','salt','bank'];
  function defaults(time=480,seed=995){return {schemaVersion:1,seed:Math.floor(num(seed,995,0,4294967295)),mode:'dynamic',seasonBase:'autumn',seasonEpochDay:0,cursor:Math.floor(num(time,480,0,1440001439)/STEP),frontKey:'',wipers:true,zones:{},observations:[],history:[],revision:0};}
  function sanitize(raw,time=480,seed=995){
    const d=defaults(time,seed),v=raw&&raw.schemaVersion===1?raw:{};
    d.wipers=v.wipers!==false;
    d.mode=v.mode==='dynamic'||KINDS.includes(v.mode)?v.mode:'dynamic';
    d.seasonBase=SEASONS.includes(v.seasonBase)?v.seasonBase:'autumn';
    d.seasonEpochDay=Math.floor(num(v.seasonEpochDay,0,0,Math.floor(time/1440)));
    d.cursor=Math.floor(num(v.cursor,d.cursor,0,d.cursor));
    d.frontKey=typeof v.frontKey==='string'?v.frontKey.slice(0,100):'';
    d.revision=Math.floor(num(v.revision,0,0,1e9));
    const zones=v.zones&&typeof v.zones==='object'&&!Array.isArray(v.zones)?v.zones:{};
    for(const name of Object.keys(zones).slice(0,LIMITS.zones)){
      if(!safeName(name))continue;const z=emptyZone(),q=zones[name]||{};
      for(const f of unitFields)z[f]=num(q[f],0,0,1);
      z.lastService=Math.floor(num(q.lastService,-1,-1,time));d.zones[name]=z;
    }
    const seen=new Set();for(const o of (Array.isArray(v.observations)?v.observations:[]).slice(0,LIMITS.observations)){
      if(!o||!safeName(o.road)||seen.has(o.road)||!HAZARDS.includes(o.hazard))continue;seen.add(o.road);
      const hazards=Array.isArray(o.hazards)?[...new Set(o.hazards.filter(h=>HAZARDS.includes(h)))].slice(0,9):[o.hazard];
      d.observations.push({road:o.road,hazard:o.hazard,hazards,at:num(o.at,time,0,time),visits:Math.floor(num(o.visits,1,1,1e6))});
    }
    for(const h of (Array.isArray(v.history)?v.history:[]).slice(0,LIMITS.history)){
      if(!h||!['front','treatment','selection'].includes(h.type)||typeof h.text!=='string')continue;
      d.history.push({type:h.type,text:h.text.slice(0,180),at:num(h.at,time,0,time)});
    }
    return d;
  }
  function seasonAt(s,time){return SEASONS[(SEASONS.indexOf(s.seasonBase)+Math.floor(max(0,Math.floor(time/1440)-s.seasonEpochDay)/30))%4];}
  function forecast(s,time){
    time=num(time,480,0,1440001439);const season=seasonAt(s,time),minute=time%1440,front=Math.floor(time/180),rng=random(hash(`${s.seed}:front:${front}`));
    const sunStart=season==='winter'?450:season==='summer'?300:360,dayLength=season==='winter'?540:season==='summer'?900:720;
    const daylight=clamp(Math.sin(clamp((minute-sunStart)/dayLength)*Math.PI)*1.8);
    const base={spring:9,summer:22,autumn:10,winter:-5}[season];
    const daily=random(hash(`${s.seed}:temperature:${Math.floor(time/1440)}`))();
    let temp=base+(daily-.5)*9+Math.sin((minute-540)/1440*Math.PI*2)*5;
    const chance={spring:.42,summer:.25,autumn:.38,winter:.52}[season],roll=rng();let kind='clear';
    if(roll<chance){kind=temp< -1?'snow':temp<1?(rng()<.55?'freezing-rain':'sleet'):rng()<.30?'heavy-rain':'rain';}
    else if(roll<chance+.23)kind='overcast';
    else if(daylight<.15&&temp<1&&season!=='summer')kind='frost';
    else if(daylight<.30&&roll>.90)kind='fog';
    const custom=s.mode!=='dynamic';if(custom)kind=s.mode;
    // Presets are explicit fictional scenarios. Keep precipitation thermodynamically coherent.
    if(kind==='snow')temp=min(temp,-3);if(kind==='sleet')temp=-.4;if(kind==='freezing-rain')temp=-1;
    if(kind==='frost')temp=min(temp,-2);if(kind==='thaw')temp=max(temp,5);
    if(kind==='rain'||kind==='heavy-rain')temp=max(temp,3);
    const intensity=.45+rng()*.4,cloud=['clear','frost'].includes(kind)?.12:kind==='thaw'?.5:kind==='fog'?.85:.95;
    const rain=kind==='heavy-rain'?1:kind==='rain'?intensity:0,snow=kind==='snow'?intensity:0,sleet=kind==='sleet'?.7:0,freezing=kind==='freezing-rain'?.65:0;
    return {kind,season,tempC:temp,rain,snow,sleet,freezing,cloud,daylight,fog:kind==='fog'?.85:kind==='heavy-rain'?.22:kind==='snow'?.30:.02,
      wind:kind==='heavy-rain'?.85:kind==='snow'?.55:.15+rng()*.25,frontKey:`${s.mode}:${season}:${front}`,custom};
  }
  // Road attributes are seeded heuristics. They are not claimed as local measurements.
  function profile(name){const r=random(hash('road-weather:'+name)),primary=/^(main|elm|wells|somersworth)\b/i.test(name),secondary=/high|noble|market|school/i.test(name);return {shade:.15+r()*.7,drainage:.3+r()*.65,priority:primary?1:secondary?2:3,phase:Math.floor(r()*30)*5};}
  function evolve(z,p,w,minutes,time){
    const temp=w.tempC+(w.daylight>.2?(1-p.shade)*1.5:-p.shade*.8),effective=temp+z.salt*4;
    const liquid=w.rain+w.freezing*.3+w.sleet*.18;
    z.wet=clamp(z.wet+minutes*(liquid*.024-(.002+max(temp,0)*.00045)*(1-w.cloud*.5)));
    z.puddle=clamp(z.puddle+minutes*(liquid*(1-p.drainage)*.016-p.drainage*.0035));
    const melt=min(z.snow,max(effective,0)*minutes*.0025);
    z.snow=clamp(z.snow+minutes*w.snow*.0035+minutes*w.sleet*.001-melt);
    z.packed=clamp(z.packed+z.snow*minutes*.0016*(4-p.priority)-max(effective,0)*minutes*.0018);
    z.slush=clamp(z.slush+melt*.7+minutes*w.sleet*.002-max(effective,1)*minutes*.0015);
    if(melt>0)z.wet=clamp(z.wet+melt*.7);
    if(effective<-.3){const freeze=min(z.wet,minutes*(-effective)*.004*(.35+p.shade));z.ice=clamp(z.ice+freeze+minutes*w.freezing*.009+z.slush*minutes*.003);z.wet=clamp(z.wet-freeze*.5);z.puddle=clamp(z.puddle-freeze);z.slush=clamp(z.slush-freeze*.2);}
    else z.ice=clamp(z.ice-max(effective,.3)*minutes*.004);
    if(w.kind==='frost'&&effective<0)z.ice=clamp(max(z.ice,min(.20,z.ice+minutes*.002*p.shade)));
    z.leaves=clamp(z.leaves+minutes*(w.season==='autumn'?.0008+w.wind*.0018:-.002)-minutes*w.rain*.0015);
    z.salt=clamp(z.salt-minutes*(.0005+w.rain*.002));z.bank=clamp(z.bank-max(temp,0)*minutes*.0007);
    // Abstract municipal service: priority corridors first. Actual plow actors are visual representatives.
    const interval=p.priority===1?60:p.priority===2?120:240,slot=Math.floor((time+p.phase)/interval)*interval-p.phase;
    let treated=false;
    if(slot>=0&&slot>z.lastService&&slot>time-minutes&&(z.snow>.055||z.ice>.06||z.slush>.08)&&temp<4){
      z.lastService=slot;z.bank=clamp(z.bank+z.snow*.45);z.snow*=.30;z.packed*=.60;z.slush*=.42;z.salt=max(z.salt,.72);z.ice*=.65;treated=true;
    }
    for(const f of unitFields)z[f]=clamp(z[f]);return treated;
  }
  function condition(z,w,speed=0,tires=100){
    z=z||emptyZone();speed=Math.abs(num(speed,0,0,120));tires=num(tires,100,0,100);
    let hazard='dry',grip=1;
    if(z.wet>.12){hazard='wet';grip=1-z.wet*.18;}
    if(z.puddle>.2){hazard='puddles';grip=min(grip,.83);}
    if(z.leaves>.22&&z.wet>.18){hazard='wet-leaves';grip=min(grip,.76-z.leaves*.18);}
    if(z.snow>.07){hazard='snow';grip=min(grip,.7-z.snow*.3);}
    if(z.slush>.10){hazard='slush';grip=min(grip,.65-z.slush*.18);}
    if(z.packed>.13){hazard='packed-snow';grip=min(grip,.60-z.packed*.25);}
    if(z.ice>.06){hazard=z.ice>.22?'black-ice':'frost';grip=min(grip,.62-z.ice*.40);}
    const hydro=clamp((speed-14)/20)*clamp((z.puddle-.18)/.65)*(.45+(1-tires/100)*.55);
    grip=clamp(grip*(1-hydro*.6),.18,1);
    return {hazard,label:SURFACE_LABELS[hazard],grip,braking:clamp(grip,.20,1),drive:clamp(.5+grip*.5-hydro*.1,.35,1),response:clamp(.55+grip*.45,.55,1),rolling:z.snow*1.4+z.slush*.7,hydro,
      wetness:z.wet,puddle:z.puddle,snowDepth:z.snow,packed:z.packed,slush:z.slush,ice:z.ice,salt:z.salt,bank:z.bank,leaves:z.leaves,
      lastService:z.lastService,tempC:w.tempC,electrical:clamp(.25+(1-w.daylight)*.5+(w.rain+w.snow+w.freezing)*.2+max(0,4-w.tempC)*.012,0,1.5)};
  }
  class Director {
    constructor(raw,world,town={day:0,minuteOfDay:480,seed:995}){
      this.time=num(town.day,0,0,1e6)*1440+num(town.minuteOfDay,480,0,1439.999999);
      this.state=sanitize(raw,this.time,town.seed);this.enabled=false;this.roads=[];this.grid=new Map();this.profiles=new Map();this.byName=new Map();this.cachedProps=[];this.propKey='';
      const names=[...new Set((world.roads||[]).map(r=>r.name).filter(safeName))].sort().slice(0,LIMITS.zones);
      const allowed=new Set(names);this.current=forecast(this.state,this.state.cursor*STEP);
      for(const name of names){this.profiles.set(name,profile(name));this.byName.set(name,[]);if(!own(this.state.zones,name))this.state.zones[name]=this.primeZone(this.current);}
      for(const n of Object.keys(this.state.zones))if(!allowed.has(n))delete this.state.zones[n];
      this.state.observations=this.state.observations.filter(o=>allowed.has(o.road));
      for(const r of world.roads||[]){if(!allowed.has(r.name)||![r.x1,r.x2,r.z1,r.z2,r.width].every(Number.isFinite))continue;
        const len=Math.hypot(r.x2-r.x1,r.z2-r.z1);if(len<.5||len>2000)continue;
        const q={...r,len,yaw:Math.atan2(r.x2-r.x1,r.z2-r.z1),index:this.roads.length};this.roads.push(q);this.byName.get(r.name).push(q);
        for(let x=Math.floor((min(r.x1,r.x2)-25)/200);x<=Math.floor((max(r.x1,r.x2)+25)/200);x++)for(let z=Math.floor((min(r.z1,r.z2)-25)/200);z<=Math.floor((max(r.z1,r.z2)+25)/200);z++){
          const key=x+','+z;if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(q);
        }
      }
      this.advanceTo(this.time,true); // bounded old-save catch-up; not wall-clock/offline progress
    }
    primeZone(w){const z=emptyZone();z.wet=w.rain*.55;z.puddle=w.rain>.8?.20:0;z.snow=w.snow*.35;z.ice=w.freezing*.6+(w.kind==='frost'?.12:0);z.slush=w.sleet*.25;z.leaves=w.season==='autumn'?.30:0;return z;}
    note(type,text,time){this.state.history.unshift({type,text,at:time});this.state.history.length=min(this.state.history.length,LIMITS.history);this.state.revision=(this.state.revision+1)%1e9;}
    advanceTo(time,active=true){
      if(!active||!Number.isFinite(time)||time<this.state.cursor*STEP)return;
      this.time=num(time,this.time,0,1440001439);const target=Math.floor(this.time/STEP),s=this.state;if(target===s.cursor)return;
      // A forged/very old cursor never causes an unbounded synchronous catch-up.
      if(target-s.cursor>LIMITS.catchUpSteps){s.cursor=target-LIMITS.catchUpSteps;for(const z of Object.values(s.zones))z.lastService=min(z.lastService,s.cursor*STEP);}
      while(s.cursor<target){s.cursor++;const t=s.cursor*STEP,w=forecast(s,t);let serviced=0;
        for(const [name,p] of this.profiles)if(evolve(s.zones[name],p,w,STEP,t))serviced++;
        if(w.frontKey!==s.frontKey){s.frontKey=w.frontKey;this.note('front',LABELS[w.kind]+' · '+w.season+' · '+Math.round(w.tempC)+'°C',t);}
        if(serviced)this.note('treatment',`Public works treated ${serviced} road corridor${serviced===1?'':'s'}; priority routes first.`,t);
        this.current=w;
      }
      this.current=forecast(s,s.cursor*STEP);
    }
    select(mode,season,time=this.time){
      if(!(mode==='dynamic'||KINDS.includes(mode))||!SEASONS.includes(season))return false;
      const s=this.state;s.mode=mode;s.seasonBase=season;s.seasonEpochDay=Math.floor(time/1440);s.cursor=Math.floor(time/STEP);this.time=time;this.current=forecast(s,s.cursor*STEP);s.frontKey=this.current.frontKey;
      // An explicit scenario selection establishes its starting surface, not an invisible timer skip.
      for(const name of this.profiles.keys())s.zones[name]=this.primeZone(this.current);
      this.note('selection',`${mode==='dynamic'?'Seeded seasonal journey':LABELS[mode]+' scenario'} · ${season}`,time);this.propKey='';return true;
    }
    locate(x,z){let best=null,dist=Infinity;for(const r of this.grid.get(Math.floor(x/200)+','+Math.floor(z/200))||[]){const dx=r.x2-r.x1,dz=r.z2-r.z1,t=clamp(((x-r.x1)*dx+(z-r.z1)*dz)/(r.len*r.len)),d=Math.hypot(x-r.x1-t*dx,z-r.z1-t*dz);if(d<dist&&d<r.width/2+5){best={road:r,t,distance:d};dist=d;}}return best;}
    sample(player,vehicle={tires:100}){const near=this.locate(player.x,player.z),z=near?this.state.zones[near.road.name]:this.primeZone(this.current);return {...condition(z,this.current,Math.hypot(player.vx||0,player.vz||0),vehicle.tires),road:near?.road.name||'',onRoad:!!near,priority:near?this.profiles.get(near.road.name).priority:0};}
    observe(sample,distanceM){if(!sample.road||!Number.isFinite(distanceM)||distanceM<=0)return false;const s=this.state;let o=s.observations.find(o=>o.road===sample.road);
      if(o&&this.time-o.at<15&&o.hazard===sample.hazard)return false;
      if(o){o.hazard=sample.hazard;o.at=this.time;o.visits=min(1e6,o.visits+1);if(!o.hazards.includes(sample.hazard))o.hazards.push(sample.hazard);s.observations=s.observations.filter(x=>x!==o);}
      else o={road:sample.road,hazard:sample.hazard,hazards:[sample.hazard],at:this.time,visits:1};
      s.observations.unshift(o);s.observations.length=min(LIMITS.observations,s.observations.length);return true;
    }
    context(){const key=this.state.cursor+':'+this.state.revision;if(this.contextKey===key)return this.cachedContext;this.contextKey=key;let puddle=0,snow=0,ice=0;const zones=Object.values(this.state.zones);for(const z of zones){puddle=max(puddle,z.puddle);snow=max(snow,z.snow);ice=max(ice,z.ice);}const w=this.current;
      return this.cachedContext={...w,standingWater:puddle,snowCover:snow,iceCover:ice,trafficSpeed:clamp(1-w.fog*.32-w.snow*.25-w.rain*.16-ice*.25,.40,1),needsPlow:snow>.06||ice>.12||w.snow>.1};
    }
    scene(sample){const w=this.current;return {...w,wetness:sample?.wetness||0,groundSnow:clamp((sample?.snowDepth||0)+(sample?.packed||0)+(sample?.bank||0)*.4),visibilityM:Math.round(3/(.0017+w.fog*.026+w.snow*.004))};}
    // Cheap nearby road dressing; cached by movement cell + 5-minute weather tick.
    props(player){if(!this.enabled)return [];const key=[Math.floor(player.x/30),Math.floor(player.z/30),this.state.cursor,this.state.revision].join(':');if(key===this.propKey)return this.cachedProps;this.propKey=key;
      const set=new Set();for(let x=Math.floor(player.x/200)-1;x<=Math.floor(player.x/200)+1;x++)for(let z=Math.floor(player.z/200)-1;z<=Math.floor(player.z/200)+1;z++)for(const r of this.grid.get(x+','+z)||[])set.add(r);
      const out=[];const add=(r,t,off,y,w,h,d,color,material=0,rough=.9)=>{if(out.length>=LIMITS.props)return;const dx=(r.x2-r.x1)/r.len,dz=(r.z2-r.z1)/r.len;out.push({mesh:'box',x:r.x1+dx*r.len*t+dz*off,z:r.z1+dz*r.len*t-dx*off,y,w,h,d,color,yaw:r.yaw,material,rough});};
      const roads=[...set].sort((a,b)=>Math.hypot((a.x1+a.x2)/2-player.x,(a.z1+a.z2)/2-player.z)-Math.hypot((b.x1+b.x2)/2-player.x,(b.z1+b.z2)/2-player.z)).slice(0,50);
      for(const r of roads){const z=this.state.zones[r.name];for(let m=6;m<r.len;m+=14){const t=m/r.len,x=r.x1+(r.x2-r.x1)*t,zz=r.z1+(r.z2-r.z1)*t;if(Math.hypot(x-player.x,zz-player.z)>155)continue;
          if(z.snow>.05||z.bank>.04){const bank=max(z.snow,z.bank);for(const side of [-1,1])add(r,t,side*(r.width/2+.28),.22+bank*.12,.72,.1+bank*.22,10,'#d8e1e4');}
          if(z.snow>.10)add(r,t,0,.22,r.width*.85,.018,11,z.salt>.25?'#b9c6ca':'#d7e0e4');
          else if(z.packed>.15||z.slush>.10)add(r,t,r.width*.19,.225,r.width*.27,.02,9,z.packed>.15?'#bac6cd':'#828f93');
          if(z.ice>.13)add(r,t,-r.width*.14,.242,r.width*.45,.013,7,'#8ba3ad',5,.09);
          else if(z.puddle>.20)add(r,t,-r.width*.28,.238,r.width*.22,.012,4,'#354b54',5,.09);
          if(z.leaves>.20&&z.snow<.10)for(const side of [-1,1])add(r,t,side*r.width*.38,.243,.32+z.leaves,.013,2.2,z.wet>.15?'#705641':'#b38d58');
        }if(out.length>=LIMITS.props)break;
      }this.cachedProps=out;return out;
    }
  }
  return Object.freeze({LIMITS,STEP,SEASONS,KINDS,LABELS,HAZARDS,SURFACE_LABELS,defaults,sanitize,seasonAt,forecast,profile,evolve,condition,Director,hash,random,emptyZone});
})();
