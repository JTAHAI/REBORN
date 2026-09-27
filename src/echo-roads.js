// Embedded inside RebornCore. Echoes are authored memories, not historical surveys.
const EchoRoads = (() => {
  'use strict';
  const VERSION=1, LIMITS=Object.freeze({anchors:6,history:32,events:12,props:220});
  const num=(v,d,lo,hi)=>typeof v==='number'&&Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):d;
  const text=(v,n=120)=>typeof v==='string'?v.slice(0,n):'';
  const point=p=>p&&['x','z','yaw'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k]))&&Math.abs(p.x)<1e6&&Math.abs(p.z)<1e6?{x:p.x,z:p.z,yaw:num(p.yaw,0,-Math.PI,Math.PI)}:null;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const CHOICES=Object.freeze({place:'Keep the place',feeling:'Keep the feeling',quiet:'Leave it unspoken'});
  const ANCHORS=Object.freeze([
    {id:'town-office-police',title:'The town keeps its name',detail:'Town Hall / Main Street',prop:'noticeboard',
      present:'A public building. A familiar turn. A place can hold a thousand ordinary departures.',
      memory:'In this imagined 1999½ layer, a paper notice catches the light. No notification. No hurry. Just the next road.'},
    {id:'cumberland-farms',title:'Before the long way home',detail:'Cumberland Farms / Main Street',prop:'payphone',
      present:'Fuel, a clean windshield, a reason to keep going. Ordinary stops become the things you remember.',
      memory:'An imagined payphone and a folded road map. This is a feeling of the time, not a claim that this phone stood here.'},
    {id:'fire-department',title:'Somebody is always awake',detail:'Fire Department / Market Street',prop:'equipment',
      present:'The doors face the road. Somewhere, someone is ready to leave before the rest of the town wakes up.',
      memory:'A brass-colored bell, a hose rack, warm lamps. The memory is about readiness, not an exact old station inventory.'},
    {id:'olde-woolen-mill',title:'What the river carries',detail:'Olde Woolen Mill / Canal Street',prop:'loading',
      present:'Listen between the engine notes. The river is part of the route, even when you cannot see it.',
      memory:'Imagined timber crates and a loading platform return to the mill frontage. The shell stays where the mapped building stands.'},
    {id:'hurd-manor',title:'A light left on',detail:'Hurd Manor / Elm Street',prop:'porch',
      present:'Some buildings ask you to slow down. A roofline, a porch, one light against the evening.',
      memory:'Shutters and warm porch lamps make the familiar silhouette feel like an earlier evening. Not a verified 1999 restoration.'},
    {id:'allards-market',title:'One more ordinary day',detail:'Allard’s / Elm Street',prop:'awning',
      present:'A storefront at the end of a short drive. Nothing extraordinary has to happen for a trip to matter.',
      memory:'A striped canvas shade and newspaper boxes appear in the memory layer. The places are real; this dressing is authored.'}
  ].map(a=>Object.freeze(a)));
  const IDS=new Set(ANCHORS.map(a=>a.id));
  const defaults=()=>({schemaVersion:VERSION,active:false,targetEra:'present',blend:0,elapsed:0,distanceM:0,lastPosition:null,focus:ANCHORS[0].id,completed:false,audio:true,visits:{},history:[],revision:0});
  function sanitize(raw){
    const s=defaults(),v=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    s.active=v.active===true;s.targetEra=v.targetEra==='memory'?'memory':'present';s.blend=num(v.blend,0,0,1);
    s.elapsed=num(v.elapsed,0,0,1e8);s.distanceM=num(v.distanceM,0,0,1e9);s.lastPosition=point(v.lastPosition);
    s.focus=IDS.has(v.focus)?v.focus:ANCHORS[0].id;s.audio=v.audio!==false;s.revision=Math.floor(num(v.revision,0,0,1e9));
    for(const id of IDS){const r=v.visits&&Object.hasOwn(v.visits,id)?v.visits[id]:null;if(!r||typeof r!=='object')continue;
      const present=r.present===true,memory=r.memory===true,choice=present&&memory&&Object.hasOwn(CHOICES,r.choice)?r.choice:'';
      s.visits[id]={present,memory,choice,at:num(r.at,0,0,s.elapsed)};
    }
    const seen=new Set();for(const h of (Array.isArray(v.history)?v.history:[]).slice(0,128)){
      if(!h||!IDS.has(h.id)||seen.has(h.id)||!s.visits[h.id]?.choice)continue;seen.add(h.id);
      s.history.push({id:h.id,choice:s.visits[h.id].choice,at:num(h.at,0,0,s.elapsed)});
    }
    // Completion is derived from six legitimate comparisons, never a trusted flag.
    s.completed=ANCHORS.every(a=>!!s.visits[a.id]?.choice)&&v.completed===true;
    if(!s.active){s.blend=0;s.targetEra='present';}
    return s;
  }
  // Keep discovery / resume positions clear of the production collision hulls.
  // Some rotated source footprints have broader axis-aligned driving hulls;
  // the nearest point on a frontage road can otherwise spawn inside the mill.
  function roadPointClear(world,p,clearance=1.65){
    const bounds=world.bounds;
    if(!p||![p.x,p.z].every(Number.isFinite)||!bounds||p.x<bounds.minX||p.x>bounds.maxX||p.z<bounds.minZ||p.z>bounds.maxZ)return false;
    for(const b of world.hash.query(p.x,p.z,3)){
      const x=clamp(p.x,b.x-b.w/2,b.x+b.w/2),z=clamp(p.z,b.z-b.d/2,b.z+b.d/2);
      if(Math.hypot(p.x-x,p.z-z)<clearance)return false;
    }
    return true;
  }
  function bind(world){
    if(!world?.northBerwick)return [];
    return ANCHORS.map(a=>{
      const b=world.buildings.find(b=>b.landmarkId===a.id);
      if(!b||![b.x,b.z,b.w,b.d].every(Number.isFinite))return null;
      // Use the maintained building frontage, not the nearest unrelated side street
      // to a landmark pin (the Town Hall pin is closer to Church Avenue).
      let p=null,best=Infinity;
      for(const road of world.roads){if(road.name!==b.frontRoad||![road.x1,road.z1,road.x2,road.z2].every(Number.isFinite))continue;
        const dx=road.x2-road.x1,dz=road.z2-road.z1,den=dx*dx+dz*dz;if(den<1)continue;
        const projected=clamp(((b.x-road.x1)*dx+(b.z-road.z1)*dz)/den,.02,.98);
        const samples=[projected],steps=Math.max(2,Math.min(512,Math.ceil(Math.sqrt(den)/3)));
        for(let i=0;i<=steps;i++)samples.push(.02+.96*i/steps);
        for(const t of samples){const x=road.x1+t*dx,z=road.z1+t*dz,d=Math.hypot(x-b.x,z-b.z);
          if(d<best&&roadPointClear(world,{x,z})){best=d;p={id:a.id,name:a.title,x,z,yaw:Math.atan2(dx,-dz),road:road.name,distanceFromLandmark:d};}
        }
      }
      if(!p||best>160)return null;
      return {...a,detail:a.detail.split(' / ')[0]+' / '+p.road,point:p,building:b};
    }).filter(Boolean);
  }
  function markStatics(objects,world){
    // One-time tagging at world construction. No world or collision data changes.
    const anchors=bind(world);
    for(const o of objects){if(o.y<.6||o.radius>90||!o.color)continue;
      const b=anchors.find(a=>{const b=a.building;return distance(o,{x:b.heroX??b.x,z:b.heroZ??b.z})<Math.hypot(b.w,b.d)/2+2;});
      if(!b||![0,3,9].includes(o.surface?.[0]))continue;
      o.echoTone=[Math.min(1,o.color[0]*1.13+.015),Math.min(1,o.color[1]*.97+.015),o.color[2]*.83,o.color[3]];
    }
    return objects;
  }
  function visualWeight(anchors,p){
    if(!p||![p.x,p.z].every(Number.isFinite)||!anchors.length)return 0;
    const d=Math.min(...anchors.map(a=>distance(p,a.point)));
    return Math.max(0,Math.min(1,(330-d)/110));
  }
  function makeProps(a){
    const out=[],b=a.building,yaw=Number.isFinite(b.frontYaw)?b.frontYaw:b.yaw||0;
    const nx=Math.sin(yaw),nz=Math.cos(yaw),tx=Math.cos(yaw),tz=-Math.sin(yaw);
    const by=b.yaw||0,extent=Math.abs(nx*Math.cos(by)-nz*Math.sin(by))*b.w/2+Math.abs(nx*Math.sin(by)+nz*Math.cos(by))*b.d/2;
    const center={x:b.heroX??b.x,z:b.heroZ??b.z};
    const add=(lx,y,lz,w,h,d,color,kind,material=0,mesh='box')=>out.push({mesh,x:center.x+tx*lx+nx*(extent+lz),y,z:center.z+tz*lx+nz*(extent+lz),w,h,d,color,yaw,material,kind,anchor:a.id});
    const lamp=x=>{add(x,1.85,.32,.12,3.7,.12,'#5b5140','period-lamp',3);add(x,3.75,.32,.5,.7,.5,'#edc185','period-lamp',8);add(x,4.12,.32,.7,.16,.7,'#51493c','period-lamp');};
    const width=Math.max(3,Math.min(12,b.w*.6));
    lamp(-width/2);lamp(width/2);
    if(a.prop==='payphone'){
      add(-2,1.25,.8,.82,2.4,.65,'#53727c','payphone');add(-2,1.9,1.14,.58,.53,.03,'#d9d5ba','payphone',3);
      add(-2.17,1.5,1.17,.10,.4,.06,'#1b2528','payphone');add(-1.9,1.38,1.17,.25,.23,.04,'#aaa9a1','payphone',3);
      add(1,1.55,.7,2.5,.7,.3,'#d6ca9d','paper-map');for(let i=0;i<5;i++)add(.1+i*.4,1.54,.87,.025,.54,.035,'#687878','paper-map');
    }else if(a.prop==='noticeboard'){
      add(0,1.85,.5,3,1.6,.2,'#68513e','noticeboard');for(const x of [-1.1,0,1])add(x,1.92,.64,.7,1.08,.06,'#e2d4b5','paper-notice');
      add(0,.9,.5,3.3,.18,.9,'#75654d','noticeboard');
    }else if(a.prop==='equipment'){
      for(let i=0;i<4;i++)add(-2+i*1.1,.7,.8,.8,1.1,.65,'#b5a27a','hose-rack');
      add(1,2.6,.9,.65,.55,.65,'#c1a36b','station-bell',3,'cone');
    }else if(a.prop==='loading'){
      add(0,.3,.95,width,.4,1.8,'#695b45','loading-platform');
      for(let i=0;i<6;i++){const x=(i-2.5)*1.2;add(x,.95,.95,1.04,.95,1.15,i%2?'#998160':'#836d50','timber-crate');add(x,1.0,1.55,.10,.84,.08,'#574b39','timber-strap');}
    }else if(a.prop==='porch'){
      for(let i=0;i<4;i++){const x=(i-1.5)*2.8;for(const s of [-1,1])add(x+s*.75,3.3,.19,.44,1.6,.16,'#3e594f','window-shutter');}
      add(0,.65,1.0,2.2,.2,.9,'#9f8c69','porch-bench');
    }else if(a.prop==='awning'){
      for(let i=0;i<10;i++)add(-width/2+(i+.5)*width/10,3.3,.75,width/10,.2,1.4,i%2?'#ddd0aa':'#526f64','canvas-awning');
      for(const x of [-1,1]){add(x,1,.8,.7,1.6,.6,'#7c5c45','newspaper-box');add(x,1.3,1.13,.52,.62,.04,'#ded5b9','newspaper-box');}
    }
    // Decorative only. Reject any prop that would intrude into a mapped travel lane.
    return out;
  }
  function placementValid(world,p){
    if(!['x','y','z','w','h','d','yaw'].every(k=>Number.isFinite(p[k]))||p.w<=0||p.h<=0||p.d<=0)return false;
    const r=nearestRoad(world,p.x,p.z,25),pad=Math.hypot(p.w,p.d)/2;
    if(r&&r.distance<=(r.road.width||6)/2+pad)return false;
    const inside=pts=>{let hit=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a[1]>p.z)!==(b[1]>p.z)&&p.x<(b[0]-a[0])*(p.z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
    for(const f of world.openContext?.waterPolygons||[])if(f.points?.length>=3&&inside(f.points))return false;
    for(const f of world.openContext?.waterways||[]){for(let i=1;i<(f.points?.length||0);i++){const a=f.points[i-1],b=f.points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((p.x-a[0])*dx+(p.z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);if(Math.hypot(p.x-a[0]-t*dx,p.z-a[1]-t*dz)<(f.widthM||4)/2+pad)return false;}}
    return true;
  }
  const layoutCache=new WeakMap();
  function layout(world){
    let cached=layoutCache.get(world);if(cached)return cached;
    const anchors=bind(world),props=new Map(anchors.map(a=>[a.id,makeProps(a).filter(p=>placementValid(world,p))]));
    cached={anchors,props};layoutCache.set(world,cached);return cached;
  }
  class Director {
    constructor(raw,world){
      this.state=sanitize(raw);this.world=world;const geometry=layout(world);this.anchors=geometry.anchors;this.events=[];this.enabled=false;
      this.dwell={id:'',era:'',seconds:0};this.cachedProps=[];this.propKey='';
      this.propsByAnchor=geometry.props;
      if(this.anchors.length!==6){this.state.active=false;this.state.blend=0;}
      if(this.state.lastPosition){const p=this.state.lastPosition,b=world.bounds,r=nearestRoad(world,p.x,p.z,25);if(!r||p.x<b.minX||p.x>b.maxX||p.z<b.minZ||p.z>b.maxZ||!roadPointClear(world,p,1.15))this.state.lastPosition=null;}
    }
    emit(e){this.events.push(e);if(this.events.length>LIMITS.events)this.events.shift();}
    changed(){this.state.revision=Math.min(1e9,this.state.revision+1);this.emit({type:'persist'});}
    begin(blocked=false){if(blocked)return {ok:false,reason:'Finish or end the passenger commitment first.'};if(this.anchors.length!==6)return {ok:false,reason:'The complete North Berwick memory corridor is not loaded.'};this.state.active=true;this.changed();return {ok:true};}
    end(){this.state.active=false;this.state.blend=0;this.state.targetEra='present';this.dwell={id:'',era:'',seconds:0};this.changed();}
    toggle(){if(!this.enabled||!this.state.active)return false;this.state.targetEra=this.state.targetEra==='present'?'memory':'present';this.dwell={id:'',era:'',seconds:0};this.changed();return true;}
    focus(id){if(!this.anchors.some(a=>a.id===id))return false;this.state.focus=id;this.changed();return true;}
    nearest(p,max=55){if(!p||![p.x,p.z].every(Number.isFinite))return null;const focused=this.anchors.find(a=>a.id===this.state.focus);if(focused&&distance(focused.point,p)<max)return focused;let best=null;for(const a of this.anchors){const d=distance(a.point,p);if(d<max){best=a;max=d;}}return best;}
    era(){return this.state.blend>=.98?'memory':this.state.blend<=.02?'present':'transition';}
    mix(player){return this.enabled&&this.state.active?this.state.blend*visualWeight(this.anchors,player):0;}
    tick(dt,ctx={}){
      const s=this.state;this.enabled=ctx.available===true&&s.active&&!ctx.passenger;
      if(!this.enabled||!ctx.running||!Number.isFinite(dt)||dt<=0||dt>.25||!point(ctx.car))return;
      s.elapsed=Math.min(1e8,s.elapsed+dt);
      const target=s.targetEra==='memory'?1:0;
      s.blend=ctx.reducedMotion?target:Math.max(0,Math.min(1,s.blend+(target>s.blend?1:-1)*Math.min(Math.abs(target-s.blend),dt/2.4)));
      // Measure observation speed from real displacement. Collision resolution can leave
      // stale internal velocity on a physically stopped car, while a teleport must never
      // count as a slow observation or add impossible route distance.
      const previous=s.lastPosition,moved=previous?distance(ctx.car,previous):0;
      if(previous&&moved<25)s.distanceM=Math.min(1e9,s.distanceM+moved);
      s.lastPosition=point(ctx.car);
      const a=this.nearest(ctx.car),era=this.era(),speed=previous?(moved<25?moved/dt:Infinity):0;
      if(!s.completed&&ANCHORS.every(a=>s.visits[a.id]?.choice)&&era==='present'){
        s.completed=true;this.emit({type:'complete',text:'One hometown. One car. Every road remembers.',seconds:s.elapsed,miles:s.distanceM/1609.344});this.changed();
      }
      if(!a||era==='transition'||speed>2.5){this.dwell={id:'',era:'',seconds:0};return;}
      if(this.dwell.id!==a.id||this.dwell.era!==era)this.dwell={id:a.id,era,seconds:0};
      this.dwell.seconds+=dt;
      if(this.dwell.seconds>=1.5){const v=s.visits[a.id]||(s.visits[a.id]={present:false,memory:false,choice:'',at:0});if(!v[era]){
        v[era]=true;v.at=s.elapsed;s.focus=a.id;this.emit({type:'observed',id:a.id,title:a.title,text:a[era],era});this.changed();
      }}
    }
    remember(id,choice){
      const s=this.state,v=IDS.has(id)?s.visits[id]:null;
      if(!s.active||!v?.present||!v?.memory||v.choice||!Object.hasOwn(CHOICES,choice))return {ok:false};
      v.choice=choice;v.at=s.elapsed;s.history.unshift({id,choice,at:s.elapsed});s.history=s.history.slice(0,LIMITS.history);
      const a=ANCHORS.find(a=>a.id===id);this.emit({type:'remembered',id,title:a.title,choice:CHOICES[choice],road:this.anchors.find(a=>a.id===id)?.point.road||''});
      const next=this.anchors.find(a=>!s.visits[a.id]?.choice);if(next)s.focus=next.id;
      this.changed();return {ok:true};
    }
    objective(){if(!this.enabled)return null;const s=this.state,a=this.anchors.find(a=>a.id===s.focus)||this.anchors[0],n=ANCHORS.filter(a=>s.visits[a.id]?.choice).length;
      if(s.completed)return {title:'Every road remembers.',destination:null,detail:'SIX PLACES KEPT · KEEP DRIVING OR END IN J / ECHO ROADS',progress:1};
      return {title:n===6?'Bring the memory home':a.title,destination:a.point,detail:n===6?'V / RETURN TO TODAY':a.detail+' · SLOW TO OBSERVE BOTH ERAS · J TO REFLECT',progress:n/6};
    }
    props(player){
      if(!this.enabled||!this.state.active||this.mix(player)<.025){this.propKey='';this.cachedProps=[];return [];}
      const scale=Math.round(this.mix(player)*20)/20,key=Math.floor(player.x/20)+':'+Math.floor(player.z/20)+':'+scale;
      if(key===this.propKey)return this.cachedProps;this.propKey=key;const out=[];
      for(const a of this.anchors){if(distance(player,a.point)>250)continue;for(const p of this.propsByAnchor.get(a.id)||[]){out.push({...p,h:p.h*scale,y:p.y*scale});if(out.length>=LIMITS.props)break;}}
      return this.cachedProps=out.slice(0,LIMITS.props);
    }
    takeEvents(){return this.events.splice(0);}
    snapshot(player){return {state:JSON.parse(JSON.stringify(this.state)),enabled:this.enabled,era:this.era(),visualMix:this.mix(player),nearest:this.nearest(player)?.id||null,anchors:this.anchors.map(a=>({id:a.id,title:a.title,point:a.point,props:this.propsByAnchor.get(a.id)?.length||0})),props:this.cachedProps.length,objective:this.objective()};}
  }
  return Object.freeze({VERSION,LIMITS,ANCHORS,CHOICES,defaults,sanitize,bind,markStatics,visualWeight,placementValid,roadPointClear,Director});
})();
