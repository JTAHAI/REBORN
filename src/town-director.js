// Embedded inside RebornCore by tools/sync-town.cjs. No runtime dependency.
const Town = (() => {
  'use strict';
  const LIMITS=Object.freeze({events:6,actors:12,history:96,resolved:256,consequences:48,closures:6});
  const num=(v,d,min,max)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):d;
  const str=(v,n=120)=>typeof v==='string'?v.slice(0,n):'';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const BANDS=[['Late Night',0,270],['Early Morning',270,390],['Morning Commute',390,510],['School Arrival',510,570],['Daytime',570,870],['School Dismissal',870,990],['Evening Commute',990,1140],['Evening',1140,1380],['Late Night',1380,1440]];
  const band=m=>BANDS.find(b=>m>=b[1]&&m<b[2])?.[0]||'Late Night';
  const now=s=>s.day*1440+s.minuteOfDay;
  function random(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=Math.imul(x^(x>>>15),x|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function hash(v){let h=2166136261;for(const c of String(v)){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;}
  // All rhythms below are fictional gameplay schedules, not real opening hours.
  const rows=[
    ['disabled-vehicle','Disabled vehicle','A fictional driver has pulled over with a mechanical problem.','vehicle','local',120,'all','any','body',0],
    ['stranded-motorist','Stranded motorist','A fictional motorist needs a safe way home.','vehicle','local',100,'all','any','time',0],
    ['overheating','Overheating vehicle','Steam rises from a stopped car. Let it cool before approaching.','vehicle','local',90,'day','any','coolant',0],
    ['flat-tire','Flat tire','A driver is waiting clear of traffic beside a deflated tire.','vehicle','local',120,'all','any','time',0],
    ['dead-battery','Dead battery','A parked car will not crank. Sharing reserve costs battery charge.','vehicle','commercial',100,'morning','any','battery',0],
    ['loose-cargo','Loose cargo','Boxes have slipped onto the road edge. Slow down before helping.','debris','commercial',70,'day','any','tires',1],
    ['fallen-branch','Fallen branch','A limb narrows one side of the road. Keep the opposite lane clear.','branch','local',100,'all','rain','tires',1],
    ['storm-debris','Storm debris','Windblown debris is collecting at the verge.','debris','local',120,'all','rain','tires',1],
    ['utility-line','Downed utility line','Stay in the car and well clear. Only qualified crews may approach.','utility','local',160,'all','rain','unsafe',1],
    ['lane-obstruction','Temporary lane obstruction','One lane has a temporary obstruction. Opposing access remains open.','barrier','local',80,'day','any','time',1],
    ['delivery-stall','Stalled delivery van','A delivery vehicle is waiting for assistance at the shoulder.','van','commercial',90,'day','any','battery',0],
    ['construction','Road construction','A fictional crew has coned off part of a lane. Use caution.','works','local',180,'day','any','unsafe',1],
    ['utility-work','Utility work','A service crew is working behind a temporary barrier.','utility','commercial',150,'day','any','unsafe',1],
    ['public-works','Public-works activity','A maintenance crew is clearing the shoulder.','works','local',120,'morning','any','time',0],
    ['power-outage','Localized power outage','A block is without power. Report hazards without entering equipment areas.','utility','commercial',180,'all','rain','unsafe',0],
    ['flooded-shoulder','Flooded shoulder','Standing water makes the shoulder unsafe. Stay on the dry lane.','water','local',110,'all','rain','unsafe',1],
    ['deer','Deer near the road','An animal is near the verge. Slow down and leave room.','animal','local',45,'edges','any','unsafe',0],
    ['lost-pet','Lost fictional pet','A fictional pet is waiting near a public roadside area.','animal','commercial',100,'day','any','time',0],
    ['minor-collision','Minor collision','Two fictional drivers are safely out of traffic and need assistance.','emergency','local',90,'commute','any','unsafe',1],
    ['ambulance','Ambulance response','Keep an access lane clear for a fictional medical response.','emergency','commercial',60,'all','any','unsafe',0],
    ['fire-response','Fire response','Responders need space. Do not approach the hazard.','emergency','commercial',100,'all','any','unsafe',1],
    ['traffic-stop','Police traffic stop','A fictional stop occupies the shoulder. Pass slowly without interfering.','emergency','local',55,'evening','any','unsafe',0],
    ['school-arrival','School arrival congestion','Fictional school traffic is slowing at the public approach.','bus','school',60,'arrival','any','time',1],
    ['school-dismissal','School dismissal congestion','Fictional school traffic needs a clear public approach.','bus','school',70,'dismissal','any','time',1],
    ['procession','Funeral procession','A quiet fictional procession is passing. Give it time and space.','vehicle','local',55,'day','any','unsafe',0],
    ['community-traffic','Community-event traffic','Visitors need directions around a fictional public event.','vehicle','commercial',100,'evening','any','time',0],
    ['plow-staging','Plow preparation','A fictional public-works truck is preparing equipment off the travel lane.','works','local',100,'morning','any','unsafe',0],
    ['jump-start','Jump-start requested','A fictional driver asks for help restarting a car.','vehicle','commercial',100,'all','any','battery',0],
    ['directions','Directions requested','A visitor is stopped safely and looking for a public landmark.','vehicle','commercial',75,'day','any','time',0],
    ['detour','Temporary detour','Crews recommend another road while a reduced lane remains passable.','barrier','local',120,'all','any','time',1],
    ['return-assistance','A familiar act of kindness','A fictional volunteer offers reserve supplies after your earlier help.','van','commercial',120,'all','any','reward',0]
  ];
  const catalog=Object.freeze(rows.map(r=>Object.freeze({type:r[0],title:r[1],description:r[2],visual:r[3],district:r[4],duration:r[5],schedule:r[6],condition:r[7],cost:r[8],closure:!!r[9],risk:r[8]==='unsafe'?'Keep clear; call qualified assistance.':r[9]?'Slow down; road-edge hazard.':'Stop fully off the travel lane.',followUp:r[8]==='reward'?'assistance-consumed':'community-support'})));
  const definitions=new Map(catalog.map(d=>[d.type,d]));
  const STATES=['scheduled','active','acknowledged','assistance-called','player-helping','temporarily-stabilized'];
  const FINAL=['resolved','failed','expired-with-consequence'];
  const ACTORS=['commuter','school-bus','delivery','public-works','emergency','late-local','snowplow'];
  const ACTIONS={help:'Stop and help',call:'Call for assistance',warn:'Warn or direct traffic',detour:'Take a detour',continue:'Continue driving',unsafe:'Decline / abandon: Jetta is unsafe',accept:'Accept reserve supplies'};
  const defaults=()=>({schemaVersion:1,seed:995,day:0,minuteOfDay:480,timeScale:1,trust:50,lastSlot:-1,lastActorSlot:-1,revision:0,activeEvents:[],resolvedEvents:[],consequences:[],closures:[],actors:[],history:[],stats:{helped:0,called:0,ignored:0,failed:0,assistance:0}});
  const position=p=>p&&['x','z','t','yaw'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k]))&&Math.abs(p.x)<1e6&&Math.abs(p.z)<1e6&&p.t>=0&&p.t<=1&&typeof p.roadId==='string'?{x:p.x,z:p.z,t:p.t,yaw:num(p.yaw,0,-Math.PI,Math.PI),roadId:str(p.roadId,140),road:str(p.road,90),side:p.side===-1?-1:1,lane:!!p.lane}:null;
  const eventID=id=>typeof id==='string'&&/^t\d+-\d+-\d+-[a-z-]+$/.test(id)&&id.length<120;
  function sanitize(raw){
    const s=defaults(),v=raw&&typeof raw==='object'?raw:{};
    for(const [k,lo,hi] of [['seed',0,4294967295],['day',0,1000000],['minuteOfDay',0,1439.999999],['timeScale',.1,10],['trust',0,100],['revision',0,1e9]])s[k]=num(v[k],s[k],lo,hi);
    s.seed=Math.floor(s.seed);s.day=Math.floor(s.day);const time=now(s);
    s.lastSlot=Math.floor(num(v.lastSlot,-1,-1,Math.floor(time/90)));s.lastActorSlot=Math.floor(num(v.lastActorSlot,-1,-1,Math.floor(time/30)));
    const arr=(key)=>Array.isArray(v[key])?v[key].slice(0,1024):[];const seen=new Set();
    for(const e of arr('resolvedEvents')){if(s.resolvedEvents.length>=LIMITS.resolved)break;if(!e||!eventID(e.id)||seen.has(e.id)||!definitions.has(e.type)||!FINAL.includes(e.state))continue;seen.add(e.id);s.resolvedEvents.push({id:e.id,type:e.type,state:e.state,at:num(e.at,time,0,time),choice:str(e.choice,30),road:str(e.road,90)});}
    for(const e of arr('activeEvents')){if(s.activeEvents.length>=6)break;const p=position(e?.location);if(!e||!eventID(e.id)||seen.has(e.id)||!definitions.has(e.type)||!STATES.includes(e.state)||!p)continue;seen.add(e.id);const created=num(e.created,time,0,time),expires=num(e.expires,time+60,created,Math.min(time+360,created+360));s.activeEvents.push({id:e.id,type:e.type,state:e.state,location:p,created,expires,actionAt:num(e.actionAt,0,0,time+60),choice:Object.hasOwn(ACTIONS,e.choice)?e.choice:'',impact:!!e.impact});}
    for(const e of arr('history').slice(0,96))if(e&&eventID(e.id)&&definitions.has(e.type))s.history.push({id:e.id,type:e.type,at:num(e.at,time,0,time),text:str(e.text,180),road:str(e.road,90)});
    const used=new Set();for(const e of arr('consequences')){if(s.consequences.length>=48)break;if(!e||!eventID(e.id)||used.has(e.id)||!['support','caution','assisted'].includes(e.kind))continue;used.add(e.id);s.consequences.push({id:e.id,kind:e.kind,until:num(e.until,time,0,time+2880),road:str(e.road,90)});}
    // Closure authority comes only from a valid active event, never imported coordinates.
    for(const e of s.activeEvents)if(definitions.get(e.type).closure)s.closures.push({id:e.id,roadId:e.location.roadId,until:e.expires,widthFactor:.55});
    const actorIDs=new Set();for(const a of arr('actors')){if(s.actors.length>=12)break;const p=position(a?.location);if(!a||!p||!ACTORS.includes(a.kind)||typeof a.id!=='string'||a.id.length>100||!/^a\d+-\d+-\d+$/.test(a.id)||actorIDs.has(a.id))continue;actorIDs.add(a.id);const route=Array.isArray(a.route)?a.route.slice(0,8).filter(r=>typeof r==='string'&&r.length<141):[];if(!route.length)continue;s.actors.push({id:a.id,kind:a.kind,location:p,route,index:Math.floor(num(a.index,0,0,route.length-1)),origin:str(a.origin,140),destination:str(a.destination,140),expires:num(a.expires,time+30,0,time+90),speed:num(a.speed,0,0,15)});}
    for(const k of Object.keys(s.stats))s.stats[k]=Math.floor(num(v.stats?.[k],0,0,1e9));
    return s;
  }
  function eligible(d,s,weather){const w=weather&&typeof weather==='object'?weather:null;if(w){if(d.type==='flooded-shoulder'&&w.standingWater<.18)return false;if(d.type==='plow-staging'&&!w.needsPlow)return false;}const wet=w?(w.rain>.15||w.freezing>.1||w.wind>.55||w.snow>.1):weather==='rain';const b=band(s.minuteOfDay),schedule=d.schedule;return (d.condition==='any'||wet)&&(d.cost!=='reward'||s.trust>=60&&s.consequences.some(c=>c.kind==='support'&&c.until>now(s)))&&(schedule==='all'||schedule==='day'&&['Daytime','School Arrival','School Dismissal'].includes(b)||schedule==='morning'&&['Early Morning','Morning Commute'].includes(b)||schedule==='commute'&&b.includes('Commute')||schedule==='evening'&&['Evening','Late Night'].includes(b)||schedule==='edges'&&['Early Morning','Evening','Late Night'].includes(b)||schedule==='arrival'&&b==='School Arrival'||schedule==='dismissal'&&b==='School Dismissal');}
  const roadID=r=>`${r.name}:${r.x1.toFixed(2)},${r.z1.toFixed(2)}:${r.x2.toFixed(2)},${r.z2.toFixed(2)}`;
  class Grid{
    constructor(size=100){this.size=size;this.cells=new Map();}
    key(x,z){return Math.floor(x/this.size)+','+Math.floor(z/this.size);}
    add(item,minX,minZ,maxX,maxZ){for(let x=Math.floor(minX/this.size);x<=Math.floor(maxX/this.size);x++)for(let z=Math.floor(minZ/this.size);z<=Math.floor(maxZ/this.size);z++){const k=x+','+z;let a=this.cells.get(k);if(!a)this.cells.set(k,a=[]);a.push(item);}}
    at(x,z){return this.cells.get(this.key(x,z))||[];}
  }
  const segmentDistance=(p,r)=>{const dx=r.x2-r.x1,dz=r.z2-r.z1,t=clamp(((p.x-r.x1)*dx+(p.z-r.z1)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-r.x1-t*dx,p.z-r.z1-t*dz);};
  function inside(p,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>p.z)!==(b[1]>p.z)&&p.x<(b[0]-a[0])*(p.z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
  class Network{
    constructor(world){
      this.world=world;this.roads=new Map();this.ends=new Map();this.water=new Grid();this.buildings=new Grid();this.roadGrid=new Grid(250);
      for(const b of world.buildings||[]){const r=Math.hypot(b.w,b.d)/2+4;this.buildings.add(b,b.x-r,b.z-r,b.x+r,b.z+r);}
      for(const r of world.roads||[]){if(![r.x1,r.x2,r.z1,r.z2,r.width].every(Number.isFinite)||Math.hypot(r.x2-r.x1,r.z2-r.z1)<20)continue;const id=roadID(r),q={...r,id,len:Math.hypot(r.x2-r.x1,r.z2-r.z1)};this.roads.set(id,q);for(const [x,z] of [[r.x1,r.z1],[r.x2,r.z2]]){const k=Math.round(x)+','+Math.round(z);let a=this.ends.get(k);if(!a)this.ends.set(k,a=[]);a.push(id);}this.roadGrid.add(q,Math.min(r.x1,r.x2),Math.min(r.z1,r.z2),Math.max(r.x1,r.x2),Math.max(r.z1,r.z2));}
      for(const f of world.openContext?.waterways||[]){const pts=f.points||[];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if(!Array.isArray(a)||!Array.isArray(b)||!a.concat(b).every(Number.isFinite))continue;const r={x1:a[0],z1:a[1],x2:b[0],z2:b[1],width:num(f.widthM,4,1,100)};if(Math.hypot(r.x2-r.x1,r.z2-r.z1)>2000)continue;this.water.add(r,Math.min(r.x1,r.x2)-r.width,Math.min(r.z1,r.z2)-r.width,Math.max(r.x1,r.x2)+r.width,Math.max(r.z1,r.z2)+r.width);}}
      for(const f of world.openContext?.waterPolygons||[]){const pts=f.points;if(!Array.isArray(pts)||pts.length<3||!pts.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))continue;const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]),a=Math.min(...xs),b=Math.min(...zs),c=Math.max(...xs),d=Math.max(...zs);if(c-a>3000||d-b>3000)continue;this.water.add({points:pts},a,b,c,d);}
      // Compile public-road pools once. No building/road scan in the fixed-step loop.
      const anchors=world.landmarks||[],spawn=world.spawn||{x:0,z:0};this.pools={local:[],commercial:[],school:[]};
      for(const r of this.roads.values()){const mid={x:(r.x1+r.x2)/2,z:(r.z1+r.z2)/2};if(r.surface==='gravel'||r.len<40)continue;const near=anchors.filter(l=>distance(l,mid)<550);if(distance(mid,spawn)<1500||near.length)this.pools.local.push(r.id);if(near.some(l=>/retail|commercial|civic/.test(l.category)||/farms|market|crossing|town-office|hannaford/.test(l.id)))this.pools.commercial.push(r.id);if(near.some(l=>/school|academy/.test(l.id)))this.pools.school.push(r.id);}
    }
    point(id,t,side=1,lane=false){const r=this.roads.get(id);if(!r)return null;const dx=(r.x2-r.x1)/r.len,dz=(r.z2-r.z1)/r.len,off=(lane?r.width*.25:r.width/2+1.75)*side;return {roadId:id,road:r.name,t,side,lane,x:r.x1+(r.x2-r.x1)*t-dz*off,z:r.z1+(r.z2-r.z1)*t+dx*off,yaw:Math.atan2(dx*side,-dz*side)};}
    valid(p,player,occupied=[],minDistance=65){
      if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return false;const b=this.world.bounds;if(b&&(p.x<b.minX+4||p.x>b.maxX-4||p.z<b.minZ+4||p.z>b.maxZ-4))return false;
      if(player&&distance(p,player)<minDistance||occupied.some(q=>distance(p,q)<35))return false;
      if(this.water.at(p.x,p.z).some(w=>w.points?inside(p,w.points):segmentDistance(p,w)<w.width/2+2))return false;
      if(this.buildings.at(p.x,p.z).some(b=>{const dx=p.x-b.x,dz=p.z-b.z,co=Math.cos(b.yaw||0),si=Math.sin(b.yaw||0);return Math.abs(co*dx-si*dz)<b.w/2+2.8&&Math.abs(si*dx+co*dz)<b.d/2+2.8;}))return false;
      return true;
    }
    restore(p){const q=p&&this.point(p.roadId,p.t,p.side,p.lane);return q&&distance(q,p)<.5&&this.valid(q,null)?q:null;}
    placement(d,seed,player,events,closures){const pool=this.pools[d.district]||this.pools.local;if(!pool.length)return null;const r=random(seed),taken=events.map(e=>e.location);for(let i=0;i<64;i++){const id=pool[Math.floor(r()*pool.length)];if(closures.some(c=>c.roadId===id))continue;const p=this.point(id,.22+r()*.56,r()>.5?1:-1,false);if(this.valid(p,player,taken))return p;}return null;}
    route(first,side,seed){const out=[first],r=random(seed);let current=this.roads.get(first);for(let i=0;i<5;i++){const k=Math.round(side===1?current.x2:current.x1)+','+Math.round(side===1?current.z2:current.z1),choices=(this.ends.get(k)||[]).filter(id=>!out.includes(id)&&(()=>{const q=this.roads.get(id);return Math.hypot((side===1?q.x1:q.x2)-(side===1?current.x2:current.x1),(side===1?q.z1:q.z2)-(side===1?current.z2:current.z1))<2;})());if(!choices.length)break;const id=choices[Math.floor(r()*choices.length)];out.push(id);current=this.roads.get(id);}return out;}
  }
  function unsafe(v){return !v||v.body<25||v.brakes<25||v.tires<20||v.battery<15||v.engineTempC>110||v.fuel<2||v.faults?.brakeHydraulics?.active&&v.faults.brakeHydraulics.severity>.5;}
  function choices(e,v){const d=definitions.get(e.type);if(!d)return[];const ids=['call','warn','detour','continue','unsafe'];if(d.cost==='reward')ids.unshift('accept');else if(d.cost!=='unsafe')ids.unshift('help');return ids.map(id=>({id,label:ACTIONS[id],disabled:(id==='help'&&(unsafe(v)||d.cost==='battery'&&v.battery<35||d.cost==='coolant'&&v.coolant<35))||['assistance-called','player-helping','temporarily-stabilized'].includes(e.state)&&!['continue','unsafe'].includes(id),effect:id==='help'?`Requires remaining nearby for 8 town minutes. ${d.cost==='battery'?'Uses 8% battery.':d.cost==='coolant'?'Uses 6% coolant.':'Uses a little fuel; idling raises temperature.'} Trust +2 on completion.`:id==='call'?'Assistance arrives after 15 town minutes. Trust +1 on resolution.':id==='warn'?'Stabilizes the scene; assistance follows after 10 town minutes. Trust +1.':id==='unsafe'?'Safety-first withdrawal: no trust penalty.':id==='accept'?'Receive a small battery/fuel reserve once.':id==='detour'?'Leave this reduced lane; consult M for another named road.':'No reward. Leaving accepted help unfinished reduces trust.'}));}
  const transitions={scheduled:['active'],active:['acknowledged','expired-with-consequence','resolved','failed'],acknowledged:['assistance-called','player-helping','temporarily-stabilized','expired-with-consequence','resolved','failed'], 'assistance-called':['resolved','failed'],'player-helping':['resolved','failed','assistance-called'],'temporarily-stabilized':['resolved','failed']};
  class Director{
    constructor(raw,world){this.state=sanitize(raw);this.network=new Network(world);this.messages=[];this.enabled=false;this.actorAccumulator=0;this.logicAccumulator=0;this.contactCooldown=0;this.attach(world);}
    attach(world){if(this.network.world!==world)this.network=new Network(world);const s=this.state;s.activeEvents=s.activeEvents.filter(e=>{const p=this.network.restore(e.location);if(p){e.location=p;if(e.state==='scheduled')e.state='active';}return !!p;});s.actors=s.actors.filter(a=>this.network.restore(a.location)&&a.route.every(id=>this.network.roads.has(id))&&a.route[a.index]===a.location.roadId&&a.expires>now(s));for(const a of s.actors){a.origin=a.route[0];a.destination=a.route.at(-1);}this.syncClosures();}
    note(e,text){const s=this.state;s.history.unshift({id:e.id,type:e.type,at:now(s),road:e.location.road,text});s.history.length=Math.min(96,s.history.length);s.revision=(s.revision+1)%1e9;this.messages.push({id:e.id,title:definitions.get(e.type).title,text,road:e.location.road});if(this.messages.length>12)this.messages.shift();}
    transition(e,state){if(!transitions[e.state]?.includes(state))return false;e.state=state;return true;}
    syncClosures(){this.state.closures=this.state.activeEvents.filter(e=>definitions.get(e.type).closure&&e.expires>now(this.state)).map(e=>({id:e.id,roadId:e.location.roadId,until:e.expires,widthFactor:.55}));}
    resolve(e,state,trust=0){if(!this.transition(e,state))return false;const s=this.state;if(s.resolvedEvents.some(q=>q.id===e.id))return false;s.trust=clamp(s.trust+trust,0,100);s.resolvedEvents.unshift({id:e.id,type:e.type,state,at:now(s),choice:e.choice,road:e.location.road});s.resolvedEvents.length=Math.min(256,s.resolvedEvents.length);s.activeEvents=s.activeEvents.filter(q=>q.id!==e.id);if(state==='failed')s.stats.failed++;if(state==='expired-with-consequence')s.stats.ignored++;const kind=state==='resolved'&&trust>0?'support':state==='resolved'?'assisted':'caution';s.consequences.unshift({id:e.id,kind,until:now(s)+(kind==='support'?1440:180),road:e.location.road});s.consequences=s.consequences.slice(0,48);this.syncClosures();this.note(e,`${state}: ${e.choice||'timed out'}. ${kind==='caution'?'Caution remains in the town ledger.':kind==='support'?'Community support may become available.':'Response recorded.'}`);return true;}
    generate(player,weather){const s=this.state,slot=Math.floor(now(s)/90);if(slot<=s.lastSlot)return;s.lastSlot=slot;const defs=catalog.filter(d=>eligible(d,s,weather));if(!defs.length)return;const r=random(hash(`${s.seed}:${slot}:${Math.floor(s.trust/10)}`));for(let k=0;k<3&&s.activeEvents.length<6;k++){const d=defs[Math.floor(r()*defs.length)],id=`t${s.seed}-${slot}-${k}-${d.type}`;if(s.activeEvents.some(e=>e.id===id)||s.resolvedEvents.some(e=>e.id===id))continue;const location=this.network.placement(d,hash(id),player,s.activeEvents,s.closures);if(!location)continue;const e={id,type:d.type,state:'scheduled',location,created:now(s),expires:now(s)+d.duration,actionAt:0,choice:'',impact:false};this.transition(e,'active');s.activeEvents.push(e);this.note(e,'Roadside incident active.');}this.syncClosures();}
    scheduleActors(player,weather){const s=this.state,slot=Math.floor(now(s)/30);if(slot<=s.lastActorSlot)return;s.lastActorSlot=slot;const b=band(s.minuteOfDay),kinds=b.includes('School')?['school-bus','commuter']:b.includes('Commute')?['commuter','commuter','delivery']:b==='Late Night'?['late-local']:b==='Early Morning'?['public-works','delivery']:['delivery','commuter','public-works'];if(weather?.needsPlow){const wi=kinds.indexOf('public-works');if(wi>=0)kinds[wi]='snowplow';else kinds.push('snowplow');}if(s.activeEvents.some(e=>definitions.get(e.type).visual==='emergency'||e.state==='assistance-called'))kinds.push('emergency');const r=random(hash(`${s.seed}:actors:${slot}`));for(let k=0;k<kinds.length&&s.actors.length<12;k++){const pool=this.network.pools[kinds[k]==='school-bus'?'school':'local'];for(let tries=0;tries<24&&pool.length;tries++){const id=pool[Math.floor(r()*pool.length)],side=r()>.5?1:-1,p=this.network.point(id,side===1?.12:.88,side,true);if(s.closures.some(c=>c.roadId===id)||!this.network.valid(p,player,s.actors.map(a=>a.location).concat(s.activeEvents.map(e=>e.location)),80))continue;const route=this.network.route(id,side,hash(`${slot}:${k}`));s.actors.push({id:`a${s.seed}-${slot}-${k}`,kind:kinds[k],location:p,route,index:0,origin:route[0],destination:route.at(-1),expires:now(s)+60,speed:0});break;}}}
    interact(id,choice,vehicle,player){const s=this.state,e=s.activeEvents.find(e=>e.id===id);if(!this.enabled||!e||!player||distance(player,e.location)>22||Math.hypot(player.vx||0,player.vz||0)>1.5)return {ok:false,reason:'Stop safely within 22 m of the incident.'};const option=choices(e,vehicle).find(c=>c.id===choice);if(!option||option.disabled)return {ok:false,reason:'This action is unavailable or the Jetta is unsafe.'};if(e.state==='active')this.transition(e,'acknowledged');
      if(choice==='continue'||choice==='detour'){if(e.state==='player-helping'){e.choice=choice;this.resolve(e,'failed',-1);}else{e.choice=choice;this.note(e,choice==='detour'?'Driver chose another route; incident remains.':'Driver continued; incident remains.');}return {ok:true};}
      e.choice=choice;
      if(choice==='unsafe'){if(e.state==='player-helping')this.transition(e,'assistance-called');else if(e.state==='acknowledged')this.transition(e,'assistance-called');e.actionAt=now(s)+15;this.note(e,'Safety-first withdrawal; assistance requested, no trust penalty.');}
      else if(choice==='accept'){vehicle.fuel=clamp(vehicle.fuel+8,0,100);vehicle.battery=clamp(vehicle.battery+12,0,100);s.stats.assistance++;s.consequences=s.consequences.filter(c=>c.kind!=='support');this.resolve(e,'resolved',0);}
      else if(choice==='help'){const d=definitions.get(e.type);if(!this.transition(e,'player-helping'))return {ok:false};if(d.cost==='battery')vehicle.battery=clamp(vehicle.battery-8,0,100);if(d.cost==='coolant')vehicle.coolant=clamp(vehicle.coolant-6,0,100);vehicle.fuel=clamp(vehicle.fuel-.2,0,100);vehicle.engineTempC=clamp(vehicle.engineTempC+2,-30,160);e.actionAt=now(s)+8;this.note(e,'Help accepted. Stay nearby until the task is finished.');}
      else{const target=choice==='call'?'assistance-called':'temporarily-stabilized';if(!this.transition(e,target))return {ok:false};e.actionAt=now(s)+(choice==='call'?15:10);s.stats.called+=choice==='call'?1:0;this.note(e,choice==='call'?'Qualified assistance dispatched.':'Traffic warned; scene stabilized pending assistance.');}
      return {ok:true};
    }
    tick(dt,{active=false,player,vehicle,weather='clear'}={}){
      this.enabled=active;if(!active||!Number.isFinite(dt)||dt<=0)return;const s=this.state,advance=Math.min(dt,1)*s.timeScale,time=Math.min(1440001439,now(s)+advance);s.day=Math.floor(time/1440);s.minuteOfDay=time%1440;
      this.logicAccumulator+=dt;this.actorAccumulator+=dt;this.contactCooldown=Math.max(0,this.contactCooldown-dt);
      if(this.logicAccumulator>=.5){this.logicAccumulator%=.5;
        for(const e of [...s.activeEvents]){if(e.state==='player-helping'&&distance(e.location,player)>45){this.resolve(e,'failed',-1);continue;}if(e.state==='player-helping'&&unsafe(vehicle)){e.choice='unsafe';this.transition(e,'assistance-called');e.actionAt=now(s)+15;this.note(e,'Help stopped: Jetta became unsafe. Assistance called.');}
          if(e.actionAt&&e.actionAt<=now(s)&&['player-helping','assistance-called','temporarily-stabilized'].includes(e.state)){if(e.state==='player-helping')s.stats.helped++;this.resolve(e,'resolved',e.choice==='unsafe'?0:e.state==='player-helping'?2:1);continue;}
          if(e.expires<=now(s)){this.resolve(e,['assistance-called','temporarily-stabilized'].includes(e.state)?'resolved':e.state==='player-helping'?'failed':'expired-with-consequence',e.state==='player-helping'?-1:0);continue;}
          if(!e.impact&&definitions.get(e.type).closure&&distance(e.location,player)<3&&Math.hypot(player.vx||0,player.vz||0)>5){e.impact=true;s.trust=clamp(s.trust-2,0,100);vehicle.tires=clamp(vehicle.tires-2,0,100);const f=vehicle.faults?.alignment;if(f){f.active=true;f.severity=clamp(f.severity+.08,0,1);f.occurrences=clamp(f.occurrences+1,0,1e6);}this.note(e,'Road-edge hazard struck: tires/alignment affected; trust -2.');}}
        s.consequences=s.consequences.filter(c=>c.until>now(s));this.generate(player,weather);this.scheduleActors(player,weather);this.syncClosures();
      }
      if(this.actorAccumulator>=.1){const delta=this.actorAccumulator;this.actorAccumulator=0;for(const a of s.actors){const p=a.location,previousIndex=a.index,r=this.network.roads.get(p.roadId);if(!r){a.expires=0;continue;}let speed=a.kind==='school-bus'?5:['public-works','snowplow'].includes(a.kind)?4:8;speed*=num(weather?.trafficSpeed,1,.4,1);const next=this.network.point(p.roadId,clamp(p.t+p.side*10/r.len,.001,.999),p.side,true);if(s.closures.some(c=>c.roadId===p.roadId)||distance(next,player)<9||s.actors.some(b=>b!==a&&distance(next,b.location)<8)||!this.network.valid(next,null))speed=0;a.speed=speed;let t=p.t+speed*delta/r.len*p.side;if(t>.999||t<.001){a.index++;const id=a.route[a.index];if(!id){a.expires=0;continue;}a.location=this.network.point(id,p.side===1?.001:.999,p.side,true);}else a.location=this.network.point(p.roadId,t,p.side,true);
          if(s.closures.some(c=>c.roadId===a.location.roadId)||!this.network.valid(a.location,null)||s.actors.some(b=>b!==a&&distance(a.location,b.location)<4)){a.location=p;a.index=previousIndex;a.speed=0;}
          if(!this.contactCooldown&&distance(a.location,player)<2.6&&Math.hypot(player.vx||0,player.vz||0)>3){player.vx*=.4;player.vz*=.4;player.health=clamp(player.health-1,0,100);vehicle.body=player.health;this.contactCooldown=2;}}
        s.actors=s.actors.filter(a=>a.expires>now(s));}
    }
    nearest(player,max=22){let best=null;for(const e of this.state.activeEvents)if(distance(e.location,player)<max){max=distance(e.location,player);best=e;}return best;}
    takeMessages(){return this.messages.splice(0);}
    // Every closure is a reduced lane; the opposite lane remains open, so no
    // town incident can disconnect the road graph or trap the player.
    constrainInput(input,player){if(!this.enabled)return input;const close=this.state.activeEvents.find(e=>definitions.get(e.type).closure&&distance(e.location,player)<13);return close?{...input,throttle:Math.min(input.throttle||0,.35)}:input;}
    props(player,time=0){if(!this.enabled)return[];const out=[];const add=(mesh,p,x,y,z,w,h,d,color)=>{const co=Math.cos(p.yaw),si=Math.sin(p.yaw);out.push({mesh,x:p.x+co*x+si*z,y,z:p.z-si*x+co*z,w,h,d,color,yaw:p.yaw});};
      const car=(p,kind)=>{const bus=kind==='bus'||kind==='school-bus',van=['van','delivery','works','public-works','snowplow','utility','emergency'].includes(kind),color=bus?'#d5ac49':kind==='emergency'?'#c7d5d9':van?'#869d9c':'#6f8295';add('box',p,0,.8,0,1.8,.8,bus?6:van?4.5:3.8,color);add('box',p,0,van?1.65:1.3,.3,1.55,van?1.2:.6,bus?4.7:van?3:1.9,'#314754');for(const x of [-.9,.9])for(const z of [-1.25,1.25])add('box',p,x,.42,z,.26,.65,.7,'#252b2c');for(const x of [-.65,.65])add('box',p,x,1.05,1.95,.25,.18,.12,Math.floor(time*2)%2?'#efad55':'#614c36');if(kind==='snowplow')add('box',p,0,.42,-2.6,2.65,.8,.35,'#d4934f');if(kind==='emergency'||kind==='snowplow'||kind==='works'||kind==='utility'||kind==='public-works')add('box',p,0,2.35,0,.9,.16,.25,Math.floor(time*3)%2?'#ef8b52':'#729fc8');};
      for(const e of this.state.activeEvents){if(distance(e.location,player)>320)continue;const p=e.location,d=definitions.get(e.type);if(['branch','debris','water','animal'].includes(d.visual)){add('box',p,0,.4,0,d.visual==='animal'?.6:2.4,d.visual==='water'?.05:.6,1,d.visual==='water'?'#537683':d.visual==='animal'?'#9c8a6c':'#6d614c');}else if(d.visual!=='barrier')car(p,d.visual);
        for(const z of [-3.4,3.4]){add('cone',p,-1,.65,z,.45,1,.45,'#e2a15e');add('box',p,-1,.19,z,.7,.12,.7,'#d1d1b5');}if(d.closure)add('box',p,-1.4,.75,0,.18,.4,3.5,'#e3b477');add('box',p,1.3,2.4,0,.32,.6,.32,e.state==='player-helping'?'#8fddbc':'#e1c68d');}
      for(const a of this.state.actors)if(distance(a.location,player)<280)car(a.location,a.kind);return out;
    }
  }
  return Object.freeze({LIMITS,BANDS,catalog,definitions,band,now,random,hash,defaults,sanitize,eligible,Network,Director,choices,unsafe,roadID});
})();
