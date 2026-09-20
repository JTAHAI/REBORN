// Independent asset-selection regression; does not alter game code or GLB.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const declaration = html.match(/const exteriorPath\s*=\s*(\/[^\n]+?\/[a-z]*);/);
assert.ok(declaration, 'production exterior component filter is available');
const filter = vm.runInNewContext(declaration[1], {}, { timeout: 1000 });
const bytes = fs.readFileSync(path.join(root, 'assets/vehicles/jetta-mkiv/volkswagen-bora-jetta-mk4-2005.cc-by-4.0.glb'));
const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
const parents = [];
doc.nodes.forEach((node, index) => (node.children || []).forEach(child => parents[child] = index));
const selected = new Set();
doc.nodes.forEach((node, index) => {
  if (node.mesh === undefined) return;
  const lineage = [];
  for (let n = index; n !== undefined; n = parents[n]) lineage.push(doc.nodes[n].name || '');
  if (filter.test(lineage.join('/'))) lineage.forEach(name => selected.add(name));
});
for (const required of ['body', 'roof_plain', 'trunk', 'hood', 'backlight', 'fender_L', 'fender_R', 'dno', 'interior', 'headlightglass_L', 'headlightglass_R']) {
  assert.ok(selected.has('BoraVR6_' + required), 'missing production shell component: ' + required);
}
for (const excluded of ['hood_rusty', 'bumper_F_rusty', 'bumper_F_stance', 'bumper_F_v6', 'trunk_v6', 'roof_sun']) {
  assert.ok(!selected.has('BoraVR6_' + excluded), 'optional duplicate variant selected: ' + excluded);
}
const styleFunction = html.match(/function factoryStyle\(path\)\{[\s\S]*?\n\}/);
assert.ok(styleFunction, 'production component material selector is available');
const style = vm.runInNewContext('(' + styleFunction[0] + ')', {
  COLORS: { glass: '#glass', paint: '#paint' },
  M: { GLASS: 'glass', PAINT: 'paint', LAMP: 'lamp', RUBBER: 'rubber', METAL: 'metal' },
}, { timeout: 1000 });
assert.equal(style('etk800_glass-material/BoraVR6_backlight')[1], 'glass', 'rear glass material');
assert.equal(style('BoraVR6_backlight')[1], 'glass', 'rear window identity must not fall through to paint');
console.log('PASS: required real GLB shell components selected, duplicate variants excluded');
