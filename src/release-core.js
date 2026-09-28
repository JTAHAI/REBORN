// Pass 8 pure helpers: bounded storage, routing and render-candidate selection.
// Embedded in RebornCore; no remote services and no mutation of world geometry.
const ReleaseUX = (() => {
  'use strict';
  const LIMITS=Object.freeze({backupBytes:4*1024*1024,routeRoads:12000,routeVisits:30000,alerts:8});
  const scales=[1,1.25,1.5,2];
  const prefs=(s={})=>({textScale:scales.includes(s.textScale)?s.textScale:1,dialogueMode:s.dialogueMode==='pause'?'pause':'live',diagnosticCaptions:s.diagnosticCaptions!==false});
  function backup(text){
    if(typeof text!=='string'||text.length>LIMITS.backupBytes)throw new Error('Choose a REBORN JSON backup smaller than 4 MB.');
    let raw;try{raw=JSON.parse(text);}catch{throw new Error('This file is not valid JSON. Nothing was changed.');}
    if(!raw||raw.format!=='REBORN_BACKUP_V1'||!raw.save||raw.save.version!==1)throw new Error('This is not a supported REBORN version-1 backup. Nothing was changed.');
    return {save:validateSave(raw.save),story:raw.story||null,exportedAt:typeof raw.exportedAt==='string'?raw.exportedAt.slice(0,40):''};
  }
  function writePair(storage,saveKey,storyKey,saveText,storyText){
    let a,b;try{a=storage.getItem(saveKey);b=storage.getItem(storyKey);storage.setItem(saveKey,saveText);storage.setItem(storyKey,storyText);return {ok:true};}
    catch(error){let restored=true;try{if(a===null)storage.removeItem(saveKey);else if(a!==undefined)storage.setItem(saveKey,a);if(b===null)storage.removeItem(storyKey);else if(b!==undefined)storage.setItem(storyKey,b);}catch{restored=false;}return {ok:false,restored,message:restored?'Save unavailable. Previous stored progress was retained.':'Storage refused the write and rollback. Export your session before closing.'};}
  }
  function warnings(car,vehicle){const out=[];const add=(id,text,level)=>out.push({id,text,level});
    if(vehicle.fuel<=.02)add('fuel','Out of fuel · stop and arrange help',3);else if(vehicle.fuel<15)add('fuel','Low fuel · plan a garage stop',1);
    if(vehicle.engineTempC>=108)add('heat','Engine overheating · reduce load and stop safely',3);
    if(vehicle.battery<=18)add('battery','Low battery reserve',vehicle.battery<=2?3:2);
    if(vehicle.brakes<30)add('brakes','Brake wear critical · increase stopping room',3);
    if(vehicle.tires<30)add('tires','Tire wear critical · reduce speed',2);
    if(car.health<30)add('body','Body condition critical',2);
    return out.sort((a,b)=>b.level-a.level||a.id.localeCompare(b.id)).slice(0,LIMITS.alerts);
  }
  class SceneIndex {
    constructor(objects,cellSize=128){this.size=cellSize;this.source=objects;this.cells=new Map();this.large=[];this.maxRadius=0;
      for(const o of objects){const r=Number.isFinite(o.radius)?Math.max(0,o.radius):0;if(!Number.isFinite(o.x)||!Number.isFinite(o.z)||r>128||o.hero||o.studio){this.large.push(o);continue;}this.maxRadius=Math.max(this.maxRadius,r);const k=Math.floor(o.x/cellSize)+','+Math.floor(o.z/cellSize);if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k).push(o);}
    }
    candidates(x,z,range){const out=this.large.slice(),d=range+this.maxRadius,s=this.size;for(let a=Math.floor((x-d)/s);a<=Math.floor((x+d)/s);a++)for(let b=Math.floor((z-d)/s);b<=Math.floor((z+d)/s);b++){const list=this.cells.get(a+','+b);if(list)out.push(...list);}return out;}
  }
  const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
  function project(p,r){const dx=r.x2-r.x1,dz=r.z2-r.z1,l=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((p.x-r.x1)*dx+(p.z-r.z1)*dz)/(l||1))),x=r.x1+dx*t,z=r.z1+dz*t;return {x,z,t,distance:Math.hypot(p.x-x,p.z-z)};}
  class MinHeap{constructor(){this.a=[];}push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].cost<=v.cost)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}pop(){const a=this.a,v=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].cost<a[j].cost)j++;if(a[j].cost>=last.cost)break;a[i]=a[j];i=j;}a[i]=last;}return v;}}
  class Router {
    constructor(world){this.roads=(world.roads||[]).filter(r=>[r.x1,r.z1,r.x2,r.z2].every(n=>Number.isFinite(n)&&Math.abs(n)<=100000)&&Math.hypot(r.x2-r.x1,r.z2-r.z1)<20000&&Math.hypot(r.x2-r.x1,r.z2-r.z1)>.5).slice(0,LIMITS.routeRoads);this.nodes=[];this.graph=[];this.parts=[];const keys=new Map(),node=p=>{const key=Math.round(p.x*2)+','+Math.round(p.z*2);if(keys.has(key))return keys.get(key);const id=this.nodes.length;keys.set(key,id);this.nodes.push({x:p.x,z:p.z});this.graph.push([]);return id;};
      // Only connect existing endpoints/T-junctions. Do not invent connections at
      // arbitrary geometric crossings (bridges can cross without a junction).
      const buckets=new Map(),size=128,key=(x,z)=>Math.floor(x/size)+','+Math.floor(z/size);
      this.roads.forEach((r,i)=>{for(const p of [{x:r.x1,z:r.z1},{x:r.x2,z:r.z2}]){const k=key(p.x,p.z);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push({...p,road:i});}});
      this.roads.forEach((r,i)=>{const splits=[{t:0,x:r.x1,z:r.z1},{t:1,x:r.x2,z:r.z2}];for(let x=Math.floor((Math.min(r.x1,r.x2)-.3)/size);x<=Math.floor((Math.max(r.x1,r.x2)+.3)/size);x++)for(let z=Math.floor((Math.min(r.z1,r.z2)-.3)/size);z<=Math.floor((Math.max(r.z1,r.z2)+.3)/size);z++)for(const p of buckets.get(x+','+z)||[]){if(p.road===i)continue;const q=project(p,r);if(q.distance<=.3&&q.t>.0001&&q.t<.9999)splits.push({...q,x:p.x,z:p.z});}splits.sort((a,b)=>a.t-b.t);const unique=splits.filter((s,k)=>!k||s.t-splits[k-1].t>1e-6);this.parts[i]=[];
        for(let j=1;j<unique.length;j++){const a=unique[j-1],b=unique[j],u=node(a),v=node(b),length=Math.hypot(a.x-b.x,a.z-b.z);if(length<.01||u===v)continue;const edge={road:i,u,v,length,a:a.t,b:b.t};this.parts[i].push(edge);this.graph[u].push({to:v,...edge});this.graph[v].push({to:u,...edge});}
      });
    }
    nearest(p){if(!point(p))return null;let best=null;this.roads.forEach((r,i)=>{const q=project(p,r);if(!best||q.distance<best.distance)best={...q,road:i};});return best;}
    route(start,end,profile='direct',context={}){
      const from=this.nearest(start),dest=this.nearest(end);if(!from||!dest||from.distance>100||dest.distance>250)return {ok:false,reason:'No mapped road approach nearby. Pin and bearing only.'};
      const weight=i=>{const r=this.roads[i],f=context.familiarity?.[r.name]?.distanceM||0,s=context.surfaces?.[r.name]||{},incident=(context.closures||[]).some(c=>c.roadId===Town.roadID(r));return profile==='familiar'?1+1/(1+f/2000):profile==='cautious'?1+(r.surface==='gravel'?.4:0)+(s.ice||0)*4+(s.snow||0)*2+(s.puddle||0)*3+(incident?2:0):1;};
      const connectors=p=>{const edge=this.parts[p.road].find(e=>p.t>=e.a-1e-7&&p.t<=e.b+1e-7);return edge?[{id:edge.u,len:Math.hypot(p.x-this.nodes[edge.u].x,p.z-this.nodes[edge.u].z)},{id:edge.v,len:Math.hypot(p.x-this.nodes[edge.v].x,p.z-this.nodes[edge.v].z)}]:[];};
      const origin=connectors(from),targets=connectors(dest);if(!origin.length||!targets.length)return {ok:false,reason:'Mapped road segments are not connected. Pin and bearing only.'};
      const make=segments=>({ok:true,profile,segments:segments.filter(s=>s.length>.01),distanceM:segments.reduce((n,s)=>n+s.length,0),approachM:dest.distance,destination:{x:dest.x,z:dest.z},visits});
      let visits=0;
      const segment=(a,b,i)=>({a:{x:a.x,z:a.z},b:{x:b.x,z:b.z},road:this.roads[i].name||'Unnamed road',roadId:Town.roadID(this.roads[i]),length:Math.hypot(a.x-b.x,a.z-b.z)});
      if(from.road===dest.road)return make([segment(from,dest,from.road)]);
      const heap=new MinHeap(),cost=new Map(),came=new Map();for(const c of origin){cost.set(c.id,c.len*weight(from.road));came.set(c.id,{prev:null,road:from.road});heap.push({id:c.id,cost:cost.get(c.id)});}
      let chosen=null,best=Infinity;while(heap.a.length&&visits++<LIMITS.routeVisits){const q=heap.pop();if(q.cost!==cost.get(q.id))continue;if(q.cost>best)break;for(const t of targets)if(t.id===q.id){const n=q.cost+t.len*weight(dest.road);if(n<best){best=n;chosen=q.id;}}for(const e of this.graph[q.id]){const n=q.cost+e.length*weight(e.road);if(n<(cost.get(e.to)??Infinity)){cost.set(e.to,n);came.set(e.to,{prev:q.id,road:e.road});heap.push({id:e.to,cost:n});}}}
      if(chosen===null)return {ok:false,reason:'No connected mapped route. Pin and bearing only.',visits};
      const links=[];let id=chosen;while(came.get(id)?.prev!==null){const c=came.get(id);if(!c||links.length>this.nodes.length)return {ok:false,reason:'Route limit reached. Pin and bearing only.'};links.push(segment(this.nodes[c.prev],this.nodes[id],c.road));id=c.prev;}links.reverse();links.unshift(segment(from,this.nodes[id],from.road));links.push(segment(this.nodes[chosen],dest,dest.road));return make(links);
    }
  }
  function routeProgress(route,p){if(!route?.ok||!point(p))return null;let near=null,passed=0;for(let i=0;i<route.segments.length;i++){const s=route.segments[i],q=project(p,{x1:s.a.x,z1:s.a.z,x2:s.b.x,z2:s.b.z});if(!near||q.distance<near.distance)near={...q,index:i,passed:passed+s.length*q.t,road:s.road};passed+=s.length;}if(!near)return {remainingM:0,offRoute:false,instruction:'At the mapped approach'};const next=route.segments.slice(near.index+1).find(s=>s.road!==near.road);return {...near,remainingM:Math.max(0,route.distanceM-near.passed),offRoute:near.distance>45,instruction:next?'Follow '+near.road+' → '+next.road:'Follow '+near.road+' to the mapped approach'};}
  return Object.freeze({LIMITS,prefs,backup,writePair,warnings,SceneIndex,Router,project,routeProgress});
})();
