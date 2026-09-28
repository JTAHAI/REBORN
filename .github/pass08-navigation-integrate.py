from pathlib import Path
import subprocess,json
root=Path.cwd()
def read_git(p):return subprocess.check_output(['git','show','d0dd8466cb3d9f659cbccc31ad25138d9270ca73:'+p],cwd=root,text=True)
# Take the tested redirect/cache-failure repair, but keep Pass 8's idle-consent gate.
worker=read_git('tools/service-worker.template.js')
worker=worker.replace("'pass07-navfix1-__BUILD_ID__'","'pass08-navfix1-__BUILD_ID__'")
worker=worker.replace(' await self.skipWaiting();',' // Replacements wait for Pass 8\'s explicit, all-clients-idle consent gate.')
worker=worker.replace('Never remove other apps\' or root-site caches, localStorage or IndexedDB.','Never remove other apps\' or root-site caches or player save records.')
oldworker=(root/'tools/service-worker.template.js').read_text()
worker+='\n'+oldworker[oldworker.index('// Every in-scope tab'):]
(root/'tools/service-worker.template.js').write_text(worker)
for p in ['tests/service-worker-navigation.cjs','tests/service-worker-navigation-browser.py','website/repair/index.html']:
 dest=root/p;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(read_git(p))
# Normalize a response in the full installer and defensively on old cache reads.
p=root/'tests/service-worker-navigation-browser.py'
s=p.read_text().replace("page.goto(base + '/play/')\n            page.wait_for_function('!!window.REBORN')","page.goto(base + '/play/')\n            page.wait_for_function('!!window.REBORN && REBORN.snapshot().release.mapReady')")
start=s.index('def worker_updated(page):')
end=s.index('\ntry:',start)
s=s[:start]+'''def worker_updated(page):
    # This helper runs OUTSIDE /play/ after the failed game tab is closed.
    # Pass 8 must wait for explicit consent, not regain Pass 7's skipWaiting.
    page.evaluate("navigator.serviceWorker.getRegistration('/play/').then(r=>r.update())")
    page.wait_for_function("navigator.serviceWorker.getRegistration('/play/').then(r=>!!r.waiting)")
    page.evaluate("navigator.serviceWorker.getRegistration('/play/').then(r=>r.waiting.postMessage({type:'REBORN_ACTIVATE_IF_IDLE'}))")
    page.wait_for_function("navigator.serviceWorker.getRegistration('/play/').then(r=>!r.waiting&&r.active?.state==='activated')")
''' +s[end:]
s=s.replace("passed('Broken cached installation upgrades; saves and unrelated/root caches survive')","passed('Broken cached installation upgrades after idle consent; saves and unrelated/root caches survive')")
# Exercise actual touch rather than mouse on a touch-emulated page for the new gate.
s=s.replace("""                page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] * .22)
                page.mouse.down()
                try:
                    page.wait_for_function('REBORN.snapshot().car.speed>0', timeout=20000)
                finally:
                    page.mouse.up()""","""                touch_session = context.new_cdp_session(page)
                touch_session.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{
                    'x':box['x']+box['width']/2,'y':box['y']+box['height']*.22,'id':1}]})
                try:
                    page.wait_for_function('REBORN.snapshot().car.speed>0', timeout=20000)
                finally:
                    touch_session.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
                assert page.locator('#drive-stick').get_attribute('aria-valuenow') == '0'
                touch_session.detach()""")
p.write_text(s)
# Include the redirect in the existing actual two-version active-drive update test.
p=root/'tests/update-safety-browser.py';s=p.read_text().replace('from pathlib import Path','from pathlib import Path\nfrom urllib.parse import urlsplit')
s=s.replace(" def log_message(self,*a):pass",''' def do_GET(self):
  parsed=urlsplit(self.path)
  if parsed.path.endswith('/index.html'):
   self.send_response(307)
   self.send_header('Location',parsed.path[:-len('index.html')]+(('?'+parsed.query) if parsed.query else ''))
   self.end_headers();return
  super().do_GET()
 def log_message(self,*a):pass''')
p.write_text(s)
p=root/'tools/build-site.cjs';s=p.read_text()
s=s.replace("architecture:'static-front-end-only'","navigationHotfix:'redirect-safe-v1',navigationHotfixBase:'d0dd8466cb3d9f659cbccc31ad25138d9270ca73',architecture:'static-front-end-only'")
s=s.replace('Source: ${sha}\n\nNew:', '''Source: ${sha}

Loading repair included: redirected cached HTML is rebuilt into a navigation-safe
response. Already-installed games can use /repair/ after closing other game tabs.
Save records are never cleared by the loader repair. Pass 8 idle-consent update
safety is retained; this build does not reintroduce forced active-drive reloads.

New:''')
s=s.replace("localStorage saves are never cleared by the updater.\\n'", "localStorage saves are never cleared by the updater.\\n\\nIf a prior game installation shows ERR_FAILED, close other game tabs,\\nopen /repair/ on this same site and choose Repair game loading.\\nDo not clear site data: the repair leaves saves and memories intact.\\n'")
p.write_text(s)
p=root/'package.json';pkg=json.loads(p.read_text());pkg['scripts']['test']+=' && node tests/service-worker-navigation.cjs';pkg['scripts']['test:navigation:browser']='python3 tests/service-worker-navigation-browser.py';p.write_text(json.dumps(pkg,indent=2,ensure_ascii=True)+'\n')
# Keep generated screenshots/reports out of source commits.
p=root/'.gitignore';p.write_text(p.read_text()+'\nhotfix-evidence/\nintegration-evidence/\n')
(root/'docs/PASS_08_NAVIGATION_INTEGRATION.md').write_text("# Pass 8 navigation repair integration\n\nBuild 017 / Pass 8 of 8, starting from a7641ebe5fc1fc52f7ba96ce9ca2062ae31cafa9.\nImports the navigation repair from d0dd8466cb3d9f659cbccc31ad25138d9270ca73.\n\n## Player-visible result\n\nThe completed Hometown UX pass now includes the repaired offline loader. All\nfour hub sections, road-profile guidance, larger reading options, save backup\nand restore safeguards, quieter HUD and rendering improvements remain intact.\nA redirect from /play/index.html to /play/ must no longer make a cached\nnavigation fail with Chrome ERR_FAILED.\n\nThe repair normalizes redirected HTML on cache installation and cached reads.\nOnline loading also survives unavailable cache storage or failed cache writes.\nCleanup recognizes both historical game-scope cache name formats, but leaves\nunrelated/root caches and player saves alone. /repair/ is outside the game scope\nand restarts only the game loader; it never clears progress or memories.\n\nCrucially, the Pass 7 repair's automatic skipWaiting is NOT carried over.\nPass 8 retains explicit consent and its all-game-tabs-idle activation gate.\nThe two-version active/idle update regression now serves the same HTML redirect\nas the production static host. The original failing worker is retained as a\nnegative fixture; it must reproduce ERR_FAILED before the new worker is tested.\n\nNo gameplay runtime, canonical North Berwick data, MkIV model, input mapping,\nsave key, license, dedication or hosting configuration changes in this integration.\nThe existing Pass 8 runtime changes remain those documented in\nRELEASE_HARDENING_PASS_017.md. This is still a playable pre-alpha, not a claim\nof physical-phone performance, owner visual acceptance or commercial readiness.\n\n## Required checks\n\n- npm test (prior gameplay, 20 release-hardening checks, 11 loader unit checks)\n- npm run test:navigation:browser (old failure, idle recovery, offline URLs,\n  redirected cache read, repair page, standalone scope, desktop/touch driving)\n- npm run test:updates:browser (real two-version/two-tab idle-consent fixture,\n  now including index.html redirects)\n- Existing release, UX, memory, workshop, weather, passenger, Echo and site gates\n- Exact website/standalone byte equivalence, canonical asset hashes and repeat build\n\nBrowser tests run on the CI Chromium software renderer with touch emulation.\nA local browser-policy block is an environment failure, not a game verdict.\nAny unsuccessful required CI gate prevents the dependent package job.\nMain and production are not deployed by these source, test or package commands.\n")

# Match the isolated local candidate byte-for-byte before checkpointing source.
import hashlib
expected={'.gitignore': '8dd6c5fe22866836c28dd5a180ea6ffb41ce292b0faef25a0d513f49aa2e1c2b', 'package.json': '8acec84ebf01688e7fbc149b1fca47c3e8f1eba7b0505bdaa339e1b9143e2064', 'tests/update-safety-browser.py': '760c7ff13a688a308d290ebe4e6a86498e36f2ee04830ce2c2bb175dd77715c7', 'tools/build-site.cjs': '7b4f4fa6309feacdbf55e588cbab2f044f98fad55cd2a63ef17050ebdd960810', 'tools/service-worker.template.js': 'fb57bd7b435aa6efc8ca2bbf97cf387f6cfa82d713522931a4e389f087c44d69', 'tests/service-worker-navigation.cjs': '46c70a9e8e9464614edbcb784d26b69af03cd253dcf14e307d3eca291005d1e0', 'tests/service-worker-navigation-browser.py': '0992e51ba12aa43f9e4e819541f75c1249c35f1a7c1f378f41f6f217fb894032', 'website/repair/index.html': '48328cde60c809367d017d8eaca52e2aced2f04b31ea3912324d563a6d90f6c2', 'docs/PASS_08_NAVIGATION_INTEGRATION.md': '8db027b4ce4fa1db1ea6e700dabe73a7bdea525e2af6239d94fa89ca15b4c541'}
for filename,digest in expected.items():
    actual=hashlib.sha256((root/filename).read_bytes()).hexdigest()
    if actual!=digest: raise RuntimeError("Candidate mismatch: "+filename+" "+actual)
