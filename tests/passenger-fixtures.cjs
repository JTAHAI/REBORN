'use strict';
// Isolated save fixtures for packaged-browser lifecycle tests. These do not
// expose writable test hooks in the game or claim to be manual route recordings.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),context=vm.createContext({console});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const core=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).find(s=>s.includes('else root.RebornCore = api'));
vm.runInContext(core,context);const C=context.RebornCore,D=C.DriveStories;
const world=C.createNorthBerwickWorld(JSON.parse(fs.readFileSync(path.join(root,'assets/worlds/north-berwick/world.json'),'utf8')));
const output={};
D.STORIES.forEach((story,i)=>{
 const save=C.validateSave({version:1,settings:{quality:'low',tutorialSeen:true},town:{...C.Town.defaults(),minuteOfDay:502},journeys:{completed:D.STORIES.slice(0,i).map(s=>s.id)}});
 const d=new D.Director(save.journeys,world);d.begin(story.id,500);d.board(500.1);d.choose(['long','safe','plowed'][i],500.2);
 d.state.active.previousWeather={mode:'clear',season:'summer',epoch:0};
 if(story.stops.length>1){const p=d.currentTarget();d.tick(C.DT,{active:true,at:501,car:{...p,vx:0,vz:0,forwardSpeed:0},vehicle:save.vehicle,grip:1,roadName:p.road,input:{}});}
 const target=d.currentTarget();d.state.active.lastPosition={x:target.x,z:target.z,yaw:target.yaw};
 save.journeys=d.state;output[story.id]=save;
});
const unsafe=C.validateSave({version:1,settings:{quality:'low',tutorialSeen:true},town:{...C.Town.defaults(),minuteOfDay:502}});
const d=new D.Director(unsafe.journeys,world);d.begin('long-way-home',500);d.board(500.1);d.choose('long',500.2);d.state.active.previousWeather={mode:'clear',season:'summer',epoch:0};d.state.active.lastPosition=d.startPosition('long-way-home');unsafe.journeys=d.state;unsafe.vehicle.brakes=15;output.unsafe=unsafe;
console.log(JSON.stringify(output));
