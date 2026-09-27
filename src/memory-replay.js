// Embedded inside RebornCore. Local drive recordings only; no telemetry or network service.
const MemoryReplay = (() => {
  'use strict';
  const VERSION=1;
  const LIMITS=Object.freeze({recordings:5,samples:720,markers:48,history:40,routePoints:180,diagnosticChannels:5});
  const CHANNELS=Object.freeze(['bearing','charging','cooling','clutch','brakes']);
  const clampValue=(v,lo,hi,fallback=0)=>typeof v==='number'&&Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):fallback;
  const cleanText=(v,n=120)=>typeof v==='string'?v.slice(0,n):'';
  const round=(v,p=3)=>Math.round(v*10**p)/10**p;
  const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<1e6&&Math.abs(p.z)<1e6?{x:p.x,z:p.z,yaw:Number.isFinite(p.yaw)?Math.atan2(Math.sin(p.yaw),Math.cos(p.yaw)):0}:null;
  const defaults=()=>({schemaVersion:VERSION,enabled:true,diagnosticAudio:true,selectedId:'',recordings:[],draft:null,history:[],stats:{recorded:0,ghostRuns:0,replays:0,deletes:0},revision:0});
  function cleanSample(raw,lastT=0){
    if(!Array.isArray(raw)||raw.length<9)return null;
    if(!Number.isFinite(raw[0])||raw[0]<lastT||raw[0]>1e8||!Number.isFinite(raw[1])||!Number.isFinite(raw[2])||Math.abs(raw[1])>=1e6||Math.abs(raw[2])>=1e6)return null;
    const t=raw[0],x=clampValue(raw[1],-1e6,1e6,NaN),z=clampValue(raw[2],-1e6,1e6,NaN);
    if(!Number.isFinite(x)||!Number.isFinite(z)||t<lastT)return null;
    const out=[t,x,z,Number.isFinite(raw[3])?Math.atan2(Math.sin(raw[3]),Math.cos(raw[3])):0,clampValue(raw[4],0,150,0),clampValue(raw[5],-1,1,0),clampValue(raw[6],0,1,0),clampValue(raw[7],-40,170,20),clampValue(raw[8],0,100,100)];
    for(let i=0;i<LIMITS.diagnosticChannels;i++)out.push(clampValue(raw[9+i],0,1,0));
    out.push(raw[14]===1?1:0);return out.map((v,i)=>round(v,i===0?3:i<4?4:3));
  }
  function cleanMarker(raw,duration=1e8){
    if(!raw||typeof raw!=='object')return null;const p=point(raw);if(!p)return null;
    return {t:clampValue(raw.t,0,duration,0),type:cleanText(raw.type,28)||'note',label:cleanText(raw.label,100),road:cleanText(raw.road,90),x:round(p.x,3),z:round(p.z,3)};
  }
  function summarizeSamples(samples){
    let maxMph=0,maxTemp=-40,minBattery=100,distanceM=0;const diagnostics={bearing:0,charging:0,cooling:0,clutch:0,brakes:0};
    for(let i=0;i<samples.length;i++){
      const s=samples[i];maxMph=Math.max(maxMph,s[4]*2.236936);maxTemp=Math.max(maxTemp,s[7]);minBattery=Math.min(minBattery,s[8]);
      for(let j=0;j<CHANNELS.length;j++)diagnostics[CHANNELS[j]]=Math.max(diagnostics[CHANNELS[j]],s[9+j]||0);
      if(i&&!s[14]){const p=samples[i-1];distanceM+=Math.hypot(s[1]-p[1],s[2]-p[2]);}
    }
    return {maxMph:round(maxMph,2),maxTemp:round(maxTemp,1),minBattery:round(minBattery,1),distanceM:round(distanceM,1),diagnostics};
  }
  function cleanRecording(raw,index=0){
    if(!raw||typeof raw!=='object')return null;const samples=[];let last=-1;
    for(const candidate of (Array.isArray(raw.samples)?raw.samples:[]).slice(0,LIMITS.samples*2)){
      const s=cleanSample(candidate,Math.max(0,last));if(!s||s[0]<=last)continue;samples.push(s);last=s[0];if(samples.length>=LIMITS.samples)break;
    }
    if(samples.length<2)return null;const duration=Math.max(samples[samples.length-1][0],clampValue(raw.duration,0,1e8,0)),summary=summarizeSamples(samples),seen=new Set(),markers=[];
    for(const candidate of (Array.isArray(raw.markers)?raw.markers:[]).slice(0,LIMITS.markers*2)){
      const m=cleanMarker(candidate,duration);if(!m)continue;const key=m.type+':'+m.label+':'+Math.round(m.t*4);if(seen.has(key))continue;seen.add(key);markers.push(m);if(markers.length>=LIMITS.markers)break;
    }
    const id=cleanText(raw.id,80)||('memory-'+index),createdAt=cleanText(raw.createdAt,40),interval=clampValue(raw.interval,.1,30,.75);
    return {id,title:cleanText(raw.title,120)||'North Berwick drive',createdAt,world:cleanText(raw.world,80)||'NORTH BERWICK, MAINE',mode:cleanText(raw.mode,24)||'free',startRoad:cleanText(raw.startRoad,90),endRoad:cleanText(raw.endRoad,90),duration:round(duration,2),distanceM:clampValue(raw.distanceM,0,1e8,summary.distanceM),maxMph:clampValue(raw.maxMph,0,400,summary.maxMph),maxTemp:clampValue(raw.maxTemp,-40,170,summary.maxTemp),minBattery:clampValue(raw.minBattery,0,100,summary.minBattery),interval,samples,markers,diagnostics:Object.fromEntries(CHANNELS.map(k=>[k,clampValue(raw.diagnostics?.[k],0,1,summary.diagnostics[k])])),revision:Math.floor(clampValue(raw.revision,0,1e9,0))};
  }
  function cleanDraft(raw){
    const r=cleanRecording(raw);if(!r)return null;
    return {...r,active:true,accumulator:clampValue(raw.accumulator,0,r.interval,0),lastRoad:cleanText(raw.lastRoad,90),sequence:Math.floor(clampValue(raw.sequence,0,1e9,0))};
  }
  function sanitize(raw){
    const s=defaults(),v=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};s.enabled=v.enabled!==false;s.diagnosticAudio=v.diagnosticAudio!==false;s.revision=Math.floor(clampValue(v.revision,0,1e9,0));
    const seen=new Set();for(const candidate of (Array.isArray(v.recordings)?v.recordings:[]).slice(0,LIMITS.recordings*2)){
      const r=cleanRecording(candidate,s.recordings.length);if(!r||seen.has(r.id))continue;seen.add(r.id);s.recordings.push(r);if(s.recordings.length>=LIMITS.recordings)break;
    }
    s.draft=cleanDraft(v.draft);if(s.draft&&seen.has(s.draft.id))s.draft=null;
    s.selectedId=s.recordings.some(r=>r.id===v.selectedId)?v.selectedId:(s.recordings[0]?.id||'');
    for(const h of (Array.isArray(v.history)?v.history:[]).slice(0,LIMITS.history*2)){
      if(!h||typeof h!=='object')continue;const type=['recorded','ghost','replay','deleted'].includes(h.type)?h.type:'';if(!type)continue;
      s.history.push({type,id:cleanText(h.id,80),at:cleanText(h.at,40),title:cleanText(h.title,100)});if(s.history.length>=LIMITS.history)break;
    }
    const stats=v.stats&&typeof v.stats==='object'?v.stats:{};for(const k of Object.keys(s.stats))s.stats[k]=Math.floor(clampValue(stats[k],0,1e9,0));
    return s;
  }
  function interpolate(recording,time){
    const samples=recording?.samples||[];if(!samples.length)return null;if(time<=samples[0][0])return sampleObject(samples[0]);if(time>=samples[samples.length-1][0])return sampleObject(samples[samples.length-1]);
    let lo=0,hi=samples.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(samples[mid][0]<=time)lo=mid;else hi=mid;}
    const a=samples[lo],b=samples[hi],span=Math.max(.001,b[0]-a[0]),t=Math.max(0,Math.min(1,(time-a[0])/span)),turn=Math.atan2(Math.sin(b[3]-a[3]),Math.cos(b[3]-a[3]));
    if(b[14])return {...sampleObject(a),t:time};
    const values=a.map((v,i)=>i===14?0:i===3?v+turn*t:i===0?time:v+(b[i]-v)*t);return sampleObject(values);
  }
  function sampleObject(s){return {t:s[0],x:s[1],z:s[2],yaw:s[3],speed:s[4],throttle:s[5],brake:s[6],temp:s[7],battery:s[8],breakBefore:s[14]===1,diagnostics:Object.fromEntries(CHANNELS.map((k,i)=>[k,s[9+i]||0]))};}
  function route(recording,max=LIMITS.routePoints){
    const samples=recording?.samples||[],limit=Math.floor(clampValue(max,2,LIMITS.routePoints,LIMITS.routePoints)),n=Math.min(samples.length,limit),out=[];let previous=-1;
    for(let i=0;i<n;i++){const index=n===1?0:Math.round(i*(samples.length-1)/(n-1)),s=samples[index],broken=samples.slice(previous+1,index+1).some(v=>v[14]===1);out.push({x:s[1],z:s[2],t:s[0],breakBefore:broken});previous=index;}
    return out;
  }
  function compressDraft(d){
    if(d.samples.length<LIMITS.samples)return;const old=d.samples,kept=[];let previous=-1;for(let i=0;i<old.length;i++){if(i%2===0||i===old.length-1){const s=old[i].slice();s[14]=old.slice(previous+1,i+1).some(p=>p[14]===1)?1:0;kept.push(s);previous=i;}}d.samples=kept.slice(-LIMITS.samples);d.interval=Math.min(30,d.interval*2);d.accumulator=0;
  }
  class Recorder{
    constructor(raw){this.state=sanitize(raw);this.draft=this.state.draft;}
    begin(meta={}){
      if(!this.state.enabled)return null;if(this.draft?.active&&this.draft.mode===meta.mode&&this.draft.world===meta.world)return this.draft;
      if(this.draft)this.cancel('restarted');const p=point(meta.car)||{x:0,z:0,yaw:0},id=cleanText(meta.id,80)||('memory-'+Date.now());
      this.draft={id,title:'North Berwick drive',createdAt:cleanText(meta.createdAt,40)||new Date().toISOString(),world:cleanText(meta.world,80)||'NORTH BERWICK, MAINE',mode:cleanText(meta.mode,24)||'free',startRoad:cleanText(meta.startRoad,90),endRoad:'',duration:0,distanceM:0,maxMph:0,maxTemp:-40,minBattery:100,interval:.75,accumulator:0,samples:[],markers:[],diagnostics:Object.fromEntries(CHANNELS.map(k=>[k,0])),lastRoad:'',sequence:Math.floor(clampValue(meta.sequence,0,1e9,0)),revision:0,active:true};
      this.state.draft=this.draft;this.sample(0,{...meta,car:p,force:true});this.bump();return this.draft;
    }
    sample(dt,ctx={}){
      const d=this.draft;if(!d||!d.active||ctx.running===false||!Number.isFinite(dt)||dt<0)return false;d.duration=clampValue(d.duration+dt,0,1e8,d.duration);d.distanceM=clampValue(d.distanceM+Math.max(0,ctx.distanceM||0),0,1e8,d.distanceM);d.accumulator+=dt;
      const car=ctx.car,p=point(car);if(!p)return false;if(!ctx.force&&d.samples.length&&d.accumulator<d.interval)return false;d.accumulator=0;
      const diagnostics=ctx.diagnostics||{},sample=[d.duration,p.x,p.z,p.yaw,clampValue(ctx.speed??Math.hypot(car.vx||0,car.vz||0),0,150,0),clampValue(ctx.input?.throttle,-1,1,0),clampValue(ctx.input?.brake,0,1,0),clampValue(ctx.vehicle?.engineTempC,-40,170,20),clampValue(ctx.vehicle?.battery,0,100,100),...CHANNELS.map(k=>clampValue(diagnostics[k],0,1,0))].map((v,i)=>round(v,i<4?4:3));
      const previous=d.samples[d.samples.length-1];const gap=previous?Math.hypot(sample[1]-previous[1],sample[2]-previous[2]):0;sample.push(previous&&gap>Math.max(80,(sample[0]-previous[0])*160+5)?1:0);if(previous&&sample[0]===previous[0])d.samples[d.samples.length-1]=sample;else d.samples.push(sample);compressDraft(d);d.maxMph=Math.max(d.maxMph,sample[4]*2.236936);d.maxTemp=Math.max(d.maxTemp,sample[7]);d.minBattery=Math.min(d.minBattery,sample[8]);for(let i=0;i<CHANNELS.length;i++)d.diagnostics[CHANNELS[i]]=Math.max(d.diagnostics[CHANNELS[i]],sample[9+i]);d.revision++;this.state.draft=d;return true;
    }
    mark(type,label,ctx={}){
      const d=this.draft,p=point(ctx.car);if(!d||!p||d.markers.length>=LIMITS.markers)return false;const marker=cleanMarker({t:d.duration,type,label,road:ctx.road,x:p.x,z:p.z},d.duration);if(!marker)return false;const last=d.markers[d.markers.length-1];if(last&&last.type===marker.type&&last.label===marker.label&&Math.abs(last.t-marker.t)<2)return false;d.markers.push(marker);d.revision++;return true;
    }
    road(name,ctx={}){const road=cleanText(name,90);if(!this.draft||!road||road===this.draft.lastRoad)return false;if(!this.draft.startRoad)this.draft.startRoad=road;this.draft.endRoad=road;this.draft.lastRoad=road;return this.mark('road',road,{...ctx,road});}
    finish(meta={}){
      const d=this.draft;if(!d)return null;this.sample(0,{...meta,distanceM:0,force:true});this.draft=null;this.state.draft=null;
      if(d.samples.length<2||d.duration<3||d.distanceM<3){this.bump();return null;}
      d.active=undefined;d.accumulator=undefined;d.lastRoad=undefined;d.sequence=undefined;d.endRoad=cleanText(meta.endRoad,90)||d.endRoad;d.startRoad=cleanText(meta.startRoad,90)||d.startRoad;d.distanceM=Math.max(d.distanceM,clampValue(meta.distanceM,0,1e8,0));d.maxMph=Math.max(d.maxMph,clampValue(meta.maxMph,0,400,0));d.title=cleanText(meta.title,120)||(d.startRoad&&d.endRoad&&d.startRoad!==d.endRoad?d.startRoad+' → '+d.endRoad:d.endRoad||d.startRoad||'North Berwick drive');d.revision++;
      const rec=cleanRecording(d);if(!rec){this.bump();return null;}this.state.recordings=[rec,...this.state.recordings.filter(r=>r.id!==rec.id)].slice(0,LIMITS.recordings);this.state.selectedId=rec.id;this.state.stats.recorded++;this.history('recorded',rec);this.bump();return rec;
    }
    cancel(reason='cancelled'){if(!this.draft)return false;this.draft=null;this.state.draft=null;this.bump();return true;}
    delete(id){const before=this.state.recordings.length,rec=this.state.recordings.find(r=>r.id===id);this.state.recordings=this.state.recordings.filter(r=>r.id!==id);if(this.state.selectedId===id)this.state.selectedId=this.state.recordings[0]?.id||'';if(before!==this.state.recordings.length){this.state.stats.deletes++;this.history('deleted',rec||{id,title:''});this.bump();return true;}return false;}
    select(id){if(!this.state.recordings.some(r=>r.id===id))return null;this.state.selectedId=id;this.bump();return this.selected();}
    selected(){return this.state.recordings.find(r=>r.id===this.state.selectedId)||this.state.recordings[0]||null;}
    history(type,rec){this.state.history.unshift({type,id:rec?.id||'',at:new Date().toISOString(),title:rec?.title||''});this.state.history=this.state.history.slice(0,LIMITS.history);}
    notePlayback(type,rec){if(type==='ghost')this.state.stats.ghostRuns++;else this.state.stats.replays++;this.history(type,rec);this.bump();}
    bump(){this.state.revision++;}
    export(){this.state.draft=this.draft;return sanitize(this.state);}
  }
  class Player{
    constructor(recording,options={}){this.recording=cleanRecording(recording);this.time=0;this.speed=clampValue(options.speed,0.25,4,1);this.paused=false;this.loop=options.loop===true;this.camera=Math.floor(clampValue(options.camera,0,3,0));this.finished=false;}
    tick(dt){if(this.paused||this.finished||!Number.isFinite(dt)||dt<=0||!this.recording)return this.sample();this.time+=dt*this.speed;const duration=this.recording.duration;if(this.time>=duration){if(this.loop&&duration>0)this.time%=duration;else{this.time=duration;this.finished=true;}}return this.sample();}
    sample(){return interpolate(this.recording,this.time);}
    seek(value,ratio=false){const duration=this.recording?.duration||0;this.time=ratio?clampValue(value,0,1,0)*duration:clampValue(value,0,duration,0);this.finished=this.time>=duration;return this.sample();}
    restart(){this.time=0;this.finished=false;this.paused=false;return this.sample();}
    toggle(){if(this.finished){this.restart();return false;}this.paused=!this.paused;return this.paused;}
    cycleCamera(){this.camera=(this.camera+1)%4;return this.camera;}
    progress(){return this.recording?.duration?Math.max(0,Math.min(1,this.time/this.recording.duration)):0;}
    snapshot(){return {id:this.recording?.id||'',time:this.time,duration:this.recording?.duration||0,progress:this.progress(),paused:this.paused,finished:this.finished,loop:this.loop,speed:this.speed,camera:this.camera,sample:this.sample()};}
    props(){return ghostProps(this.recording,this.time);}
  }
  function ghostProps(recording,time){
    const s=interpolate(recording,time);if(!s)return[];const out=[],add=(mesh,x,y,z,w,h,d,color,yaw=s.yaw,material=8)=>out.push({mesh,x,y,z,w,h,d,color,yaw,material,ghost:true});
    const sn=Math.sin(s.yaw),cs=Math.cos(s.yaw),side=(x,z)=>({x:s.x+cs*x+sn*z,z:s.z-sn*x+cs*z});
    let p=side(0,0);add('box',p.x,.62,p.z,1.72,.42,4.15,'#78d8db');p=side(0,2.05);add('box',p.x,.78,p.z,1.46,.28,.18,'#e7ffff');p=side(0,-.1);add('box',p.x,1.12,p.z,1.36,.42,1.92,'#79afb7');
    for(const x of [-.68,.68]){p=side(x,2.15);add('box',p.x,.72,p.z,.25,.16,.15,'#f2ffff');}
    const samples=recording.samples,at=samples.findIndex(v=>v[0]>=time),start=Math.max(0,(at<0?samples.length-1:at)-16);for(let i=start;i<(at<0?samples.length:at);i+=2){const q=samples[i],fade=(i-start+1)/Math.max(1,(at-start));add('box',q[1],.30,q[2],.14,.04,.14,fade>.55?'#5cc1c7':'#376f78',q[3],8);}
    return out.slice(0,32);
  }
  function diagnosticLevels(vehicle={},faults={}){return {bearing:clampValue(faults.bearing,0,1,0),charging:clampValue(faults.charging,0,1,0),cooling:clampValue(faults.cooling,0,1,0),clutch:clampValue(faults.clutch,0,1,0),brakes:Math.max(clampValue(faults.brakeHydraulics,0,1,0),Math.max(0,(45-clampValue(vehicle.brakes,0,100,100))/45))};}
  return Object.freeze({VERSION,LIMITS,CHANNELS,defaults,sanitize,cleanRecording,interpolate,route,ghostProps,diagnosticLevels,Recorder,Player});
})();
