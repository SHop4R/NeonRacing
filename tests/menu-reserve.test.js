import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,stepGame,collectPickup} from '../src/simulation.js';
import {menuCameraPose} from '../src/menu-camera.js';
import {createTutorial} from '../src/tutorial.js';
const tick=(s,t,input={})=>{for(let i=0;i<Math.round(t*120);i++)stepGame(s,input,1/120);};
const run=()=>{const s=createGame();startGame(s);s.spawnTimer=1e6;s.nitro=1;tick(s,.1,{boost:true});return s;};
test('automatic orb banks without changing active fuel/time; overflow awards actual score',()=>{
 const s=run(),fuel=s.nitro,time=s.bonusTime;collectPickup(s,'nitro');assert.equal(s.nitroReserve,1);assert.equal(s.nitro,fuel);assert.equal(s.bonusTime,time);const score=s.score;collectPickup(s,'nitro');assert.ok(Math.abs(s.score-score-100)<1e-8);assert.equal(s.events.at(-1).scoreAmount,100);assert.equal(s.events.at(-1).amount,0);
 tick(s,6.9,{boost:true});assert.equal(s.boost,0);assert.equal(s.nitro,1);assert.equal(s.nitroReserve,0);tick(s,1,{boost:true});assert.equal(s.boost,0);tick(s,.1);tick(s,.1,{boost:true});assert.equal(s.boostMode,'auto');
});
test('cancellation applies bank immediately without reactivation; restart clears bank',()=>{
 const s=run();collectPickup(s,'nitro');tick(s,.1,{brake:true,boost:true});assert.equal(s.boost,0);assert.equal(s.bonusTime,0);assert.equal(s.nitro,1);assert.equal(s.nitroReserve,0);assert.equal(s.nitroGrace,0);tick(s,.5,{boost:true});assert.equal(s.boost,0);
 s.nitroReserve=1;startGame(s);assert.equal(s.nitroReserve,0);assert.equal(s.nitro,0);
});
test('intro mode consumes no gameplay time, fuel, score or distance',()=>{
 const s=run();s.mode='intro';const snap=JSON.stringify(s);tick(s,2);assert.equal(JSON.stringify(s),snap);
});
test('cinematic shots stay outside the car with smooth motion, reduced motion stays fixed',()=>{
 let last;for(let t=0;t<40;t+=.02){const p=menuCameraPose(t).position;assert.ok(p[1]>=.85);assert.ok(Math.hypot(p[0],p[2])>=3.8);if(last)assert.ok(Math.hypot(...p.map((n,i)=>n-last[i]))<.2);last=p;}
 assert.deepEqual(menuCameraPose(0,true),menuCameraPose(20,true));
});
test('tutorial teaches one action at a time, grants practice fuel, and finishes on return',()=>{
 const s=createGame(),t=createTutorial();t.begin(s);
 for(const input of [{steer:1},{brake:true},{},{},{}]){
  if(t.step===2)s.boost=1;if(t.step===3)s.x=-1;if(t.step===4)s.x=1;
  for(let i=0;i<50;i++)t.update(s,input,1/120);
  if(t.step===2)assert.equal(s.nitro,.4);
 }
 assert.equal(t.active,false);t.begin(s);t.finish();assert.equal(t.active,false);
});
import * as THREE from 'three';
import {createMenuCamera} from '../src/menu-camera.js';
import {cameraPose} from '../src/vehicle-motion.js';
test('reduced-motion intro uses fixed gameplay pose rather than a sped-up sweep',()=>{
 const camera=new THREE.PerspectiveCamera(58,1,.1,1200);camera.userData.viewportHeight=900;camera.position.set(5,2,6);const menu=createMenuCamera(camera);menu.begin();
 for(const introProgress of [0,.5,1]){menu.update({mode:'intro',introProgress},1,true);const expected=cameraPose(1);assert.deepEqual(camera.position.toArray(),[expected.x,expected.y,expected.z]);}
});
import {createAudio} from '../src/audio.js';
test('muted ignition is silent; enabled starter schedules catch and shuts down on interruption',async()=>{
 const old=globalThis.AudioContext,oscillators=[];
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
 globalThis.AudioContext=class {constructor(){this.currentTime=0;this.destination={};this.state="running";}async resume(){}createGain(){return {gain:param(),connect(){},disconnect(){}};}createBiquadFilter(){return {frequency:param(),connect(){}};}createOscillator(){const o={frequency:param(),connect(){},disconnect(){},start(){this.started=true;},stop(t){this.stopAt=t;}};oscillators.push(o);return o;}};
 try{const audio=createAudio();audio.ignition();assert.equal(oscillators.length,0);await audio.unlock();audio.ignition();assert.equal(oscillators.length,2);assert.equal(oscillators[1].stopAt,1.35);audio.stopIgnition();assert.equal(oscillators[1].stopAt,undefined);await audio.toggle();audio.ignition();assert.equal(oscillators.length,2);}finally{globalThis.AudioContext=old;}
});
import {launchFrame,LAUNCH} from '../src/launch.js';
import {DRIVING} from '../src/tuning.js';
test('ignition holds still; moving launch reaches starting speed smoothly with no gameplay progress',()=>{
 for(const quick of [false,true]){
  const hold=quick?LAUNCH.retryHold:LAUNCH.hold,duration=quick?LAUNCH.retrySeconds:LAUNCH.seconds;
  assert.equal(launchFrame(hold,quick).speed,0);assert.equal(launchFrame(hold,quick).introDistance,0);
  let prior=launchFrame(hold,quick);
  for(let t=hold+.01;t<hold+duration;t+=.01){const next=launchFrame(t,quick);assert.ok(next.speed>prior.speed);assert.ok(next.introDistance>prior.introDistance);assert.ok(Math.abs((next.introDistance-prior.introDistance)/.01-(next.speed+prior.speed)/2)<.01);prior=next;}
  const end=launchFrame(hold+duration,quick);assert.equal(end.speed,DRIVING.initialSpeed);assert.equal(end.introProgress,1);assert.ok(end.speed-prior.speed<.01);
  const s=createGame();s.mode='intro';Object.assign(s,end);tick(s,2,{boost:true});assert.equal(s.score,0);assert.equal(s.time,0);assert.equal(s.distance,0);assert.equal(s.nitro,0);
 }
});
test('camera holds ignition composition and settles exactly at gameplay pose during moving launch',()=>{
 const camera=new THREE.PerspectiveCamera(58,1,.1,1200);camera.userData.viewportHeight=900;camera.position.set(5,2,6);camera.lookAt(1.5,.6,0);const menu=createMenuCamera(camera);menu.begin();const origin=camera.position.clone(),rotation=camera.quaternion.clone();
 menu.update({mode:'intro',...launchFrame(.6)},0,false);assert.ok(camera.position.distanceTo(origin)<1e-9);assert.ok(camera.quaternion.angleTo(rotation)<1e-7);
 const mid=launchFrame(LAUNCH.hold+LAUNCH.seconds/2);menu.update({mode:'intro',...mid},0,false);assert.ok(mid.speed>0);assert.ok(camera.position.distanceTo(origin)>1);
 menu.update({mode:'intro',...launchFrame(LAUNCH.hold+LAUNCH.seconds)},0,false);const expected=cameraPose(1);assert.ok(camera.position.distanceTo(new THREE.Vector3(expected.x,expected.y,expected.z))<1e-9);
});
