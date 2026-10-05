import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDrivingEffects} from '../src/scene-effects.js';
import {createGame,startGame} from '../src/simulation.js';
import {updateVehiclePose} from '../src/vehicle-motion.js';
import {EFFECTS,CRASH} from '../src/tuning.js';
function setup(){const scene=new THREE.Scene(),player=new THREE.Group(),body=new THREE.Group();player.add(body);scene.add(player);player.userData={body,tail:{color:new THREE.Color()},glow:new THREE.Group()};const s=createGame();startGame(s);const fx=createDrivingEffects(scene,player);fx.update(s,1/120,0,0);return {fx,s,player};}
test('boost ribbons remain bounded under steering; pause freezes them and respawn/restart clears effects',()=>{
 const {fx,s,player}=setup();s.boost=1;s.boostMode='auto';
 for(let i=0;i<300;i++){player.position.x=Math.sin(i*.1)*5;fx.update(s,1/120,100/120,i/120);}
 let info=fx.inspect();assert.ok(info.intensity>.99);assert.ok(info.trailSamples.every(n=>n<=EFFECTS.trailSamples));assert.ok(info.trailExtent.every(n=>n<45));
 const snapshot=fx.inspect();fx.update(s,0,0,10);assert.deepEqual(fx.inspect(),snapshot);
 s.boost=0;for(let i=0;i<180;i++)fx.update(s,1/120,50/120,i/120);assert.ok(fx.inspect().intensity<.001);assert.deepEqual(fx.inspect().trailSamples,[0,0]);
 fx.handleEvent({type:'hit'},s);fx.update(s,1/120,0,10);assert.ok(fx.inspect().particles>0);
 s.respawnId++;fx.update(s,1/120,0,10);assert.deepEqual(fx.inspect().trailSamples,[0,0]);startGame(s);fx.update(s,1/120,0,10);assert.equal(fx.inspect().particles,0);
});
test('crash particles stay within fixed pool and shield hits produce distinct particles',()=>{
 const {fx,s}=setup();for(let i=0;i<10;i++)fx.handleEvent({type:'hit'},s);assert.equal(fx.inspect().particles,EFFECTS.particleCount);
 for(let i=0;i<240;i++)fx.update(s,1/120,0,i/120);assert.equal(fx.inspect().particles,0);fx.handleEvent({type:'shield-hit'},s);assert.equal(fx.inspect().particles,28);
});
test('directional crash animation affects only the body and resets on recovery',()=>{
 const {s,player}=setup();s.x=2;s.crashTime=CRASH.duration/2;s.crashDirection=-1;updateVehiclePose(player,s,1/60,1);
 assert.equal(player.position.x,2);assert.equal(player.rotation.z,0);assert.ok(player.userData.body.rotation.y<-.3);
 s.crashTime=0;updateVehiclePose(player,s,1/60,1);assert.equal(Math.abs(player.userData.body.rotation.y),0);assert.equal(Math.abs(player.userData.body.position.x),0);
});
