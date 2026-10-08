import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVisualPool,instanceBoxes,sceneryVisibility} from '../src/render-reuse.js';
import {createHeroCar} from '../src/hero-car.js';
import {createTrafficModel,updateTrafficModel} from '../src/traffic-model.js';
import {updateVehiclePose} from '../src/vehicle-motion.js';
import {createGame,startGame} from '../src/simulation.js';
import {createDrivingEffects} from '../src/scene-effects.js';
test('bounded prewarmed traffic pools reuse and reset transforms, signal and warning state',()=>{
 const pool=createVisualPool(()=>createTrafficModel('sedan'),{sedan:2});pool.prewarm('sedan',2);
 for(let i=0;i<50;i++){const m=pool.acquire('sedan');updateTrafficModel(m,{direction:-1,change:{from:0,to:1,phase:'moving'}},true,true);m.position.set(3,2,1);m.scale.setScalar(3);pool.release('sedan',m);assert.deepEqual(m.position.toArray(),[0,0,0]);assert.deepEqual(m.scale.toArray(),[1,1,1]);assert.equal(m.userData.body.rotation.y,0);assert.equal(m.userData.wheels.rotation.y,0);assert.ok(m.userData.signals.every(s=>!s.visible));assert.equal(m.userData.lights[0].scale.y,.17);}
 assert.equal(pool.inspect().created,2);const a=pool.acquire('sedan'),b=pool.acquire('sedan');assert.throws(()=>pool.acquire('sedan'));pool.release('sedan',a);pool.release('sedan',b);
});
test('spatial instancing preserves transforms and supplies bounded culling volumes',()=>{
 const g=new THREE.Group(),geo=new THREE.BoxGeometry(),mat=new THREE.MeshBasicMaterial();for(let i=0;i<100;i++){const m=new THREE.Mesh(geo,mat);m.position.set(2,3,i*5);g.add(m);}instanceBoxes(g);assert.ok(g.children.length<=4);assert.equal(g.children.reduce((n,m)=>n+m.count,0),100);assert.ok(g.children.every(m=>m.boundingSphere&&m.frustumCulled));
});
test('visibility follows the active camera in either direction and keeps distant building body',()=>{
 const c=new THREE.PerspectiveCamera(58,3.56,.1,1200),g=new THREE.Group();g.position.set(20,0,200);g.userData={height:40,radius:25,details:[new THREE.Group()]};const visibility=sceneryVisibility(c);c.lookAt(0,0,300);c.updateMatrixWorld();visibility(g);assert.equal(g.visible,true);c.lookAt(0,0,-300);c.updateMatrixWorld();visibility(g);assert.equal(g.visible,false);
});
test('hero car keeps ground-aligned glow and bounded persistent effect storage through repeated runs',()=>{
 const s=createGame(),scene=new THREE.Scene(),car=createHeroCar(new THREE.Texture());scene.add(car);const fx=createDrivingEffects(scene,car);for(let run=0;run<15;run++){startGame(s);fx.update(s,.01,0,0);s.boost=1;s.boostMode='auto';for(let n=0;n<100;n++){s.vx=Math.sin(n)*12;s.deceleration=90;updateVehiclePose(car,s,.01,n/100);fx.update(s,.01,1,n/100);}fx.handleEvent({type:'hit'},s);assert.equal(fx.inspect().particleCapacity,96);assert.deepEqual(fx.inspect().trailCapacity,[36,36]);assert.equal(car.userData.glow.position.y,.04);assert.equal(car.userData.glow.rotation.z,0);}
});
import {projectBounds} from '../src/render-reuse.js';
import {pickupTrafficOverlap} from '../src/pickup-visibility.js';
test('allocation-free projected bounds retain the traffic occlusion coordinate convention',()=>{
 const c=new THREE.PerspectiveCamera(58,1,.1,1200);c.position.set(0,5,11);c.lookAt(0,.5,-20);c.updateMatrixWorld();const vehicle=projectBounds(c,0,0,-30,2,2,5),orb=projectBounds(c,0,.8,-28,1.5,1.5,.5);assert.ok(vehicle.top<vehicle.bottom);assert.ok(pickupTrafficOverlap(orb,[vehicle]));assert.ok(pickupTrafficOverlap(vehicle,[vehicle]));
});
