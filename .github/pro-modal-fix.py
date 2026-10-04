from pathlib import Path
import json,subprocess
p=Path('index.html');s=p.read_text()
a="function action(name){\n if(document.querySelector('dialog[open]'))return;"
b=a+"\n if(state==='photo'){if(name==='pause')proClosePhoto();return;}"
assert a in s;s=s.replace(a,b)
a="document.addEventListener('keydown',e=>{\n if(e.key==='Tab'"
b="document.addEventListener('keydown',e=>{\n if(document.querySelector('dialog[open]'))return;\n if(e.key==='Tab'"
assert a in s;s=s.replace(a,b);p.write_text(s)
p=Path('src/memory-replay-ui.js');s=p.read_text();a="document.addEventListener('keydown',e=>{const editing=";assert a in s;p.write_text(s.replace(a,"document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;const editing="))
p=Path('src/pro-driving-ui.js');s=p.read_text().replace("e.code==='KeyP'","e.code==='F8'").replace('P · PHOTO MODE','F8 · PHOTO MODE').replace('photo mode. P','photo mode. F8').replace('Photo mode · P','Photo mode · F8');p.write_text(s)
p=Path('tests/pro-driving-browser.py');s=p.read_text().replace("p.keyboard.press('KeyP')","p.keyboard.press('F8')")
s=s.replace("assert frozen(p)==a;p.keyboard.press('Escape')","assert frozen(p)==a;p.keyboard.press('KeyJ');assert snapshot(p)['appState']=='photo';p.keyboard.press('Escape')")
s=s.replace("VERSION=json.loads((ROOT/'package.json').read_text())['version'];", "VERSION=json.loads((ROOT/'package.json').read_text())['version'];")
p.write_text(s)
p=Path('package.json');d=json.loads(p.read_text());d['scripts']['test']+=' && node tests/hometown-drives.cjs';p.write_text(json.dumps(d,indent=2)+'\n')
subprocess.run(['node','tools/bundle.cjs'],check=True)
