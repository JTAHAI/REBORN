// Local synthesized mechanical cues. No downloaded audio, telemetry, or runtime service.
function installDiagnosticAudio(AudioEngine){
 'use strict';
 if(!AudioEngine||AudioEngine.prototype.updateDiagnostics)return;
 const clamp=(v,lo=0,hi=1)=>Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):lo;
 AudioEngine.prototype.ensureDiagnosticAudio=function(){
  if(this.diagnosticNodes||!this.context||!this.master)return this.diagnosticNodes;
  const a=this.context,make=(type,frequency)=>{const oscillator=a.createOscillator(),gain=a.createGain();oscillator.type=type;oscillator.frequency.value=frequency;gain.gain.value=0;oscillator.connect(gain);gain.connect(this.master);oscillator.start();return {oscillator,gain};};
  this.diagnosticNodes={bearing:make('sine',62),charging:make('sine',420),cooling:make('triangle',92),clutch:make('sawtooth',155),brakes:make('square',780)};
  this.diagnosticLevels={bearing:0,charging:0,cooling:0,clutch:0,brakes:0};
  return this.diagnosticNodes;
 };
 AudioEngine.prototype.updateDiagnostics=function(ctx={}){
  if(!this.context||!this.master)return;const levels=ctx.levels||{},active=ctx.active===true&&ctx.enabled!==false&&this.enabled;
  const peak=Math.max(0,...Object.values(levels).map(v=>clamp(v)));
  if(active&&(peak>.015||(ctx.temp||20)>100))this.ensureDiagnosticAudio();if(!this.diagnosticNodes)return;
  const a=this.context,t=a.currentTime,speed=clamp(Math.abs(ctx.speed||0),0,70),load=clamp(ctx.load||0),brake=clamp(ctx.brake||0),lateral=clamp(Math.abs(ctx.lateral||0)/10),temp=clamp(((ctx.temp||20)-88)/45);
  const targets={
   bearing:active?clamp(levels.bearing)*(0.007+speed*.00055)*(0.65+lateral*.5):0,
   charging:active?clamp(levels.charging)*(0.005+load*.016):0,
   cooling:active?Math.max(clamp(levels.cooling)*.012,temp*.013):0,
   clutch:active?clamp(levels.clutch)*load*(0.005+speed*.00025):0,
   brakes:active?clamp(levels.brakes)*brake*(0.008+speed*.00045):0
  };
  const n=this.diagnosticNodes;
  n.bearing.oscillator.frequency.setTargetAtTime(52+speed*3.2,t,.14);
  n.charging.oscillator.frequency.setTargetAtTime(330+speed*5+load*220,t,.10);
  n.cooling.oscillator.frequency.setTargetAtTime(78+temp*70,t,.25);
  n.clutch.oscillator.frequency.setTargetAtTime(130+speed*6+load*90,t,.09);
  n.brakes.oscillator.frequency.setTargetAtTime(620+speed*15,t,.06);
  for(const [key,value] of Object.entries(targets)){n[key].gain.gain.setTargetAtTime(value,t,key==='cooling'?.25:.1);this.diagnosticLevels[key]=value;}
 };
 AudioEngine.prototype.diagnosticSnapshot=function(){return {nodes:this.diagnosticNodes?Object.keys(this.diagnosticNodes).length*2:0,levels:{...(this.diagnosticLevels||{})}};};
 AudioEngine.prototype.diagnosticEvent=function(name,severity=.5){if(!this.context||!this.enabled)return;const s=clamp(severity);if(name==='starter')this.tone(110,58,.36,'sawtooth',.04+s*.08);else if(name==='bearing')this.tone(90,65,.22,'sine',.025+s*.04);else if(name==='cooling')this.tone(190,85,.32,'triangle',.03+s*.05);};
}
