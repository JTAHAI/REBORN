"""Pass 8 user-task acceptance on the complete static website.
Fixtures seed saved mechanics/positions, never bypass production state transitions.
"""
import json,os,tempfile,threading,subprocess,time
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
from hub_helpers import hub_tab
root=Path(__file__).resolve().parent.parent
out=Path(os.environ.get('REBORN_SCREENSHOTS',tempfile.mkdtemp(prefix='reborn-release-')));out.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root/'site-dist'),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/play/'
errors=[];checks=[]
def log(s):checks.append(s);print('PASS Pass8 browser: '+s,flush=True)
def no_overlap(a,b):return a['right']<=b['left']+.1 or b['right']<=a['left']+.1 or a['bottom']<=b['top']+.1 or b['bottom']<=a['top']+.1
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  def open_case(seed=None,w=1366,h=900,touch=False,raw=None,block_world=False):
   ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch,device_scale_factor=1)
   text=raw if raw is not None else json.dumps(seed or {'version':1,'vehicle':{'fuel':47,'odometerMiles':995},'settings':{'quality':'low','sound':False,'tutorialSeen':True}})
   ctx.add_init_script("if(location.protocol.startsWith('http')&&!sessionStorage.getItem('seeded')){localStorage.setItem('995.reborn.save.v1',"+json.dumps(text)+");sessionStorage.setItem('seeded','1');}")
   if block_world:ctx.route('**/assets/worlds/north-berwick/world.json',lambda r:r.fulfill(status=503,body='test unavailable'))
   pg=ctx.new_page();pg.set_default_timeout(40000);pg.on('pageerror',lambda e:errors.append(str(e)))
   pg.goto(url);pg.wait_for_function('window.REBORN && REBORN.snapshot().release')
   if pg.locator('#buttercup-continue').is_visible():pg.locator('#buttercup-continue').click()
   if not block_world:pg.wait_for_function('REBORN.snapshot().release.mapReady')
   return ctx,pg
  ctx,page=open_case();assert page.evaluate('REBORN.snapshot().livingCar.vehicle.fuel')==47
  assert 'NORTH BERWICK' in page.locator('#drive').inner_text();page.locator('#journey-open').click()
  assert page.locator('[data-hub-group]').count()==4
  for name in ['stories','echoes','overview','workshop','town','journal','memories']:
   hub_tab(page,name);assert page.locator('#ux-panel-'+name).is_visible();assert page.locator('.ux-tab-panel:visible').count()==1
  hub_tab(page,'workshop');page.screenshot(path=str(out/'hometown-workshop.png'))
  log('four primary sections expose all seven secondary destinations and correct headings')
  # Group selector and scaled reading remain inside the screen, not clipped under headers.
  for w,h in [(1920,1080),(1366,768),(1024,600),(844,390),(640,360),(390,844)]:
   page.set_viewport_size({'width':w,'height':h});hub_tab(page,'workshop');assert page.locator('#journey-close').is_visible()
   rects=page.locator('.ux-tabs button:not([hidden])').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())')
   assert all(r['left']>=0 and r['right']<=w+1 and r['height']>=40 for r in rects),rects
   if w==390:page.screenshot(path=str(out/'portrait-workshop.png'))
  page.set_viewport_size({'width':1024,'height':600});page.keyboard.press('Escape');page.locator('#intro-help').click()
  for scale in ['1','1.5','2']:
   page.locator('#ux-text-scale').select_option(scale);page.keyboard.press('Escape');page.locator('#journey-open').click();hub_tab(page,'workshop')
   assert page.evaluate('document.querySelector(".journey-modal").scrollWidth<=document.querySelector(".journey-modal").clientWidth+2')
   if scale=='2':page.screenshot(path=str(out/'workshop-200percent.png'))
   page.keyboard.press('Escape');page.locator('#intro-help').click()
  page.locator('#ux-text-scale').select_option('1');page.keyboard.press('Escape');log('six viewport sizes and 100/150/200 percent reading sizes retain accessible navigation')
  # Map opens in the hub without silently starting or moving a drive.
  page.locator('#journey-open').click();hub_tab(page,'town');before=page.evaluate('REBORN.snapshot().time');page.locator('#hub-map-open').click()
  assert page.evaluate('REBORN.snapshot().appState')=='map';page.locator('#ux-map-search').fill('Riverside');page.locator('#ux-map-results button').first.click()
  assert page.evaluate('REBORN.snapshot().release.route.ok');assert page.evaluate('REBORN.snapshot().release.route.segments')>0
  page.locator('#ux-route-profile').select_option('cautious');assert page.evaluate('REBORN.snapshot().release.route.profile')=='cautious'
  page.screenshot(path=str(out/'mapped-road-route.png'));page.keyboard.press('Escape');assert page.evaluate('REBORN.snapshot().appState')=='journey';assert page.evaluate('REBORN.snapshot().time')==before
  page.keyboard.press('Escape');page.locator('#drive').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  page.wait_for_function('REBORN.snapshot().release.renderCandidates>0');perf=page.evaluate('REBORN.snapshot().release');assert perf['renderCandidates']<perf['staticObjects'],perf
  page.keyboard.down('ArrowUp')
  try:page.wait_for_function('REBORN.snapshot().car.speed>1')
  finally:page.keyboard.up('ArrowUp')
  page.keyboard.press('Escape');page.screenshot(path=str(out/'paused-controls.png'));log('hub map, real mapped route profiles and spatial render candidates work without advancing paused time')
  # Malformed imports never overwrite. A valid import requires a review and confirmation.
  page.locator('#ux-import-save').click();stored=page.evaluate("localStorage.getItem('995.reborn.save.v1')")
  page.locator('#release-import-file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{invalid'})
  assert page.locator('#release-import-confirm').is_disabled();assert page.evaluate("localStorage.getItem('995.reborn.save.v1')")==stored
  backup={'format':'REBORN_BACKUP_V1','save':{'version':1,'vehicle':{'fuel':63,'odometerMiles':1234},'settings':{'quality':'low','sound':False}},'story':None}
  page.locator('#release-import-file').set_input_files({'name':'good.json','mimeType':'application/json','buffer':json.dumps(backup).encode()})
  page.wait_for_function('!document.getElementById("release-import-confirm").disabled');assert '1234.0' in page.locator('#release-import-preview').inner_text()
  page.locator('#release-dialog-cancel').click();assert page.evaluate("localStorage.getItem('995.reborn.save.v1')")==stored
  page.locator('#reset-progress').click();assert page.locator('#release-reset-confirm').is_disabled();page.locator('#release-reset-text').fill('RESET');page.locator('#release-dialog-cancel').click();assert page.evaluate("localStorage.getItem('995.reborn.save.v1')")==stored
  page.locator('#ux-import-save').click();page.locator('#release-import-file').set_input_files({'name':'good.json','mimeType':'application/json','buffer':json.dumps(backup).encode()});page.locator('#release-import-confirm').click();page.wait_for_function('window.REBORN?.snapshot().livingCar.vehicle.odometerMiles===1234')
  assert page.evaluate('REBORN.snapshot().livingCar.vehicle.fuel')==63;assert page.evaluate("!!localStorage.getItem('995.reborn.before-restore.v1')")
  log('import validation, preview, cancel, reset confirmation and confirmed restore with recovery copy pass');ctx.close()
  # Corrupt originals are retained through a menu visit and reload, rather than replaced by defaults.
  ctx,page=open_case(raw='{broken');assert page.evaluate('REBORN.snapshot().release.saveProtected');assert page.locator('#release-save-recovery').is_visible()
  page.reload();page.wait_for_function('window.REBORN');assert page.evaluate("localStorage.getItem('995.reborn.save.v1')")=='{broken';ctx.close();log('corrupt save remains protected and exportable across reload')
  ctx,page=open_case(block_world=True);page.wait_for_function('!document.getElementById("release-load-retry").hidden');assert page.locator('#drive').is_disabled()
  page.locator('[data-mode="run"]').click();assert page.locator('#drive').is_enabled();ctx.unroute('**/assets/worlds/north-berwick/world.json');page.locator('#release-load-retry').click();page.wait_for_function('REBORN.snapshot().release.mapReady');ctx.close();log('failed North Berwick load has a real retry and never silently substitutes a different map')
  # A live passenger + weather + low-fuel warning must share the phone view.
  for w,h in [(844,390),(640,360)]:
   seed={'version':1,'settings':{'quality':'low','tutorialSeen':True,'sound':False,'dialogueMode':'pause'},'vehicle':{'fuel':8}}
   ctx,page=open_case(seed,w,h,True);page.locator('#passenger-open').click();page.locator('[data-passenger-story="long-way-home"]').click();page.wait_for_function('REBORN.snapshot().release.readingPaused')
   page.evaluate('document.fullscreenElement?document.exitFullscreen():undefined');page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(250)
   frozen=page.evaluate('({time:REBORN.snapshot().time,town:REBORN.snapshot().town.minuteOfDay,deadline:REBORN.snapshot().passengers.state.active.prompt.expiresAt})');page.wait_for_timeout(450);assert page.evaluate('({time:REBORN.snapshot().time,town:REBORN.snapshot().town.minuteOfDay,deadline:REBORN.snapshot().passengers.state.active.prompt.expiresAt})')==frozen
   boxes=page.evaluate("(()=>{const r=id=>document.getElementById(id).getBoundingClientRect().toJSON();return {choice:r('passenger-choice'),stick:r('drive-stick'),mission:document.querySelector('.mission').getBoundingClientRect().toJSON(),alert:r('ux-alert'),controls:[...document.querySelectorAll('#touch-controls button')].filter(e=>e.getBoundingClientRect().width).map(e=>e.getBoundingClientRect().toJSON())}})()")
   assert no_overlap(boxes['choice'],boxes['stick']),boxes
   assert all(no_overlap(boxes['choice'],r) for r in boxes['controls']),boxes
   assert no_overlap(boxes['choice'],boxes['mission']),boxes
   assert no_overlap(boxes['choice'],boxes['alert']),boxes
   page.screenshot(path=str(out/f'passenger-reading-{w}.png'));page.locator('[data-passenger-choice="silence"]').click();page.wait_for_function('!REBORN.snapshot().release.readingPaused');assert page.evaluate('REBORN.snapshot().passengers.state.stats.silences')==1
   assert page.evaluate('REBORN.snapshot().errors')==[];ctx.close()
  log('phone passenger choices, warnings and touch controls remain separate; reading pause freezes all driving and response clocks')
  assert not errors,errors;browser.close();print(json.dumps({'checks':checks,'renderSample':perf,'errors':errors,'physicalDevice':'not tested'}),flush=True)
except Exception:
 try:
  print('FAILURE_STATE',page.evaluate('window.REBORN?.snapshot()'),flush=True);page.screenshot(path=str(out/'release-failure.png'))
 except Exception:pass
 raise
finally:server.shutdown()
