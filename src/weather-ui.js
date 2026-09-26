// Embedded in the application closure. All weather is local game state.
const WX = C.MaineWeather;
let weatherHazardName = '', weatherWarningUntil = 0;
function weatherSnapshot(){return weatherDirector?{enabled:townAvailable(),current:{...weatherDirector.current},road:roadWeather?{...roadWeather}:null,mode:weatherDirector.state.mode,season:weatherDirector.current.season,cursor:weatherDirector.state.cursor,zoneCount:Object.keys(weatherDirector.state.zones).length,observations:weatherDirector.state.observations.length,history:weatherDirector.state.history.slice(0,8),props:weatherDirector.cachedProps.length}:null;}
function applyWeatherRoad(dt){
  const active=townAvailable()&&weatherDirector,c=sim.car;
  if(!active){roadWeather=null;c.roadGrip=1;c.roadBrake=1;c.roadDrive=1;c.roadResponse=1;c.roadRolling=0;return;}
  weatherDirector.enabled=true;roadWeather=weatherDirector.sample(c,vehicle);
  // Blend at road boundaries; no random yaw kicks or unavoidable scripted spin-outs.
  for(const [key,value] of [['roadGrip',roadWeather.grip],['roadBrake',roadWeather.braking],['roadDrive',roadWeather.drive],['roadResponse',roadWeather.response],['roadRolling',roadWeather.rolling]])c[key]=C.approach(Number.isFinite(c[key])?c[key]:(key==='roadRolling'?0:1),value,3,dt);
}
function recordWeatherKnowledge(distanceM){
  if(!townAvailable()||!weatherDirector||!roadWeather)return;
  weatherObserveDistance+=Math.max(0,distanceM);
  if(weatherObserveDistance>=1){weatherDirector.observe(roadWeather,weatherObserveDistance);weatherObserveDistance=0;}
}
function weatherRenderSettings(){return townAvailable()&&weatherDirector?{...settings,climate:weatherDirector.scene(roadWeather||weatherDirector.sample(sim.car,vehicle))}:settings;}
function updateWeatherHUD(){
  const button=$('weather-chip');if(!button)return;const active=townAvailable()&&!!weatherDirector;button.hidden=!active;
  if(!active)return;const w=weatherDirector.current,s=roadWeather||weatherDirector.sample(sim.car,vehicle),temp=Math.round(settings.units==='kph'?w.tempC:w.tempC*9/5+32)+(settings.units==='kph'?'°C':'°F');
  button.textContent=WX.LABELS[w.kind]+' · '+temp+' · '+s.label;button.dataset.risk=s.grip<.6?'high':s.grip<.85?'caution':'normal';button.title='Open weather and remembered road conditions. Fictional simulation.';
  $('surface').textContent=s.onRoad?s.label.toUpperCase():sim.car.surface.toUpperCase();
  if(s.hazard!==weatherHazardName){weatherHazardName=s.hazard;if(state==='play'&&s.grip<.65&&clock>weatherWarningUntil){notify(s.label.toUpperCase()+' / LONGER STOPPING DISTANCE',3.5);weatherWarningUntil=clock+12;}}
  if(s.hydro>.32){$('ux-alert').hidden=false;$('ux-alert').textContent=($('ux-alert').textContent?$('ux-alert').textContent+' · ':'')+'Standing water: ease off';}
}
function syncWeatherControls(){
  if(!$('town-weather-setting'))return;const s=weatherDirector?.state||save.climate;
  $('town-weather-setting').value=s.mode;$('town-season-setting').value=weatherDirector?.current.season||s.seasonBase;
  $('weather-wipers').checked=s.wipers!==false;
}
function renderWeatherPanel(){
  if(!$('weather-panel'))return;syncWeatherControls();
  if(!weatherDirector){$('weather-summary').textContent='Loading the static North Berwick road network…';return;}
  const d=weatherDirector,w=d.current,s=d.sample(sim.car,vehicle),time=d.time,unit=settings.units==='kph'?'°C':'°F',temperature=t=>Math.round(unit==='°C'?t:t*9/5+32)+unit;
  $('weather-summary').replaceChildren();
  const headline=document.createElement('p');headline.className='weather-headline';headline.textContent=WX.LABELS[w.kind]+' · '+temperature(w.tempC)+' · '+w.season;$('weather-summary').append(headline);
  const note=document.createElement('p');note.textContent=(w.custom?'Selected weather scenario. ':'Seeded seasonal journey. ')+(townAvailable()?'Advances with the town clock; menus pause it.':'Weather resumes in North Berwick Free Drive.');$('weather-summary').append(note);
  const values=[['Road',s.road||'Drive onto a named road'],['Surface',s.onRoad?s.label:'Off road / no sampled lane'],['Plow priority',s.priority?'Tier '+s.priority+' · fictional service schedule':'—'],['Last treatment',s.lastService>=0?Math.max(0,Math.floor(time-s.lastService))+' town minutes ago':'Not yet treated'],['Ground snow',Math.round(s.snowDepth*20)+' cm (game model)'],['Next front',w.custom?'Fixed scenario':Math.ceil(180-time%180)+' town minutes']];
  const grid=document.createElement('dl');grid.className='weather-facts';for(const [label,value] of values){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;grid.append(dt,dd);}$('weather-summary').append(grid);
  const list=$('weather-memory');list.replaceChildren();
  for(const o of d.state.observations.slice(0,18)){const entry=document.createElement('li'),strong=document.createElement('strong'),small=document.createElement('span');strong.textContent=o.road;small.textContent=WX.SURFACE_LABELS[o.hazard]+' · observed '+Math.max(0,Math.floor(time-o.at))+' town minutes ago · '+o.hazards.filter(h=>h!=='dry').map(h=>WX.SURFACE_LABELS[h]).join(', ');entry.append(strong,small);list.append(entry);}
  if(!list.children.length){const li=document.createElement('li');li.textContent='Drive to learn the surfaces. The map records only conditions you have actually encountered.';list.append(li);}
  const history=$('weather-history');history.replaceChildren();for(const item of d.state.history.slice(0,8)){const li=document.createElement('li');li.textContent=item.text+' · '+Math.max(0,Math.floor(time-item.at))+' town minutes ago';history.append(li);}
}
function initWeatherUI(){
  const panel=document.createElement('section');panel.id='weather-panel';panel.className='journey-panel';
  panel.innerHTML='<h3>MAINE WEATHER / ROAD CONDITIONS</h3><div id="weather-summary"></div><p class="weather-disclaimer">Fictional weather, seasons and service schedules. Shade and drainage are seeded gameplay approximations, not surveys or forecasts.</p><h4>YOUR ROAD-SURFACE MEMORY</h4><ul id="weather-memory" class="weather-memory"></ul><h4>WEATHER / PUBLIC WORKS LOG</h4><ul id="weather-history" class="weather-memory"></ul>';
  $('ux-panel-town').prepend(panel);
  const settingsNode=document.querySelector('#pause .settings');settingsNode.insertAdjacentHTML('beforeend','<label><span>North Berwick weather<small>Simulation, not live weather</small></span><select id="town-weather-setting"><option value="dynamic">Seasonal journey</option>'+WX.KINDS.map(k=>'<option value="'+k+'">'+WX.LABELS[k]+' scenario</option>').join('')+'</select></label><label><span>North Berwick season<small>30 in-game days per season</small></span><select id="town-season-setting">'+WX.SEASONS.map(s=>'<option value="'+s+'">'+s[0].toUpperCase()+s.slice(1)+'</option>').join('')+'</select></label><label><span>Automatic cockpit wipers<small>Visual effect; reduced-motion respected</small></span><input id="weather-wipers" type="checkbox" checked></label>');
  $('weather-setting').closest('label').querySelector('span').textContent='Other activities / lighting';
  for(const id of ['town-weather-setting','town-season-setting'])$(id).addEventListener('change',()=>{
    if(!weatherDirector){notify('NORTH BERWICK IS STILL LOADING');syncWeatherControls();return;}
    if($('toast').textContent.includes('LONGER STOPPING DISTANCE')){toastUntil=0;$('toast').classList.remove('visible');}weatherHazardName='';weatherWarningUntil=0;
    weatherDirector.select($('town-weather-setting').value,$('town-season-setting').value,C.Town.now(save.town));save.climate=weatherDirector.state;roadWeather=weatherDirector.sample(sim.car,vehicle);persist();renderWeatherPanel();
  });
  $('weather-wipers').addEventListener('change',()=>{save.climate.wipers=$('weather-wipers').checked;persist();});
  const button=document.createElement('button');button.id='weather-chip';button.type='button';button.hidden=true;button.addEventListener('click',()=>{openJourney();selectDriverTab('town',true);renderWeatherPanel();});$('hud').append(button);
  const legend=document.querySelector('.ux-map-legend');if(legend){const span=document.createElement('span');span.className='weather-legend';span.textContent='Blue / white / brown: observed water / ice & snow / leaves';legend.append(span);}
  syncWeatherControls();renderWeatherPanel();
}
function drawWeatherMap(ctx,p){
  if(!townAvailable()||!weatherDirector)return;const d=weatherDirector;ctx.save();ctx.lineWidth=2;ctx.setLineDash([4,4]);
  for(const o of d.state.observations.slice(0,64)){if(o.hazard==='dry'||d.time-o.at>360)continue;ctx.strokeStyle=['black-ice','frost','snow','packed-snow','slush'].includes(o.hazard)?'#d2e4ef':o.hazard==='wet-leaves'?'#c39566':'#74b8d0';
    ctx.beginPath();for(const r of (d.byName.get(o.road)||[]).slice(0,64)){ctx.moveTo(...p(r.x1,r.z1));ctx.lineTo(...p(r.x2,r.z2));}ctx.stroke();
  }ctx.restore();
}
function drawMaineWeather(dt){
  fxc.clearRect(0,0,fx.width,fx.height);if(renderer.presentation==='studio'||settings.reducedMotion)return;
  const w=weatherDirector.current,rate=Math.max(w.rain,w.snow,w.sleet,w.freezing);if(rate<.03)return;
  const isSnow=w.snow>.1,count=Math.floor(drops.length*rate);fxc.save();fxc.strokeStyle='rgba(206,225,238,.28)';fxc.fillStyle='rgba(224,234,243,.72)';fxc.lineWidth=1;
  for(let i=0;i<count;i++){const a=drops[i];if(state==='play'){a.y=(a.y+dt*a.speed*(isSnow?.20:1))%1;a.x=(a.x+dt*(isSnow?Math.sin(clock*.7+i)*.008+w.wind*.02:.04))%1;if(a.x<0)a.x+=1;}
    const x=a.x*fx.width,y=a.y*fx.height;if(isSnow){fxc.beginPath();fxc.arc(x,y,1+(i%3)*.6,0,Math.PI*2);fxc.fill();}else{fxc.beginPath();fxc.moveTo(x,y);fxc.lineTo(x-3,y+(w.sleet>0?5:16));fxc.stroke();}
  }
  if(cameraStyle===2&&save.climate.wipers!==false&&!isSnow){const swing=Math.sin(sim.time*(w.rain>.7?4:2.8))*.65;fxc.lineWidth=5;fxc.strokeStyle='rgba(13,23,31,.82)';for(const side of [.24,.61]){const x=fx.width*side,y=fx.height*1.03,length=fx.height*.44;fxc.beginPath();fxc.moveTo(x,y);fxc.lineTo(x+Math.sin(swing)*length,y-Math.cos(swing)*length);fxc.stroke();}}
  fxc.restore();
}
