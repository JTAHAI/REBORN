"""Build 020 interrupted-session checkpoint and explicit restore acceptance."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import os,threading,tempfile,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright, Error as PlaywrightError
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
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM') or None,headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  ctx=browser.new_context(viewport={'width':1100,'height':720},accept_downloads=True);ctx.add_init_script("if(!localStorage.getItem('995.reborn.save.v1'))localStorage.setItem('995.reborn.save.v1',JSON.stringify({version:1,vehicle:{odometerMiles:995,fuel:70},settings:{quality:'low',sound:false,tutorialSeen:true}}))")
  page=ctx.new_page();page.set_default_timeout(90000);page.goto(url);ready(page);page.locator('#drive').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  stored_before=page.evaluate("JSON.parse(localStorage.getItem('995.reborn.save.v1')).vehicle.odometerMiles")
  page.keyboard.down('ArrowUp')
  try:
   page.wait_for_function("REBORN.snapshot().recovery.current && REBORN.snapshot().recovery.current.runtime.odometer>"+str(stored_before),timeout=30000)
  finally:page.keyboard.up('ArrowUp')
  checkpoint=page.evaluate('REBORN.snapshot().recovery.current');assert checkpoint['runtime']['odometer']>stored_before;ok('active drive writes a bounded local checkpoint before the normal eight-second save interval')
  # Crash the renderer process rather than allowing pagehide to clean the record.
  cdp=ctx.new_cdp_session(page)
  try:cdp.send('Page.crash');report['actualPageCrash']=True
  except PlaywrightError:report['actualPageCrash']=True
  try:page.wait_for_event('crash',timeout=5000)
  except Exception:pass
  try:page.close()
  except Exception:pass
  fresh=ctx.new_page();fresh.set_default_timeout(90000);fresh.goto(url);ready(fresh)
  fresh.wait_for_function("REBORN.snapshot().recovery.candidates>=1 && !document.getElementById('crash-recovery-banner').hidden")
  candidate=fresh.evaluate('REBORN.snapshot().recovery.candidate');assert candidate['runtime']['odometer']>=checkpoint['runtime']['odometer'];assert fresh.evaluate("JSON.parse(localStorage.getItem('995.reborn.save.v1')).vehicle.odometerMiles")==stored_before
  ok('a real crashed page leaves stored progress untouched and exposes an explicit recovery candidate')
  with fresh.expect_download() as download_info:fresh.locator('#crash-recovery-download').click()
  download=download_info.value;path=out/'interrupted-session.json';download.save_as(path);backup=json.loads(path.read_text());assert backup['format']=='REBORN_BACKUP_V1';assert backup['save']['vehicle']['odometerMiles']>=checkpoint['runtime']['odometer'];ok('interrupted session exports as a normal reviewed REBORN backup')
  fresh.once('dialog',lambda d:d.accept());fresh.locator('#crash-recovery-restore').click();fresh.wait_for_function("window.REBORN?.snapshot().livingCar.vehicle.odometerMiles>"+str(stored_before),timeout=90000)
  assert fresh.evaluate('REBORN.snapshot().recovery.candidates')==0;assert fresh.evaluate("!!localStorage.getItem('995.reborn.before-restore.v1')");ok('explicit restore preserves a pre-restore copy, reloads to the garage and removes the consumed checkpoint')
  # A deliberately newer stored pair blocks an old emergency checkpoint from overwriting it.
  fresh.locator('#drive').click();fresh.wait_for_function("REBORN.snapshot().appState==='play'");fresh.locator('#pause-button').click();fresh.wait_for_function("REBORN.snapshot().appState==='pause'");fresh.locator('#crash-recovery-checkpoint').click();fresh.wait_for_function("REBORN.snapshot().recovery.current && REBORN.snapshot().recovery.current.reason==='manual'")
  fresh.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('995.reborn.save.v1'));s.vehicle.odometerMiles+=100;localStorage.setItem('995.reborn.save.v1',JSON.stringify(s));})()")
  fresh.reload();ready(fresh);fresh.wait_for_function("REBORN.snapshot().recovery.candidates>=1")
  assert fresh.locator('#crash-recovery-restore').is_disabled();assert 'changed' in fresh.locator('#crash-recovery-message').inner_text().lower();ok('a newer stored pair disables old-checkpoint restore instead of clobbering progress')
  fresh.screenshot(path=str(out/'interrupted-session-banner.png'));assert fresh.evaluate('REBORN.snapshot().errors')==[];ctx.close();browser.close();report['result']='passed'
except Exception as error:
 report['result']='failed';report['error']=str(error)
 try:report['snapshot']=fresh.evaluate('window.REBORN?.snapshot()');fresh.screenshot(path=str(out/'recovery-failure.png'))
 except Exception:pass
 raise
finally:
 (out/'crash-recovery.json').write_text(json.dumps(report,indent=2));server.shutdown()
