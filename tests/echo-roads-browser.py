"""Packaged Echo Roads acceptance. Saved road-position fixtures shorten travel;
all observations, comparisons, choices and the ending use actual gameplay/UI.
No production requests, private footage, or manual-route claim.
"""
import json,os,threading,tempfile,math,time
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
site=root/'site-dist';evidence=Path(os.environ.get('REBORN_SCREENSHOTS',tempfile.mkdtemp(prefix='reborn-echo-')));evidence.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(site),**k)
 def log_message(self,*a):pass
 def end_headers(self):self.send_header('Cache-Control','no-cache');super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();url='http://127.0.0.1:'+str(server.server_port)+'/play/'
results=[]
def log(s):results.append(s);print('PASS packaged Echo Roads: '+s,flush=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  ctx=browser.new_context(viewport={'width':1024,'height':600});page=ctx.new_page();page.set_default_timeout(120000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  ctx.add_init_script("if(!localStorage.getItem('995.reborn.save.v1'))localStorage.setItem('995.reborn.save.v1',JSON.stringify({version:1,settings:{quality:'low',tutorialSeen:true,sound:true},town:{schemaVersion:1,minuteOfDay:720}}))")
  # Apply a documented position fixture on the NEXT document, after the real
  # pagehide save. Writing localStorage immediately before reload is overwritten
  # by the production pagehide handler and does not actually install a fixture.
  ctx.add_init_script("const pending=sessionStorage.getItem('echo-position-fixture');if(pending){const f=JSON.parse(pending),s=JSON.parse(localStorage.getItem('995.reborn.save.v1'));s.echoes={...s.echoes,active:true,focus:f.focus,lastPosition:f.point};localStorage.setItem('995.reborn.save.v1',JSON.stringify(s));sessionStorage.removeItem('echo-position-fixture');}")
  def ready():
   page.bring_to_front()
   page.wait_for_function('!!window.REBORN?.snapshot()?.echoes')
   if page.locator('#buttercup-continue').is_visible():page.locator('#buttercup-continue').click()
  def hub():
   if page.evaluate('REBORN.snapshot().appState')=='menu':page.locator('#journey-open').click()
   elif page.evaluate('REBORN.snapshot().appState')=='play':page.keyboard.press('j')
   page.locator('#ux-tab-echoes').click()
  def snapshot():return page.evaluate('REBORN.snapshot()')
  def fixture(point,focus):
   # Pause before saving a fixture: the running game's autosave must not overwrite it.
   if snapshot()['appState']=='play':page.keyboard.press('j')
   page.evaluate("f=>sessionStorage.setItem('echo-position-fixture',JSON.stringify(f))",{'point':point,'focus':focus})
   page.reload();ready();hub();page.locator('#echo-begin').click();page.wait_for_function("REBORN.snapshot().appState==='play' && REBORN.snapshot().echoes.enabled")
  def view(id,era):
   # Software WebGL can render at 1 fps on a shared CI runner. Wait for the
   # real simulation predicate; do not accelerate the clock or skip dwell.
   if snapshot()['echoes']['state']['targetEra']!=era:page.keyboard.press('v')
   try:page.wait_for_function('([id,era])=>REBORN.snapshot().echoes.state.visits[id]?.[era]===true',arg=[id,era],timeout=120000,polling=200)
   except Exception:
    print('OBSERVATION_FAILURE',id,era,json.dumps(snapshot()),flush=True);page.screenshot(path=str(evidence/'echo-failure.png'));raise
  page.goto(url);ready();hub();assert page.locator('[role=tab]').count()==6
  assert page.locator('#echo-places .echo-card').count()==6
  assert 'not an exact historical reconstruction' in page.locator('#echo-panel').inner_text()
  assert page.locator('#echo-begin').is_enabled();page.screenshot(path=str(evidence/'echo-roads-hub.png'));log('six accessible notebook cards, interpretation notice, launch control')
  page.locator('#echo-begin').click();page.wait_for_function("REBORN.snapshot().appState==='play' && REBORN.snapshot().echoes.enabled")
  assert snapshot()['car']['speed']==0;log('manual-throttle stationary launch, no new race mode')
  page.keyboard.press('j');before=snapshot()['echoes']['state'];page.wait_for_timeout(350);assert snapshot()['echoes']['state']==before;page.keyboard.press('v');assert snapshot()['echoes']['state']==before
  page.keyboard.press('Escape');page.keyboard.press('m');before=snapshot()['echoes']['state'];page.wait_for_timeout(350);assert snapshot()['echoes']['state']==before;page.keyboard.press('Escape');log('hub, map and V while paused freeze memory clock and transitions')
  anchors=snapshot()['echoes']['anchors']
  # Cumberland first provides a clear driver's-eye visual comparison.
  anchors=sorted(anchors,key=lambda a:a['id']!='cumberland-farms')
  page.keyboard.press('Escape');page.locator('#town-season-setting').select_option('summer');page.locator('#town-weather-setting').select_option('clear');page.keyboard.press('Escape')
  for index,a in enumerate(anchors):
   pt=dict(a['point'])
   if a['id']=='cumberland-farms':pt['yaw']=-2.42
   fixture(pt,a['id']);assert math.hypot(snapshot()['car']['x']-pt['x'],snapshot()['car']['z']-pt['z'])<3,{'anchor':a['id'],'expected':pt,'snapshot':snapshot()};view(a['id'],'present')
   if index==0:page.screenshot(path=str(evidence/'echo-roads-today.png'))
   view(a['id'],'memory');page.wait_for_function('REBORN.snapshot().echoes.visualMix>.98 && REBORN.snapshot().echoes.props>0')
   if index==0:
    page.screenshot(path=str(evidence/'echo-roads-memory.png'));assert snapshot()['echoes']['audioNodes']==3
    page.keyboard.press('v');page.wait_for_function('REBORN.snapshot().echoes.state.blend<.02');page.keyboard.press('v');page.wait_for_function('REBORN.snapshot().echoes.state.blend>.98');assert snapshot()['echoes']['audioNodes']==3
    # Mid-memory reload must resume the same view and discoveries through the normal launch path.
    before=snapshot()['echoes']['state'];page.reload();ready();hub();page.locator('#echo-begin').click();page.wait_for_function("REBORN.snapshot().echoes.enabled")
    assert snapshot()['echoes']['state']['targetEra']=='memory';assert snapshot()['echoes']['state']['visits'][a['id']]==before['visits'][a['id']]
    log('visible era dressing, three reused audio voices, view and observation resume after reload')
   hub();selector='[data-echo-remember="'+a['id']+'"][data-echo-choice="'+['place','feeling','quiet'][index%3]+'"]';page.locator(selector).click()
   assert snapshot()['echoes']['state']['visits'][a['id']]['choice']==['place','feeling','quiet'][index%3]
   if index==0:page.screenshot(path=str(evidence/'echo-roads-reflection.png'))
   page.keyboard.press('Escape');log('both viewpoints and reflection: '+a['id'])
  assert snapshot()['echoes']['state']['completed']==False
  page.keyboard.press('v');page.wait_for_function('REBORN.snapshot().echoes.state.completed===true');hub();assert page.locator('#echo-finale').is_visible();assert len(snapshot()['echoes']['state']['history'])==6
  log('all six two-view stops, three response types and single return-to-Today ending through production UI')
  page.screenshot(path=str(evidence/'echo-roads-homecoming.png'))
  # Readable tab targets on the same landscapes used by the existing acceptance gate.
  page.evaluate('document.fullscreenElement ? document.exitFullscreen() : undefined')
  for width,height in [(1024,600),(844,390),(667,375)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
   rects=page.locator('.ux-tabs button').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())')
   assert all(r['height']>=36 and r['width']>=40 and r['left']>=0 and r['right']<=width+1 for r in rects),rects
  page.set_viewport_size({'width':1024,'height':600});page.locator('#echo-stop').click();assert snapshot()['echoes']['state']['active']==False
  page.keyboard.press('Escape');page.wait_for_timeout(1200);assert snapshot()['echoes']['audioLevel']<.001;assert page.locator('#echo-strip').is_hidden()
  page.keyboard.press('Escape');page.locator('#garage').click();page.locator('#passenger-open').click();page.locator('[data-passenger-story="long-way-home"]').click();page.wait_for_function('!!REBORN.snapshot().passengers.active');hub();assert page.locator('#echo-begin').is_disabled()
  log('ending retains the notebook, silences memory audio and protects a new passenger commitment')
  assert not errors,errors;assert snapshot()['errors']==[];ctx.close()
  # A true touch-emulated context uses pointer events, not an image-only layout assertion.
  touch=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1);page=touch.new_page();page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)))
  seed={'version':1,'settings':{'quality':'low','tutorialSeen':True,'sound':False},'echoes':{'active':True,'lastPosition':anchors[0]['point'],'focus':anchors[0]['id']}}
  touch.add_init_script("if(!localStorage.getItem('995.reborn.save.v1'))localStorage.setItem('995.reborn.save.v1',"+json.dumps(json.dumps(seed))+")")
  page.goto(url);ready();hub();page.locator('#echo-begin').click();page.wait_for_function("REBORN.snapshot().echoes.enabled")
  page.evaluate('document.fullscreenElement ? document.exitFullscreen() : undefined');page.set_viewport_size({'width':844,'height':390})
  assert snapshot()['car']['speed']==0;page.locator('#echo-toggle').tap();page.wait_for_function("REBORN.snapshot().echoes.state.targetEra==='memory'")
  rect=page.locator('#echo-toggle').bounding_box();strip=page.locator('#echo-strip').bounding_box();controls=page.locator('#drive-stick,#touch-controls button,#town-interact').evaluate_all('(es)=>es.filter(e=>e.offsetParent!==null).map(e=>e.getBoundingClientRect().toJSON())')
  assert rect['height']>=44 and rect['width']>=44
  for box in [rect,strip]:
   for r in controls:assert not(box['x']<r['right'] and box['x']+box['width']>r['left'] and box['y']<r['bottom'] and box['y']+box['height']>r['top']),[box,r]
  page.screenshot(path=str(evidence/'echo-roads-touch.png'));page.locator('#minimap').tap();assert snapshot()['appState']=='map';before=snapshot()['echoes']['state'];page.wait_for_timeout(250);assert snapshot()['echoes']['state']==before
  assert not errors,errors;assert snapshot()['errors']==[];log('touch compare has a 44px target clear of driving controls; minimap pauses the transition')
  browser.close()
 print(json.dumps({'pass':6,'packagedChecks':results,'travelMethod':'documented saved-position fixtures; production observations and choices','physicalPhone':'not tested','errors':errors}),flush=True)
finally:server.shutdown()
