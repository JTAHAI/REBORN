from pathlib import Path
import subprocess
r=Path.cwd()
p=r/'index.html';s=p.read_text();old="const firstFocusable=panel.querySelector('input:not([disabled]),select:not([disabled]),button:not([disabled])');"
new="const firstFocusable=Array.from(panel.querySelectorAll('input:not([disabled]),select:not([disabled]),button:not([disabled])')).find(el=>el.offsetParent!==null&&!el.hidden&&el.tabIndex>=0&&!el.closest('[inert]'));"
assert old in s;s=s.replace(old,new);p.write_text(s)
p=r/'tests/session-saves-browser.py';s=p.read_text();old="pause(owner);owner.locator('#ux-units').select_option('kph');pair=raw(owner)";new="pause(owner);assert owner.evaluate('document.activeElement.id')=='sound-setting'\n  owner.locator('#ux-units').select_option('kph');pair=raw(owner)";assert old in s;s=s.replace(old,new)
old="pause(other);other.locator('#ux-units').select_option('mph')";new="pause(other);assert other.evaluate('document.activeElement.id')=='session-export'\n  other.locator('#ux-units').select_option('mph')";assert old in s;s=s.replace(old,new)
old="other.close();assert raw(owner)==pair";new="""# A narrow paused menu must expose all save actions at large reading sizes.
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
  other.close();assert raw(owner)==pair""";assert old in s;s=s.replace(old,new)
a=s.index('except Exception as error:');b=s.index('\nfinally:',a)
s=s[:a]+'''except Exception as error:
 report['result']='failed';report['error']=str(error)
 try:
  for ci,ctx in enumerate(browser.contexts):
   for pi,pg in enumerate(ctx.pages):
    try:
     report.setdefault('failurePages',[]).append({'url':pg.url,'snapshot':pg.evaluate('window.REBORN?.snapshot()')})
     pg.screenshot(path=str(OUT/f'session-failure-{ci}-{pi}.png'))
    except Exception:pass
 except Exception:pass
 raise'''+s[b:];p.write_text(s)
p=r/'docs/SESSION_SAFETY_PASS_018.md';s=p.read_text();old='The top-level save label identifies session-only operation.';new='Pause autofocus skips actions inside hidden banners. When save protection is\nvisible, its export action receives focus. The narrow paused menu is tested at\n100% and 200% reading size with all three actions reachable.\n\n'+old;assert old in s;p.write_text(s.replace(old,new))
subprocess.run(['node','tools/bundle.cjs'],check=True)
subprocess.run(['git','add','index.html','dist/index.html','tests/session-saves-browser.py','docs/SESSION_SAFETY_PASS_018.md'],check=True)
tree=subprocess.check_output(['git','write-tree'],text=True).strip()
assert tree=='e27c691021731163d52238fcc995946755276f17',tree
print('Exact focus-correction candidate:',tree)
