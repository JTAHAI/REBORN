'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const file=path.join(root,'index.html');let html=fs.readFileSync(file,'utf8');
for(const [name,marker,prefix,extension='js'] of [['session-saves','SESSION_SAVES','  '],['session-save-ui','SESSION_SAVE_UI',''],['release-core','RELEASE_CORE','  '],['release-ux','RELEASE_UI',''],['release-ux','RELEASE_CSS','','css'],['workshop-memories','WORKSHOP_MEMORIES','  '],['workshop-memory-ui','WORKSHOP_MEMORY_UI',''],['workshop-memory-ui','WORKSHOP_MEMORY_CSS','','css'],['echo-roads','ECHO_ROADS','  '],['memory-replay','MEMORY_REPLAY','  '],['echo-roads-ui','ECHO_UI',''],['echo-roads-ui','ECHO_CSS','','css'],['memory-replay-ui','MEMORY_REPLAY_UI',''],['memory-replay-ui','MEMORY_REPLAY_CSS','','css'],['maine-weather','MAINE_WEATHER','  '],['weather-ui','WEATHER_UI',''],['weather-ui','WEATHER_CSS','','css'],['town-director','TOWN_DIRECTOR','  '],['drive-stories','DRIVE_STORIES','  '],['town-ui','TOWN_UI',''],['drive-stories-ui','DRIVE_STORIES_UI',''],['drive-stories-ui','DRIVE_STORIES_CSS','','css'],['driver-ux','DRIVER_UX',''],['driver-ux','DRIVER_CSS','','css'],['diagnostic-audio','DIAGNOSTIC_AUDIO','']]){
 const source=fs.readFileSync(path.join(root,'src',name+'.'+extension),'utf8'),start=prefix+'/* '+marker+'_BEGIN */',end=prefix+'/* '+marker+'_END */';
 if(!html.includes(start)||!html.includes(end))throw new Error('Town source markers missing');
 html=html.slice(0,html.indexOf(start))+start+'\n'+source+'\n'+end+html.slice(html.indexOf(end)+end.length);
}
fs.writeFileSync(file,html);
