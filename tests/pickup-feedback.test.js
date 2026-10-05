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
 collectPickup(s,'energy');assert.equal(s.events.find(e=>e.type==='energy').amount,300);assert.equal(s.score,300);
});
test('pickup origins stay fixed while nearby gains merge and expire without following the player',()=>{
 const nodes=[],container={ownerDocument:{createElement:()=>({style:{},dataset:{},remove(){nodes.splice(nodes.indexOf(this),1);}})},append:n=>nodes.push(n)};
 const ui=createPickupFeedback(container),s={time:0,mode:'running',x:0};ui.add({resource:'energy',amount:300},{x:130,y:400},0);ui.update(s,390,844);
 const x=nodes[0].style.left;ui.add({resource:'energy',amount:300},{x:135,y:402},.1);assert.equal(nodes.length,1);assert.equal(nodes[0].textContent,'+600 Energy');
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
