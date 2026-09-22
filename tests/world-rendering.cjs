'use strict';
// Execute the production world builder and vehicle loader, not source-token checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const scripts = [...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
let loaded;
const ready = new Promise(resolve => { loaded = resolve; });
const context = vm.createContext({console, TextDecoder, Event,
  dispatchEvent: event => { if (event.type === 'reborn-vehicle-model-ready') loaded(); },
  fetch: async relative => ({ok: true, arrayBuffer: async () => {
    const b = fs.readFileSync(path.join(root, relative));
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  }})
});
for (const marker of ['else root.RebornCore = api', 'root.RebornRenderer={Renderer', 'root.RebornVehicle={objects']) {
  const code = scripts.find(s => s.includes(marker));
  assert.ok(code, 'Production module missing: ' + marker);
  vm.runInContext(code, context, {timeout: 10000});
}
(async () => {
  let timer;
  await Promise.race([ready, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Imported vehicle failed to load')), 10000); })]);
  clearTimeout(timer);
  const C = context.RebornCore, R = context.RebornRenderer, V = context.RebornVehicle;
  const world = C.createNorthBerwickWorld(JSON.parse(fs.readFileSync(path.join(root, 'assets/worlds/north-berwick/world.json'), 'utf8')));
  const objects = R.buildWorld(world);
  const site=id=>world.buildings.find(b=>b.landmarkId===id);
  for(const [id,street] of [['cumberland-farms','Main Street'],['town-office-police','Main Street'],['aroma-joes','Main Street'],['fire-department','Market Street'],['north-berwick-crossing','Wells Street'],['post-office','Wells Street']]){
    const b=site(id);assert.ok(b,`Missing site ${id}`);assert.equal(b.frontRoad,street);
    assert.equal(world.buildings.filter(b=>b.landmarkId===id).length,1,`Duplicate site ${id}`);
    assert.equal(b.frontYaw,b.yaw,'Authored frontage and collision frame must agree');
  }
  const cf=site('cumberland-farms'),hall=site('town-office-police'),fire=site('fire-department');
  assert.ok(Math.cos(cf.frontYaw-hall.frontYaw)<-.95,'Cumberland and Town Hall must face opposite sides of Main Street');
  assert.ok((fire.x-cf.x)*Math.sin(cf.frontYaw)+(fire.z-cf.z)*Math.cos(cf.frontYaw)<0,'Fire station must be behind Cumberland, across Market Street');
  assert.ok(Math.hypot(cf.x-3953.9635,cf.z-4300.3031)<.1,'Cumberland must use its own mapped building, not nearest unrelated footprint');
  assert.ok(objects.length > 1000, 'Town must produce renderable scenery');
  assert.ok(objects.every(o => [...o.m, ...o.color, ...o.surface].every(Number.isFinite)), 'Town transforms and materials must be finite');
  assert.ok(objects.some(o => o.surface[0] === V.M.ROAD && Math.hypot(o.x - world.spawn.x, o.z - world.spawn.z) < 50), 'Road geometry must exist at the player spawn');
  const road = C.roadAt(world, world.spawn.x, world.spawn.z);
  assert.ok(road, 'Free drive must start on the road');
  const dx = road.x2-road.x1, dz=road.z2-road.z1;
  assert.ok(Math.abs((Math.sin(world.spawn.yaw)*dx-Math.cos(world.spawn.yaw)*dz)/Math.hypot(dx,dz)) > .99, 'Car must face along the road');
  const car = C.createCar(0, 0, 0), parts = V.objects(car);
  assert.ok(parts.some(o => o.mesh.startsWith('mkiv_factory_')), 'Regression check must use the supplied GLB');
  // The actual plain-roof primitive, with the same axis mapping as production.
  const roof = R.geometries.mkiv_factory_152_0.data;
  function roofHeight(x,z) {
    let y = -Infinity;
    for(let i=0;i<roof.length;i+=18){
      const ax=roof[i],az=roof[i+2],bx=roof[i+6],bz=roof[i+8],cx=roof[i+12],cz=roof[i+14];
      const det=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(det)<1e-10)continue;
      const a=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/det,b=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/det,c=1-a-b;
      if(Math.min(a,b,c)>=-1e-6)y=Math.max(y,a*roof[i+1]+b*roof[i+7]+c*roof[i+13]);
    }
    return y;
  }
  let vertices = 0;
  for(const name of ['mkiv_sunroof_gasket','mkiv_sunroof_glass']) {
    assert.ok(parts.some(o => o.mesh === name), 'Fitted sunroof must be rendered');
    const d = R.geometries[name].data;
    for(let i=0;i<d.length;i+=6){
      const gap=d[i+1]-roofHeight(d[i],d[i+2]);
      assert.ok(gap >= .001 && gap <= .005, 'Sunroof must follow roof within 1–5 mm; gap=' + gap);
      vertices++;
    }
  }
  console.log(`Rendered world: ${objects.length} finite objects; road-aligned spawn; ${vertices} sunroof vertices within 1–5 mm of GLB roof.`);
})().catch(error => { console.error(error); process.exitCode=1; });
