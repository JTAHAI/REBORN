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
const short=sha.slice(0,7),download=`REBORN-PASS-05-DRIVE-STORIES-${short}-Standalone.zip`;
const inputs=[...files(path.join(root,'dist')),...files(path.join(root,'website-game-shell'))];
const contentTag=hash(Buffer.concat(inputs.map(f=>fs.readFileSync(f)))).slice(0,16);
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
html=html.replace(/<span>BUILD 014 <i>\/<\/i>[^<]*<\/span>/,'<button id="memorial-credits-open" type="button">FOR BUTTERCUP · CREDITS</button>');
// The footer varies slightly across historical releases; fail rather than omit the notice access.
if(!html.includes('id="memorial-credits-open"'))html=html.replace('<footer class="intro-footer">','<footer class="intro-footer"><button id="memorial-credits-open" type="button">FOR BUTTERCUP · CREDITS</button>');
html=html.replace('</body>',`<script src="./memorial.js?v=${contentTag}"></script><script src="./release-client.js?v=${contentTag}"></script></body>`);
write(path.join(game,'index.html'),html);
for(const n of ['LICENSE.txt','EXHIBIT-B.txt','NOTICE.txt','MEDIA-NOTICE.txt'])write(path.join(game,n),read('website/'+n));
const credits=['# 99½ REBORN — Build 014','In loving memory — Buttercup, Justin Tahai\'s 99.5 mkIV','Source: https://github.com/JTAHAI/REBORN/tree/'+sha,read('assets/vehicles/jetta-mkiv/CREDITS.md'),read('assets/worlds/north-berwick/CREDITS.md')].join('\n\n');write(path.join(game,'CREDITS.md'),credits);
const release={game:pkg.version,runtime:'0.11.0-drive-stories-p014',pass:5,remainingPasses:3,sourceCommit:sha,baselineCommit:'e0fb07ab5ceb2d5a50266aa339ba5420b5772ab3',upstreamIndexSha256:hash(read('dist/index.html')),packagedPlayIndexSha256:hash(html),modelSha256:hash(fs.readFileSync(path.join(root,'assets/vehicles/jetta-mkiv/volkswagen-bora-jetta-mk4-2005.cc-by-4.0.glb'))),northBerwickWorldSha256:hash(read('assets/worlds/north-berwick/world.json')),architecture:'static-front-end-only',status:'playable-pre-alpha',cacheTag:contentTag};
write(path.join(game,'release.json'),JSON.stringify(release,null,2)+'\n');
write(path.join(game,'START-HERE.txt'),'99½ REBORN — Pass 5 of 8. 3 passes remaining.\n\nServe this folder over local HTTP (for example: python -m http.server 8000),\nthen open http://localhost:8000/. Double-click file:// is not supported by the\nasset loader. No map API, login, database or server-side game logic is required.\n\nJ: Jetta hub. M: paused map. F: nearby incident. E: existing pulse.\n1 / 2 / 3: passenger response; letting the prompt expire chooses silence.\nThe Passenger Drives tab contains three fictional North Berwick journeys.\nWeather, schedules, passengers and personal situations are authored gameplay.\n');
const shell=files(game).map(f=>'./'+path.relative(game,f).replaceAll(path.sep,'/')).filter(n=>!n.endsWith('.txt'));
const sw=read('tools/service-worker.template.js').replace('__BUILD_ID__',hash(JSON.stringify(release)).slice(0,16)).replace('__SHELL__',JSON.stringify(shell));write(path.join(game,'sw.js'),sw);
fs.cpSync(game,path.join(out,'play'),{recursive:true});
fs.mkdirSync(path.join(out,'downloads'),{recursive:true});
const python=process.env.PYTHON||(process.platform==='win32'?'python':'python3');
cp.execFileSync(python,[path.join(root,'tools/zip-static.py'),game,path.join(out,'downloads',download)],{stdio:'inherit'});
release.standaloneZip=download;release.standaloneZipSha256=hash(fs.readFileSync(path.join(out,'downloads',download)));write(path.join(out,'release.json'),JSON.stringify(release,null,2)+'\n');
write(path.join(out,'release-notes.txt'),`99½ REBORN — Build 014 / Pass 5 of 8\n3 passes remaining\nSource: ${sha}\n\nNew: three complete fictional passenger drives, in-car choices that do not pause\nthe road, explicit silence, route commitments, relationship trust, resume after\nreload, Jetta Hub relationship history and passenger entries in the Road Journal.\nRetained: Passes 1–4, Maine weather/surfaces, Living Town, diagnostics, modern UX,\nmap repair, owner's MkIV, existing story and all four activities.\n\nThis full website packages the current game AND its matching standalone ZIP.\nA push is not a production deployment. No production settings were changed.\nPassengers, conversations, schedules and personal situations are fictional.\nNo generated dialogue, photorealism or physical-device acceptance claim.\n\nStandalone SHA-256: ${release.standaloneZipSha256}\n`);
write(path.join(out,'DEPLOY-README.txt'),'FULL WEBSITE PACKAGE\nindex.html is the memorial homepage; play/ contains the current game.\nDeploy the CONTENTS of this directory or the full website ZIP to your existing\nstatic host. The recorded production host is Workers Static Assets, not Pages.\nDo not replace this website with game-only dist/.\nNo deployment, hosting-plan, domain, binding or production configuration change\nis performed by the build or packaging commands.\n\nThe website has no root service worker. The game worker owns only its scope.\nCached installations update atomically once the complete new game is cached;\nlocalStorage saves are never cleared by the updater.\n');
console.log(JSON.stringify({site:out,standalone:game,...release},null,2));
module.exports={out,game,release};
