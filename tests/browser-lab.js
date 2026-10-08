// Owned, development-only UI fixture: actions exercise the real game and input wiring.
const markup=await (await fetch('/index.html')).text();
const template=new DOMParser().parseFromString(markup,'text/html');document.body.replaceChildren(template.querySelector('main'),template.querySelector('#audio-settings'));
const {game,input,scene,start,pause}=await import('../src/main.js');
document.getElementById('game').inert=false;
const {collectPickup}=await import('../src/simulation.js');
const {makePickup}=await import('../src/pickups.js');
const {makeTraffic,LANES,VEHICLES}=await import('../src/traffic.js');
const bar=document.createElement('aside');bar.style.cssText='position:fixed;z-index:100;top:145px;left:8px;display:flex;max-width:95vw;max-height:45vh;overflow:auto;gap:4px;flex-wrap:wrap;padding:5px;background:#06101ce8;font:10px monospace';
const report=document.createElement('output');report.setAttribute('aria-label','Verification report');report.style.cssText='display:block;flex-basis:100%;color:white;white-space:pre-wrap';bar.append(report);document.body.append(bar);
let tutorialDriver=false;
let comparisonSpeed=null,compareEnd=Infinity,stopAfterBoost=false;
let stopOnPickup=false,blinkFrames=0,visibleFrames=0;let override={},autopilot=false,readyTransitions=0,signals=new Set(),moving=new Set(),lastState='charging',frames=0,frameTime=0,lastFrame=0,peakParticles=0,signPasses=0,priorSigns=[],lastCrash=0;
const {drive}=await import('./driver.js');
const {difficultyAt,DRIVING,DIFFICULTY,NITRO}=await import('../src/tuning.js');
const read=input.read;let autoInput={},nextDecision=0;
input.read=()=>{
 if(comparisonSpeed!==null){const decay=Math.exp(-DRIVING.acceleration/120);game.speed=(comparisonSpeed-difficultyAt(game.distance).speed*(1-decay))/decay;}
 if(autopilot&&game.time>=nextDecision){autoInput=drive(game);nextDecision=game.time+.1;}
 if(tutorialDriver&&!document.getElementById('tutorial').hidden){const n=Number(document.getElementById('tutorial-step').textContent.split('/')[0]);return {steer:n===1?1:n===4?-1:n===5?1:0,brake:n===2,boost:n===3};}
 return {...read(),...(autopilot?autoInput:{}),...override};
};
const watch=new MutationObserver(()=>{const state=document.getElementById('nitro-panel').dataset.state;if(state==='ready'&&lastState!=='ready')readyTransitions++;lastState=state;});watch.observe(document.getElementById('nitro-panel'),{attributes:true,attributeFilter:['data-state']});
function button(label,action){const b=document.createElement('button');b.textContent=label;b.style.cssText='padding:7px;border:1px solid #79fff4;background:#142936;color:white;font:10px monospace';b.onclick=()=>{comparisonSpeed=null;compareEnd=Infinity;stopAfterBoost=false;action();b.blur();};bar.append(b);}
const key=(type)=>window.dispatchEvent(new KeyboardEvent(type,{code:'Space',bubbles:true}));
button('Reset test',()=>{override={};autopilot=false;readyTransitions=0;signals.clear();moving.clear();frames=0;frameTime=0;start();});
button('Autopilot run',()=>{override={};autopilot=true;nextDecision=0;signals.clear();moving.clear();start();});
button('Drive after launch',()=>{override={};autopilot=true;nextDecision=0;});
button('Partial fuel',()=>{game.nitro=.45;});
button('Collect orb',()=>collectPickup(game,'nitro'));
button('Hold Space',()=>key('keydown'));
button('Release Space',()=>key('keyup'));
button('Press Space',()=>{key('keydown');setTimeout(()=>key('keyup'),40);});
button('Brake hold',()=>{override.brake=true;});
button('Release brake',()=>{override.brake=false;});
button('Hard left',()=>{autopilot=false;override.steer=-1;});
button('Straight',()=>{override.steer=0;});
button('Crash now',()=>{autopilot=false;override={};game.entities.push({id:game.nextId++,kind:'traffic',x:game.x,z:3,speed:24});});
button('Signal scene',()=>{game.entities=[makeTraffic(game,0,230,1),makeTraffic(game,3,230,1)];game.laneChangeTimer=0;});
button('Pause view',()=>{if(game.mode==='running')pause();document.getElementById('dialog').hidden=true;});
button('Resume view',()=>{if(game.mode==='paused')pause();});
button('Impact freeze',()=>{autopilot=false;override={};game.nitro=0;game.boost=0;game.bonusTime=0;game.recovery=0;game.entities=[{id:game.nextId++,kind:'traffic',x:game.x+.5,z:2,speed:24}];setTimeout(()=>{if(game.mode==='running')pause();document.getElementById('dialog').hidden=true;},220);});
button('Lane-edge orb',()=>{stopOnPickup=true;override={};autopilot=false;start();game.spawnTimer=1e6;game.x=-1.04;game.entities=[makePickup(game,'nitro',1.5,8)];});
button('Brake behind orb',()=>{stopOnPickup=true;override={brake:true};autopilot=false;start();game.spawnTimer=1e6;game.x=1.5;game.entities=[makeTraffic(game,2,30,1,'truck'),makePickup(game,'nitro',1.5,35)];});
button('Partial effects',()=>{override={boost:true};autopilot=true;start();game.nitro=.5;});
button('Full effects',()=>{override={};autopilot=true;start();collectPickup(game,'nitro');game.nitroPress=true;});
button('Blink recovery',()=>{override={};autopilot=false;start();game.recovery=2.2;});
for(const kmh of [160,400])button(`${kmh} comparison`,()=>{override={};autopilot=false;start();comparisonSpeed=kmh/3.6;compareEnd=3;game.speed=comparisonSpeed;game.spawnTimer=1e6;game.entities=[makeTraffic(game,3,120,1,'sedan'),makeTraffic(game,0,160,1,'sedan'),makePickup(game,'nitro',1.5,150)];for(const e of game.entities)if(e.kind==='traffic'){e.speed=25;e.cruiseSpeed=25;}});
for(const kmh of [55,Math.round(DIFFICULTY.maxSpeed*NITRO.speedMultiplier*3.6)])button(`Orb approach ${kmh}`,()=>{override={};autopilot=false;start();comparisonSpeed=kmh/3.6;compareEnd=660/comparisonSpeed;game.speed=comparisonSpeed;game.spawnTimer=1e6;stopOnPickup=false;game.entities=[makePickup(game,'nitro',1.5,760)];});
button('Parallel overlap',()=>{override={};autopilot=false;start();game.x=3;game.spawnTimer=1e6;game.entities=[makeTraffic(game,2,12,1,'sedan'),makeTraffic(game,3,12,1,'sedan')];for(const e of game.entities){e.speed=30;e.cruiseSpeed=undefined;}});
button('Seven-second boost',()=>{override={};autopilot=false;start();game.spawnTimer=1e6;collectPickup(game,'nitro');game.nitroPress=true;stopAfterBoost=true;});
button('Motorcycle front rear',()=>{override={};autopilot=false;start();game.spawnTimer=1e6;game.entities=[makeTraffic(game,1,22,1,'motorcycle'),makeTraffic(game,2,22,1,'motorcycle'),makeTraffic(game,0,65,1,'motorcycle'),makeTraffic(game,3,65,1,'motorcycle')];pause();document.getElementById('dialog').hidden=true;});
button('Motorcycle overtake',()=>{override={};autopilot=false;start();game.x=-4.5;game.spawnTimer=1e6;const bike=makeTraffic(game,2,180,1,'motorcycle'),truck=makeTraffic(game,2,230,1,'truck');bike.speed=24;bike.cruiseSpeed=VEHICLES.motorcycle.max;truck.speed=truck.cruiseSpeed=VEHICLES.truck.min;game.entities=[bike,truck];game.laneChangeTimer=0;});
button('Crash between lanes',()=>{override={};autopilot=false;start();game.spawnTimer=1e6;game.x=-3;game.entities=[{id:game.nextId++,kind:'traffic',x:-3,z:1,speed:0}];});
button('Vehicle lineup',()=>{override={};autopilot=false;start();game.spawnTimer=1e6;game.entities=['truck','pickup','motorcycle','van','hatchback','sedan'].map((type,i)=>makeTraffic(game,i%4,28+Math.floor(i/4)*24,i,type));pause();document.getElementById('dialog').hidden=true;});
button('Oncoming warning',()=>{override={};autopilot=false;start();game.x=-1.5;game.spawnTimer=1e6;game.entities=[makeTraffic(game,1,160,1,'sedan')];setTimeout(()=>{if(game.mode==='running')pause();document.getElementById('dialog').hidden=true;},70);});
button('Late traffic',()=>{override={};autopilot=true;nextDecision=0;start();game.distance=DIFFICULTY.rampDistance;game.speed=difficultyAt(game.distance).speed;});
button('Feedback burst',()=>{override={};autopilot=false;start();game.spawnTimer=1e6;game.combo=3;game.events.push({type:'near',text:'NEAR MISS',detail:''});setTimeout(()=>{game.combo=4;game.events.push({type:'near',text:'NEAR MISS',detail:''});},180);});
for(const type of ['motorcycle','sedan','truck'])button(`Orb over ${type}`,()=>{override={brake:true};autopilot=false;start();game.spawnTimer=1e6;game.x=4.5;const car=makeTraffic(game,1,38,1,type);car.speed=0;car.cruiseSpeed=undefined;game.entities=[car,makePickup(game,'nitro',-1.5,31)];setTimeout(()=>{if(game.mode==='running')pause();document.getElementById('dialog').hidden=true;},250);});
button('Recovery message',()=>{override={};autopilot=false;start();game.spawnTimer=1e6;game.recovery=2.2;game.events.push({type:'respawn',text:'BACK IN THE RACE',detail:'RECOVERY PROTECTION · 2.2s'});});
button('Message priority burst',()=>{override={};autopilot=false;start();game.spawnTimer=1e6;game.x=-4.5;game.oncoming=true;game.recovery=2.2;game.combo=4;game.events.push({type:'respawn',text:'BACK IN THE RACE',detail:'RECOVERY PROTECTION · 2.2s'},{type:'near',text:'NEAR MISS'},{type:'energy',text:'+400',detail:'ENERGY COLLECTED'});});
button('Oncoming message',()=>{override={};autopilot=false;start();game.spawnTimer=1e6;game.x=-4.5;});
button('Pickup amounts',()=>{override={steer:-1};autopilot=false;start();game.spawnTimer=1e6;game.shield=92;game.combo=3;collectPickup(game,'repair',{x:1.5,z:2});collectPickup(game,'energy',{x:-1.5,z:2});collectPickup(game,'energy',{x:-1.5,z:2});});
button('Pickup font edges',()=>{override={};autopilot=false;start();game.spawnTimer=1e6;game.combo=5;collectPickup(game,'energy',{x:-4.5,z:0});collectPickup(game,'energy',{x:-4.5,z:0});collectPickup(game,'nitro',{x:4.5,z:0});});
button('Busy shield HUD',()=>{bar.hidden=true;override={};autopilot=false;start();game.spawnTimer=1e6;game.x=-1.5;game.combo=3;game.nitro=.27;game.boost=1;game.boostMode='auto';game.bonusTime=1.95;game.events.push({type:'near',text:'NEAR MISS'});collectPickup(game,'energy',{x:1.5,z:1});game.entities=[makeTraffic(game,0,150,1,'truck'),makeTraffic(game,2,80,1,'motorcycle'),makeTraffic(game,3,115,1,'sedan')];});
button('Tutorial actions',()=>{tutorialDriver=true;});
button('Reserve pickups',()=>{override={};autopilot=false;start();game.spawnTimer=1e6;game.nitro=1;game.nitroPress=true;setTimeout(()=>{collectPickup(game,'nitro');collectPickup(game,'nitro');},500);});
for(const side of [-1,1])button(side<0?'Left barrier scrape':'Right barrier scrape',()=>{override={steer:side};autopilot=false;tutorialDriver=false;start();game.spawnTimer=1e6;game.x=side*6;bar.hidden=true;});
let menuPreview=null;const originalRender=scene.render;scene.render=(state,time)=>originalRender(state,state.mode==='ready'&&menuPreview!==null?menuPreview:time);
for(let i=0;i<6;i++)button(i===5?'Menu side':`Menu angle ${i+1}`,()=>{menuPreview=i===5?3.5:i*7;game.mode='ready';game.x=1.5;game.vx=0;game.boost=0;game.crashTime=0;game.recovery=0;game.entities=[];document.body.className='ready';document.getElementById('menu').hidden=false;document.getElementById('dialog').hidden=true;bar.hidden=true;});
button('Pool restart loop',()=>{override={};autopilot=false;bar.hidden=true;let rounds=0;const cycle=setInterval(()=>{start();game.spawnTimer=1e6;game.entities=['truck','pickup','motorcycle','van','hatchback','sedan'].map((t,i)=>makeTraffic(game,i%4,30+i*20,i,t));pause();document.getElementById('dialog').hidden=true;if(++rounds>=20)clearInterval(cycle);},150);});
button('Hide controls',()=>{bar.hidden=true;});
const launchReport=document.createElement('pre');launchReport.id='launch-report';launchReport.hidden=true;document.body.append(launchReport);
let launchSamples=[],launchStage='';
function monitor(now){
 if(stopAfterBoost&&game.time>1&&!game.boost){stopAfterBoost=false;pause();document.getElementById('dialog').hidden=true;}
 if(game.mode==='running'&&game.time>=compareEnd){comparisonSpeed=null;compareEnd=Infinity;pause();document.getElementById('dialog').hidden=true;}
 if(stopOnPickup&&game.pickups>0){stopOnPickup=false;pause();document.getElementById('dialog').hidden=true;}
 if(lastFrame&&game.mode==='running'){frames++;frameTime+=now-lastFrame;}lastFrame=now;
 for(const e of game.entities){if(e.change?.phase==='signal')signals.add(e.id);if(e.change?.phase==='moving')moving.add(e.id);}
 const view=scene.inspect();
 const stage=game.mode==='intro'?(game.introProgress===0?'ignition':game.introProgress===1?'settled':game.introProgress<.5?'launch-early':'launch-late'):game.mode==='running'&&launchSamples.length?(game.time>3.5?'cruising':'handoff'):'';
 if(stage&&stage!==launchStage){launchStage=stage;launchSamples.push({stage,speed:game.speed,time:game.time,score:game.score,distance:game.distance,travel:game.introDistance,camera:view.camera,boost:game.boost,runId:game.runId,traffic:game.entities.filter(e=>e.kind==='traffic').map(e=>({id:e.id,z:e.z,speed:e.speed,cruiseSpeed:e.cruiseSpeed,launchTime:e.launchTime}))});launchReport.textContent=JSON.stringify(launchSamples);}
peakParticles=Math.max(peakParticles,view.particles);if(game.recovery>0){if(view.bodyVisible)visibleFrames++;else blinkFrames++;}
 view.signs.forEach((z,i)=>{if(priorSigns[i]<0&&z>=0)signPasses++;});priorSigns=view.signs;
 if(game.crashTime>0)lastCrash=game.crashTime;
 report.textContent=`X ${game.x.toFixed(3)} / impact ${game.impactPosition?.x??'-'} | Distance ${(game.distance/1000).toFixed(2)}km | Traffic ${game.entities.filter(e=>e.kind==='traffic'&&e.z>0&&e.z<320).length} near / ${game.entities.filter(e=>e.kind==='traffic').length} total | Time ${game.time.toFixed(1)}s | ${game.mode} | speed ${(game.speed*3.6).toFixed(0)} | fuel ${game.nitro.toFixed(3)} | boost ${game.boostMode} | bonus ${game.bonusTime.toFixed(2)} | recovery ${game.recovery.toFixed(2)}\nSignals ${signals.size} / moves ${moving.size} | signs passed ${signPasses} | crash ${game.crashTime.toFixed(2)} (last ${lastCrash.toFixed(2)}) | shield ${game.shield} | respawns ${game.respawnId} | ready ${readyTransitions}\nPool ${view.pool.created} made / ${view.pool.reused} reused / ${view.pool.idle} idle | Buildings ${view.visibleBuildings} | Render ${view.renderMs.toFixed(2)}ms | calls ${view.drawCalls} | geometries ${view.geometries} | textures ${view.textures} | FPS ${(frames*1000/(frameTime||1)).toFixed(0)} | particles ${view.particles} peak ${peakParticles} | trails ${view.trailSamples} / extent ${view.trailExtent.map(n=>n.toFixed(1))} | camera ${view.camera.map(n=>n.toFixed(2))} | glow ${view.glowY.toFixed(3)} | shield warning ${view.shield.warning.toFixed(2)}/${view.shield.pulse.toFixed(2)} | shield sphere ${view.shield.visible} ${view.shield.scale} | recovery frames on/off ${visibleFrames}/${blinkFrames} | pickups ${game.pickups} | traffic gap ${game.entities.find(e=>e.kind==='traffic')?.z.toFixed(1)} | orbs ${view.pickupVisibility.map(p=>`${p.z.toFixed(0)}m/${p.fade.toFixed(2)}/traffic ${p.trafficFade.toFixed(2)}`).join(',')} | power ${view.intensity.toFixed(2)} | HUD scale ${document.getElementById('nitro-panel').style.scale} | pitch/roll ${view.body.map(n=>n.toFixed(3))}`;
 requestAnimationFrame(monitor);
}requestAnimationFrame(monitor);
