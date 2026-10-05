import test from 'node:test';
import assert from 'node:assert/strict';
import {nitroPresentation,animateNitroReady} from '../src/hud.js';
test('HUD distinguishes fuel, full bonuses, partial boost, expired bonuses and recovery restrictions',()=>{
 const s={nitro:0,boost:0,mode:'running',braking:false,crashTime:0};
 assert.equal(nitroPresentation(s).label,'CHARGING');assert.match(nitroPresentation(s).detail,/30s/);
 s.nitro=.5;assert.equal(nitroPresentation(s).available,true);assert.equal(nitroPresentation(s).label,'AVAILABLE');
 s.boost=1;s.boostMode='hold';assert.match(nitroPresentation(s).detail,/NO SHIELD/);assert.equal(nitroPresentation(s).fill,.5);
 s.boostMode='auto';s.bonusTime=8;assert.match(nitroPresentation(s).detail,/SHIELD \+ MAGNET 8.0s/);
 s.bonusTime=0;assert.match(nitroPresentation(s).detail,/EXPIRED/);
 s.boost=0;s.nitro=1;assert.equal(nitroPresentation(s).label,'FULL POWER');s.braking=true;assert.equal(nitroPresentation(s).available,false);
});
test('ready animation runs one pop and one sweep, with reduced-motion alternative',()=>{const calls=[];const panel={getAnimations:()=>[],animate:(frames,options)=>calls.push({frames,options}),querySelector:()=>({getAnimations:()=>[],animate:(frames,options)=>calls.push({frames,options})})};animateNitroReady(panel);assert.equal(calls.length,2);assert.equal(calls[0].frames[1].translate,'0 -8px');assert.equal(calls[0].options.duration,500);calls.length=0;animateNitroReady(panel,true);assert.equal(calls.length,1);assert.equal(calls[0].frames.some(f=>f.transform),false);});
import {createNitroFeedback} from '../src/hud.js';
test('Nova feedback celebrates each ready transition once, freezes with simulation time, and resets',()=>{
 const calls=[],sparks=[];const particles={getAnimations:()=>[],replaceChildren:()=>sparks.length=0,append:s=>sparks.push(s)};
 const panel={style:{},dataset:{},getAnimations:()=>[],querySelector:selector=>selector==='.nitro-particles'?particles:null,
  animate:(frames,opts)=>{calls.push({frames,opts});return {cancel(){}};},ownerDocument:{createElement:()=>({style:{},animate:()=>({cancel(){}}),remove(){}})}};
 const ui=createNitroFeedback(panel),s={mode:'running',nitro:1,boost:0,time:30};ui.ready(s);ui.update(s);ui.update(s);assert.equal(calls.length,1);assert.equal(sparks.length,18);
 s.time+=.2;ui.update(s);const scale=panel.style.scale;s.mode='paused';ui.update(s);assert.equal(panel.style.scale,scale);assert.equal(calls.length,1);
 s.mode='running';s.boost=1;s.boostMode='hold';ui.activate(false);ui.update(s);assert.equal(panel.dataset.power,'normal');assert.equal(panel.style.scale,'1');
 s.boost=0;ui.update(s);assert.equal(calls.length,3);ui.reset();assert.equal(panel.style.scale,'1');assert.equal(sparks.length,0);
});
