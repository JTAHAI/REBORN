'use strict';
// Independent simulation tests, not browser playthrough evidence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).find(code => code.includes('else root.RebornCore = api'));
assert.ok(script, 'The production simulation must remain independently testable');
const context = {module: {exports: {}}, console};
vm.runInNewContext(script, context, {timeout: 5000});
const C = context.module.exports;
let passed = 0;
function check(name, run) { run(); passed++; console.log('PASS ' + name); }
const neutral = {throttle: 0, brake: 0, steer: 0};
const speed = car => Math.hypot(car.vx, car.vz);
function frames(sim, input, count) { for (let i = 0; i < count; i++) sim.step(input, C.DT); }
check('acceleration then braking', () => {
  const sim = new C.Simulation(); sim.agents = [];
  frames(sim, {...neutral, throttle: 1}, 90);
  const moving = speed(sim.car); assert.ok(moving > 5);
  frames(sim, {...neutral, brake: 1}, 45); assert.ok(speed(sim.car) < moving / 2);
});
check('reverse and steering affect motion', () => {
  const sim = new C.Simulation(); sim.agents = [];
  frames(sim, {...neutral, throttle: -1}, 45); assert.ok(sim.car.forwardSpeed < -1);
  sim.reset(); sim.agents = [];
  frames(sim, {...neutral, throttle: 1, steer: .5}, 120); assert.ok(Math.abs(sim.car.yaw) > .1);
});
check('transformation cycles and disabled car cannot transform', () => {
  const sim = new C.Simulation();
  for (const expected of ['rally', 'reborn', 'street']) { sim.transform(); assert.equal(sim.car.mode, expected); }
  sim.car.health = 0; sim.transform(); assert.equal(sim.car.mode, 'street');
});
check('boost consumes bounded energy', () => {
  const sim = new C.Simulation(); sim.agents = [];
  frames(sim, {...neutral, throttle: 1, boost: true}, 60);
  assert.ok(sim.car.energy < 100 && sim.car.energy >= 0); assert.equal(sim.car.boosting, true);
});
check('pulse requires mode, energy and cooldown', () => {
  const sim = new C.Simulation(); assert.equal(sim.pulse(), false);
  sim.transform(); sim.transform(); assert.equal(sim.pulse(), true);
  assert.equal(sim.car.energy, 70); assert.equal(sim.pulse(), false); assert.equal(sim.car.energy, 70);
  sim.car.pulseCooldown = 0; sim.car.energy = 29; assert.equal(sim.pulse(), false);
});
check('recover stops motion and time trial imposes penalty', () => {
  const sim = new C.Simulation(); sim.reset('run'); sim.car.vx = 15; sim.car.vz = 8;
  sim.recover(); assert.equal(speed(sim.car), 0); assert.equal(sim.mission.time, 5);
  assert.ok(Number.isFinite(sim.car.x) && Number.isFinite(sim.car.z));
});
check('time trial expiry and route completion are distinct', () => {
  const sim = new C.Simulation(); sim.reset('run'); sim.mission.time = 151;
  sim.step(neutral); assert.equal(sim.mission.status, 'failed');
  sim.reset('run'); sim.agents = [];
  for (const cp of C.ROUTE) { sim.car.x = cp.x; sim.car.z = cp.z; sim.car.vx = sim.car.vz = 0; sim.step(neutral); }
  assert.equal(sim.mission.status, 'complete'); assert.equal(sim.mission.checkpoint, C.ROUTE.length);
});
check('all four mode simulations retain finite bounded state', () => {
  for (const mode of ['free', 'run', 'pursuit', 'arena']) {
    const sim = new C.Simulation(); sim.reset(mode);
    frames(sim, {...neutral, throttle: .6, steer: .1}, 600);
    const car = sim.snapshot().car;
    for (const key of ['x', 'z', 'yaw', 'speed', 'health', 'energy']) assert.ok(Number.isFinite(car[key]), mode + ':' + key);
    assert.ok(car.health >= 0 && car.health <= 100); assert.ok(car.energy >= 0 && car.energy <= 100);
  }
});
check('malformed saves are sanitized without changing save version', () => {
  const save = C.validateSave({version: 1, bestRun: -7, settings: {weather: 'unknown', quality: 'bad', sound: 'yes'}});
  assert.equal(save.version, 1); assert.equal(save.bestRun, null); assert.equal(save.settings.weather, 'clear');
  assert.equal(save.settings.quality, 'auto'); assert.equal(save.settings.sound, true);
});
console.log(`${passed} independent production-simulation checks passed`);
