'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const file=path.join(root,'index.html');let html=fs.readFileSync(file,'utf8');
for(const [name,marker,prefix,extension='js'] of [['maine-weather','MAINE_WEATHER','  '],['weather-ui','WEATHER_UI',''],['weather-ui','WEATHER_CSS','','css'],['town-director','TOWN_DIRECTOR','  '],['town-ui','TOWN_UI',''],['driver-ux','DRIVER_UX',''],['driver-ux','DRIVER_CSS','','css']]){
 const source=fs.readFileSync(path.join(root,'src',name+'.'+extension),'utf8'),start=prefix+'/* '+marker+'_BEGIN */',end=prefix+'/* '+marker+'_END */';
 if(!html.includes(start)||!html.includes(end))throw new Error('Town source markers missing');
 html=html.slice(0,html.indexOf(start))+start+'\n'+source+'\n'+end+html.slice(html.indexOf(end)+end.length);
}
fs.writeFileSync(file,html);
