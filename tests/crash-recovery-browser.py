"""Build 020 interrupted-session checkpoint and explicit restore acceptance."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import os,threading,tempfile,json,time,signal
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;site=root/'site-dist';out=Path(os.environ.get('REBORN_EVIDENCE',tempfile.mkdtemp(prefix='reborn-recovery-')));out.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(site),**k)
 def log_message(self,*a):pass
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/play/'
report={'checks':[],'physicalDevice':False,'actualPageCrash':False}
def ok(x):report['checks'].append(x);print('PASS recovery browser: '+x,flush=True)
def ready(page):
 page.wait_for_function("window.REBORN?.version==='0.17.0-recovery-integrity-p020' && REBORN.snapshot().release.mapReady")
 if page.locator('#buttercup-continue').is_visible():page.locator('#buttercup-continue').click()
try:
 with sync_playwright() as p:
  # A single renderer makes the later OS-level crash deterministic without
  # weakening the production page or routing the test through an app hook.
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM') or None,headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--renderer-process-limit=1'])
  browser_cdp=browser.new_browser_cdp_session()
  ctx=browser.new_context(viewport={'width':1100,'height':720},accept_downloads=True);ctx.add_init_script("if(!localStorage.getItem('995.reborn.save.v1'))localStorage.setItem('995.reborn.save.v1',JSON.stringify({version:1,vehicle:{odometerMiles:995,fuel:70},settings:{quality:'low',sound:false,tutorialSeen:true}}))")
  page=ctx.new_page();page.set_default_timeout(90000);page.goto(url);ready(page);page.locator('#drive').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  stored_at_start=page.evaluate("JSON.parse(localStorage.getItem('995.reborn.save.v1')).vehicle.odometerMiles")
  page.keyboard.down('ArrowUp')
  try:
   page.wait_for_function("REBORN.snapshot().recovery.current?.reason==='heartbeat' && REBORN.snapshot().recovery.current.runtime.odometer>"+str(stored_at_start),timeout=30000)
  finally:page.keyboard.up('ArrowUp')
  automatic=page.evaluate('REBORN.snapshot().recovery.current');assert automatic['runtime']['odometer']>stored_at_start;ok('active drive writes its automatic bounded heartbeat checkpoint')
  # Deliberately observe one normal main save first. That resets the eight-
  # second persistence clock. We can then create a short unsaved delta, pause,
  # and use the production CHECKPOINT NOW action without racing another save.
  page.keyboard.down('ArrowUp')
  try:page.wait_for_function("JSON.parse(localStorage.getItem('995.reborn.save.v1')).vehicle.odometerMiles>"+str(stored_at_start),timeout=30000)
  finally:page.keyboard.up('ArrowUp')
  page.locator('#pause-button').click();page.wait_for_function("REBORN.snapshot().appState==='pause'")
  stored_before_crash=page.evaluate("JSON.parse(localStorage.getItem('995.reborn.save.v1')).vehicle.odometerMiles")
  page.locator('#resume').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  page.keyboard.down('ArrowUp')
  try:page.wait_for_function("REBORN.snapshot().livingCar.vehicle.odometerMiles>"+str(stored_before_crash+0.00001),timeout=5000)
  finally:page.keyboard.up('ArrowUp')
  page.locator('#pause-button').click();page.wait_for_function("REBORN.snapshot().appState==='pause'")
  page.locator('#crash-recovery-checkpoint').click()
  page.wait_for_function("""()=>{const c=REBORN.snapshot().recovery.current;if(!c||c.reason!=='manual')return false;const key=Object.keys(localStorage).find(k=>k==='995.reborn.emergency.v1.'+c.id);if(!key)return false;const record=JSON.parse(localStorage.getItem(key)),stored=JSON.parse(localStorage.getItem('995.reborn.save.v1'));return record.backup.save.vehicle.odometerMiles>stored.vehicle.odometerMiles+1e-7}""")
  checkpoint=page.evaluate('REBORN.snapshot().recovery.current');assert checkpoint['runtime']['odometer']>stored_before_crash;ok('manual production checkpoint preserves a deterministic unsaved delta for crash acceptance')
  # Crash the actual renderer process rather than allowing pagehide to clean
  # the record. SystemInfo reports operating-system process IDs. With a single
  # renderer configured for this isolated context, killing it produces the
  # native Playwright crash event without blocking the command channel.
  renderers=[int(item['id']) for item in browser_cdp.send('SystemInfo.getProcessInfo')['processInfo'] if item.get('type')=='renderer']
  if not renderers:raise RuntimeError('Chromium did not expose a renderer process for the game page')
  renderer=renderers[0]
  page.locator('#resume').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  with page.expect_event('crash',timeout=15000):os.kill(renderer,signal.SIGKILL)
  report['actualPageCrash']=True
  # Keep the crashed Page object untouched. Closing it can itself block on a dead
  # renderer; the browser context is closed once the replacement page is done.
  fresh=ctx.new_page();fresh.set_default_timeout(90000);fresh.goto(url);ready(fresh)
  fresh.wait_for_function("REBORN.snapshot().recovery.candidates>=1 && !document.getElementById('crash-recovery-banner').hidden")
  candidate=fresh.evaluate('REBORN.snapshot().recovery.candidate');assert candidate['runtime']['odometer']>=checkpoint['runtime']['odometer'];assert fresh.evaluate("JSON.parse(localStorage.getItem('995.reborn.save.v1')).vehicle.odometerMiles")==stored_before_crash
  ok('a real crashed page leaves stored progress untouched and exposes an explicit recovery candidate')
  with fresh.expect_download() as download_info:fresh.locator('#crash-recovery-download').click()
  download=download_info.value;path=out/'interrupted-session.json';download.save_as(path);backup=json.loads(path.read_text());assert backup['format']=='REBORN_BACKUP_V1';assert backup['save']['vehicle']['odometerMiles']>=checkpoint['runtime']['odometer'];ok('interrupted session exports as a normal reviewed REBORN backup')
  fresh.once('dialog',lambda d:d.accept());fresh.locator('#crash-recovery-restore').click();fresh.wait_for_function("window.REBORN?.snapshot().livingCar.vehicle.odometerMiles>"+str(stored_before_crash),timeout=90000)
  assert fresh.evaluate('REBORN.snapshot().recovery.candidates')==0;assert fresh.evaluate("!!localStorage.getItem('995.reborn.before-restore.v1')");ok('explicit restore preserves a pre-restore copy, reloads to the garage and removes the consumed checkpoint')
  # A deliberately newer stored pair blocks an old emergency checkpoint from overwriting it.
  fresh.locator('#drive').click();fresh.wait_for_function("REBORN.snapshot().appState==='play'");fresh.locator('#pause-button').click();fresh.wait_for_function("REBORN.snapshot().appState==='pause'");fresh.locator('#crash-recovery-checkpoint').click();fresh.wait_for_function("REBORN.snapshot().recovery.current && REBORN.snapshot().recovery.current.reason==='manual'")
  fresh.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('995.reborn.save.v1'));s.vehicle.odometerMiles+=100;localStorage.setItem('995.reborn.save.v1',JSON.stringify(s));})()")
  fresh.reload();ready(fresh);fresh.wait_for_function("REBORN.snapshot().recovery.candidates>=1")
  assert fresh.locator('#crash-recovery-restore').is_disabled();assert 'changed' in fresh.locator('#crash-recovery-message').inner_text().lower();ok('a newer stored pair disables old-checkpoint restore instead of clobbering progress')
  fresh.screenshot(path=str(out/'interrupted-session-banner.png'));assert fresh.evaluate('REBORN.snapshot().errors')==[];ctx.close();browser.close();report['result']='passed'
except Exception as error:
 report['result']='failed';report['error']=str(error)
 try:
  report['snapshot']=fresh.evaluate('window.REBORN?.snapshot()');report['storage']=fresh.evaluate("()=>({save:localStorage.getItem('995.reborn.save.v1'),emergency:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('995.reborn.emergency.v1.')).map(k=>[k,localStorage.getItem(k)]))})");fresh.screenshot(path=str(out/'recovery-failure.png'))
 except Exception:pass
 raise
finally:
 (out/'crash-recovery.json').write_text(json.dumps(report,indent=2));server.shutdown()
