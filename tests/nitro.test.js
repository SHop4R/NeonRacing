import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,stepGame,collectPickup,hasNitroBonus} from '../src/simulation.js';
const run=()=>{const s=createGame();startGame(s);s.spawnTimer=1e6;return s;};
const advance=(s,seconds,input={})=>{for(let i=0;i<Math.round(seconds*120);i++)stepGame(s,input,1/120);};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('empty starts, 30 active seconds refill exactly once and pause freezes all timers',()=>{
 const s=run();assert.equal(s.nitro,0);advance(s,29);assert.ok(s.nitro<1);advance(s,1);assert.equal(s.nitro,1);
 advance(s,5);assert.equal(s.events.filter(e=>e.type==='nitro-ready').length,1);
 advance(s,1,{boost:true});s.mode='paused';const snapshot=JSON.stringify(s);advance(s,60,{boost:true});assert.equal(JSON.stringify(s),snapshot);
});
test('partial fuel boosts only while held without bonuses, then waits .75s to charge',()=>{
 const s=run();s.nitro=.5;advance(s,2,{boost:true});close(s.nitro,.3);assert.equal(s.boostMode,'hold');assert.equal(hasNitroBonus(s),false);
 advance(s,.75);assert.equal(s.boost,0);close(s.nitro,.3);advance(s,3);close(s.nitro,.4);
});
test('full activation latches after initial release and drains in seven seconds',()=>{
 const s=run();s.nitro=1;advance(s,.5,{boost:true});assert.equal(s.boostMode,'auto');assert.ok(hasNitroBonus(s));
 advance(s,6.4);assert.equal(s.boostMode,'auto');assert.ok(s.nitro>0);advance(s,.1);assert.equal(s.nitro,0);assert.equal(s.boost,0);assert.equal(hasNitroBonus(s),false);
});
test('fresh press or brake cancels automatic boost, held cancel cannot restart it',()=>{
 for(const cancel of [{boost:true},{boost:true,brake:true}]){
  const s=run();s.nitro=1;advance(s,.1,{boost:true});advance(s,.1);advance(s,.1,cancel);assert.equal(s.boost,0);assert.equal(s.bonusTime,0);
  advance(s,1,{boost:true});assert.equal(s.boost,0);advance(s,.1);advance(s,.1,{boost:true});assert.equal(s.boostMode,'hold');
 }
});
test('orbs cap fuel, do not upgrade a held boost, and do not extend original bonus duration',()=>{
 const partial=run();partial.nitro=.5;advance(partial,1,{boost:true});collectPickup(partial,'nitro');collectPickup(partial,'nitro');assert.equal(partial.nitro,1);advance(partial,1,{boost:true});assert.equal(partial.bonusTime,0);assert.equal(partial.boostMode,'hold');
 const full=run();full.nitro=1;advance(full,1,{boost:true});advance(full,4);collectPickup(full,'nitro');advance(full,2.1);assert.equal(full.boostMode,'off');assert.equal(hasNitroBonus(full),false);assert.equal(full.nitro,1);assert.equal(full.nitroReserve,0);
});
test('depletion while held cannot sputter or automatically start with an orb',()=>{
 const s=run();s.nitro=.1;advance(s,1,{boost:true});assert.equal(s.boost,0);collectPickup(s,'nitro');advance(s,1,{boost:true});assert.equal(s.boost,0);advance(s,.1);advance(s,.1,{boost:true});assert.equal(s.boostMode,'auto');
});
test('partial boost has no magnet, full bonus attracts pickups',()=>{
 for(const full of [false,true]){
  const s=run();s.nitro=full?1:.5;s.entities=[{id:10,kind:'energy',x:3,z:22,speed:24}];advance(s,.1,{boost:true});assert.equal(s.entities[0].x<3,full);
 }
});
