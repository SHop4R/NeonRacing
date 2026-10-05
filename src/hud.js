import {NITRO} from './tuning.js';
export function nitroPresentation(s, touch=false) {
  const active=s.boost>0,full=s.nitro>=1,bonus=active&&s.bonusTime>0;
  const fill=active&&s.boostMode==='auto'?Math.min(s.nitro,Math.max(0,s.bonusTime)/NITRO.autoSeconds):s.nitro;
  return {state:active?'active':full?'ready':'charging',
    label:active?(bonus?'OVERDRIVE':s.boostMode==='auto'?'AUTO BOOST':'BOOST'):full?'FULL POWER':s.nitro>0?'AVAILABLE':'CHARGING',
    percent:Math.floor(fill*100+1e-8),fill,
    detail:active?(s.boostMode==='auto'?`${bonus?`SHIELD + MAGNET ${s.bonusTime.toFixed(1)}s`:'BONUSES EXPIRED'} · PRESS TO CANCEL`:'RELEASE TO STOP · NO SHIELD'):
      full?'PRESS: AUTO + SHIELD + MAGNET':`HOLD ${touch?'NITRO':'SPACE'} · FULL IN ${Math.ceil((1-s.nitro)*NITRO.refillSeconds)}s`,
    available:s.mode==='running'&&s.crashTime===0&&!s.braking&&(s.nitro>0||active)};
}
// Adapted from SpaceAttack's actual NovaUI: a simulation-clock scale pulse,
// independent one-shot translate jump, local sparks, and pause-safe animations.
export const nitroReadyScale=seconds=>1.015+.005*Math.sin(seconds*Math.PI*2/2.4);
export function animateNitroReady(panel,reduced=false){
  const jump=panel.animate(reduced?[
    {filter:'brightness(1)'},{filter:'brightness(1.65)',offset:.25},{filter:'brightness(1)'},
  ]:[{translate:'0 0'},{translate:'0 -8px',transform:'scale(1.13)',offset:.3},{translate:'0 2px',transform:'scale(.98)',offset:.65},{translate:'0 0',transform:'scale(1)'}],
  {duration:500,easing:'cubic-bezier(.2,.8,.3,1)'});
  const sweep=panel.querySelector('.nitro-sweep');
  if(sweep&&!reduced)sweep.animate([{transform:'translateX(-140%)',opacity:0},{opacity:.9,offset:.25},{transform:'translateX(440%)',opacity:0}],{duration:620,easing:'ease-out'});
  return jump;
}
export function createNitroFeedback(panel,reduced=()=>false){
  let readyAt=null,wasReady=false;
  function stopReady(){panel.getAnimations({subtree:true}).forEach(a=>a.cancel());clearSparks();panel.style.translate='0 0';}
  const particles=panel.querySelector('.nitro-particles');
  function clearSparks(){if(!particles)return;particles.getAnimations({subtree:true}).forEach(a=>a.cancel());particles.replaceChildren();}
  function sparks(count,strength){
    clearSparks();if(reduced()||!particles)return;
    for(let i=0;i<count;i++){
      const spark=panel.ownerDocument.createElement('i');spark.className='nitro-spark';spark.style.left=`${8+Math.random()*84}%`;spark.style.background=i%3?'#8affed':'#fff1b2';particles.append(spark);
      const a=spark.animate([{transform:'translate(0,0) scale(1.5)',opacity:1},{transform:`translate(${(Math.random()-.5)*65*strength}px,${-(15+Math.random()*32)*strength}px) scale(.3)`,opacity:0}],{duration:500+Math.random()*300,easing:'cubic-bezier(.1,.6,.2,1)',fill:'forwards'});
      a.onfinish=()=>spark.remove();a.oncancel=()=>spark.remove();
    }
  }
  return {
    ready(s){wasReady=true;readyAt=s.time;animateNitroReady(panel,reduced());sparks(18,1);},
    activate(full){stopReady();readyAt=null;wasReady=false;panel.style.scale='1';sparks(full?24:0,1.3);panel.animate(reduced()?[{filter:'brightness(1.6)'},{filter:'brightness(1)'}]:full?[
      {transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(1.045)',filter:'brightness(2)',offset:.16},{transform:'scale(.985)',filter:'brightness(1.25)',offset:.45},{transform:'scale(1)',filter:'brightness(1)'},
    ]:[{filter:'brightness(1.3)'},{filter:'brightness(1)'}],{duration:full?600:180,easing:'ease-out'});},
    update(s){const ready=s.nitro>=1&&!s.boost;if(ready&&!wasReady&&s.mode==='running')this.ready(s);wasReady=ready&&s.mode==='running'||ready&&wasReady;if(!ready){if(readyAt!==null)stopReady();readyAt=null;}else readyAt??=s.time;panel.style.scale=ready&&!reduced()?String(nitroReadyScale(s.time-readyAt)):'1';panel.style.translate='0 0';panel.dataset.power=s.boost?(s.boostMode==='auto'?'full':'normal'):'off';},
    reset(){readyAt=null;wasReady=false;panel.getAnimations({subtree:true}).forEach(a=>a.cancel());clearSparks();panel.style.scale='1';panel.style.transform='';panel.dataset.power='off';}
  };
}
