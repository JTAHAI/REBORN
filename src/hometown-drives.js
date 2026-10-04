// SPDX-License-Identifier: CPAL-1.0
// Optional, unhurried itineraries. No network, payments, wall-clock deadlines or auto-driving.
const HometownDrives = (() => {
 'use strict';
 const ROUTES = Object.freeze([
  Object.freeze({id:'mill-main',title:'Mill & Main',tag:'THE HEART OF TOWN',description:'A little history. Familiar corners. Take the Jetta around the town center.',stops:['town-office-police','olde-woolen-mill','hurd-manor','fire-department'],badge:'Main Street Regular'}),
  Object.freeze({id:'everyday',title:'The Everyday Loop',tag:'THE GOOD KIND OF ORDINARY',description:'The places that make a town yours. Coffee, groceries, and absolutely no hurry.',stops:['north-berwick-crossing','allards-market','hannaford','aroma-joes'],badge:'The Familiar Way'}),
  Object.freeze({id:'long-way',title:'The Long Way Home',tag:'A FEW MORE MILES',description:'Leave the center behind, find the outer roads, and bring Buttercup home.',stops:['noble-high-school','riverside-farm-stand','pratt-whitney','town-office-police'],badge:'Every Road Remembers'})
 ]);
 const IDS=ROUTES.map(r=>r.id),PLACES=new Set(ROUTES.flatMap(r=>r.stops));
 const finite=(n,f,min=0,max=1e7)=>typeof n==='number'&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):f;
 const cleanPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)?{x:p.x,z:p.z}:null;
 function defaults(){return {version:1,active:null,completed:{},visited:[]};}
 function sanitize(raw){
  const s=defaults();if(!raw||typeof raw!=='object')return s;
  s.visited=Array.from(new Set(Array.isArray(raw.visited)?raw.visited.filter(x=>PLACES.has(x)):[])).slice(0,15);
  for(const id of IDS){const item=Object.prototype.hasOwnProperty.call(raw.completed||{},id)?raw.completed[id]:null;if(item&&typeof item==='object')s.completed[id]={runs:Math.floor(finite(item.runs,1,1,9999)),distanceM:finite(item.distanceM,0),seconds:finite(item.seconds,0)};}
  const a=raw.active,r=ROUTES.find(r=>r.id===a?.id);
  if(r&&Number.isInteger(a.index)&&a.index>=0&&a.index<r.stops.length)s.active={id:r.id,index:a.index,distanceM:finite(a.distanceM,0),seconds:finite(a.seconds,0)};
  return s;
 }
 function catalog(world,router){
  const byId=new Map((world.landmarks||[]).map(x=>[x.id,x]));
  return ROUTES.map(route=>{
   let from=world.spawn,total=0,valid=true;const stops=[];
   for(const id of route.stops){
    const place=byId.get(id),path=place?router.route(from,place):null;
    if(!path?.ok){valid=false;break;}
    const road=path.segments.at(-1)?.road||router.roads[router.nearest(place)?.road]?.name||'Mapped road';
    const p={id,name:place.name,x:path.destination.x,z:path.destination.z,road,approachM:path.approachM};
    stops.push(p);total+=path.distanceM;from=p;
   }
   return {...route,stops,distanceM:total,available:valid&&stops.length===route.stops.length};
  });
 }
 class Director{
  constructor(raw,routes){this.state=sanitize(raw);this.routes=routes||[];this.dwell=0;this.last=null;}
  route(){return this.routes.find(r=>r.id===this.state.active?.id)||null;}
  goal(){const r=this.route();return r?.stops[this.state.active.index]||null;}
  begin(id){const r=this.routes.find(r=>r.id===id);if(!r?.available)return false;if(this.state.active&&this.state.active.id!==id)return false;if(!this.state.active)this.state.active={id,index:0,distanceM:0,seconds:0};this.last=null;this.dwell=0;return true;}
  end(){this.state.active=null;this.last=null;this.dwell=0;}
  resetContinuity(){this.last=null;this.dwell=0;}
  tick(dt,car,running,onRoad){
   const a=this.state.active,goal=this.goal();if(!a||!goal)return null;
   if(!running||!cleanPoint(car)||!Number.isFinite(dt)||dt<=0||dt>.1){this.resetContinuity();return null;}
   const speed=Number.isFinite(car.speed)?Math.abs(car.speed):Math.hypot(car.vx||0,car.vz||0);
   const delta=this.last?Math.hypot(car.x-this.last.x,car.z-this.last.z):0;
   const jumped=delta>Math.max(4,speed*dt+2);this.last={x:car.x,z:car.z};a.seconds=Math.min(1e7,a.seconds+dt);
   if(!jumped)a.distanceM=Math.min(1e7,a.distanceM+delta);
   const near=Math.hypot(car.x-goal.x,car.z-goal.z)<=18;
   this.dwell=near&&speed<=3.6&&onRoad&&!jumped?this.dwell+dt:0;
   if(this.dwell<.65)return null;
   this.dwell=0;if(!this.state.visited.includes(goal.id))this.state.visited.push(goal.id);
   const route=this.route();a.index++;
   if(a.index<route.stops.length)return {type:'stop',place:goal.name,index:a.index,total:route.stops.length};
   const prev=this.state.completed[a.id],result={type:'complete',title:route.title,badge:route.badge,id:a.id,distanceM:a.distanceM,seconds:a.seconds};
   this.state.completed[a.id]={runs:Math.min(9999,(prev?.runs||0)+1),distanceM:a.distanceM,seconds:a.seconds};this.end();return result;
  }
  snapshot(){return {state:sanitize(this.state),goal:this.goal()?{...this.goal()}:null,dwell:this.dwell,catalog:this.routes.map(r=>({id:r.id,title:r.title,available:r.available,stops:r.stops.length,distanceM:r.distanceM,badge:r.badge}))};}
 }
 return Object.freeze({ROUTES,defaults,sanitize,catalog,Director});
})();
