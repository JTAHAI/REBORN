"""Inspect actual full-site output and embedded ZIP, including local links."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import hashlib,json,zipfile,sys
root=Path(__file__).resolve().parent.parent
site=root/'site-dist';game=root/'standalone-dist'
class Links(HTMLParser):
 def __init__(self): super().__init__(); self.ids=[]; self.urls=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get('id'): self.ids.append(a['id'])
  for k in ['href','src']:
   if a.get(k): self.urls.append(a[k])
errors=[]; html_count=0
for f in site.rglob('*.html'):
 p=Links(); text=f.read_text();p.feed(text);html_count+=1
 assert len(set(p.ids))==len(p.ids),(f,'duplicate IDs')
 assert '{{' not in text or f.name=='index.html' and f.parent.name=='play','Unexpanded website placeholders'
 for url in p.urls:
  u=urlsplit(url)
  if u.scheme or u.netloc or not u.path:continue
  target=(site/unquote(u.path).lstrip('/')) if u.path.startswith('/') else (f.parent/unquote(u.path))
  if target.is_dir():target=target/'index.html'
  if not target.is_file():errors.append((str(f.relative_to(site)),url))
assert not errors,errors
release=json.loads((site/'release.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert release['pass']==4 and release['remainingPasses']==4
assert sha(site/'play/index.html')==release['packagedPlayIndexSha256']
assert sha(site/'play/index.html')==sha(game/'index.html')
assert sha(site/'play/assets/worlds/north-berwick/world.json')==release['northBerwickWorldSha256']
archive=site/'downloads'/release['standaloneZip'];assert sha(archive)==release['standaloneZipSha256']
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None and 'index.html' in z.namelist()
 for p in game.rglob('*'):
  if p.is_file():assert z.read(p.relative_to(game).as_posix())==p.read_bytes(),p
 assert not any(n.startswith('dist/') for n in z.namelist())
html=(site/'play/index.html').read_text()
for text in ['MAINE WEATHER','weather-chip','buttercup-dedication','memorial-credits-open','town-ledger','995.reborn.save.v1','9855','MaineWeather']:
 assert text in html,text
assert html.count('id="buttercup-dedication"')==1
assert html.count('src="./memorial.js')==1
assert html.count('src="./release-client.js')==1
assert 'window.localStorage.clear' not in html and 'localStorage.clear' not in (game/'sw.js').read_text()
assert 'North Berwick Grand Prix' not in html
assert (game/'sw.js').read_text().count('__BUILD_ID__')==0
assert not (site/'sw.js').exists(),'No root worker should compete with the game scope'
assert all(p.stat().st_size<25*1024*1024 for p in site.rglob('*') if p.is_file())
assert 'immutable' not in (site/'_headers').read_text()
print(json.dumps({'siteHtmlPages':html_count,'brokenLocalLinks':len(errors),'siteFiles':sum(p.is_file() for p in site.rglob('*')),'matchingDownloadFiles':sum(p.is_file() for p in game.rglob('*')),'matchingWorldAndGLB':True,'pass':4,'remaining':4}))
