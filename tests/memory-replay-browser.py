from hub_helpers import hub_tab
"""Packaged Pass 7 acceptance for local drive memories, ghosts, replay and audio.

The desktop path records a real short Free Drive through production input and
finishes it through the garage. A second touch-emulated context reuses that local
save only to verify responsive interaction; no network, route upload or telemetry
service is involved.
"""
import json, os, threading, tempfile, math
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parent.parent
site=root/'site-dist'
evidence=Path(os.environ.get('REBORN_SCREENSHOTS',tempfile.mkdtemp(prefix='reborn-memory-')))
evidence.mkdir(parents=True,exist_ok=True)

class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k): super().__init__(*a,directory=str(site),**k)
 def log_message(self,*a): pass
 def end_headers(self): self.send_header('Cache-Control','no-cache');super().end_headers()

server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/play/'
results=[]
def log(text): results.append(text);print('PASS packaged Drive Memories: '+text,flush=True)
def overlap(a,b): return a['x']<b['right'] and a['x']+a['width']>b['left'] and a['y']<b['bottom'] and a['y']+a['height']>b['top']

try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  errors=[]
  seed={
   'version':1,
   'settings':{'quality':'low','tutorialSeen':True,'sound':True,'volume':.6},
   'town':{'schemaVersion':1,'minuteOfDay':780},
   'vehicle':{
    'fuel':96,'battery':68,'brakes':76,'engineTempC':94,
    'faults':{
     'bearing':{'active':True,'discovered':True,'severity':.58},
     'charging':{'active':True,'discovered':True,'severity':.44},
     'cooling':{'active':True,'discovered':True,'severity':.36},
     'clutch':{'active':True,'discovered':True,'severity':.31},
     'brakeHydraulics':{'active':True,'discovered':True,'severity':.42}
    }
   }
  }
  ctx=browser.new_context(viewport={'width':1366,'height':900})
  ctx.add_init_script("if(!localStorage.getItem('995.reborn.save.v1'))localStorage.setItem('995.reborn.save.v1',"+json.dumps(json.dumps(seed))+')')
  page=ctx.new_page();page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)))
  def ready(pg=page):
   pg.wait_for_function("window.REBORN?.version==='0.15.0-session-safety-p018'")
   if pg.locator('#buttercup-continue').is_visible(): pg.locator('#buttercup-continue').click()
   pg.wait_for_function("!document.getElementById('intro').hidden")
  def snap(pg=page): return pg.evaluate('REBORN.snapshot()')
  def hub(pg=page):
   state=pg.evaluate('REBORN.snapshot().appState')
   if state=='menu': pg.locator('#journey-open').click()
   elif state=='play': pg.keyboard.press('j')
   hub_tab(pg,'memories')

  original_wait=page.wait_for_function
  def wait_with_snapshot(*args,**kwargs):
   try:return original_wait(*args,**kwargs)
   except Exception:
    try:
     (evidence/'failure.json').write_text(json.dumps({'snapshot':page.evaluate('window.REBORN?.snapshot()'),'hidden':page.evaluate('document.hidden'),'focus':page.evaluate('document.hasFocus()'),'errors':errors},indent=2))
     page.screenshot(path=str(evidence/'memory-failure.png'),timeout=15000)
    except Exception:pass
    raise
  page.wait_for_function=wait_with_snapshot
  page.goto(url);ready()
  assert snap()['memories']['state']['recordings']==[]
  assert page.locator('#ux-tab-memories').count()==1
  page.locator('#drive').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  assert snap()['car']['speed']==0
  start_position={k:snap()['car'][k] for k in ['x','z']}
  page.keyboard.down('ArrowUp')
  try:
   page.wait_for_function("p=>{const s=REBORN.snapshot();return s.memories.state.draft && s.memories.state.draft.duration>=4.1 && Math.hypot(s.car.x-p.x,s.car.z-p.z)>6}",arg=start_position,timeout=120000,polling=150)
  finally: page.keyboard.up('ArrowUp')
  assert snap()['car']['speed']>0
  # Do not conflate 16 simulation seconds with a fixed wall-clock wait on
  # software WebGL. Preserve a real capture, then verify coasting progression.
  released=snap();released_duration=released['memories']['recorder']['duration']
  page.wait_for_function('t=>REBORN.snapshot().memories.recorder.duration>t+.25',arg=released_duration,timeout=45000,polling=150)
  coast=snap();assert coast['memories']['recorder']['phase']=='recording'
  assert abs(coast['memories']['recorder']['duration']-coast['time'])<.02
  log('recording and simulation clocks advance together after throttle release; captured FPS '+str(coast['fps']))
  assert snap()['memories']['state']['draft']['samples'].__len__() >= 2
  page.keyboard.press('Escape');page.locator('#garage').click();page.wait_for_function("REBORN.snapshot().appState==='menu'")
  saved=json.loads(page.evaluate("localStorage.getItem('995.reborn.save.v1')"))
  assert len(saved['memories']['recordings'])==1,saved.get('memories')
  recording=saved['memories']['recordings'][0]
  assert recording['duration']>=3 and recording['distanceM']>=3 and len(recording['samples'])>=2
  assert max(recording['diagnostics'].values())>.2,recording['diagnostics']
  assert any(entry.get('memoryId')==recording['id'] for entry in saved.get('journal',[])),saved.get('journal')
  hub();assert page.locator('#ux-panel-memories').is_visible();assert page.locator('.memory-card').count()==1
  assert 'Stored only inside the existing local REBORN save' in page.locator('.memory-privacy').inner_text()
  assert page.locator('.memory-card canvas').get_attribute('aria-label')=='Recorded route preview'
  page.screenshot(path=str(evidence/'drive-memories-hub.png'))
  log('real manual-throttle Free Drive creates one bounded local recording and Road Journal link')

  # Route ghost from production UI.
  page.locator('[data-memory-action="ghost"]').click();page.wait_for_function("REBORN.snapshot().appState==='play' && REBORN.snapshot().memories.ghost")
  assert page.locator('#memory-ghost-strip').is_visible()
  assert page.locator('#memory-ghost-strip').bounding_box()['height']<=100
  ghost_before=snap()['memories']['ghost'];page.wait_for_function("p=>{const g=REBORN.snapshot().memories.ghost;if(!g)return false;return ((g.time-p.time+p.duration)%p.duration)>.1}",arg=ghost_before,timeout=15000,polling=100);ghost_after=snap()['memories']['ghost'];ghost_delta=(ghost_after['time']-ghost_before['time']+ghost_before['duration'])%ghost_before['duration'];assert ghost_delta>.1,(ghost_before,ghost_after,ghost_delta)
  page.keyboard.press('g');assert snap()['memories']['ghost']['paused'] is True;paused=snap()['memories']['ghost']['time'];page.wait_for_timeout(500);assert abs(snap()['memories']['ghost']['time']-paused)<.02
  page.keyboard.press('g');assert snap()['memories']['ghost']['paused'] is False
  page.keyboard.press('m');assert snap()['appState']=='map';before=snap()['memories']['ghost']['time'];page.wait_for_timeout(400);assert abs(snap()['memories']['ghost']['time']-before)<.02
  page.screenshot(path=str(evidence/'memory-ghost-map.png'));page.keyboard.press('Escape')
  page.keyboard.press('Shift+G');page.wait_for_function('REBORN.snapshot().memories.ghost===null');assert page.locator('#memory-ghost-strip').is_hidden()
  log('spectral route ghost advances, pauses, freezes on the map and stops without becoming a race')

  # Replay and diagnostic audio from the same real recording.
  page.keyboard.press('j');hub_tab(page,'memories')
  restore=snap();restore_car={k:restore['car'][k] for k in ['x','z','yaw']};restore_vehicle={k:restore['livingCar']['vehicle'][k] for k in ['engineTempC','battery']}
  page.locator('[data-memory-action="replay"]').click();page.wait_for_function("REBORN.snapshot().appState==='replay' && REBORN.snapshot().memories.replay")
  assert page.locator('#memory-replay').is_visible();assert page.locator('#memory-replay-camera').inner_text()=='CHASE'
  assert snap()['time']==restore['time']
  assert snap()['livingCar']['vehicle']==restore['livingCar']['vehicle']
  replay_saved=json.loads(page.evaluate("localStorage.getItem('995.reborn.save.v1')"))
  assert replay_saved['vehicle']==restore['livingCar']['vehicle'], 'Replay must not persist its sampled mechanics into the live Jetta'
  assert page.evaluate('document.activeElement.id')=='memory-replay-toggle'
  assert snap()['memories']['replay']['paused'] is True
  assert page.locator('#memory-replay-toggle').inner_text()=='PLAY'
  frozen=snap()['memories']['replay']['time'];page.wait_for_timeout(400);assert abs(snap()['memories']['replay']['time']-frozen)<.02
  page.wait_for_function('Object.values(REBORN.snapshot().memories.audio.levels).every(v=>v===0)')
  page.locator('#memory-replay-progress').evaluate("e=>{e.value='620';e.dispatchEvent(new Event('input',{bubbles:true}))}")
  sought=snap()['memories']['replay'];assert .58<sought['progress']<.66
  page.locator('#memory-replay-camera').click();assert snap()['memories']['replay']['camera']==1
  page.locator('#memory-replay-speed').click();assert snap()['memories']['replay']['speed']==2
  page.locator('#memory-replay-speed').click();assert snap()['memories']['replay']['speed']==.5
  page.locator('#memory-replay-progress').evaluate("e=>{e.value='200';e.dispatchEvent(new Event('input',{bubbles:true}))}")
  page.locator('#memory-replay-toggle').click()
  page.wait_for_function("REBORN.snapshot().memories.audio.nodes===10 && Object.values(REBORN.snapshot().memories.audio.levels).some(v=>v>0)",timeout=30000)
  audio=snap()['memories']['audio'];assert audio['nodes']==10 and max(audio['levels'].values())>0,audio
  page.screenshot(path=str(evidence/'cinematic-memory-replay.png'))
  assert snap()['time']==restore['time']
  assert snap()['livingCar']['vehicle']==restore['livingCar']['vehicle']
  page.evaluate("window.dispatchEvent(new Event('blur'))")
  assert snap()['memories']['replay']['paused'] is True
  page.wait_for_function('Object.values(REBORN.snapshot().memories.audio.levels).every(v=>v===0)')
  # Escape from the editable timeline must exit and return keyboard focus.
  page.locator('#memory-replay-progress').focus();page.keyboard.press('Escape');page.wait_for_function("REBORN.snapshot().appState==='journey'")
  assert page.evaluate('document.activeElement.id')=='ux-tab-memories'
  restored=snap();
  for k,v in restore_car.items(): assert abs(restored['car'][k]-v)<.001,(k,v,restored['car'][k])
  for k,v in restore_vehicle.items(): assert abs(restored['livingCar']['vehicle'][k]-v)<.01,(k,v,restored['livingCar']['vehicle'][k])
  assert page.locator('#ux-panel-memories').is_visible()
  log('cinematic replay: read-only live save/time, four-camera controls, seek/speed, bounded audio, background pause, timeline Escape and focus restoration')

  # Local toggles and persistence.
  page.locator('#memory-diagnostic-audio').uncheck();page.locator('#memory-recording-enabled').uncheck()
  page.reload();ready();hub()
  assert page.locator('#memory-diagnostic-audio').is_checked() is False
  assert page.locator('#memory-recording-enabled').is_checked() is False
  assert len(snap()['memories']['state']['recordings'])==1
  saved_text=page.evaluate("localStorage.getItem('995.reborn.save.v1')")
  log('privacy controls and recording library persist through reload without route upload')
  assert not errors,errors;assert snap()['errors']==[];ctx.close()

  # True touch-emulated landscape acceptance using the same local save.
  saved_obj=json.loads(saved_text);saved_obj['settings']={**saved_obj.get('settings',{}),'quality':'low','tutorialSeen':True,'sound':False};saved_obj['memories']['enabled']=True
  touch=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1)
  touch.add_init_script("localStorage.setItem('995.reborn.save.v1',"+json.dumps(json.dumps(saved_obj))+')')
  t=touch.new_page();t.set_default_timeout(120000);t.on('pageerror',lambda e:errors.append(str(e)))
  t.goto(url);ready(t)
  t.locator('#journey-open').tap();hub_tab(t,'memories');t.locator('.memory-card').scroll_into_view_if_needed()
  actions=t.locator('.memory-card-actions button').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())')
  assert len(actions)==3 and all(r['height']>=44 and r['left']>=0 and r['right']<=844 for r in actions),actions
  t.screenshot(path=str(evidence/'drive-memories-touch-hub.png'))
  t.locator('[data-memory-action="ghost"]').tap();t.wait_for_function("REBORN.snapshot().appState==='play' && REBORN.snapshot().memories.ghost")
  ghost=t.locator('#memory-ghost-strip').bounding_box();buttons=t.locator('#memory-ghost-strip button').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())')
  controls=t.locator('#drive-stick,#touch-controls button,#town-interact').evaluate_all('(es)=>es.filter(e=>e.offsetParent!==null).map(e=>e.getBoundingClientRect().toJSON())')
  assert ghost and ghost['height']<=100 and all(r['height']>=44 for r in buttons)
  for r in controls: assert not overlap(ghost,r),(ghost,r)
  t.screenshot(path=str(evidence/'memory-ghost-touch.png'))
  t.locator('#minimap').tap();assert t.evaluate('REBORN.snapshot().appState')=='map';before=t.evaluate('REBORN.snapshot().memories.ghost.time');t.wait_for_timeout(350);assert abs(t.evaluate('REBORN.snapshot().memories.ghost.time')-before)<.02
  t.locator('#map-resume').tap();t.locator('#memory-ghost-stop').tap();t.keyboard.press('j');hub_tab(t,'memories');t.locator('.memory-card').scroll_into_view_if_needed();t.locator('[data-memory-action="replay"]').tap();t.wait_for_function("REBORN.snapshot().appState==='replay'")
  replay_buttons=t.locator('.memory-replay-controls button').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())')
  assert all(r['height']>=44 and r['left']>=0 and r['right']<=844 and r['top']>=0 and r['bottom']<=390 for r in replay_buttons),replay_buttons
  t.screenshot(path=str(evidence/'memory-replay-touch.png'));t.locator('#memory-replay-exit').tap();t.wait_for_function("REBORN.snapshot().appState==='journey'")
  assert not errors,errors;assert t.evaluate('REBORN.snapshot().errors').__len__()==0
  log('844×390 touch cards, ghost HUD, paused map and replay controls retain clear 44px targets')
  touch.close();browser.close()
 print(json.dumps({'pass':7,'checks':results,'recordingSource':'real short production Free Drive','storage':'localStorage only','physicalPhone':'not tested','errors':errors}),flush=True)
except Exception:
 try:
  (evidence/'failure.json').write_text(json.dumps({'snapshot':page.evaluate('window.REBORN?.snapshot()'),'hidden':page.evaluate('document.hidden'),'focus':page.evaluate('document.hasFocus()'),'errors':errors},indent=2))
  page.screenshot(path=str(evidence/'memory-failure.png'),timeout=15000)
 except Exception as diagnostic: print('Failure snapshot unavailable: '+str(diagnostic),flush=True)
 raise
finally:
 server.shutdown()
