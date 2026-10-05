import test from 'node:test';
import assert from 'node:assert/strict';
import {relativeSpeed,VEHICLES,directionForLane,headlightOn,makeTraffic,stepTraffic} from '../src/traffic.js';
import {difficultyAt,ONCOMING,DIFFICULTY} from '../src/tuning.js';
import {makePickup} from '../src/pickups.js';
import {createGame,startGame,stepGame} from '../src/simulation.js';
const run=()=>{const s=createGame(()=>.5);startGame(s);s.spawnTimer=1e6;return s;};
test('160 versus 400 uses actual signed closing velocities',()=>{
 for(const speed of [160/3.6,400/3.6]){assert.equal(relativeSpeed(speed,{speed:25,direction:1}),speed-25);assert.equal(relativeSpeed(speed,{speed:25,direction:-1}),speed+25);assert.equal(relativeSpeed(speed,{kind:'energy',speed:999}),speed);}
 assert.ok(relativeSpeed(400/3.6,{speed:25})>4*relativeSpeed(160/3.6,{speed:25}));
});
test('all classes have physical dimensions, bounded varied speeds, and assigned direction',()=>{for(const type of Object.keys(VEHICLES)){const s=run();for(let lane=0;lane<4;lane++){const e=makeTraffic(s,lane,400,1,type);const v=VEHICLES[type];assert.ok(e.speed>=v.min&&e.speed<=v.max);assert.equal(e.direction,lane<2?-1:1);assert.equal(e.width,v.width);assert.equal(e.length,v.length);}}assert.ok(VEHICLES.truck.length>VEHICLES.sedan.length*1.5);assert.ok(VEHICLES.motorcycle.width<1);});
test('stationary pickups move exactly by road distance, independent of braking and old speed',()=>{for(const brake of [false,true]){const s=run();s.x=4.5;const p=makePickup(s,'energy',-4.5,150);p.speed=99;s.entities=[p];stepGame(s,{brake},.05);assert.ok(Math.abs(p.z+s.distance-150)<1e-8);}});
test('distance, not time, controls capped progression and lower encounter spacing',()=>{const early=difficultyAt(0),late=difficultyAt(DIFFICULTY.rampDistance);assert.ok(late.waveSpacing<early.waveSpacing*.6);assert.ok(late.density>early.density);assert.deepEqual(late,difficultyAt(1e9));});
test('oncoming reward is forward progress only and clears across center line',()=>{const a=run(),b=run();a.x=-1.5;b.x=1.5;stepGame(a,{},.05);stepGame(b,{},.05);assert.equal(a.score/b.score,ONCOMING.reward);assert.equal(a.oncoming,true);a.x=0;stepGame(a,{},.05);assert.equal(a.oncoming,false);a.mode='paused';const score=a.score;stepGame(a,{},.05);assert.equal(a.score,score);});
test('headlights warn once in a relevant path, with a brief white double flash',()=>{const s=run();s.x=-1.5;const e=makeTraffic(s,1,160,1,'sedan');s.entities=[e];stepTraffic(s,.01);assert.ok(e.warningTime>0);assert.ok(headlightOn(e));s.x=4.5;for(let i=0;i<200;i++)stepTraffic(s,.01);assert.equal(headlightOn(e),false);assert.equal(e.warned,true);});
test('lane changes never cross the center divider',()=>{for(let lane=0;lane<4;lane++){const s=run();s.laneChangeTimer=0;const e=makeTraffic(s,lane,500,1,'motorcycle');s.entities=[e];for(let i=0;i<1200;i++){stepTraffic(s,.01);if(e.change)assert.equal(directionForLane(e.change.to),e.direction);}}});
test('vehicle meshes match class width and length without changing the player model',async()=>{
 const THREE=await import('three'),{createTrafficModel}=await import('../src/traffic-model.js');
 for(const type of Object.keys(VEHICLES)){const model=createTrafficModel(type);model.updateMatrixWorld(true);const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());assert.ok(Math.abs(size.x-VEHICLES[type].width)<.16,type);assert.ok(Math.abs(size.z-VEHICLES[type].length)<.16,type);}
});
test('relative collision sweep catches long trucks, narrow motorcycles and rear approaches',()=>{
 const s=run();s.x=1.5;const truck=makeTraffic(s,2,5,1,'truck');s.entities=[truck];stepGame(s,{},.05);assert.equal(s.shield,66);
 const b=run();b.x=0;const bike=makeTraffic(b,2,0,1,'motorcycle');b.entities=[bike];stepGame(b,{},.01);assert.equal(b.shield,100);
 const r=run();r.x=1.5;r.speed=5;r.entities=[{id:1,kind:'traffic',x:1.5,z:-3,speed:44,width:1.8,length:4}];stepGame(r,{brake:true},.05);assert.equal(r.shield,66);
});
test('braking ignores opposing vehicles instead of matching their speed',async()=>{const {brakingTarget}=await import('../src/braking.js');const s=run();s.x=-1.5;s.entities=[makeTraffic(s,1,15,1,'truck')];assert.equal(brakingTarget(s),55/3.6);});
test('sustained 14 km drive becomes denser, remains bounded, and exercises all classes',async()=>{
 const {drive}=await import('./driver.js');let seed=718;const s=createGame(()=>{seed=seed*16807%2147483647;return seed/2147483647});startGame(s);
 const early=[],late=[],types=new Set(),warnings=new Set(),changes=new Set();let input={},peak=0;
 for(let i=0;i<120*220;i++){
  if(i%12===0)input=drive(s);stepGame(s,input,1/120);s.events=[];
  const cars=s.entities.filter(e=>e.kind==='traffic');peak=Math.max(peak,cars.length);
  for(const e of cars){types.add(e.vehicleType);if(e.warned)warnings.add(e.id);if(e.change)changes.add(e.id);assert.equal(directionForLane(e.lane),e.direction);if(e.change)assert.equal(directionForLane(e.change.to),e.direction);}
  if(i%120===0){const n=cars.filter(e=>e.z>0&&e.z<320).length;if(s.distance>500&&s.distance<2500)early.push(n);if(s.distance>8000)late.push(n);}
  assert.notEqual(s.mode,'over');
 }
 const mean=a=>a.reduce((n,v)=>n+v,0)/a.length;
 assert.ok(s.distance>13000);assert.equal(types.size,6);assert.ok(mean(late)>mean(early)*1.25,`${mean(early)} -> ${mean(late)}`);assert.ok(peak<DIFFICULTY.maxTraffic,'cap must not be limiting density');assert.ok(warnings.size>0);assert.ok(changes.size>5);assert.ok(s.respawnId<6);
});
test('braking recognizes partial-width overlap with a wide truck',()=>{const s=run();s.x=-.45;const e=makeTraffic(s,2,55,1,'truck');e.speed=20;e.cruiseSpeed=20;s.entities=[e];for(let i=0;i<120*8;i++)stepGame(s,{brake:true},1/120);assert.equal(s.shield,100);assert.equal(s.respawnId,0);assert.ok(s.speed<22);});
test('stationary orb stays anchored until collected or passed, even on a long wait',()=>{const s=run();s.x=1.5;const p=makePickup(s,'nitro',-4.5,100);p.age=10000;s.entities=[p];stepGame(s,{brake:true},.01);assert.equal(s.entities.length,1);assert.ok(Math.abs(p.z+s.distance-100)<1e-9);});
