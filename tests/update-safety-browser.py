"""Exercise real service-worker replacement with active and idle tabs.
Two complete staged versions share one local origin. No production requests.
"""
import json, os, shutil, tempfile, threading
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
out=Path(os.environ.get('REBORN_SCREENSHOTS',tempfile.mkdtemp(prefix='reborn-updates-')));out.mkdir(parents=True,exist_ok=True)
stage=tempfile.TemporaryDirectory(prefix='reborn-new-install-');new=Path(stage.name)
shutil.copytree(root/'site-dist',new,dirs_exist_ok=True)
sw=new/'play/sw.js';sw.write_text(sw.read_text().replace("const CACHE=PREFIX+", "const CACHE=PREFIX+'replacement-test-'+"))
r=new/'play/release.json';data=json.loads(r.read_text());data['testInstallation']='replacement';r.write_text(json.dumps(data))
phase={'root':root/'site-dist'}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(phase['root']),**kw)
 def log_message(self,*a):pass
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/play/'
checks=[];errors=[]
def log(s):checks.append(s);print('PASS update safety: '+s,flush=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  ctx=browser.new_context(viewport={'width':1000,'height':650})
  ctx.add_init_script("if(!localStorage.getItem('995.reborn.save.v1'))localStorage.setItem('995.reborn.save.v1',JSON.stringify({version:1,vehicle:{fuel:58,odometerMiles:246},settings:{quality:'low',sound:false,tutorialSeen:true,recordMemories:false}}))")
  page=ctx.new_page();page.set_default_timeout(45000);page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url);page.wait_for_function('!!window.REBORN && REBORN.snapshot().release.mapReady');page.locator('#buttercup-continue').click()
  page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('!!navigator.serviceWorker.controller')
  page.locator('#drive').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  page.evaluate("window.updateCanary='original-page'")
  phase['root']=new
  # Calling the browser's actual update API simulates its periodic update check,
  # not a private game function and not a replacement of the worker itself.
  page.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())')
  page.wait_for_function('navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)',timeout=60000)
  page.wait_for_timeout(1000)
  assert page.evaluate('window.updateCanary')=='original-page'
  assert page.evaluate("REBORN.snapshot().appState")=='play'
  assert page.locator('#release-update button').is_disabled()
  oldFuel=page.evaluate('REBORN.snapshot().livingCar.vehicle.fuel')
  log('a fully downloaded replacement waits without reloading an active drive')
  page.keyboard.press('Escape');page.wait_for_function('REBORN.snapshot().release.safeToUpdate')
  page.locator('#release-update').wait_for(state='visible');assert page.locator('#release-update button').is_enabled()
  other=ctx.new_page();other.set_default_timeout(45000);other.on('pageerror',lambda e:errors.append(str(e)));other.goto(url)
  other.wait_for_function('!!window.REBORN && REBORN.snapshot().release.mapReady')
  if other.locator('#buttercup-dedication').is_visible():other.locator('#buttercup-continue').click()
  other.locator('#drive').click();other.wait_for_function("REBORN.snapshot().appState==='play'")
  page.locator('#release-update button').click()
  page.wait_for_function("document.querySelector('#release-update p').textContent.includes('Another game tab')")
  assert page.evaluate('navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)')
  assert page.evaluate('window.updateCanary')=='original-page'
  log('a second active game tab blocks replacement even after consent in a paused tab')
  # A non-game page cannot pretend to have saved successfully. An unresponsive
  # scope client is conservatively busy; closing the active tab resolves this.
  other.close()
  page.locator('#release-update button').click()
  page.wait_for_function("window.updateCanary===undefined && !!window.REBORN",timeout=60000)
  page.wait_for_function("fetch('./release.json').then(r=>r.json()).then(r=>r.testInstallation==='replacement')")
  assert page.evaluate('REBORN.snapshot().appState')=='menu'
  vehicle=page.evaluate('REBORN.snapshot().livingCar.vehicle')
  assert abs(vehicle['odometerMiles']-246)<.1
  assert abs(vehicle['fuel']-oldFuel)<.1
  assert not page.evaluate('navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)')
  assert not errors,errors
  page.screenshot(path=str(out/'safe-update-complete.png'))
  log('explicit idle update activates the complete new cache and retains the saved car')
  ctx.set_offline(True);page.reload();page.wait_for_function('!!window.REBORN')
  assert page.evaluate("fetch('./release.json').then(r=>r.json()).then(r=>r.testInstallation)")=='replacement'
  log('the replacement still loads offline as one complete installation')
  ctx.close();browser.close()
 print(json.dumps({'checks':checks,'errors':errors,'scope':'local two-version service-worker fixture, not production'}),flush=True)
except Exception:
 try:
  print('FAILURE',page.evaluate("({state:window.REBORN?.snapshot?.().appState,text:document.getElementById('release-update')?.textContent,hidden:document.getElementById('release-update')?.hidden,canary:window.updateCanary})"),flush=True)
  page.screenshot(path=str(out/'update-failure.png'))
 except Exception:pass
 raise
finally:
 server.shutdown();stage.cleanup()
