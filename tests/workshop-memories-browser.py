"""Real UI acceptance for the optional driveway recollection. No repair fixture completes it."""
import json, os, threading, tempfile
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('REBORN_SCREENSHOTS',tempfile.mkdtemp(prefix='reborn-driveway-')));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'site-dist'),**kwargs)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/play/'
errors=[];checks=[]
def log(s):checks.append(s);print('PASS Workshop UX: '+s,flush=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  ctx=browser.new_context(viewport={'width':1366,'height':900})
  seed={'version':1,'settings':{'quality':'low','sound':False,'tutorialSeen':True},'vehicle':{'fuel':47,'odometerMiles':995,'faults':{'charging':{'active':True,'severity':.4}}}}
  ctx.add_init_script("if(!localStorage.getItem('995.reborn.save.v1'))localStorage.setItem('995.reborn.save.v1',"+json.dumps(json.dumps(seed))+')')
  page=ctx.new_page();page.set_default_timeout(60000);page.on('pageerror',lambda e:errors.append(str(e)))
  def ready(pg):
   pg.wait_for_function('window.REBORN && window.REBORN.snapshot')
   if pg.locator('#buttercup-continue').is_visible():pg.locator('#buttercup-continue').click()
   pg.locator('#journey-open').click();pg.locator('#ux-tab-workshop').click()
  def protected(pg):
   return pg.evaluate('(()=>{const s=REBORN.snapshot();return {vehicle:s.livingCar.vehicle,time:s.time,town:s.town,weather:s.weather,echoes:s.echoes,passengers:s.passengers}})()')
  page.goto(url);ready(page)
  assert page.locator('#journey-title').inner_text()=='Built by hand. Kept with care.'
  before=protected(page)
  page.locator('[data-driveway-action="begin"]').click()
  assert 'red AEM' in page.locator('#driveway-text').inner_text()
  assert 'underneath the engine' in page.locator('#driveway-text').inner_text()
  page.locator('[data-driveway-action="optimist"]').click()
  assert 'first mount' in page.locator('#driveway-title').inner_text().lower()
  assert 'fucking' not in page.locator('#driveway-quote').inner_text()
  page.locator('.driveway-options summary').click();page.locator('#driveway-language').check()
  assert 'fucking' in page.locator('#driveway-quote').inner_text()
  page.screenshot(path=str(OUT/'driveway-sailor-memory.png'))
  page.locator('[data-driveway-action="sailor"]').click()
  assert 'cold air' in page.locator('#driveway-quote').inner_text()
  page.locator('[data-driveway-action="keep"]').click()
  after=protected(page);assert before==after,'Workshop memory must not alter the live car, town, or clocks'
  assert json.loads(page.evaluate("localStorage.getItem('995.reborn.save.v1')"))['workshopMemories']['completed'] is True
  log('full memory uses real choices, optional sailor language, no timer, and no mechanical or town effects')
  page.locator('[data-driveway-action="begin"]').click();page.locator('[data-driveway-action="close"]').click()
  assert page.locator('[data-driveway-action="begin"]').is_visible()
  page.locator('[data-driveway-action="begin"]').click();page.locator('[data-driveway-action="skip"]').click()
  assert 'cold air' in page.locator('#driveway-quote').inner_text()
  assert before==protected(page)
  log('close and skip remain immediate, no missed reward or repair penalty')
  page.locator('[data-driveway-action="close"]').click()
  page.locator('[data-diagnostic="charging"]').click()
  assert 'stern talking-to' in page.locator('#driveway-aside').inner_text()
  page.locator('[data-repair="charging"][data-strategy="rebuild"]').click()
  assert 'peace treaty' in page.locator('#driveway-aside').inner_text()
  assert page.evaluate('REBORN.snapshot().livingCar.vehicle.faults.charging.active') is False
  log('real charging diagnosis and rebuild keep their normal results and gain quiet story callbacks')
  page.reload();ready(page)
  assert page.locator('#driveway-language').is_checked();assert 'MEMORY WORTH KEEPING' in page.locator('#driveway-step').inner_text()
  page.locator('.driveway-options summary').click();page.locator('#driveway-asides').uncheck();page.reload();ready(page);assert not page.locator('#driveway-asides').is_checked()
  log('memory completion and independent language/asides preferences survive reload')
  page.locator('#ux-tab-stories').click();assert page.locator('#journey-title').inner_text()=='Someone needs a ride.'
  page.locator('#ux-tab-memories').click();assert page.locator('#journey-title').inner_text()=='Your drives, kept.'
  assert page.locator('#memory-recording-status').inner_text()
  log('hub headings follow the selected task and recording policy has an explicit status')
  assert not errors,errors;ctx.close()
  for w,h in [(844,390),(640,360),(390,844)]:
   mobile=browser.new_context(viewport={'width':w,'height':h},has_touch=True,is_mobile=True,device_scale_factor=1)
   mobile.add_init_script("localStorage.setItem('995.reborn.save.v1',"+json.dumps(json.dumps(seed))+')')
   page=mobile.new_page();page.set_default_timeout(60000);page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(url);ready(page)
   page.locator('[data-driveway-action="begin"]').tap()
   sizes=page.locator('#driveway-actions button').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())')
   assert all(x['height']>=44 and x['left']>=0 and x['right']<=w for x in sizes),sizes
   page.locator('[data-driveway-action="toolbox"]').tap();page.locator('[data-driveway-action="negotiate"]').tap();page.locator('[data-driveway-action="keep"]').tap()
   page.locator('#driveway-actions').scroll_into_view_if_needed()
   if w==844:page.screenshot(path=str(OUT/'driveway-touch-workshop.png'))
   mobile.close();log(f'{w}×{h}: tap-only story completes with 44px-plus buttons, no horizontal clipping')
  browser.close()
 print(json.dumps({'workshopChecks':checks,'errors':errors,'physicalPhone':'not tested'}),flush=True)
 assert not errors,errors
except Exception:
 try:page.screenshot(path=str(OUT/'driveway-failure.png'))
 except Exception:pass
 raise
finally:server.shutdown()
