import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,stepGame} from '../src/simulation.js';
import {seedOpeningTraffic,paceOpeningTraffic,relativeSpeed,trafficBounds} from '../src/traffic.js';
import {DRIVING,DIFFICULTY,COLLISION,TRAFFIC} from '../src/tuning.js';
import {launchFrame,LAUNCH} from '../src/launch.js';
import {createTutorial} from '../src/tutorial.js';
import {drive} from './driver.js';

test('opening traffic is visible immediately, safely spaced and overtaken promptly',()=>{
 for(const random of [.01,.5,.99])for(const hz of [30,60,120]){
  const s=createGame(()=>random);startGame(s);seedOpeningTraffic(s);
  assert.equal(s.entities.length,2);assert.equal(s.speed,DRIVING.initialSpeed);
  assert.equal(s.time,0);assert.equal(s.score,0);assert.equal(s.nitro,0);
  assert.ok(s.entities.some(e=>e.z<=80&&e.x!==s.x));
  for(const e of s.entities){
   assert.equal(e.direction,1);assert.ok(e.cruiseSpeed<s.speed);assert.ok(e.z<=140);
   const clearance=e.z-trafficBounds(e).halfLength-COLLISION.playerLength/2;
   assert.ok(clearance/relativeSpeed(s.speed,{...e,speed:e.cruiseSpeed})>=DIFFICULTY.minReactionSeconds);
  }
  const opening=s.entities.slice();let overtook=false,input={};
  for(let i=0;i<hz*12;i++){
   if(i%Math.max(1,Math.round(hz/10))===0)input=drive(s);
   stepGame(s,i<hz*3?{}:input,1/hz);
   if(opening.some(e=>e.z< -6))overtook=true;
  }
  assert.equal(s.respawnId,0,`${random}/${hz}`);assert.ok(overtook,'opening should offer an overtake within 12 seconds');
 }
});

test('normal and retry launch retain cars, gaps, identity and speed at handoff',()=>{
 for(const quick of [false,true])for(const hz of [30,60,120]){
  const s=createGame();startGame(s);seedOpeningTraffic(s);s.mode='intro';
  const pack=s.entities,runId=s.runId,nextId=s.nextId,gaps=pack.map(e=>e.z),ids=pack.map(e=>e.id);
  const end=quick?LAUNCH.retryHold+LAUNCH.retrySeconds:LAUNCH.hold+LAUNCH.seconds;
  for(let i=0;i<=Math.ceil(end*hz);i++){
   Object.assign(s,launchFrame(Math.min(end,i/hz),quick));paceOpeningTraffic(s);stepGame(s,{boost:true},1/hz);
   assert.deepEqual(s.entities.map(e=>e.z),gaps);assert.ok(s.entities.every(e=>e.speed===s.speed));
   assert.equal(s.time,0);assert.equal(s.score,0);assert.equal(s.nitro,0);
  }
  const speeds=pack.map(e=>e.speed);startGame(s,true);
  assert.equal(s.entities,pack);assert.equal(s.runId,runId);assert.equal(s.nextId,nextId);
  assert.deepEqual(pack.map(e=>e.id),ids);assert.deepEqual(pack.map(e=>e.z),gaps);assert.deepEqual(pack.map(e=>e.speed),speeds);
  s.spawnTimer=1e6;stepGame(s,{},1/hz);
  assert.ok(pack.every((e,i)=>Math.abs(e.speed-speeds[i])<.01),'no sudden traffic slowdown');
  for(let i=0;i<hz*5;i++)stepGame(s,{},1/hz);
  for(const e of pack){assert.ok(Math.abs(e.speed-e.cruiseSpeed)<.05);assert.equal(e.launchTime,undefined);}
 }
});

test('practice keeps the same traffic safely ahead, then eases it into the run',()=>{
 const s=createGame(),tutorial=createTutorial();startGame(s);seedOpeningTraffic(s);
 const pack=s.entities,gaps=pack.map(e=>e.z),runId=s.runId;tutorial.begin(s);s.spawnTimer=1e6;
 for(let i=0;i<120*8;i++)stepGame(s,{steer:i<120*4?-1:1,brake:i<120*2},1/120);
 assert.ok(pack.every((e,i)=>s.entities[i]===e));assert.deepEqual(pack.map(e=>e.z),gaps);assert.equal(s.shield,100);
 assert.ok(pack.every(e=>e.launchTime===TRAFFIC.launchBlendSeconds));
 tutorial.finish();startGame(s,true);assert.equal(s.tutorialSafe,false);assert.ok(pack.every((e,i)=>s.entities[i]===e));assert.equal(s.runId,runId);
 s.spawnTimer=1e6;stepGame(s,{},1/120);assert.ok(pack.every(e=>e.launchTime<TRAFFIC.launchBlendSeconds));
 s.mode='paused';const snapshot=JSON.stringify(s);stepGame(s,{},.05);assert.equal(JSON.stringify(s),snapshot);
 startGame(s);seedOpeningTraffic(s);assert.equal(s.entities.length,2);assert.notEqual(s.entities,pack);assert.equal(s.runId,runId+1);
});
