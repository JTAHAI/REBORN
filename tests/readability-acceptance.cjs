'use strict';
// Independent regression for the legacy small-text overrides. Browser checks
// remain authoritative for computed layout; this does not certify all CSS.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]).join('\n');
for (const tag of ['p', 'b']) {
  const rules = [...css.matchAll(new RegExp('\\.control-help\\s+' + tag + '\\s*\\{([^}]*)\\}', 'g'))];
  assert.ok(rules.length, 'Keep explicit control-help ' + tag + ' styling');
  for (const rule of rules) {
    const size = rule[1].match(/font-size\s*:\s*([\d.]+)px\b/);
    if (size) assert.ok(Number(size[1]) >= 12, 'Remove obsolete undersized override: ' + rule[0]);
  }
}
console.log('No obsolete sub-12px control-help paragraph or label overrides');
