from pathlib import Path
import base64,gzip,hashlib,subprocess,sys
transport=Path(sys.argv[1]);root=Path.cwd()
encoded=''.join((transport/f'pass09-candidate.{i}.b64').read_text().strip() for i in range(1,4))
patch=gzip.decompress(base64.b64decode(encoded,validate=True))
assert hashlib.sha256(patch).hexdigest()=='f9897bff62b25bfeb89ce9e6a7028e61ed66000c0ff74aa3ad69539cf04596cb'
subprocess.run(['git','apply','--unidiff-zero','-'],input=patch,check=True)
def edit(name,old,new):
 p=root/name;s=p.read_text();assert old in s,(name,old[:100]);p.write_text(s.replace(old,new))
edit('index.html','  /* RELEASE_CORE_BEGIN */','  /* SESSION_SAVES_BEGIN */\n  /* SESSION_SAVES_END */\n  /* RELEASE_CORE_BEGIN */')
edit('index.html','/* RELEASE_UI_BEGIN */','/* SESSION_SAVE_UI_BEGIN */\n/* SESSION_SAVE_UI_END */\n/* RELEASE_UI_BEGIN */')
edit('index.html','WorkshopMemories,ReleaseUX};','WorkshopMemories,ReleaseUX,SessionSaves};')
edit('index.html',"rawStoredStory=null,releaseWorldError='';","rawStoredStory=null,storedPairRead=false,releaseWorldError='';")
edit('index.html','rawStoredStory=localStorage.getItem(STORY_STORAGE);hadSave','rawStoredStory=localStorage.getItem(STORY_STORAGE);storedPairRead=true;hadSave')
edit('index.html','const settings=save.settings;',"const sessionSave=new C.SessionSaves.Guard(()=>localStorage,STORAGE,STORY_STORAGE,rawStoredSave,rawStoredStory,storedPairRead);\nconst settings=save.settings;")
p=root/'index.html';s=p.read_text();a=s.index('function persist(){');b=s.index('\n',a)
s=s[:a]+'''function persist(){
 captureSessionSave();if(saveLoadBlocked){setUXSaveStatus(false);return false;}
 let result;try{result=sessionSave.write(JSON.stringify(save),JSON.stringify(director.progress));}catch{result=sessionSave.fail('unavailable');}
 storageAvailable=result.ok;if(result.ok){[rawStoredSave,rawStoredStory]=sessionSave.expected;}
 setUXSaveStatus(storageAvailable);sessionSaveNotice();return result.ok;
}'''+s[b:]
s=s.replace('initReleaseUX();applySettings();','initReleaseUX();initSessionSaves();applySettings();').replace('0.14.0-hometown-ux-p017','0.15.0-session-safety-p018').replace('BUILD 017','BUILD 018').replace('Build 017','Build 018')
p.write_text(s)
edit('website/index.html','BUILD 017 · YOUR HOMETOWN, TOGETHER','BUILD 018 · YOUR DRIVES, PROTECTED')
edit('website/index.html','Drive, Jetta, Town, Journal. Find a mapped road route, read a conversation at your pace, and keep your saves safe. The red AEM driveway story stays in the workshop.','One saving tab at a time. Keep driving in a second tab without overwriting stored progress, export its session, and reload deliberately. The hometown routes and red AEM driveway story stay.')
edit('website/index.html','Pass 8 of 8 · Build 017','Pass 9 · Build 018')
edit('website-game-shell/dedication.html','Playable Build 014 / passenger drives, Maine weather, the living town, diagnostics and the modern driving interface','Playable Build 018 / protected local saves, hometown routes, passenger drives, Maine weather, the living town, diagnostics and the modern driving interface')
subprocess.run(['node','tools/bundle.cjs'],check=True)
subprocess.run(['git','add','--all'],check=True)
tree=subprocess.check_output(['git','write-tree'],text=True).strip()
assert tree=='09ce29187a53a446ce8c17ecff0affd225af540e',tree
print('Exact candidate tree verified:',tree)
