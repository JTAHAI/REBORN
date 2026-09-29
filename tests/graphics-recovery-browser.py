"""Build 019 real Chromium WebGL context-loss, restore and software-fallback checks.
Uses WEBGL_lose_context on SwiftShader. It is not physical GPU or phone certification.
No production requests, accounts, telemetry or save clearing.
"""
import json, os, threading
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('REBORN_EVIDENCE',str(ROOT/'integration-evidence/graphics')));OUT.mkdir(parents=True,exist_ok=True)
report={'checks':[],'errors':[],'physicalGpuTested':False,'renderer':'Chromium SwiftShader WebGL2 + Canvas 2D fallback'}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'site-dist'),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}'
def passed(text):report['checks'].append(text);print('PASS graphics browser: '+text,flush=True)
def seed(context,timeout=5000):
 context.add_init_script("window.REBORN_GRAPHICS_TIMEOUT_MS="+str(timeout)+";localStorage.setItem('995.reborn.save.v1',JSON.stringify({version:1,vehicle:{fuel:73,odometerMiles:995.5},settings:{quality:'low',sound:false,tutorialSeen:true}}));")
def open_game(context):
 page=context.new_page();page.set_default_timeout(45000);page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(BASE+'/play/');page.wait_for_function('!!window.REBORN && REBORN.snapshot().release.mapReady')
 if page.locator('#buttercup-dedication').is_visible():page.locator('#buttercup-continue').click()
 return page
def start_drive(page):
 page.locator('#drive').click();page.wait_for_function("REBORN.snapshot().appState==='play'");page.keyboard.down('ArrowUp')
 try:page.wait_for_function('REBORN.snapshot().car.speed>1')
 finally:page.keyboard.up('ArrowUp')
def install_loss_handle(page):
 result=page.evaluate("""()=>{const c=document.getElementById('world'),gl=c.getContext('webgl2');if(!gl)return {ok:false,reason:'no-webgl2'};const ext=gl.getExtension('WEBGL_lose_context');if(!ext)return {ok:false,reason:'no-extension'};window.__rebornLoss=ext;return {ok:true,pipeline:REBORN.snapshot().graphics.pipeline};}""")
 assert result['ok'],result
 return result
def lose(page):page.evaluate('window.__rebornLoss.loseContext()')
def restore(page):page.evaluate('window.__rebornLoss.restoreContext()')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM') or None,headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl-developer-extensions'])
  context=browser.new_context(service_workers='block',viewport={'width':1100,'height':720});seed(context,5000);page=open_game(context);start_drive(page);install_loss_handle(page)
  before=page.evaluate("({time:REBORN.snapshot().time,x:REBORN.snapshot().car.x,z:REBORN.snapshot().car.z,save:localStorage.getItem('995.reborn.save.v1'),restores:REBORN.snapshot().graphics.graphicsRestores})")
  lose(page);page.wait_for_function("REBORN.snapshot().graphics.contextLost && REBORN.snapshot().appState==='pause'");assert page.locator('#graphics-recovery').is_visible()
  paused=page.evaluate("({time:REBORN.snapshot().time,x:REBORN.snapshot().car.x,z:REBORN.snapshot().car.z})");page.wait_for_timeout(500)
  frozen=page.evaluate("({time:REBORN.snapshot().time,x:REBORN.snapshot().car.x,z:REBORN.snapshot().car.z})")
  assert abs(frozen['time']-paused['time'])<.02
  assert abs(frozen['x']-paused['x'])<1e-9 and abs(frozen['z']-paused['z'])<1e-9
  assert page.evaluate("localStorage.getItem('995.reborn.save.v1')") is not None
  passed('Actual WebGL context loss pauses the drive, clears input and freezes world progression')
  restore(page);page.wait_for_function("REBORN.snapshot().graphics.graphicsRestores>=1 && !REBORN.snapshot().graphics.contextLost")
  restored=page.evaluate('REBORN.snapshot()')
  assert restored['appState']=='pause' and restored['graphics']['graphicsRestores']>before['restores'] and 'WebGL2' in restored['graphics']['pipeline'] and not report['errors']
  assert page.locator('#graphics-continue').is_visible();page.locator('#graphics-continue').click();assert page.evaluate("REBORN.snapshot().appState")== 'pause';page.locator('#resume').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  page.keyboard.down('ArrowUp')
  try:page.wait_for_function('REBORN.snapshot().car.speed>1')
  finally:page.keyboard.up('ArrowUp')
  passed('Browser restoration rebuilds GPU programs, targets, textures and buffers without reloading or auto-resuming')

  # Lose the restored context again and explicitly choose the emergency renderer.
  install_loss_handle(page);lose(page);page.wait_for_function("REBORN.snapshot().graphics.contextLost && REBORN.snapshot().appState==='pause'")
  page.locator('#graphics-use-compatibility').click();page.wait_for_function("REBORN.snapshot().graphics.pipeline.includes('Canvas 3D compatibility')")
  assert page.evaluate("document.getElementById('world').dataset.rebornCanvasBound")=='true'
  assert page.evaluate('REBORN.snapshot().graphics.graphicsFallbacks')==1
  assert page.locator('#graphics-continue').is_visible();page.screenshot(path=str(OUT/'compatibility-mode.png'))
  page.locator('#graphics-continue').click();page.locator('#resume').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  page.keyboard.down('ArrowUp')
  try:page.wait_for_function('REBORN.snapshot().car.speed>1')
  finally:page.keyboard.up('ArrowUp')
  assert page.evaluate('REBORN.snapshot().errors')==[]
  assert page.evaluate('REBORN.snapshot().livingCar.vehicle.odometerMiles')>=995.5
  passed('A fresh Canvas 2D renderer replaces the lost canvas, rebinds controls and continues the same local session')
  context.close()

  # Auto-fallback is visible-only and deterministic; use a short test override.
  context=browser.new_context(service_workers='block',viewport={'width':844,'height':390});seed(context,450);page=open_game(context);start_drive(page);install_loss_handle(page);lose(page)
  page.wait_for_function("REBORN.snapshot().graphics.pipeline.includes('Canvas 3D compatibility')",timeout=15000)
  assert page.evaluate("REBORN.snapshot().appState")== 'pause'
  assert page.locator('#graphics-recovery').is_visible();page.locator('#graphics-continue').click();page.locator('#resume').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  assert page.evaluate('REBORN.snapshot().errors')==[]
  page.screenshot(path=str(OUT/'automatic-fallback-landscape.png'))
  passed('A visible unrecovered context switches to compatibility mode after the bounded timeout and remains paused')
  context.close()

  # Graphics recovery must not bypass Build 018/019 save ownership. A protected
  # second tab downloads its current session and stays put instead of reloading.
  context=browser.new_context(service_workers='block',viewport={'width':1100,'height':720});seed(context,5000)
  owner=open_game(context);owner.wait_for_function("REBORN.snapshot().release.saveSession.mode==='owner'")
  protected=open_game(context);protected.wait_for_function("REBORN.snapshot().release.saveSession.mode==='other'")
  stored_before=protected.evaluate("localStorage.getItem('995.reborn.save.v1')")
  start_drive(protected);install_loss_handle(protected);lose(protected)
  protected.wait_for_function("REBORN.snapshot().graphics.contextLost && REBORN.snapshot().appState==='pause'")
  url_before=protected.url
  with protected.expect_download() as pending:
   protected.locator('#graphics-reload').click()
  download=pending.value;download.save_as(OUT/'protected-session-backup.json')
  assert protected.url==url_before
  assert protected.locator('#graphics-recovery').is_visible()
  assert 'reload was cancelled' in protected.locator('#graphics-recovery-message').inner_text().lower()
  assert protected.evaluate("localStorage.getItem('995.reborn.save.v1')")==stored_before
  assert protected.evaluate("REBORN.snapshot().release.saveSession.mode")=='other'
  protected.locator('#graphics-use-compatibility').click();protected.wait_for_function("REBORN.snapshot().graphics.pipeline.includes('Canvas 3D compatibility')")
  passed('A session-only tab exports its current drive and cancels graphics reload without changing stored progress')
  context.close();browser.close();report['result']='passed'
except Exception as error:
 report['result']='failed';report['error']=str(error)
 try:
  for ci,ctx in enumerate(browser.contexts):
   for pi,pg in enumerate(ctx.pages):
    try:
     report.setdefault('failurePages',[]).append({'url':pg.url,'snapshot':pg.evaluate('window.REBORN?.snapshot()')})
     pg.screenshot(path=str(OUT/f'graphics-failure-{ci}-{pi}.png'))
    except Exception:pass
 except Exception:pass
 raise
finally:
 (OUT/'graphics-recovery-report.json').write_text(json.dumps(report,indent=2));server.shutdown()
