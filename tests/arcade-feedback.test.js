import test from 'node:test';
import assert from 'node:assert/strict';
import {createScoreFeedback} from '../src/score-feedback.js';
import {pickupTrafficOverlap,approachVisibility} from '../src/pickup-visibility.js';
test('near and combo events coalesce into one bounded notification and expire on simulation clock',()=>{
 const label={},number={},el={style:{},dataset:{},querySelector:s=>s==='span'?label:number};
 const ui=createScoreFeedback(el),s={time:1,combo:2,mode:'running',crashTime:0};
 ui.notify(s,true);s.combo=3;ui.update(s,{x:900,y:800},390,844);
 assert.equal(label.textContent,'NEAR MISS');assert.equal(number.textContent,'×3');assert.equal(el.style.left,'228px');
 s.time=1.2;ui.notify(s,true);assert.equal(number.textContent,'×3');
 s.time=3;ui.update(s,{x:0,y:0},390,844);assert.equal(el.hidden,true);
 ui.reset();s.time=0;s.combo=1;ui.update(s,{x:100,y:100},390,844);assert.equal(el.hidden,true);
});
test('reduced motion keeps popup stationary and at readable scale',()=>{
 const el={style:{},dataset:{},querySelector:()=>({})};const ui=createScoreFeedback(el,()=>true),s={time:1,combo:5,mode:'running'};
 ui.notify(s,true);ui.update(s,{x:200,y:600},390,844);const top=el.style.top;s.time+=.2;ui.update(s,{x:200,y:600},390,844);assert.equal(el.style.top,top);assert.match(el.style.transform,/scale\(1\)/);
});
test('orb overlap tests screen geometry and depth, with smooth attenuation and restoration',()=>{
 const orb={left:-.1,right:.1,top:-.1,bottom:.1,depth:30};const car={left:-.2,right:.2,top:-.2,bottom:.2,depth:38};
 assert.equal(pickupTrafficOverlap(orb,[car]),true);
 assert.equal(pickupTrafficOverlap(orb,[{...car,depth:20}]),false);
 assert.equal(pickupTrafficOverlap(orb,[{...car,left:.2,right:.4}]),false);
 let alpha=1;for(let i=0;i<60;i++)alpha=approachVisibility(alpha,true,1/120);assert.ok(alpha<.121&&alpha>=.12);
 assert.equal(approachVisibility(alpha,false,0),alpha);const next=approachVisibility(alpha,false,1/120);assert.ok(next>alpha&&next<1);
});
test('safety events replace rewards and reject lower priority bursts without queuing',()=>{
 const nodes={span:{},strong:{},small:{}},el={style:{},dataset:{},querySelector:s=>nodes[s]};const ui=createScoreFeedback(el),s={time:1,combo:4,mode:'running',recovery:2.2,shield:100};
 ui.event(s,{type:'respawn',text:'BACK IN THE RACE',detail:'RECOVERY PROTECTION'});
 ui.event(s,{type:'near'});ui.event(s,{type:'energy',text:'+400'});ui.update(s,{x:10,y:500},320,640);
 assert.equal(nodes.span.textContent,'BACK IN THE RACE');assert.equal(nodes.small.textContent,'RECOVERY PROTECTION');assert.equal(nodes.strong.textContent,'');
 s.time=3;ui.update(s,{x:10,y:500},320,640);assert.equal(el.hidden,true);
 s.time=4;ui.event(s,{type:'hit',text:'CRASH'});s.crashTime=.8;ui.update(s,{x:10,y:500},320,640);assert.equal(el.hidden,false);assert.equal(nodes.span.textContent,'CRASH');
 ui.reset();assert.equal(el.hidden,true);
});
test('oncoming stays out of the vehicle popup and pause clears rewards',()=>{
 const nodes={span:{},strong:{},small:{}},el={style:{},dataset:{},querySelector:s=>nodes[s]},ui=createScoreFeedback(el);
 const s={time:0,combo:1,shield:100,mode:'running',oncoming:true};ui.update(s,{x:200,y:400},390,844);assert.equal(el.hidden,true);
 ui.event(s,{type:'oncoming',text:'ONCOMING TRAFFIC'});ui.update(s,{x:200,y:400},390,844);assert.equal(el.hidden,true);
 ui.event(s,{type:'energy',text:'+100'});s.mode='paused';ui.update(s,{x:200,y:400},390,844);s.mode='running';ui.update(s,{x:200,y:400},390,844);assert.equal(el.hidden,true);
});
test('respawn replaces the completed crash even before the crash notification expires',()=>{
 const nodes={span:{},strong:{},small:{}},el={style:{},dataset:{},querySelector:s=>nodes[s]};const ui=createScoreFeedback(el),s={time:1,combo:1,shield:66,mode:'running',crashTime:.85};
 ui.event(s,{type:'hit',text:'CRASH'});ui.update(s,{x:200,y:500},390,844);
 s.time+=.85;s.crashTime=0;s.recovery=2.2;ui.event(s,{type:'respawn',text:'BACK IN THE RACE',detail:'RECOVERY PROTECTION'});ui.update(s,{x:200,y:500},390,844);
 assert.equal(nodes.span.textContent,'BACK IN THE RACE');assert.equal(el.hidden,false);
});
