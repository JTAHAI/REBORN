"""Build 019 storage ownership/recovery on the packaged game in real Chromium.
Two real tabs and real storage/lock APIs; quota/denial are explicit fault fixtures.
No production requests. Physical phones and arbitrary legacy races not certified.
"""
import json, os, subprocess, threading, tempfile
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('REBORN_EVIDENCE',str(ROOT/'integration-evidence/session')));OUT.mkdir(parents=True,exist_ok=True)
BASELINE='9d5e6d926edfdf93ec8cf2b46812089ef5f44cdc'
OLD=subprocess.check_output(['git','show',BASELINE+':dist/index.html'],cwd=ROOT)
SAVE='995.reborn.save.v1';STORY='995.reborn.story.v1';RECOVERY='995.reborn.before-restore.v1'
report={'checks':[],'errors':[],'physicalPhoneTested':False,'faultFixtures':['storage getter denial','quota refusal','uncooperating external writer','missing Web Locks API']}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'site-dist'),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  path=urlsplit(self.path).path
  if path=='/observer/':
   body=b'<!doctype html><title>Storage observer fixture</title>'
  elif path=='/legacy/':body=OLD
  elif path.startswith('/legacy/assets/'):
   self.path=self.path.replace('/legacy/assets/','/play/assets/',1);return super().do_GET()
  else:return super().do_GET()
  self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
def passed(s):report['checks'].append(s);print('PASS session browser: '+s,flush=True)
def raw(page):return page.evaluate('([localStorage.getItem("'+SAVE+'"),localStorage.getItem("'+STORY+'")])')
def download(page,selector):
 with page.expect_download() as event:page.locator(selector).click()
 d=event.value;p=OUT/d.suggested_filename;d.save_as(p);return json.loads(p.read_text())
def seed(context,extra=''):
 context.add_init_script("if(!localStorage.getItem('"+SAVE+"'))localStorage.setItem('"+SAVE+"',JSON.stringify({version:1,vehicle:{fuel:58,odometerMiles:246},settings:{quality:'low',sound:false,tutorialSeen:true}}));"+extra)
def open_game(ctx,path='/play/'):
 page=ctx.new_page();page.set_default_timeout(45000);page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.goto(url+path);page.wait_for_function('!!window.REBORN && REBORN.snapshot().release.mapReady')
 if path!='/legacy/':
  page.wait_for_function("REBORN.snapshot().release.saveSession.mode!=='pending'")
  if page.locator('#buttercup-dedication').is_visible():page.locator('#buttercup-continue').click()
 return page
def pause(page):
 state=page.evaluate('REBORN.snapshot().appState')
 if state=='menu':page.locator('#intro-help').click()
 elif state=='play':page.keyboard.press('Escape')
 page.wait_for_function("REBORN.snapshot().appState==='pause'")
def load_backup(page,odo):
 page.locator('#ux-import-save').click()
 data={'format':'REBORN_BACKUP_V1','save':{'version':1,'vehicle':{'fuel':61,'odometerMiles':odo},'settings':{'quality':'low','sound':False}},'story':None}
 page.locator('#release-import-file').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(data).encode()})
 page.wait_for_function("document.getElementById('release-import-preview').textContent.includes('Review:')")
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  # Actual baseline app, not a mock of persist(). A legacy/external writer changes
  # the saved odometer; the old settings handler writes its stale RAM copy back.
  ctx=browser.new_context(service_workers='block');seed(ctx);old=open_game(ctx,'/legacy/');pause(old)
  observer=ctx.new_page();observer.goto(url+'/observer/')
  observer.evaluate("s=>{const v=JSON.parse(localStorage.getItem(s));v.vehicle.odometerMiles=4321;localStorage.setItem(s,JSON.stringify(v));}",SAVE)
  old.locator('#ux-units').select_option('kph')
  assert old.evaluate("JSON.parse(localStorage.getItem('"+SAVE+"')).vehicle.odometerMiles")==246
  passed('Build 017 reproduces newer-save loss through the actual settings-save handler');ctx.close()

  ctx=browser.new_context(service_workers='block',viewport={'width':1100,'height':760});seed(ctx)
  owner=open_game(ctx);assert owner.evaluate('REBORN.snapshot().release.saveSession.mode')=='owner'
  pause(owner);assert owner.evaluate('document.activeElement.id')=='sound-setting'
  owner.locator('#ux-units').select_option('kph');pair=raw(owner)
  other=open_game(ctx);assert other.evaluate('REBORN.snapshot().release.saveSession.mode')=='other'
  other.locator('#drive').click();other.wait_for_function("REBORN.snapshot().appState==='play'")
  other.keyboard.down('ArrowUp')
  try:other.wait_for_function('REBORN.snapshot().car.speed>1')
  finally:other.keyboard.up('ArrowUp')
  pause(other);assert other.evaluate('document.activeElement.id')=='session-export'
  other.locator('#ux-units').select_option('mph')
  assert raw(owner)==pair
  assert other.locator('#session-save-banner').is_visible()
  session=download(other,'#session-export');assert session['format']=='REBORN_BACKUP_V1' and session['save']['version']==1
  assert raw(owner)==pair
  load_backup(other,777)
  assert other.locator('#release-import-confirm').is_disabled()
  other.locator('#release-import-confirm').dispatch_event('click')
  assert raw(owner)==pair
  other.locator('#release-dialog-cancel').click();other.locator('#reset-progress').click();other.locator('#release-reset-text').fill('RESET')
  assert other.locator('#release-reset-confirm').is_disabled()
  other.locator('#release-reset-confirm').dispatch_event('click');assert raw(owner)==pair
  other.locator('#release-dialog-cancel').click();other.screenshot(path=str(OUT/'second-tab-save-protection.png'))
  # A narrow paused menu must expose all save actions at large reading sizes.
  # This is a viewport layout check; actual touch controls have a separate gate.
  other.set_viewport_size({'width':390,'height':844})
  for scale in ['1','2']:
   other.locator('#ux-text-scale').select_option(scale)
   assert other.evaluate('document.querySelector("#pause .ux-settings-body").scrollWidth<=document.querySelector("#pause .ux-settings-body").clientWidth+2')
   for button in ['#session-export','#session-export-stored','#session-reload']:
    other.locator(button).scroll_into_view_if_needed()
    box=other.locator(button).bounding_box()
    assert box and box['x']>=0 and box['x']+box['width']<=391 and box['height']>=44,box
   other.screenshot(path=str(OUT/('save-protection-portrait-'+scale+'.png')))
  assert raw(owner)==pair
  passed('Visible save actions receive focus; hidden actions are skipped; portrait menus retain all actions at 100 and 200 percent text')
  other.close();assert raw(owner)==pair
  passed('Second real tab can drive/export, but settings, forced restore/reset events and page close cannot overwrite the owner')
  owner.close();fresh=open_game(ctx);assert fresh.evaluate('REBORN.snapshot().release.saveSession.mode')=='owner';assert fresh.evaluate('REBORN.snapshot().livingCar.vehicle.odometerMiles')==246
  passed('Closing the owner releases the browser lock for a newly loaded game')
  pause(fresh);observer=ctx.new_page();observer.goto(url+'/observer/')
  observer.evaluate("s=>{const v=JSON.parse(localStorage.getItem(s));v.vehicle.odometerMiles=4321;localStorage.setItem(s,JSON.stringify(v));}",SAVE)
  fresh.wait_for_function('REBORN.snapshot().release.saveSession.conflict')
  external=raw(observer);fresh.locator('#ux-units').select_option('mph');assert raw(observer)==external
  stored=download(fresh,'#session-export-stored');assert stored['save']==external[0] and stored['story']==external[1]
  local=download(fresh,'#session-export');assert local['save']['vehicle']['odometerMiles']==246
  fresh.evaluate("window.reloadCanary='old-session'")
  fresh.once('dialog',lambda d:d.dismiss());fresh.locator('#session-reload').click();assert fresh.evaluate('window.reloadCanary')=='old-session'
  fresh.once('dialog',lambda d:d.accept());fresh.locator('#session-reload').click()
  fresh.wait_for_function("!!window.REBORN && REBORN.snapshot().livingCar.vehicle.odometerMiles===4321 && REBORN.snapshot().release.saveSession.mode==='owner'")
  passed('External/legacy write latches protection; separate exports and explicit cancel/confirm reload preserve the newer save');ctx.close()

  # Getter denial is stronger than setItem failure: the property access itself
  # throws, before a Storage object can be passed into a helper.
  ctx=browser.new_context(service_workers='block');seed(ctx,"Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('fixture denial','SecurityError');}});")
  denied=open_game(ctx);pause(denied);denied.locator('#ux-units').select_option('kph')
  assert not denied.evaluate('REBORN.snapshot().storageAvailable')
  assert denied.evaluate('REBORN.snapshot().release.saveSession.reason')=='unknown'
  exported=download(denied,'#ux-export-save');assert exported['save']['settings']['units']=='kph'
  denied.locator('#ux-close-settings').click();denied.locator('#drive').click();denied.wait_for_function("REBORN.snapshot().appState==='play'")
  assert denied.evaluate('REBORN.snapshot().errors')==[]
  passed('Denied localStorage getter leaves gameplay and current-session export usable without a JavaScript crash');ctx.close()

  ctx=browser.new_context(service_workers='block');seed(ctx);page=open_game(ctx);pause(page)
  page.evaluate("k=>localStorage.setItem(k,'prior recovery canary')",RECOVERY)
  before=raw(page);load_backup(page,777)
  # Refuse the game save after the recovery-copy write, once; rollback can work.
  page.evaluate("""key=>{const real=Storage.prototype.setItem;let failed=false;Storage.prototype.setItem=function(k,v){if(k===key&&!failed){failed=true;throw new DOMException('fixture quota','QuotaExceededError');}return real.call(this,k,v);};}""",SAVE)
  page.locator('#release-import-confirm').click();page.wait_for_function("document.getElementById('release-dialog-result').textContent.includes('Save failed')")
  assert raw(page)==before;assert page.evaluate('k=>localStorage.getItem(k)',RECOVERY)=='prior recovery canary'
  page.locator('#release-dialog-cancel').click();page.locator('#ux-units').select_option('kph');assert page.evaluate('REBORN.snapshot().storageAvailable')
  passed('Failed confirmed restore rolls back its recovery-copy write; normal saving can retry after transient quota refusal');ctx.close()

  ctx=browser.new_context(service_workers='block');seed(ctx,"Object.defineProperty(navigator,'locks',{configurable:true,value:undefined});")
  page=open_game(ctx);assert page.evaluate('REBORN.snapshot().release.saveSession.mode')=='fallback';pause(page)
  page.locator('#ux-units').select_option('kph');assert page.evaluate('REBORN.snapshot().storageAvailable')
  observer=ctx.new_page();observer.goto(url+'/observer/');observer.evaluate('s=>localStorage.removeItem(s)',STORY)
  page.wait_for_function('REBORN.snapshot().release.saveSession.conflict');page.locator('#ux-units').select_option('mph');assert observer.evaluate('s=>localStorage.getItem(s)',STORY) is None
  passed('Without Web Locks, single-tab saves work and an externally deleted story blocks stale recreation');ctx.close()

  # Corrupt originals remain an intentional recovery path, not an ownership error.
  ctx=browser.new_context(service_workers='block');ctx.add_init_script("if(!sessionStorage.getItem('seeded')){localStorage.setItem('"+SAVE+"','{broken-original');sessionStorage.setItem('seeded','1');}")
  page=open_game(ctx);assert page.evaluate('REBORN.snapshot().release.saveProtected');assert page.evaluate('s=>localStorage.getItem(s)',SAVE)=='{broken-original'
  pause(page);load_backup(page,888);page.locator('#release-import-confirm').click();page.wait_for_function('window.REBORN?.snapshot().livingCar.vehicle.odometerMiles===888')
  recovery=page.evaluate('k=>JSON.parse(localStorage.getItem(k))',RECOVERY);assert recovery['save']=='{broken-original' and recovery['story'] is None
  passed('Explicit restore from a corrupt original keeps its exact raw bytes and an absent story in the recovery copy');ctx.close()
  assert not report['errors'],report['errors'];browser.close();report['result']='passed'
except Exception as error:
 report['result']='failed';report['error']=str(error)
 try:
  for ci,ctx in enumerate(browser.contexts):
   for pi,pg in enumerate(ctx.pages):
    try:
     report.setdefault('failurePages',[]).append({'url':pg.url,'snapshot':pg.evaluate('window.REBORN?.snapshot()')})
     pg.screenshot(path=str(OUT/f'session-failure-{ci}-{pi}.png'))
    except Exception:pass
 except Exception:pass
 raise
finally:
 (OUT/'session-report.json').write_text(json.dumps(report,indent=2));server.shutdown()
