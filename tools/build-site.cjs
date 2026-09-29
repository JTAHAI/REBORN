#!/usr/bin/env node
'use strict';
// Reproducible complete memorial website, current game and matching download.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'site-dist'),game=path.join(root,'standalone-dist');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):e.isFile()?[path.join(dir,e.name)]:[]);
const write=(file,data)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);};
require('./bundle.cjs');
const pkg=JSON.parse(read('package.json'));
let sha=process.env.REBORN_SOURCE_SHA;
if(!sha){try{sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{throw new Error('Set REBORN_SOURCE_SHA when building without git history');}}
if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('REBORN_SOURCE_SHA must be an exact 40-character commit');
const short=sha.slice(0,7),download=`REBORN-PASS-11-RECOVERY-INTEGRITY-${short}-Standalone.zip`;
const inputs=[...files(path.join(root,'dist')),...files(path.join(root,'website-game-shell')),...files(path.join(root,'website')),path.join(root,'tools/service-worker.template.js')];
const contentTag=hash(Buffer.concat(inputs.flatMap(f=>[Buffer.from(path.relative(root,f).replaceAll(path.sep,'/')+'\0'),fs.readFileSync(f)]))).slice(0,16);
const world=JSON.parse(read('assets/worlds/north-berwick/world.json'));
const vars={SOURCE_SHA:sha,SHORT_SHA:short,CACHE_TAG:contentTag,STANDALONE_ZIP:download,WORLD_ROADS:String(world.roads.length),BUILDINGS:world.buildings.length.toLocaleString('en-US'),LANDMARKS:String(world.landmarks.length)};
const substitute=s=>s.replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{if(!Object.hasOwn(vars,key))throw new Error('Unknown website token '+key);return vars[key];});
for(const dir of [out,game]){fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});}
for(const file of files(path.join(root,'website'))){const target=path.join(out,path.relative(path.join(root,'website'),file));const ext=path.extname(file);write(target,['.html','.css','.js','.txt',''].includes(ext)?substitute(fs.readFileSync(file,'utf8')):fs.readFileSync(file));}
fs.cpSync(path.join(root,'dist'),game,{recursive:true});
for(const f of files(path.join(root,'website-game-shell'))){if(path.basename(f)==='dedication.html')continue;write(path.join(game,path.relative(path.join(root,'website-game-shell'),f)),fs.readFileSync(f));}
let html=read('dist/index.html');
if(!html.includes('const M = root.RebornVehicle')&&!html.includes('const M=')&&!html.includes('M=V.M'))throw new Error('Review material enum binding before packaging');
if(html.includes('buttercup-dedication')||html.includes('memorial.js'))throw new Error('The game shell must be injected exactly once');
const dedication=read('website-game-shell/dedication.html');
html=html.replace('</head>',`<link rel="manifest" href="./manifest.webmanifest"><link rel="icon" href="./assets/icon.svg"><link rel="stylesheet" href="./memorial.css?v=${contentTag}"></head>`);
html=html.replace('<div id="app">',dedication+'\n<div id="app">');
html=html.replace(/<span>BUILD 020 <i>\/<\/i>[^<]*<\/span>/,'<button id="memorial-credits-open" type="button">FOR BUTTERCUP · CREDITS</button>');
// The footer varies slightly across historical releases; fail rather than omit the notice access.
if(!html.includes('id="memorial-credits-open"'))html=html.replace('<footer class="intro-footer">','<footer class="intro-footer"><button id="memorial-credits-open" type="button">FOR BUTTERCUP · CREDITS</button>');
html=html.replace('</body>',`<script src="./memorial.js?v=${contentTag}"></script><script src="./release-client.js?v=${contentTag}"></script></body>`);
write(path.join(game,'index.html'),html);
for(const n of ['LICENSE.txt','EXHIBIT-B.txt','NOTICE.txt','MEDIA-NOTICE.txt'])write(path.join(game,n),read('website/'+n));
const credits=['# 99½ REBORN — Build 020','In loving memory — Buttercup, Justin Tahai\'s 99.5 mkIV','Source: https://github.com/JTAHAI/REBORN/tree/'+sha,read('assets/vehicles/jetta-mkiv/CREDITS.md'),read('assets/worlds/north-berwick/CREDITS.md')].join('\n\n');write(path.join(game,'CREDITS.md'),credits);
const release={game:pkg.version,runtime:'0.17.0-recovery-integrity-p020',pass:11,originalMilestonePasses:8,remainingPasses:0,sourceCommit:sha,baselineCommit:'201a628b4c9819385f9b90b74a0e0991aa0e5ae7',upstreamIndexSha256:hash(read('dist/index.html')),packagedPlayIndexSha256:hash(html),modelSha256:hash(fs.readFileSync(path.join(root,'assets/vehicles/jetta-mkiv/volkswagen-bora-jetta-mk4-2005.cc-by-4.0.glb'))),northBerwickWorldSha256:hash(read('assets/worlds/north-berwick/world.json')),navigationHotfix:'redirect-safe-v1',navigationHotfixBase:'d0dd8466cb3d9f659cbccc31ad25138d9270ca73',architecture:'static-front-end-only',status:'playable-pre-alpha',cacheTag:contentTag};
write(path.join(game,'release.json'),JSON.stringify(release,null,2)+'\n');
write(path.join(game,'START-HERE.txt'),'99½ REBORN — Pass 11 · Build 020 recovery integrity. Original eight-pass milestone complete.\n\nServe this folder over local HTTP (for example: python -m http.server 8000),\nthen open http://localhost:8000/. Double-click file:// is not supported by the\nasset loader. No map API, login, database or server-side game logic is required.\n\nBuild 020 keeps a bounded local emergency checkpoint while a drive or replay is\nactive. It never restores automatically. After an interrupted tab, review the\ncheckpoint on the garage screen, download it, restore it deliberately, or keep\nthe existing stored game. A successful normal exit removes the checkpoint.\n\nJ: four-section hub. Drive: passenger/Echo journeys. Jetta: status/workshop.\nTown: ledger and road map. Journal: drives/recordings. M: paused map. F: nearby incident. E: existing pulse.\n1 / 2 / 3: passenger response; letting the prompt expire chooses silence.\nJ / Drive Memories: manage local route recordings, ghosts and replays.\nG pauses or resumes a route ghost; Shift+G stops it. Replay uses Space, C,\ntimeline seek and the on-screen controls. Replay starts paused.\nAll saves, emergency checkpoints and route recordings remain local to the browser.\n');
const shell=files(game).map(f=>'./'+path.relative(game,f).replaceAll(path.sep,'/')).filter(n=>!n.endsWith('.txt'));
const sw=read('tools/service-worker.template.js').replace('__BUILD_ID__',hash(JSON.stringify(release)).slice(0,16)).replace('__SHELL__',JSON.stringify(shell));write(path.join(game,'sw.js'),sw);
fs.cpSync(game,path.join(out,'play'),{recursive:true});
fs.mkdirSync(path.join(out,'downloads'),{recursive:true});
const python=process.env.PYTHON||(process.platform==='win32'?'python':'python3');
cp.execFileSync(python,[path.join(root,'tools/zip-static.py'),game,path.join(out,'downloads',download)],{stdio:'inherit'});
release.standaloneZip=download;release.standaloneZipSha256=hash(fs.readFileSync(path.join(out,'downloads',download)));write(path.join(out,'release.json'),JSON.stringify(release,null,2)+'\n');
write(path.join(out,'release-notes.txt'),`99½ REBORN — Build 020 / Pass 11 · recovery integrity
Original eight-pass milestone complete
Source: ${sha}

New: a bounded, local-only interrupted-session checkpoint while a drive or replay
is active. A normal successful exit removes the checkpoint. After a browser tab,
renderer or process interruption, the garage presents a review card with download,
explicit restore-to-garage and keep-stored-game choices. Recovery never happens
automatically and never resumes an exact road position.

Stored-progress integrity remains fail-closed. A recovery checkpoint records the
stored pair it began from; if the stored game changes later, direct restore is
disabled rather than overwriting newer progress. Restores still preserve the exact
pre-restore raw pair under the existing recovery key. Non-writing tabs remain
session-only and can export without overwriting the saving tab.

Graphics interruption handling now avoids WebGL calls while the context is lost,
abandons invalid old GPU handles, rebuilds resources by generation, and declares
success only after a complete frame renders. If restoration does not complete,
the local export and graphics-restart controls remain available. Browser acceptance
records whether the native WEBGL_lose_context event was observed; deterministic
production-listener coverage is reported separately instead of being mislabeled.

Retained: Chrome redirected-navigation repair, offline installation, idle-consent
updates, four-section hub, North Berwick routes, owner-correct MkIV, Living Car,
diagnostics, Workshop memory, Maine weather, passengers, Living Town, Echo Roads,
local Drive Memories, ghosts, replay and synthesized diagnostic audio.

No account, telemetry, cloud save, live map service or runtime backend has been
added. Browser storage can still be cleared or evicted, so downloaded backups
remain the durable copy. This is a playable pre-alpha, not physical-device GPU,
performance, handling, visual or commercial acceptance.

Standalone SHA-256: ${release.standaloneZipSha256}
`);
write(path.join(out,'DEPLOY-README.txt'),'FULL WEBSITE PACKAGE\nindex.html is the memorial homepage; play/ contains the current game.\nDeploy the CONTENTS of this directory or the full website ZIP to your existing\nstatic host. The recorded production host is Workers Static Assets, not Pages.\nDo not replace this website with game-only dist/.\nNo deployment, hosting-plan, domain, binding or production configuration change\nis performed by the build or packaging commands.\n\nThe website has no root service worker. The game worker owns only its scope.\nCached installations update after the full game is cached, the player approves,\nand other in-scope game tabs are idle;\nlocalStorage saves are never cleared by the updater.\n\nIf a prior game installation shows ERR_FAILED, close other game tabs,\nopen /repair/ on this same site and choose Repair game loading.\nDo not clear site data: the repair leaves saves, memories and any interrupted-session checkpoint intact.\n\nAfter publishing, close older REBORN tabs before opening Build 020.\n');
console.log(JSON.stringify({site:out,standalone:game,...release},null,2));
module.exports={out,game,release};
