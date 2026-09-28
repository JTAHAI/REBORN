"""Real Chromium regression for HTML-host redirects and complete game reloads.
Requires Python Playwright + Chromium. No production or external requests.
"""
import json, os, subprocess, threading, time
from pathlib import Path
from urllib.parse import urlsplit
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, Error

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / 'site-dist'
EVIDENCE = Path(os.environ.get('REBORN_EVIDENCE', str(ROOT / 'hotfix-evidence')))
EVIDENCE.mkdir(parents=True, exist_ok=True)
BASELINE = '3957339883932f0ed4c3bc9657ae4118aa8def29'
old_path = os.environ.get('REBORN_BASELINE_SW')
ORIGINAL = Path(old_path).read_text() if old_path else subprocess.check_output(
    ['git', 'show', BASELINE + ':tools/service-worker.template.js'], cwd=ROOT, text=True)
FIXED = (ROOT / 'tools/service-worker.template.js').read_text()
phase = {'template': ORIGINAL, 'full': False, 'tag': 'old'}
report = {'checks': [], 'physicalAndroidTested': False}

def passed(message):
    report['checks'].append(message)
    print('PASS ' + message, flush=True)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)
    def log_message(self, *args):
        pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def reply(self, body, content_type='text/html'):
        raw = body.encode()
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
    def do_GET(self):
        path = urlsplit(self.path).path
        # Reproduce the host behavior missing from the previous local server tests.
        if path.endswith('/index.html'):
            self.send_response(307)
            self.send_header('Location', path[:-len('index.html')])
            self.end_headers()
            return
        if path == '/outside/':
            self.reply('<!doctype html><h1>Outside game scope</h1>')
            return
        if path == '/other/sw.js':
            self.reply("self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));", 'text/javascript')
            return
        if not phase['full']:
            for scope in ['/play/', '/standalone/']:
                if path == scope + 'sw.js':
                    script = phase['template'].replace('__BUILD_ID__', phase['tag']).replace(
                        '__SHELL__', '["./index.html","./asset.txt"]')
                    self.reply(script, 'text/javascript')
                    return
                if path == scope:
                    self.reply('<!doctype html><meta name="viewport" content="width=device-width">'
                               '<h1 id="ready">Navigation fixture</h1><script>'
                               'navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});'
                               '</script>')
                    return
                if path == scope + 'asset.txt':
                    self.reply('same-release-asset', 'text/plain')
                    return
        super().do_GET()

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = 'http://127.0.0.1:' + str(server.server_port)

def ready(page):
    page.wait_for_function('!!navigator.serviceWorker.controller', timeout=30000)
    page.evaluate('navigator.serviceWorker.ready')

def worker_updated(page):
    # No controlled game tabs remain. The browser may activate naturally as the
    # old worker loses its last client, or the waiting worker may accept the
    # homepage's idle request. Do not race those two valid lifecycle paths.
    page.evaluate("navigator.serviceWorker.getRegistration('/play/').then(r=>r.update())")
    page.wait_for_function("""async()=>{
      const r=await navigator.serviceWorker.getRegistration('/play/');
      const keys=await caches.keys();
      return !!r.waiting || (keys.some(k=>k.includes('navfix1-')) && !keys.some(k=>k.endsWith('pass07-old')));
    }""")
    page.evaluate("navigator.serviceWorker.getRegistration('/play/').then(r=>r.waiting?.postMessage({type:'REBORN_ACTIVATE_IF_IDLE'}))")
    page.wait_for_function("""async()=>{
      const r=await navigator.serviceWorker.getRegistration('/play/');
      const keys=await caches.keys();
      return !r.waiting && r.active?.state==='activated' && keys.some(k=>k.includes('navfix1-')) && !keys.some(k=>k.endsWith('pass07-old'));
    }""")

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM') or None,
            headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
                                 '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        context = browser.new_context()
        page = context.new_page()
        page.set_default_timeout(30000)
        page.goto(base + '/play/')
        ready(page)
        original_response = page.evaluate("""async()=>{
          const c=await caches.open((await caches.keys())[0]);
          const r=await c.match(new URL('./index.html',location.href));
          localStorage.setItem('995.reborn.save.v1','original-progress-keep');
          localStorage.setItem('unrelated-save','keep');
          await caches.open('another-app-keep');
          await caches.open('995-reborn-'+encodeURIComponent(location.origin+'/')+'-root-keep');
          await caches.open('995-reborn-'+encodeURIComponent('/play/')+'-old-path-cache');
          return {redirected:r.redirected,url:r.url,type:r.type};
        }""")
        assert original_response['redirected'], original_response
        report['originalCachedResponse'] = original_response
        try:
            page.reload(timeout=10000)
            raise AssertionError('Original worker should reproduce the navigation failure')
        except Error as error:
            assert 'ERR_FAILED' in str(error), str(error)
            report['originalError'] = str(error)
        passed('Original deployed worker reproduces ERR_FAILED after index.html redirect')

        phase.update(template=FIXED, tag='fixed')
        # Chromium commits its error document asynchronously after ERR_FAILED.
        # A fresh tab in the SAME context retains the broken worker and all saves.
        page.close()
        page = context.new_page()
        page.set_default_timeout(30000)
        page.goto(base + '/outside/')
        worker_updated(page)
        for suffix in ['/play/', '/play/index.html', '/play/?build=hotfix', '/play/']:
            page.goto(base + suffix)
            assert page.locator('#ready').is_visible()
        ready(page)
        state = page.evaluate("""async()=>{
          const keys=await caches.keys();const c=await caches.open(keys.find(k=>k.includes('navfix1-')));
          const r=await c.match(new URL('/play/index.html',location.origin));
          return {redirected:r.redirected,keys,save:localStorage.getItem('995.reborn.save.v1'),other:localStorage.getItem('unrelated-save')};
        }""")
        assert not state['redirected']
        assert state['save'] == 'original-progress-keep' and state['other'] == 'keep'
        assert 'another-app-keep' in state['keys'] and any(k.endswith('root-keep') for k in state['keys'])
        assert not any(k.endswith('old-path-cache') or k.endswith('pass07-old') for k in state['keys'])
        passed('Broken cached installation upgrades with old game tabs closed; saves and unrelated/root caches survive')
        context.set_offline(True)
        for suffix in ['/play/', '/play/index.html', '/play/?build=offline']:
            page.goto(base + suffix)
            assert page.locator('#ready').is_visible()
        assert page.evaluate("fetch('./asset.txt').then(r=>r.text())") == 'same-release-asset'
        context.set_offline(False)
        passed('Repeated canonical, explicit-index and versioned navigations work offline')

        # An uncontrolled page gets a real redirected network response, like an old disk cache.
        page.goto(base + '/outside/')
        assert page.evaluate("""async()=>{
          const r=await fetch('/play/index.html');if(!r.redirected)return false;
          const c=await caches.open((await caches.keys()).find(k=>k.includes('navfix1-')));
          await c.put(new URL('/play/index.html',location.origin),r);return true;
        }""")
        page.goto(base + '/play/')
        assert page.locator('#ready').is_visible()
        context.set_offline(True)
        page.reload()
        assert page.locator('#ready').is_visible()
        context.set_offline(False)
        passed('Defensive read handles a redirected response reintroduced into the cache')

        page.goto(base + '/outside/')
        page.evaluate("navigator.serviceWorker.register('/other/sw.js',{scope:'/other/'})")
        page.goto(base + '/repair/')
        page.locator('#repair').click()
        page.wait_for_url('**/play/?repair=redirect-safe-v1')
        assert page.locator('#ready').is_visible()
        assert page.evaluate("localStorage.getItem('995.reborn.save.v1')") == 'original-progress-keep'
        assert page.evaluate("navigator.serviceWorker.getRegistrations().then(r=>r.some(x=>x.scope.endsWith('/other/')))")
        passed('Outside-scope repair page restarts only the game worker without deleting saves')
        context.close()

        context = browser.new_context()
        page = context.new_page()
        page.goto(base + '/standalone/')
        ready(page)
        context.set_offline(True)
        page.reload()
        assert page.locator('#ready').is_visible()
        context.close()
        passed('Standalone game under another directory also survives offline reload')

        phase['full'] = True
        for name, viewport, touch in [('desktop', {'width':1100,'height':720}, False),
                                     ('mobile', {'width':844,'height':390}, True)]:
            context = browser.new_context(viewport=viewport, is_mobile=touch, has_touch=touch)
            context.add_init_script("if(!localStorage.getItem('995.reborn.save.v1'))localStorage.setItem('995.reborn.save.v1',JSON.stringify({version:1,settings:{quality:'low',tutorialSeen:true}}));")
            page = context.new_page()
            page.set_default_timeout(45000)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base + '/play/')
            page.wait_for_function('!!window.REBORN && REBORN.snapshot().release.mapReady')
            page.locator('#buttercup-continue').click()
            page.locator('#drive').click()
            page.wait_for_function("REBORN.snapshot().appState==='play'")
            assert page.evaluate('REBORN.snapshot().car.speed') == 0
            if touch:
                if page.locator('#ux-dismiss-tip').is_visible():
                    page.locator('#ux-dismiss-tip').click()
                box = page.locator('#drive-stick').bounding_box()
                assert box is not None
                touch_session = context.new_cdp_session(page)
                touch_session.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{
                    'x':box['x']+box['width']/2,'y':box['y']+box['height']*.22,'id':1}]})
                try:
                    page.wait_for_function('REBORN.snapshot().car.speed>0', timeout=20000)
                finally:
                    touch_session.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
                assert page.locator('#drive-stick').get_attribute('aria-valuenow') == '0'
                touch_session.detach()
            else:
                page.keyboard.down('ArrowUp')
                try:
                    page.wait_for_function('REBORN.snapshot().car.speed>0', timeout=20000)
                finally:
                    page.keyboard.up('ArrowUp')
            page.screenshot(path=str(EVIDENCE / (name + '-driving.png')))
            assert not errors, errors
            assert page.evaluate('REBORN.snapshot().errors') == []
            ready(page)
            for _ in range(2):
                page.reload()
                page.wait_for_function('!!window.REBORN')
            context.set_offline(True)
            page.reload()
            page.wait_for_function('!!window.REBORN')
            assert not errors, errors
            context.close()
            passed('Full packaged game: ' + name + ' drive input, cached reloads and offline reload')
        browser.close()
        report['result'] = 'passed'
except Exception as error:
    report['result'] = 'failed'
    report['error'] = str(error)
    raise
finally:
    (EVIDENCE / 'navigation-report.json').write_text(json.dumps(report, indent=2))
    server.shutdown()
