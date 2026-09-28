from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import os,threading,tempfile,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;site=root/'site-dist';out=Path(os.environ.get('REBORN_EVIDENCE',tempfile.mkdtemp(prefix='reborn-graphics-')));out.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(site),**k)
 def log_message(self,*a):pass
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/play/'
report={'checks':[],'physicalDevice':False}
def ok(x):report['checks'].append(x);print('PASS graphics browser: '+x,flush=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM') or None,headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  c=browser.new_context(viewport={'width':1100,'height':720});page=c.new_page();page.set_default_timeout(90000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url);page.wait_for_function("window.REBORN?.version==='0.16.0-graphics-recovery-p019'")
  if page.locator('#buttercup-continue').is_visible():page.locator('#buttercup-continue').click()
  page.locator('#drive').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  ext=page.evaluate("document.getElementById('world').getContext('webgl2')?.getExtension('WEBGL_lose_context')!==null")
  if not ext:raise RuntimeError('WEBGL_lose_context unavailable in acceptance browser')
  before=page.evaluate('REBORN.snapshot()');page.evaluate("document.getElementById('world').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()")
  page.wait_for_function("REBORN.snapshot().graphics.contextLost===true && REBORN.snapshot().appState==='pause'")
  paused=page.evaluate('REBORN.snapshot()');page.wait_for_timeout(400);still=page.evaluate('REBORN.snapshot()');assert abs(still['time']-paused['time'])<.02
  ok('active drive pauses and simulation clock freezes on real WebGL context loss')
  page.evaluate("document.getElementById('world').getContext('webgl2').getExtension('WEBGL_lose_context').restoreContext()")
  page.wait_for_function("REBORN.snapshot().graphics.contextLost===false && REBORN.snapshot().graphics.contextRecoveries>=1")
  restored=page.evaluate('REBORN.snapshot()');assert restored['appState']=='pause' and restored['graphics']['contextEpoch']>before['graphics']['contextEpoch'] and not errors
  page.locator('#resume').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  page.keyboard.down('ArrowUp')
  try:page.wait_for_function("REBORN.snapshot().car.speed>0",timeout=30000)
  finally:page.keyboard.up('ArrowUp')
  ok('resource generation rebuilds and the same drive resumes manually without page errors')
  # Record a bounded memory and enter replay through production UI.
  page.keyboard.down('ArrowUp')
  try:page.wait_for_function("REBORN.snapshot().memories.state.draft && REBORN.snapshot().memories.state.draft.duration>=3.2",timeout=60000)
  finally:page.keyboard.up('ArrowUp')
  page.keyboard.press('Escape');page.locator('#garage').click();page.wait_for_function("REBORN.snapshot().appState==='menu'")
  page.locator('#journey-open').click();page.locator('#ux-tab-memories').click();page.locator('[data-memory-action="replay"]').click();page.wait_for_function("REBORN.snapshot().appState==='replay'")
  page.locator('#memory-replay-toggle').click();page.wait_for_function("REBORN.snapshot().memories.replay.paused===false")
  page.evaluate("document.getElementById('world').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()")
  page.wait_for_function("REBORN.snapshot().graphics.contextLost===true && REBORN.snapshot().memories.replay.paused===true")
  t=page.evaluate('REBORN.snapshot().memories.replay.time');page.wait_for_timeout(400);assert abs(page.evaluate('REBORN.snapshot().memories.replay.time')-t)<.02
  page.evaluate("document.getElementById('world').getContext('webgl2').getExtension('WEBGL_lose_context').restoreContext()")
  page.wait_for_function("REBORN.snapshot().graphics.contextLost===false && REBORN.snapshot().graphics.contextRecoveries>=2")
  assert page.evaluate("REBORN.snapshot().appState==='replay' && REBORN.snapshot().memories.replay.paused===true")
  ok('playing replay pauses on context loss and stays paused after recovery')
  page.screenshot(path=str(out/'graphics-recovery.png'));assert not errors,errors;c.close();browser.close();report['result']='passed'
finally:
 (out/'graphics-recovery.json').write_text(json.dumps(report,indent=2));server.shutdown()
