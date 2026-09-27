#!/usr/bin/env node
'use strict';
// Reproduce the narrow production hotfix without replacing the memorial website
// or silently releasing the newer gameplay/UX branch. Run on an extracted copy
// of release-packages/reborn-cloudflare-pages-c1d56e5-NORTH-BERWICK-POLISHED.zip.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const repo = path.resolve(__dirname, '..');
const site = path.resolve(process.argv[2] || '');
const mode = process.argv[3];
assert.ok(process.argv[2] && fs.existsSync(path.join(site, 'play/memorial.js')), 'Supply the extracted memorial site directory');
assert.notEqual(site, repo, 'Never patch the working game as a release package');
const hash = data => createHash('sha256').update(data).digest('hex');
const git = (...args) => execFileSync('git', args, {cwd: repo, encoding: 'utf8'});
const fix = '81d40040669b73129191fbc749974493a2cd052b';
const gamePath = path.join(site, 'play/index.html');
const swPath = path.join(site, 'play/sw.js');
async function main() {
  if (mode === '--check-live') {
    const files = fs.readdirSync(site, {recursive:true}).filter(p => fs.statSync(path.join(site,p)).isFile());
    const mismatches = [];
    for (const file of files) {
      const relative = file.replaceAll('\\','/');
      if (['_headers','_redirects'].includes(relative)) continue;
      const url = relative.replace(/(^|\/)index\.html$/, '$1');
      const response = await fetch('https://reborn.tahai.net/' + url, {cache:'no-store'});
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok || hash(bytes) !== hash(fs.readFileSync(path.join(site,file)))) mismatches.push({file:relative,status:response.status});
    }
    assert.deepEqual(mismatches, [], 'Extracted package differs from live site; stop before deployment');
    console.log(`Verified ${files.length - 2} live public files match this package byte-for-byte.`);
    return;
  }
  assert.equal(mode, '--patch', 'Use --check-live before --patch');
  const before = fs.readFileSync(gamePath, 'utf8');
  assert.equal(hash(before), 'b61ab27ef2be9e211046f51cf7061f151372de2230eff7aba65a98ef4a771a59', 'Only the verified Build 009 release can be patched');
  let html = before;
  // Apply every exact context hunk from the already tested renderer/spawn/roof
  // repair. Line numbers differ because the live package has a memorial shell.
  const diff = git('diff', fix + '^', fix, '--', 'index.html');
  const hunks = diff.split(/^@@[^\n]*\n/m).slice(1);
  assert.equal(hunks.length, 9, 'Unexpected source repair; review before applying');
  for (const hunk of hunks) {
    const lines = hunk.split('\n').filter(line => /^[ +\-]/.test(line));
    const old = lines.filter(line => line[0] !== '+').map(line => line.slice(1)).join('\n') + '\n';
    const next = lines.filter(line => line[0] !== '-').map(line => line.slice(1)).join('\n') + '\n';
    assert.equal(html.split(old).length, 2, 'Repair context must match exactly once');
    html = html.replace(old, next);
  }
  const cache = 'build009-c1d56e58ac847d';
  const sw = fs.readFileSync(swPath, 'utf8');
  assert.equal(sw.split(cache).length, 2, 'Unexpected service-worker version');
  // Compile all inline scripts and execute the regression shipped with this fix
  // against this exact release, including its actual world data and GLB.
  const vm = require('node:vm');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((m,i) => new vm.Script(m[1], {filename:'release-script-' + i}));
  fs.writeFileSync(gamePath, html);
  fs.writeFileSync(swPath, sw.replace(cache, cache + '-mapfix-20260925'));
  const test = git('show', fix + ':tests/world-rendering.cjs').replace("const root = path.resolve(__dirname, '..');", 'const root = ' + JSON.stringify(path.join(site,'play')) + ';');
  execFileSync(process.execPath, ['-e', test], {cwd: repo, stdio:'inherit'});
  console.log(JSON.stringify({patch:fix,compiledScripts:scripts.length,before:hash(before),after:hash(html),changed:['play/index.html','play/sw.js']},null,2));
}
main().catch(error => {console.error(error);process.exitCode=1;});
