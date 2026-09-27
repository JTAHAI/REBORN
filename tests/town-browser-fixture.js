// Run only in a dedicated test browser session, via agent-browser eval --stdin.
// Seeds a valid nearby incident through the production save migration path.
(async()=>{
 const C=RebornCore,T=C.Town,world=C.createNorthBerwickWorld(await(await fetch('assets/worlds/north-berwick/world.json')).json()),network=new T.Network(world),p=world.spawn;
 let location=null,best=22;
 for(const r of network.roads.values())for(const side of [-1,1]){const dx=r.x2-r.x1,dz=r.z2-r.z1,t=C.clamp(((p.x-r.x1)*dx+(p.z-r.z1)*dz)/(r.len*r.len),.05,.95),q=network.point(r.id,t,side,false),dist=Math.hypot(q.x-p.x,q.z-p.z);if(dist<best&&network.valid(q,null)){best=dist;location=q;}}
 if(!location)throw Error('No safe nearby fixture location');
 const save=C.validateSave(null);save.settings.weather='clear';save.settings.quality='low';save.settings.sound=false;save.town.lastSlot=5;save.town.lastActorSlot=16;save.town.activeEvents=[{id:'t995-5-0-jump-start',type:'jump-start',state:'active',location,created:480,expires:600,actionAt:0,choice:'',impact:false}];
 // Apply after the app's pagehide flush so that it cannot overwrite the fixture.
 window.addEventListener('pagehide',()=>localStorage.setItem('995.reborn.save.v1',JSON.stringify(save)),{once:true});return {fixtureDistance:best,road:location.road};
})();
