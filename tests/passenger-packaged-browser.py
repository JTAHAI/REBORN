"""Packaged Pass 5 UI/lifecycle acceptance using isolated local saves.
End-of-route positions are explicit save fixtures, not claimed manual drive-throughs.
No production service or data is contacted. No writable game debug hooks are added.
"""
import json, os, subprocess, threading, tempfile
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
site=root/'site-dist'
fixtures=json.loads(subprocess.check_output(['node',str(root/'tests/passenger-fixtures.cjs')],text=True))
evidence=Path(os.environ.get('REBORN_SCREENSHOTS',tempfile.mkdtemp(prefix='reborn-passenger-')))
evidence.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(site),**kw)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_port)
def log(s): print(s,flush=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  def open_case(save=None,touch=False):
   ctx=browser.new_context(viewport={'width':844 if touch else 1100,'height':390 if touch else 720},has_touch=touch,is_mobile=touch)
   seed=save or {'version':1,'settings':{'quality':'low','tutorialSeen':True}}
   ctx.add_init_script("if(location.protocol.startsWith('http')&&!sessionStorage.getItem('fixture-seeded')){localStorage.setItem('995.reborn.save.v1',"+json.dumps(json.dumps(seed))+");sessionStorage.setItem('fixture-seeded','1');}")
   page=ctx.new_page();page.set_default_timeout(30000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(base+'/play/');page.wait_for_function('window.REBORN && REBORN.snapshot().passengers')
   if page.locator('#buttercup-continue').is_visible():page.locator('#buttercup-continue').click()
   return ctx,page,errors
  def resume(page,story):
   page.locator('#passenger-open').click();page.locator('[data-passenger-story="'+story+'"]').click()
   page.wait_for_function("REBORN.snapshot().appState==='play' && !document.getElementById('passenger-choice').hidden")
  # New launch, unanswered conversation survives pause and page reload with the
  # original deadline. A keyboard response must not operate an unrelated control.
  ctx,page,errors=open_case();resume(page,'long-way-home');page.keyboard.press('j');page.locator('#ux-tab-stories').click()
  prompt=page.evaluate('REBORN.snapshot().passengers.state.active.prompt');town=page.evaluate('REBORN.snapshot().town.minuteOfDay')
  page.wait_for_timeout(500);assert page.evaluate('REBORN.snapshot().town.minuteOfDay')==town
  page.reload();page.wait_for_function('window.REBORN && !document.getElementById("intro").hidden')
  if page.locator('#buttercup-continue').is_visible():page.locator('#buttercup-continue').click()
  assert page.evaluate('REBORN.snapshot().passengers.state.active.prompt.expiresAt')==prompt['expiresAt']
  resume(page,'long-way-home');page.keyboard.press('3');page.wait_for_function('!REBORN.snapshot().passengers.state.active.prompt')
  assert page.evaluate('REBORN.snapshot().passengers.state.stats.silences')==1
  assert page.evaluate('REBORN.snapshot().passengers.active.commitment')=='avoid-mill'
  page.keyboard.press('Escape');page.locator('#garage').click();assert page.locator('#passenger-exit').is_visible()
  page.keyboard.press('Escape');assert page.evaluate('REBORN.snapshot().appState')=='pause'
  page.locator('#garage').click();page.locator('#passenger-exit-end').click();page.wait_for_function("REBORN.snapshot().appState==='menu'")
  assert page.evaluate('REBORN.snapshot().passengers.active') is None
  assert page.evaluate('REBORN.snapshot().passengers.state.relationships.mara.trust')==48
  assert not errors,errors;assert page.evaluate('REBORN.snapshot().errors')==[];ctx.close()
  log('PASS packaged unanswered reload, frozen choice clock, keyboard silence and confirmed abandonment')
  # Every authored ending uses production tick -> second question -> answer ->
  # stopped arrival -> result dialog -> journal -> save reload. Road positions
  # are fixtures so slow software rendering does not replace a test with a race.
  for i,story in enumerate(['long-way-home','last-part','first-snow']):
   ctx,page,errors=open_case(fixtures[story]);resume(page,story)
   assert page.evaluate('REBORN.snapshot().passengers.state.active.prompt.id')==['mara-arrival','eli-temp','nora-call'][i]
   page.locator('[data-passenger-choice="silence"]').click()
   page.wait_for_function("REBORN.snapshot().appState==='passenger-result'",timeout=60000)
   assert page.locator('#passenger-result-title').text_content()==['The Long Way Home','The Last Part Before Closing','First Snow'][i]
   snap=page.evaluate('REBORN.snapshot()');assert story in snap['passengers']['state']['completed'];assert snap['passengers']['active'] is None
   assert snap['weather']['mode']=='clear',snap['weather']['mode']
   stored=page.evaluate("JSON.parse(localStorage.getItem('995.reborn.save.v1'))")
   assert any(e.get('kind')=='journey' for e in stored['journal'])
   page.screenshot(path=str(evidence/('passenger-ending-'+story+'.png')))
   page.locator('#passenger-result-hub').click();assert page.locator('#ux-panel-stories').is_visible()
   if i<2:assert page.locator('[data-passenger-story="'+['last-part','first-snow'][i]+'"]').is_enabled()
   page.reload();page.wait_for_function('window.REBORN && REBORN.snapshot().passengers')
   assert story in page.evaluate('REBORN.snapshot().passengers.state.completed')
   assert not errors,errors;assert page.evaluate('REBORN.snapshot().errors')==[];ctx.close()
   log('PASS packaged authored ending, unlock, journal and reload: '+story)
  ctx,page,errors=open_case(fixtures['unsafe']);page.locator('#passenger-open').click();page.locator('[data-passenger-story="long-way-home"]').click();page.wait_for_function("REBORN.snapshot().appState==='play'")
  page.keyboard.press('Escape');page.locator('#garage').click();assert page.locator('#passenger-safe-exit').is_visible()
  page.locator('#passenger-safe-exit').click();page.wait_for_function("REBORN.snapshot().appState==='menu'")
  assert page.evaluate('REBORN.snapshot().passengers.state.relationships.mara.trust')==50
  assert not errors,errors;ctx.close();log('PASS mechanically unsafe onward ride has no relationship penalty')
  ctx,page,errors=open_case(touch=True);resume(page,'long-way-home')
  # Avoid a browser fullscreen transition changing the layout fixture.
  page.evaluate('document.fullscreenElement ? document.exitFullscreen() : undefined');page.set_viewport_size({'width':844,'height':390})
  page.screenshot(path=str(evidence/'passenger-touch-layout.png'))
  boxes=page.evaluate("""() => {
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
   return {choices:[...document.querySelectorAll('[data-passenger-choice]')].map(rect),stick:rect(document.getElementById('drive-stick')),controls:[...document.querySelectorAll('#touch-controls button')].filter(e=>!e.hidden && e.getBoundingClientRect().width).map(rect),touch:document.body.classList.contains('touch')};
  }""")
  assert boxes['touch'];assert len(boxes['choices'])==3
  def overlaps(a,b):return min(a['x']+a['w'],b['x']+b['w'])>max(a['x'],b['x'])+1 and min(a['y']+a['h'],b['y']+b['h'])>max(a['y'],b['y'])+1
  for b in boxes['choices']:
   assert b['h']>=44 and b['x']>=0 and b['x']+b['w']<=845 and b['y']>=0 and b['y']+b['h']<=391,boxes
   assert not any(overlaps(b,c) for c in [boxes['stick'],*boxes['controls']]),boxes
  page.screenshot(path=str(evidence/'passenger-touch-choices.png'))
  page.locator('[data-passenger-choice="long"]').tap();assert page.evaluate('REBORN.snapshot().passengers.active.commitment')=='avoid-mill'
  assert not errors,errors;assert page.evaluate('REBORN.snapshot().errors')==[];ctx.close();browser.close()
  log('PASS 844x390 touch choices clear of driving controls; all six packaged scenarios have no browser exceptions')
finally:
 server.shutdown()
