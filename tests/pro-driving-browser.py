"""Packaged game browser checks. No production requests. Actual PNG bytes, not mock images."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import os,json,threading,traceback,hashlib
from playwright.sync_api import sync_playwright
from PIL import Image,ImageStat
ROOT=Path(__file__).resolve().parent.parent;SITE=ROOT/'site-dist';OUT=Path(os.environ.get('REBORN_EVIDENCE',str(ROOT/'pro-evidence')));OUT.mkdir(parents=True,exist_ok=True)
VERSION=json.loads((ROOT/'package.json').read_text())['version'];report={'version':VERSION,'checks':[],'physicalDevice':False,'renderer':'Chromium software WebGL'}
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(SITE),**kw)
 def log_message(self,*a):pass
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
def passed(s):report['checks'].append(s);print('PASS pro game: '+s,flush=True)
def snapshot(p):return p.evaluate('REBORN.snapshot()')
def frozen(p):return p.evaluate('({time:REBORN.snapshot().time,car:REBORN.snapshot().car,town:REBORN.snapshot().town.minuteOfDay,itinerary:REBORN.snapshot().pro.hometown.state})')
def settled(p):p.wait_for_function('!!window.REBORN && REBORN.snapshot().release.mapReady && REBORN.snapshot().pro.hometown.catalog.length===3')
seed={'version':1,'settings':{'quality':'low','tutorialSeen':True,'sound':False,'weather':'clear'},'climate':{'mode':'clear'}}
all_errors=[];warnings=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  def case(value=seed,size=(1280,800),touch=False):
   ctx=browser.new_context(viewport={'width':size[0],'height':size[1]},is_mobile=touch,has_touch=touch,accept_downloads=True)
   if value is not None:ctx.add_init_script("if(!localStorage.getItem('995.reborn.save.v1'))localStorage.setItem('995.reborn.save.v1',"+json.dumps(json.dumps(value))+");")
   p=ctx.new_page();p.set_default_timeout(60000);p.on('pageerror',lambda e:all_errors.append(str(e)));p.on('console',lambda e:warnings.append(e.text) if e.type in ['warning','error'] else None)
   p.goto(base+'/play/');settled(p)
   if p.locator('#buttercup-continue').is_visible():p.locator('#buttercup-continue').click()
   return ctx,p
  ctx,p=case();assert snapshot(p)['pro']['build']==32;p.locator('#pro-drives-menu').click();assert p.locator('[data-start-tour]').count()==3
  p.screenshot(path=str(OUT/'hometown-drives-desktop.png'));p.locator('[data-start-tour="mill-main"]').click();p.wait_for_function("REBORN.snapshot().appState==='play'")
  assert snapshot(p)['car']['speed']==0;assert snapshot(p)['release']['route']['ok'];assert not snapshot(p)['release']['safeToUpdate']
  p.wait_for_function("!document.getElementById('ux-navigation').hidden && document.getElementById('objective').textContent==='Mill & Main'")
  p.keyboard.down('ArrowUp')
  try:p.wait_for_function('REBORN.snapshot().car.speed>2',timeout=30000)
  finally:p.keyboard.up('ArrowUp')
  p.screenshot(path=str(OUT/'hometown-drive-running.png'));passed('Free Drive starts stationary, real keyboard input accelerates, connected itinerary guidance is visible')
  p.keyboard.press('KeyP');p.wait_for_function("REBORN.snapshot().appState==='photo'");a=frozen(p);p.wait_for_timeout(650);assert frozen(p)==a
  for ident,value in [('pro-photo-angle',70),('pro-photo-distance',6.5),('pro-photo-height',2)]:p.locator('#'+ident).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',value)
  p.screenshot(path=str(OUT/'photo-mode-desktop.png'))
  for ratio,name in [('1','square'),('1.7777777778','landscape')]:
   p.locator('#pro-photo-ratio').select_option(ratio)
   with p.expect_download(timeout=30000) as d:p.locator('#pro-photo-export').click()
   file=OUT/('actual-game-photo-'+name+'.png');d.value.save_as(file);im=Image.open(file).convert('RGB');w,h=im.size;assert abs(w/h-float(ratio))<.015
   stats=ImageStat.Stat(im.crop((0,0,w,max(1,h-80))));assert max(stats.stddev)>12 and max(stats.mean)>15,(stats.mean,stats.stddev)
   report.setdefault('photos',[]).append({'file':file.name,'size':[w,h],'pixelStdDev':stats.stddev,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
  assert frozen(p)==a;p.keyboard.press('Escape');assert snapshot(p)['appState']=='pause';passed('Photo mode freezes vehicle/town/itinerary, exports actual square and landscape scene pixels, returns to pause')
  p.locator('#pro-drives-pause').click();assert p.locator('[data-start-tour="everyday"]').is_disabled();p.locator('#pro-drive-close').click()
  stored=json.loads(p.evaluate("localStorage.getItem('995.reborn.save.v1')"));assert stored['hometown']['active']['id']=='mill-main'
  p.reload();settled(p);p.locator('#buttercup-continue').click();p.locator('#pro-drives-menu').click();assert 'RESUME' in p.locator('[data-start-tour="mill-main"]').inner_text();p.locator('[data-start-tour="mill-main"]').click();p.wait_for_function("REBORN.snapshot().appState==='play'")
  passed('Guarded save and reload retain the itinerary; another itinerary cannot silently replace it')
  p.evaluate("window.__lose=document.getElementById('world').getContext('webgl2').getExtension('WEBGL_lose_context')");assert p.evaluate('!!window.__lose');before=snapshot(p);start=len(warnings)
  p.evaluate('window.__lose.loseContext()');p.wait_for_function('REBORN.snapshot().graphics.contextLost');p.locator('#pro-graphics-dialog').wait_for(state='visible');a=frozen(p);p.wait_for_timeout(650);assert frozen(p)==a
  with p.expect_download() as d:p.locator('#pro-graphics-export').click()
  exported=json.loads(Path(d.value.path()).read_text());assert exported['save']['hometown']['active']['id']=='mill-main';p.screenshot(path=str(OUT/'graphics-interruption.png'))
  p.keyboard.press('Escape');assert p.locator('#pro-graphics-dialog').is_visible();assert snapshot(p)['appState']=='pause'
  p.evaluate('window.__lose.restoreContext()');p.wait_for_function('!REBORN.snapshot().graphics.contextLost && REBORN.snapshot().graphics.contextRecoveries>=1');p.locator('#pro-graphics-continue').click();assert snapshot(p)['appState']=='pause';assert snapshot(p)['graphics']['contextEpoch']>before['graphics']['contextEpoch']
  p.locator('#resume').click();p.keyboard.down('ArrowUp')
  try:p.wait_for_function('REBORN.snapshot().car.speed>0')
  finally:p.keyboard.up('ArrowUp')
  p.wait_for_timeout(500);invalid=[s for s in warnings[start:] if 'INVALID_OPERATION' in s or 'INVALID_VALUE' in s];assert not invalid,invalid
  passed('Real WebGL loss freezes the drive and permits export; restoration rebuilds without invalid-resource warnings and requires manual resume')
  p.evaluate('window.__lose.loseContext()');p.locator('#pro-graphics-dialog').wait_for(state='visible')
  def cancel(d):d.dismiss()
  p.on('dialog',cancel);p.locator('#pro-graphics-reload').click();p.remove_listener('dialog',cancel);assert p.locator('#pro-graphics-dialog').is_visible()
  def accept(d):d.accept()
  p.on('dialog',accept);p.locator('#pro-graphics-reload').click();p.remove_listener('dialog',accept);settled(p);assert snapshot(p)['pro']['hometown']['state']['active']['id']=='mill-main';assert snapshot(p)['car']['speed']==0
  passed('No-restoration restart is cancelable and confirmed reload retains the stored itinerary without clearing storage')
  p.wait_for_function('!!navigator.serviceWorker.controller');ctx.set_offline(True);p.reload();settled(p);assert snapshot(p)['pro']['hometown']['state']['active']['id']=='mill-main';ctx.set_offline(False);ctx.close();passed('Packaged game and saved itinerary reopen offline')
  ctx,p=case(None,size=(850,500));assert p.evaluate('REBORN.settings().weather')=='clear';ctx.close();rain={**seed,'settings':{**seed['settings'],'weather':'rain'},'climate':{'mode':'rain'}};ctx,p=case(rain,size=(850,500));assert p.evaluate('REBORN.settings().weather')=='rain';ctx.close();passed('Fresh view is clear; saved rainy weather remains unchanged')
  ctx,p=case(size=(844,390),touch=True);p.locator('#drive').click();p.wait_for_function("REBORN.snapshot().appState==='play'");p.evaluate('document.fullscreenElement?document.exitFullscreen():undefined');p.set_viewport_size({'width':844,'height':390})
  box=p.locator('#drive-stick').bounding_box();cdp=ctx.new_cdp_session(p);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']*.2,'id':1}]})
  try:p.wait_for_function('REBORN.snapshot().car.speed>1')
  finally:cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  assert p.locator('#drive-stick').get_attribute('aria-valuenow')=='0';p.locator('#pause-button').click();p.locator('#pro-photo-pause').click()
  for sz,name in [((844,390),'landscape'),((390,844),'portrait')]:
   p.set_viewport_size({'width':sz[0],'height':sz[1]})
   for ident in ['#pro-photo-export','#pro-photo-close','#pro-photo-ratio']:
    p.locator(ident).scroll_into_view_if_needed();b=p.locator(ident).bounding_box();assert b and b['x']>=0 and b['x']+b['width']<=sz[0]+2 and b['y']>=0 and b['y']+b['height']<=sz[1]+2,(ident,b)
   p.screenshot(path=str(OUT/('photo-mode-mobile-'+name+'.png')))
  p.locator('#pro-photo-close').click();assert snapshot(p)['appState']=='pause';p.locator('#pro-drives-pause').click();p.screenshot(path=str(OUT/'hometown-drives-portrait.png'));assert p.evaluate('document.getElementById("pro-drive-dialog").scrollWidth<=document.getElementById("pro-drive-dialog").clientWidth+2');ctx.close();passed('Actual touch input accelerates/releases; all photo and itinerary controls are reachable in small landscape and portrait')
  assert not all_errors,all_errors;report['pageErrors']=all_errors;report['result']='passed';browser.close()
except Exception as e:
 report['result']='failed';report['error']=str(e);report['traceback']=traceback.format_exc();report['pageErrors']=all_errors;report['console']=warnings[-30:]
 try:report['failureSnapshot']=snapshot(p);p.screenshot(path=str(OUT/'failure.png'))
 except Exception:pass
 raise
finally:
 (OUT/'pro-driving-report.json').write_text(json.dumps(report,indent=2));server.shutdown()
