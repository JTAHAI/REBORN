"""End-to-end staged release acceptance, including an old cached installation.
No production requests. Requires Python Playwright and Chromium only for tests.
"""
import json,os,threading,tempfile,zipfile,hashlib,time
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;site=root/'site-dist'
release=json.loads((site/'release.json').read_text())
evidence=Path(os.environ.get('REBORN_SCREENSHOTS',tempfile.mkdtemp(prefix='reborn-browser-')));evidence.mkdir(parents=True,exist_ok=True)
old=tempfile.TemporaryDirectory(prefix='reborn-old-site-')
with zipfile.ZipFile(root/'release-packages/reborn-cloudflare-pages-c1d56e5-NORTH-BERWICK-POLISHED.zip') as z:z.extractall(old.name)
phase={'root':site}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(phase['root']),**k)
 def log_message(self,*a):pass
 def end_headers(self):self.send_header('Cache-Control','no-cache');super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base='http://127.0.0.1:'+str(server.server_port)
def log(s):print(s,flush=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  ctx=browser.new_context(viewport={'width':1100,'height':720});page=ctx.new_page();page.set_default_timeout(30000);errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(base);assert 'For Buttercup' in page.title();assert page.locator('.buildroom-credit').count()==1
  page.screenshot(path=str(evidence/'full-website.png'));log('PASS packaged homepage / memorial / Buildroom branding')
  ctx.add_init_script("if(!localStorage.getItem('995.reborn.save.v1'))localStorage.setItem('995.reborn.save.v1',JSON.stringify({version:1,settings:{quality:'low',tutorialSeen:true}}))")
  page.goto(base+'/play/');page.wait_for_function('window.REBORN');assert page.locator('#buttercup-dedication').is_visible();assert page.locator('#app').get_attribute('inert') is not None
  page.locator('#buttercup-continue').click();page.locator('#drive').click();page.wait_for_function("REBORN.snapshot().appState==='play' && REBORN.snapshot().weather?.enabled")
  assert page.evaluate('REBORN.snapshot().car.speed')==0
  page.keyboard.press('Escape');page.locator('#town-season-setting').select_option('winter');page.locator('#town-weather-setting').select_option('snow');page.keyboard.press('Escape');page.wait_for_timeout(500)
  assert page.evaluate('REBORN.snapshot().weather.current.kind')=='snow';assert page.evaluate('REBORN.snapshot().weather.props')>0
  page.screenshot(path=str(evidence/'packaged-snow.png'));page.keyboard.down('ArrowUp');page.wait_for_timeout(1500);page.keyboard.up('ArrowUp');assert page.evaluate('REBORN.snapshot().car.speed')>0
  page.keyboard.press('j');page.locator('#ux-tab-town').click();assert page.locator('#weather-panel').is_visible();t=page.evaluate('REBORN.snapshot().weather.cursor');page.wait_for_timeout(300);assert page.evaluate('REBORN.snapshot().weather.cursor')==t
  page.keyboard.press('Escape');page.keyboard.press('m');page.locator('#ux-map-search').fill('Cumberland');page.locator('#ux-map-results button').first.click();assert page.locator('#ux-clear-pin').is_enabled();page.keyboard.press('Escape')
  assert not errors,errors;assert page.evaluate('REBORN.snapshot().errors')==[];log('PASS packaged first Free Drive, snow render, driving, hub, paused weather, searchable map')
  response=page.request.get(base+'/downloads/'+release['standaloneZip']);assert response.ok;assert hashlib.sha256(response.body()).hexdigest()==release['standaloneZipSha256'];log('PASS embedded standalone ZIP matches release manifest')
  page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('!!navigator.serviceWorker.controller');ctx.set_offline(True);page.reload();page.wait_for_function('!!window.REBORN');assert page.evaluate('REBORN.version')==release['runtime'];ctx.set_offline(False);log('PASS complete game reloads offline')
  ctx.close()
  # An unmodified historical website at the SAME origin seeds the old cache.
  phase['root']=Path(old.name);ctx=browser.new_context(viewport={'width':1000,'height':650});page=ctx.new_page();page.set_default_timeout(30000)
  page.add_init_script("if(!localStorage.getItem('995.reborn.save.v1'))localStorage.setItem('995.reborn.save.v1',JSON.stringify({version:1,settings:{quality:'low'}}))")
  page.goto(base+'/play/');page.wait_for_function('!!window.REBORN');page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('!!navigator.serviceWorker.controller')
  before=page.evaluate('caches.keys()');assert any('build009' in k for k in before)
  page.evaluate("""async()=>{await caches.open('another-app-keep');await caches.open('995-reborn-'+encodeURIComponent(location.origin+'/')+'-root-keep');localStorage.setItem('995.reborn.save.v1',JSON.stringify({version:1,vehicle:{fuel:42,odometerMiles:321},town:{schemaVersion:1,trust:63},settings:{quality:'low',tutorialSeen:true}}));}""")
  # The current memorial homepage sits outside /play/ and explicitly updates
  # any historical play-scoped worker before its versioned Drive link is used.
  phase['root']=site;page.goto(base+'/?build='+release['cacheTag']);page.locator("a[href*='/play/?build=']").first.wait_for()
  page.wait_for_function("caches.keys().then(keys=>keys.some(k=>k.includes('pass04-')) && !keys.some(k=>k.includes('build009')))",timeout=60000)
  page.goto(base+'/play/?build='+release['cacheTag']);page.wait_for_function("window.REBORN?.version==='0.10.0-maine-weather-p013'",timeout=60000)
  page.wait_for_function("navigator.serviceWorker.controller && caches.keys().then(keys=>keys.some(k=>k.includes('pass04-')) && !keys.some(k=>k.includes('build009')))",timeout=60000)
  page.wait_for_timeout(1200);page.wait_for_function('!!window.REBORN');page.locator('#buttercup-continue').click();page.locator('#drive').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  car=page.evaluate('REBORN.snapshot().livingCar.vehicle');assert abs(car['odometerMiles']-321)<.1;assert car['fuel']>41.9 and car['fuel']<=42
  keys=page.evaluate('caches.keys()');assert 'another-app-keep' in keys;assert any(k.endswith('root-keep') for k in keys)
  assert page.evaluate('REBORN.snapshot().errors')==[];log('PASS actual Build009 cached installation upgrades; saves and unrelated/root caches preserved')
  browser.close();print(json.dumps({'packagedBrowser':'passed','cacheUpgrade':'build009-to-build013','renderer':'Chromium software WebGL, battery-saver preset','physicalMobile':'not tested'}),flush=True)
finally:
 server.shutdown();old.cleanup()
