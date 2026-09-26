"""Optional local test transport. Runs the SAME browser acceptance assertions.
Requires Python Playwright plus an installed Chromium; never used by the game.
"""
import json, os, sys
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('REBORN_CHROMIUM', '/usr/bin/chromium'), headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':1366,'height':900})
    page.set_default_timeout(20000)
    if os.environ.get('REBORN_BROWSER_LOW') == '1':
        page.add_init_script("try {const k='995.reborn.save.v1',s=JSON.parse(localStorage.getItem(k)||'null')||{version:1};s.settings={...(s.settings||{}),quality:'low'};localStorage.setItem(k,JSON.stringify(s));} catch (_) {}")
    for line in sys.stdin:
        try:
            args = json.loads(line); command = args[0]; result = None
            print('Browser command: '+str(args[0])+(' '+str(args[1])[:90] if len(args)>1 else ''),file=sys.stderr,flush=True)
            if command == 'open':
                page.goto(args[1], wait_until='load'); page.wait_for_timeout(350)
                if args[1] != 'about:blank':
                    page.wait_for_function('window.REBORN && !document.getElementById("intro").hidden', timeout=30000)
                    page.wait_for_timeout(300)
            elif command == 'set' and args[1] == 'viewport':
                page.set_viewport_size({'width':int(args[2]),'height':int(args[3])}); page.wait_for_timeout(150)
            elif command == 'eval': result = page.evaluate(args[1])
            elif command == 'click':
                page.locator(args[1]).click(); page.wait_for_timeout(120)
            elif command == 'fill': page.locator(args[1]).fill(args[2])
            elif command == 'select': page.locator(args[1]).select_option(args[2])
            elif command == 'check': page.locator(args[1]).check()
            elif command == 'uncheck': page.locator(args[1]).uncheck()
            elif command == 'press': page.keyboard.press(args[1])
            elif command == 'wait': page.wait_for_timeout(float(args[1]))
            elif command == 'reload':
                page.reload(wait_until='load'); page.wait_for_function('window.REBORN && !document.getElementById("intro").hidden'); page.wait_for_timeout(300)
            elif command == 'mouse':
                if args[1] == 'move': page.mouse.move(float(args[2]),float(args[3]))
                elif args[1] == 'down': page.mouse.down()
                elif args[1] == 'up': page.mouse.up()
                else: raise ValueError('Unsupported mouse command')
            elif command == 'screenshot': page.screenshot(path=args[1])
            elif command == 'close':
                browser.close(); print(json.dumps({'ok':True,'result':None}),flush=True); break
            else: raise ValueError('Unsupported command: '+repr(args))
            print(json.dumps({'ok':True,'result':result}),flush=True)
        except Exception as e:
            print(json.dumps({'ok':False,'error':str(e)}),flush=True)
