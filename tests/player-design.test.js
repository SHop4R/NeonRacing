import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeroCar} from '../src/hero-car.js';
import {createTrafficModel} from '../src/traffic-model.js';
import {updateVehiclePose} from '../src/vehicle-motion.js';
import {createGame} from '../src/simulation.js';
const materials=root=>{const result=new Set();root.traverse(o=>{if(o.material)result.add(o.material);});return result;};
test('player sculpted geometry stays in its existing visual envelope and uses isolated materials',()=>{
 const hero=createHeroCar(new THREE.Texture()),traffic=createTrafficModel('sedan'),trafficMaterials=materials(traffic);
 assert.ok([...materials(hero)].every(m=>!trafficMaterials.has(m)));
 const size=new THREE.Box3().setFromObject(hero.userData.body).getSize(new THREE.Vector3());assert.ok(size.x<1.91&&size.z<3.46&&size.y<1.1);
 hero.traverse(m=>{if(m.geometry){for(const value of m.geometry.attributes.position.array)assert.ok(Number.isFinite(value));}});
 const before=traffic.userData.headlightMaterial.color.clone(),s=createGame();s.braking=true;s.deceleration=90;updateVehiclePose(hero,s,.05,1);assert.ok(traffic.userData.headlightMaterial.color.equals(before));
});
test('brake signature and ground-aligned glow survive steering and crash presentation',()=>{
 const hero=createHeroCar(new THREE.Texture()),s=createGame();s.vx=12;s.braking=true;s.deceleration=90;s.crashTime=.4;s.crashDirection=-1;updateVehiclePose(hero,s,.05,1);assert.ok(hero.userData.tail.color.r>4);assert.equal(hero.userData.glow.position.y,.04);assert.equal(hero.userData.glow.rotation.z,0);assert.equal(hero.rotation.x,0);assert.ok(Math.abs(hero.userData.body.rotation.y)>.1);
 const lights=[];hero.userData.body.traverse(m=>{if(m.material===hero.userData.tail)lights.push(m);});assert.equal(lights.length,2);assert.ok(lights.every(m=>m.position.z>1.6&&m.position.y===.574));
});
test('AE86 effect sockets fit a single exhaust and paired rear lamps inside the shield',()=>{
 const hero=createHeroCar(new THREE.Texture());assert.equal(hero.userData.exhaustAnchors.length,1);assert.equal(hero.userData.trailAnchors.length,2);
 const center=new THREE.Vector3(0,.6,0),vertex=new THREE.Vector3();hero.userData.body.updateMatrixWorld(true);
 hero.userData.body.traverse(mesh=>{if(!mesh.geometry)return;const positions=mesh.geometry.attributes.position;for(let i=0;i<positions.count;i++){vertex.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);assert.ok(vertex.distanceTo(center)<2.05);}});
 assert.equal(hero.userData.headlightColor,0xfff2d9);assert.equal(hero.userData.tailColor,0xff2318);
});
test('windshield, side window and hatch glass are exposed rather than buried in trim',()=>{
 const hero=createHeroCar(new THREE.Texture());hero.updateMatrixWorld(true);
 for(const [origin,target] of [[[2,.85,0],[0,.85,0]],[[0,1,-3],[0,.84,-.4]],[[0,1.3,3],[0,.88,.9]]]){
  const start=new THREE.Vector3(...origin),direction=new THREE.Vector3(...target).sub(start).normalize();
  const hit=new THREE.Raycaster(start,direction).intersectObject(hero.userData.body,true)[0];assert.equal(hit.object.material.color.getHex(),0x23333d);
 }
});
test('fixed headlights retain raised angle and forward lamps across vehicle states',()=>{
 const hero=createHeroCar(new THREE.Texture()),s=createGame();
 for(const mode of ['ready','intro','running','paused','over']){s.mode=mode;updateVehiclePose(hero,s,.05,1);for(const h of hero.userData.headlightHinges){assert.equal(h.rotation.x,.62);assert.equal(h.userData.lamp.rotation.x,-.62);}}
});
test('former headlight wells have continuous painted bonnet coverage',()=>{
 const hero=createHeroCar(new THREE.Texture());hero.updateMatrixWorld(true);
 for(const side of [-1,1])for(const dx of [-.205,0,.205])for(const z of [-1.44,-1.37,-1.2,-1.08]){
  const hits=new THREE.Raycaster(new THREE.Vector3(side*.47+dx,2,z),new THREE.Vector3(0,-1,0)).intersectObject(hero.userData.body,true);
  assert.ok(hits.some(hit=>hit.object.material.color.getHex()===0xf1f0e7&&hit.point.y>.59),'painted hood beneath/around pod');
 }
});
