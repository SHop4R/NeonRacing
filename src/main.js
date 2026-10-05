import {launchFrame} from './launch.js';
import {createTutorial,tutorialPrompts,TUTORIAL_KEY} from './tutorial.js';
import {createPickupFeedback} from './pickup-feedback.js';
import {createOncomingHud} from './oncoming-hud.js';
import {createScoreFeedback} from './score-feedback.js';
import {nitroPresentation,createNitroFeedback} from './hud.js';
import './style.css';
import './typography.css';
import './menu.css';
import {createGame,startGame,stepGame} from './simulation.js';
import {createScene} from './scene.js';
import {createInput} from './input.js';
import {createAudio} from './audio.js';
const $=id=>document.getElementById(id);
const game=createGame(),audio=createAudio(),tutorial=createTutorial();
let appFocused=true,introInterrupted=false;
let introElapsed=0,introQuick=false,wantsTutorial=false;
const touch=()=>matchMedia('(pointer:coarse),(max-width:600px),(max-width:900px) and (max-height:620px)').matches;
function tutorialDone(){try{return localStorage.getItem(TUTORIAL_KEY)==='yes';}catch{return false;}}
function saveTutorial(){try{localStorage.setItem(TUTORIAL_KEY,'yes');}catch{}}
const oncomingHud=createOncomingHud($('oncoming-status'));
const popup=document.createElement('div');popup.id='car-feedback';popup.hidden=true;popup.innerHTML='<span></span><strong></strong><small></small>';popup.setAttribute('role','status');$('game').append(popup);
const gains=document.createElement('div');gains.id='pickup-feedback';gains.setAttribute('aria-hidden','true');$('game').append(gains);
const pickupFeedback=createPickupFeedback(gains,()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
const scoreFeedback=createScoreFeedback(popup,()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
const nitroFeedback=createNitroFeedback($('nitro-panel'),()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
let scene,best=0,hitUntil=0,last=0,accumulator=0,lastHud=0,lastMultiplier=0;
try{best=Math.max(0,Number(localStorage.getItem('neon-racing-best'))||0);}catch{}
$('best').textContent=String(Math.floor(best)).padStart(6,'0');
function setMode(mode) {
  game.mode=mode;$('ignition-status').hidden=mode!=='intro';$('start').disabled=mode==='intro';if(mode!=='running')scoreFeedback.clear();document.body.className=mode==='running'?'playing':mode;
  for(const animation of $('nitro-panel').getAnimations({subtree:true})){
    if(mode==='paused')animation.pause();
    else if(mode==='running'&&animation.playState==='paused')animation.play();
    else if(mode==='ready'||mode==='over')animation.cancel();
  }
  $('menu').hidden=mode!=='ready';$('dialog').hidden=!['paused','over'].includes(mode);
  $('pause').disabled=mode==='ready'||mode==='over'||mode==='intro';$('pause').setAttribute('aria-label',mode==='paused'?'Resume game':'Pause game');
  if(mode==='paused'){$('dialog-kicker').textContent='PAUSED';$('dialog-title').textContent='RUN PAUSED';$('dialog-copy').textContent='';$('results').hidden=true;$('resume').hidden=false;$('resume').focus();}
  if(mode==='over') {
    $('dialog-kicker').textContent=game.score>best?'A NEW PERSONAL BEST':'RUN COMPLETE';
    $('dialog-title').textContent='END OF THE ROAD';$('dialog-copy').textContent='';
    $('results').hidden=false;$('resume').hidden=true;
    $('final-score').textContent=Math.floor(game.score).toLocaleString();$('final-near').textContent=game.nearMisses;$('final-distance').textContent=(game.distance/1000).toFixed(2)+' km';
    best=Math.max(best,Math.floor(game.score));$('best').textContent=String(best).padStart(6,'0');
    try{localStorage.setItem('neon-racing-best',String(best));}catch{}
    $('restart').focus();$('live-message').textContent=`Run finished. Score ${Math.floor(game.score)}.`;
  }
}
function start(){if(!scene)return;tutorial.finish();$('tutorial').hidden=true;$('help').hidden=true;input.clear();oncomingHud.reset();pickupFeedback.reset();scoreFeedback.reset();nitroFeedback.reset();startGame(game);setMode('running');$('start').blur();$('restart').blur();hitUntil=0;accumulator=0;$('nitro-panel').getAnimations({subtree:true}).forEach(a=>a.cancel());$('live-message').textContent='Run started. Nitro charging.';}
function beginPlay(forceTutorial=false){
 if(!scene||game.mode==='intro')return;
 void audio.unlock().then(updateSoundButton);
 const retry=game.mode==='over'||game.mode==='paused';wantsTutorial=forceTutorial||!tutorialDone();
 appFocused=true;introInterrupted=false;input.clear();$('help').hidden=true;$('tutorial').hidden=true;tutorial.finish();
 introQuick=retry;introElapsed=0;
 startGame(game);Object.assign(game,launchFrame(0,introQuick));
 scene.beginIntro();setMode('intro');audio.ignition(introQuick);
}
function finishTutorial(){tutorial.finish();saveTutorial();start();}
function openHelp(){
 if(game.mode==='intro')return;
 if(game.mode==='running')pause();
 $('help-steer').textContent=touch()?'Hold ‹ or ›':'A / D or ← / →';
 $('help-brake').textContent=touch()?'Hold BRAKE':'Hold S or ↓';
 $('help-nitro').textContent=touch()?'Hold NITRO. Full tank adds shield + magnet.':'Hold Space. Full tank adds shield + magnet.';
 $('help').hidden=false;$('menu').hidden=true;$('dialog').hidden=true;
 $('help-title').setAttribute('tabindex','-1');$('help-title').focus({preventScroll:true});$('help').scrollTop=0;
}
function closeHelp(){
 $('help').hidden=true;setMode(game.mode);
 (game.mode==='ready'?$('how-menu'):$('how-pause')).focus();
}
function pause(){if(!$('help').hidden)return;if(game.mode==='running'){input.clear();setMode('paused');}else if(game.mode==='paused'){input.clear();setMode('running');$('resume').blur();$('pause').blur();}}
function boost(){if(game.mode==='running')game.nitroPress=true;}
const input=createInput($('game'),{boost,pause,escape:()=>{if(!$('help').hidden)closeHelp();else pause();},restart:()=>{if(game.mode==='over')beginPlay();},start:()=>{if((game.mode==='ready'||game.mode==='over')&&$('help').hidden)beginPlay();},blur:()=>{appFocused=false;if(game.mode==='intro'){introInterrupted=true;audio.stopIgnition();}if(game.mode==='running')pause();}});
$('start').addEventListener('click',()=>beginPlay());$('restart').addEventListener('click',()=>beginPlay());$('resume').addEventListener('click',pause);$('pause').addEventListener('click',()=>{pause();$('pause').blur();});
$('how-menu').addEventListener('click',openHelp);$('how-pause').addEventListener('click',openHelp);
$('close-help').addEventListener('click',closeHelp);
$('replay-tutorial').addEventListener('click',()=>beginPlay(true));$('skip-tutorial').addEventListener('click',finishTutorial);
function updateSoundButton(on){$('sound').setAttribute('aria-label',on?'Mute sound':'Enable sound');$('sound').querySelector('span').hidden=on;}
$('sound').addEventListener('click',async()=>{updateSoundButton(await audio.toggle());$('sound').blur();});
try{scene=createScene($('world'));}catch(error){$('menu').hidden=true;$('dialog').hidden=false;$('dialog-title').textContent='3D UNAVAILABLE';$('dialog-copy').textContent='This browser could not start WebGL. Try a browser with hardware acceleration enabled.';$('dialog-kicker').textContent='RENDERER UNAVAILABLE';$('resume').hidden=true;$('restart').hidden=true;console.error(error);}
setMode('ready');
if(!scene){$('menu').hidden=true;$('dialog').hidden=false;$('start').disabled=true;}
window.addEventListener('focus',()=>{appFocused=true;if(introInterrupted&&game.mode==='intro'){introInterrupted=false;if(introElapsed<(introQuick?.32:.8)){introElapsed=0;Object.assign(game,launchFrame(0,introQuick));audio.ignition(introQuick);}}});
window.addEventListener('resize',()=>{input.clear();scene?.resize();});
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();if(game.mode==='running')pause();$('dialog-copy').textContent='The 3D view was interrupted. Reload the page to reconnect.';});
function updateHud(now,day) {
  $('score').textContent=String(Math.floor(game.score)).padStart(6,'0');
  const multiplier=Math.floor(game.combo);
  if(multiplier!==lastMultiplier){$('multiplier').innerHTML=`${multiplier}<span>×</span>`;lastMultiplier=multiplier;}
  $('combo-fill').style.width=`${game.combo>=5?100:(game.combo%1)*100}%`;
  $('shield').textContent=game.shield;$('shield-fill').style.width=game.shield+'%';$('shield-fill').style.background=game.shield<=32?'#ff478c':'#79fff4';
  $('speed').textContent=String(game.mode==='ready'?0:Math.round(game.speed*3.6)).padStart(3,'0');
  $('distance').textContent=(game.distance/1000).toFixed(2)+' KM';const nitro=nitroPresentation(game,window.matchMedia('(pointer:coarse),(max-width:600px),(max-width:900px) and (max-height:620px)').matches);
  $('nitro-reserve').hidden=!(game.nitroReserve>0);$('nitro-reserve').textContent=`BANKED ${Math.round((game.nitroReserve??0)*100)}% · AFTER BOOST`;
  $('nitro-count').textContent=nitro.percent;$('nitro-panel').dataset.state=nitro.state;
  $('nitro-state').textContent=nitro.label;$('nitro-hint').textContent=nitro.detail;
  $('nitro-fill').style.width=`${nitro.fill*100}%`;
  $('nitro-meter').setAttribute('aria-valuenow',nitro.percent);
  $('nitro-panel').setAttribute('aria-label',`Nitro ${nitro.label.toLowerCase()}, ${nitro.percent} percent`);
  $('drive-status').textContent=game.crashTime>0?'CRASH':game.recovery>0?'RECOVERY':game.braking?'BRAKING':game.boost>0?'BOOST':'CRUISE';
  $('drive-status').classList.toggle('braking',game.braking);
  $('ambience').textContent=day>.65?'DAYBREAK':day>.2?'BLUE HOUR':'NIGHT RUN';
  $('boost-wash').style.opacity=game.boost>0&&game.mode==='running'?(game.boostMode==='auto'?'1':'.4'):'0';
  $('touch-boost').setAttribute('aria-disabled',String(!nitro.available));
  $('touch-boost').dataset.state=nitro.state;
  $('touch-boost').querySelector('span').textContent=nitro.state==='charging'?`${nitro.percent}%`:nitro.label;
  $('hit-flash').style.opacity=now<hitUntil?'1':'0';
}
function frame(timestamp) {
  const now=timestamp/1000,dt=Math.min(.1,now-(last||now));last=now;
  if(game.mode==='intro'&&appFocused&&!document.hidden){if(game.introProgress>=1){const teach=wantsTutorial;start();if(teach)tutorial.begin(game);}else{introElapsed+=dt;Object.assign(game,launchFrame(introElapsed,introQuick));}}
  if(game.mode==='running') {accumulator+=dt;while(accumulator>=1/120){const controls=input.read();game.tutorialSafe=tutorial.active;if(tutorial.active){game.entities=[];game.spawnTimer=1e6;}stepGame(game,controls,1/120);if(tutorial.active&&tutorial.update(game,controls,1/120)){finishTutorial();break;}accumulator-=1/120;if(game.mode==='over')break;}}else accumulator=0;
  for(const event of game.events.splice(0)) {
    scene?.handleEvent(event,game);
    if(event.type==='over'){setMode('over');continue;}
    if(event.type==='nitro-ready'){
      if(!game.boost){nitroFeedback.ready(game);scoreFeedback.event(game,event);}
      $('live-message').textContent='Full power ready. Press nitro for automatic boost, shield and magnet.';
      audio.event('nitro');continue;
    }
    if(event.type==='boost')nitroFeedback.activate(game.boostMode==='auto');
    audio.event(event.type);
    if(event.pickup)pickupFeedback.add(event,scene?.pickupScreen(event.position)??{x:innerWidth/2,y:innerHeight*.6},game.time);
    else scoreFeedback.event(game,event);
    if(event.type==='hit')hitUntil=now+.3;
  }
  $('tutorial').hidden=!tutorial.active||game.mode!=='running';if(tutorial.active){$('tutorial-step').textContent=`${tutorial.step+1} / 5`;$('tutorial-prompt').textContent=tutorialPrompts(touch())[tutorial.step];}
  oncomingHud.update(game);nitroFeedback.update(game);pickupFeedback.update(game,innerWidth,innerHeight);
  const day=scene?.render(game,now)||0;scoreFeedback.update(game,scene?.playerScreen()??{x:innerWidth/2,y:innerHeight*.7},innerWidth,innerHeight);if(now-lastHud>=1/30){updateHud(now,day);lastHud=now;}audio.update(game);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Module exports let the development-only browser fixture exercise real UI wiring.
export {game, input, scene, start, pause};
