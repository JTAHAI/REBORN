"""Build 020 graphics interruption acceptance in real Chromium.

The WEBGL_lose_context extension is attempted on fresh pages because software
renderers may decline to deliver the native event. A synthetic canvas event then
exercises the exact production listener/rebuild path deterministically. The report
records which path was actually observed; neither path is silently mislabeled.
"""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import os,threading,tempfile,json
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
root=Path(__file__).resolve().parent.parent;site=root/'site-dist';out=Path(os.environ.get('REBORN_EVIDENCE',tempfile.mkdtemp(prefix='reborn-graphics-')));out.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(site),**k)
 def log_message(self,*a):pass
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/play/'
report={'checks':[],'physicalDevice':False,'nativeContextLossObserved':False,'nativeContextRestored':False,'syntheticProductionCycle':False}
def ok(x):report['checks'].append(x);print('PASS graphics browser: '+x,flush=True)
def open_drive(browser):
 c=browser.new_context(viewport={'width':1100,'height':720});c.add_init_script("localStorage.setItem('995.reborn.save.v1',JSON.stringify({version:1,settings:{quality:'low',sound:false,tutorialSeen:true}}))")
 page=c.new_page();page.set_default_timeout(90000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url);page.wait_for_function("window.REBORN?.version==='0.17.0-recovery-integrity-p020'")
 if page.locator('#buttercup-continue').is_visible():page.locator('#buttercup-continue').click()
 page.locator('#drive').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
 return c,page,errors
def assert_frozen(page):
 paused=page.evaluate('REBORN.snapshot()');page.wait_for_timeout(400);still=page.evaluate('REBORN.snapshot()');assert abs(still['time']-paused['time'])<.02,(paused['time'],still['time'])
def synthetic_cycle(page,errors):
 before=page.evaluate('REBORN.snapshot()')
 page.evaluate("document.getElementById('world').dispatchEvent(new Event('webglcontextlost',{cancelable:true}))")
 page.wait_for_function("REBORN.snapshot().graphics.contextLost===true && REBORN.snapshot().appState==='pause'");assert_frozen(page)
 page.evaluate("document.getElementById('world').dispatchEvent(new Event('webglcontextrestored'))")
 page.wait_for_function("REBORN.snapshot().graphics.contextLost===false && !REBORN.snapshot().graphics.contextRecoveryPending && REBORN.snapshot().graphics.contextRecoveries>=1",timeout=30000)
 restored=page.evaluate('REBORN.snapshot()');assert restored['graphics']['contextEpoch']>before['graphics']['contextEpoch'];assert restored['appState']=='pause';assert not errors,errors
 report['syntheticProductionCycle']=True;ok('production canvas listeners rebuild resources and keep the drive paused after a verified frame')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM') or None,headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  selected=None
  for attempt in range(3):
   c,page,errors=open_drive(browser)
   available=page.evaluate("()=>{const gl=document.getElementById('world').getContext('webgl2');window.__rebornLose=gl?.getExtension('WEBGL_lose_context');return !!window.__rebornLose}")
   if not available:c.close();continue
   page.evaluate("window.__rebornLose.loseContext()")
   try:page.wait_for_function("REBORN.snapshot().graphics.contextLost===true",timeout=8000)
   except PlaywrightTimeout:c.close();continue
   report['nativeContextLossObserved']=True;selected=(c,page,errors);break
  if selected:
   c,page,errors=selected;page.wait_for_function("REBORN.snapshot().appState==='pause'");assert_frozen(page);ok('native WEBGL_lose_context pauses the active drive and freezes its clock')
   page.evaluate("window.__rebornLose.restoreContext()")
   try:
    page.wait_for_function("REBORN.snapshot().graphics.contextLost===false && !REBORN.snapshot().graphics.contextRecoveryPending && REBORN.snapshot().graphics.contextRecoveries>=1",timeout=20000)
    report['nativeContextRestored']=True;assert page.evaluate("REBORN.snapshot().appState==='pause'");assert not errors,errors;ok('native context restoration reaches a successfully rendered paused frame')
   except PlaywrightTimeout:
    page.wait_for_function("!document.getElementById('fatal').hidden",timeout=16000)
    assert page.locator('#graphics-recovery-actions').is_visible();ok('native restoration timeout fails closed with local export and restart controls')
   c.close()
  else:ok('native context-loss delivery was unavailable after three fresh SwiftShader contexts and was recorded as unavailable')
  # Deterministic production listener/rebuild path, independent of extension flakiness.
  c,page,errors=open_drive(browser);synthetic_cycle(page,errors)
  page.locator('#resume').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  page.keyboard.down('ArrowUp')
  try:page.wait_for_function("REBORN.snapshot().car.speed>0",timeout=30000)
  finally:page.keyboard.up('ArrowUp')
  assert page.evaluate('REBORN.snapshot().errors')==[];ok('the same drive resumes manually after graphics verification')
  # A replay interruption uses the same production listener and remains paused.
  page.keyboard.down('ArrowUp')
  try:page.wait_for_function("REBORN.snapshot().memories.state.draft && REBORN.snapshot().memories.state.draft.duration>=3.2",timeout=60000)
  finally:page.keyboard.up('ArrowUp')
  page.keyboard.press('Escape');page.locator('#garage').click();page.wait_for_function("REBORN.snapshot().appState==='menu'")
  page.locator('#journey-open').click();page.locator('#ux-tab-memories').click();page.locator('[data-memory-action="replay"]').click();page.wait_for_function("REBORN.snapshot().appState==='replay'")
  page.locator('#memory-replay-toggle').click();page.wait_for_function("REBORN.snapshot().memories.replay.paused===false")
  page.evaluate("document.getElementById('world').dispatchEvent(new Event('webglcontextlost',{cancelable:true}))")
  page.wait_for_function("REBORN.snapshot().graphics.contextLost===true && REBORN.snapshot().memories.replay.paused===true");t=page.evaluate('REBORN.snapshot().memories.replay.time');page.wait_for_timeout(400);assert abs(page.evaluate('REBORN.snapshot().memories.replay.time')-t)<.02
  page.evaluate("document.getElementById('world').dispatchEvent(new Event('webglcontextrestored'))")
  page.wait_for_function("REBORN.snapshot().graphics.contextLost===false && !REBORN.snapshot().graphics.contextRecoveryPending && REBORN.snapshot().graphics.contextRecoveries>=2",timeout=30000)
  assert page.evaluate("REBORN.snapshot().appState==='replay' && REBORN.snapshot().memories.replay.paused===true");ok('playing replay pauses on interruption and stays paused after resource verification')
  page.screenshot(path=str(out/'graphics-recovery.png'));assert not errors,errors;c.close();browser.close();report['result']='passed'
except Exception as error:
 report['result']='failed';report['error']=str(error)
 try:page.screenshot(path=str(out/'graphics-failure.png'));report['snapshot']=page.evaluate('window.REBORN?.snapshot()');report['pageErrors']=errors
 except Exception:pass
 raise
finally:
 (out/'graphics-recovery.json').write_text(json.dumps(report,indent=2));server.shutdown()
