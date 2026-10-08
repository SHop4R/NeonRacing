import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,collectPickup} from '../src/simulation.js';
import {createPickupFeedback,gainText} from '../src/pickup-feedback.js';
import {createScoreFeedback} from '../src/score-feedback.js';
test('gains reflect caps, full transitions occur once, and position is copied before despawn',()=>{
 const s=createGame();s.shield=92;s.combo=3;s.nitro=.75;const p={x:-1.5,z:2};
 collectPickup(s,'repair',p);p.x=4.5;
 assert.equal(s.events.find(e=>e.pickup).amount,8);assert.equal(s.events.find(e=>e.pickup).position.x,-1.5);
 assert.equal(s.events.filter(e=>e.type==='shield-full').length,1);collectPickup(s,'repair');assert.equal(s.events.filter(e=>e.type==='shield-full').length,1);
 collectPickup(s,'nitro');assert.equal(s.events.find(e=>e.type==='orb').amount,25);collectPickup(s,'nitro');assert.equal(s.events.filter(e=>e.type==='nitro-ready').length,1);
 collectPickup(s,'energy');assert.equal(s.events.find(e=>e.type==='energy').amount,300);assert.equal(s.score,1500);
});
test('pickup origins stay fixed while nearby gains merge and expire without following the player',()=>{
 const nodes=[],container={ownerDocument:{createElement:()=>({style:{},dataset:{},remove(){nodes.splice(nodes.indexOf(this),1);}})},append:n=>nodes.push(n)};
 const ui=createPickupFeedback(container),s={time:0,mode:'running',x:0};ui.add({resource:'energy',amount:300},{x:130,y:400},0);ui.update(s,390,844);
 const x=nodes[0].style.left;ui.add({resource:'energy',amount:300},{x:135,y:402},.1);assert.equal(nodes.length,1);assert.equal(nodes[0].textContent,'+600 Score');
 s.x=4.5;s.time=.5;ui.update(s,390,844);assert.equal(nodes[0].style.left,x);assert.ok(parseFloat(nodes[0].style.top)<400);
 s.time=1.2;ui.update(s,390,844);assert.equal(nodes.length,0);
 for(let i=0;i<8;i++)ui.add({resource:'repair',amount:1},{x:i*100,y:400},i);assert.equal(nodes.length,4);ui.reset();assert.equal(nodes.length,0);
 assert.equal(gainText('nitro',25),'+25% Nitro');assert.equal(gainText('repair',8),'+8 Shield');
});
test('reaching full shield replaces a now-stale critical-health warning',()=>{
 const nodes={span:{},strong:{},small:{}},el={style:{},dataset:{},querySelector:s=>nodes[s]},ui=createScoreFeedback(el);
 const s={time:0,combo:1,shield:20,mode:'running'};ui.update(s,{x:200,y:400},390,844);
 s.shield=100;s.time=.1;ui.event(s,{type:'shield-full',text:'Shield Fully Restored'});ui.update(s,{x:200,y:400},390,844);assert.equal(nodes.span.textContent,'Shield Fully Restored');
});

test('score gains fly to the HUD, pulse once and never award points again',()=>{
 const nodes=[],container={ownerDocument:{createElement:()=>({style:{},dataset:{},remove(){nodes.splice(nodes.indexOf(this),1);}})},append:n=>nodes.push(n)};
 const score={style:{},getBoundingClientRect:()=>({left:280,top:80,width:80,height:40})};
 const ui=createPickupFeedback(container,()=>false,score),s={time:0,mode:'running',score:300};
 ui.add({resource:'energy',amount:300},{x:100,y:500},0);ui.update(s,390,844);assert.equal(nodes[0].textContent,'+300 Score');
 s.time=.6;ui.update(s,390,844);assert.ok(parseFloat(nodes[0].style.left)>100);assert.ok(parseFloat(nodes[0].style.top)<300);
 s.mode='paused';const before=nodes[0].style.top;ui.update(s,390,844);assert.equal(nodes[0].style.top,before);assert.ok(container.hidden);
 s.mode='running';s.time=1;ui.update(s,390,844);assert.equal(nodes.length,0);assert.equal(score.style.color,'#fff471');assert.equal(s.score,300);
 s.time=1.4;ui.update(s,390,844);assert.equal(score.style.color,'');ui.reset();assert.equal(score.style.transform,'');
 const quiet=createPickupFeedback(container,()=>true,score);quiet.add({resource:'energy',amount:1},{x:100,y:500},2);s.time=2.6;quiet.update(s,390,844);assert.equal(nodes[0].style.left,'100px');assert.equal(nodes[0].style.top,'500px');
});

test('every orb scores once at the current combo, even when resources or reserve are full',()=>{
 for(const kind of ['energy','repair','nitro'])for(const full of [false,true]){
  const s=createGame();s.combo=3;s.shield=full?100:92;s.nitro=full?1:.75;
  collectPickup(s,kind);assert.equal(s.score,300);assert.equal(s.pickups,1);
  const e=s.events.find(e=>e.pickup);assert.equal(e.scoreAmount,300);
  assert.equal(e.amount,kind==='energy'?300:full?0:kind==='repair'?8:25);
  assert.equal(s.events.filter(e=>e.pickup).length,1,'one pickup event and sound');
 }
 const s=createGame();s.combo=4;s.boostMode='auto';s.boost=1;s.nitro=.5;s.bonusTime=3;
 collectPickup(s,'nitro');collectPickup(s,'nitro');assert.equal(s.score,800);assert.equal(s.nitroReserve,1);assert.equal(s.nitro,.5);assert.equal(s.bonusTime,3);
 assert.deepEqual(s.events.filter(e=>e.pickup).map(e=>[e.resource,e.amount,e.scoreAmount]),[['reserve',100,400],['reserve',0,400]]);
});
test('utility pickup feedback separates actual resource gain from its score flight, including capped pickups',()=>{
 const nodes=[],container={ownerDocument:{createElement:()=>({style:{},dataset:{},remove(){nodes.splice(nodes.indexOf(this),1);}})},append:n=>nodes.push(n)};
 const score={style:{},getBoundingClientRect:()=>({left:280,top:80,width:80,height:40})};
 const ui=createPickupFeedback(container,()=>false,score),s={mode:'running',time:0};
 ui.add({resource:'repair',amount:8,scoreAmount:300},{x:100,y:500},0);ui.update(s,390,844);
 assert.deepEqual(nodes.map(n=>n.textContent),['+300 Score','+8 Shield']);
 s.time=.6;ui.update(s,390,844);assert.ok(parseFloat(nodes[0].style.left)>100);assert.equal(nodes[1].style.left,'100px');
 ui.reset();ui.add({resource:'nitro',amount:0,scoreAmount:300},{x:100,y:500},1);assert.equal(nodes.length,1);assert.equal(nodes[0].textContent,'+300 Score');
 ui.reset();ui.add({resource:'energy',amount:300,scoreAmount:300},{x:100,y:500},2);assert.equal(nodes.length,1);assert.equal(nodes[0].textContent,'+300 Score');
});
