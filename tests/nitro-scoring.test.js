import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,stepGame,collectPickup} from '../src/simulation.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const run=fuel=>{const s=createGame();startGame(s);s.spawnTimer=1e6;s.nitro=fuel;return s;};
const advance=(s,seconds,input={},hz=120)=>{for(let i=0;i<Math.round(seconds*hz);i++)stepGame(s,input,1/hz);};
test('nitro gives 25 points per active second; seven-second overdrive gives 525 at every step rate',()=>{
 for(const hz of [30,60,120])for(const full of [false,true]){
  const s=run(full?1:.5);advance(s,full?7:5,{boost:true},hz);
  close(s.boostScore,full?525:125);close(s.score,.45*s.distance+s.boostScore);assert.equal(s.boost,0);
  const earned=s.boostScore;advance(s,1,{boost:true},hz);close(s.boostScore,earned);
 }
});
test('only real fuel use earns points, with no tap, pause, crash or tutorial farming',()=>{
 const partial=run(.001);stepGame(partial,{boost:true},.05);close(partial.boostScore,.25);
 const s=run(.5);advance(s,1,{boost:true});close(s.boostScore,25);
 s.mode='paused';const snap=JSON.stringify(s);advance(s,2,{boost:true});assert.equal(JSON.stringify(s),snap);
 s.mode='running';advance(s,.1,{brake:true});close(s.boostScore,25);advance(s,.1,{boost:true});close(s.boostScore,2.5);
 s.crashTime=.5;advance(s,.1,{boost:true});close(s.boostScore,2.5);
 startGame(s);assert.equal(s.boostScore,0);s.tutorialSafe=true;s.nitro=.5;advance(s,1,{boost:true});assert.equal(s.boostScore,0);
});
test('refill keeps partial scoring at its original tier and banked orbs do not extend overdrive rewards',()=>{
 const partial=run(.5);advance(partial,1,{boost:true});collectPickup(partial,'nitro');advance(partial,1,{boost:true});close(partial.boostScore,50);
 const full=run(1);advance(full,2,{boost:true});collectPickup(full,'nitro');advance(full,5,{boost:true});close(full.boostScore,525);assert.equal(full.nitro,1);
 advance(full,1,{boost:true});close(full.boostScore,525);
 const cancelled=run(1);advance(cancelled,2,{boost:true});advance(cancelled,.1,{brake:true});close(cancelled.boostScore,150);
});
