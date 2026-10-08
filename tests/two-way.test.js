import test from 'node:test';
import assert from 'node:assert/strict';
import {relativeSpeed,VEHICLES,directionForLane,headlightOn,makeTraffic,stepTraffic} from '../src/traffic.js';
import {difficultyAt,ONCOMING,DIFFICULTY,NITRO} from '../src/tuning.js';
import {makePickup} from '../src/pickups.js';
import {createGame,startGame,stepGame,activateBoost} from '../src/simulation.js';
const run=()=>{const s=createGame(()=>.5);startGame(s);s.spawnTimer=1e6;return s;};
test('maximum-boost oncoming truck spawns survive cleanup and approach until passed',()=>{
 for(const hz of [30,60,120]){
  const s=createGame(()=>.99);startGame(s);s.distance=DIFFICULTY.rampDistance;s.speed=DIFFICULTY.maxSpeed*NITRO.speedMultiplier;s.nitro=1;activateBoost(s);s.spawnTimer=0;
  stepGame(s,{},1/hz);const truck=s.entities.find(e=>e.kind==='traffic'&&e.direction===-1&&e.vehicleType==='truck');
  assert.ok(truck);assert.ok(truck.z>DIFFICULTY.minSpawnDistance);
  // Keep coverage for distant approaching traffic even when current tuning spawns closer.
  truck.z=1120;const initialZ=truck.z;s.spawnTimer=1e6;s.x=-4.5;
  stepGame(s,{},1/hz);assert.ok(s.entities.includes(truck));assert.ok(truck.z>1100);
  for(let i=0;i<hz;i++)stepGame(s,{},1/hz);
  assert.ok(s.entities.includes(truck));assert.ok(truck.z<initialZ);
  for(let i=0;i<10*hz;i++)stepGame(s,{},1/hz);
  assert.ok(!s.entities.includes(truck),'passed traffic must still be removed');
 }
});
test('160 versus 400 uses actual signed closing velocities',()=>{
 for(const speed of [160/3.6,400/3.6]){assert.equal(relativeSpeed(speed,{speed:25,direction:1}),speed-25);assert.equal(relativeSpeed(speed,{speed:25,direction:-1}),speed+25);assert.equal(relativeSpeed(speed,{kind:'energy',speed:999}),speed);}
 assert.ok(relativeSpeed(400/3.6,{speed:25})>4*relativeSpeed(160/3.6,{speed:25}));
});
test('all classes have physical dimensions, bounded varied speeds, and assigned direction',()=>{for(const type of Object.keys(VEHICLES)){const s=run();for(let lane=0;lane<4;lane++){const e=makeTraffic(s,lane,400,1,type);const v=VEHICLES[type];assert.ok(e.speed>=v.min&&e.speed<=v.max);assert.equal(e.direction,lane<2?-1:1);assert.equal(e.width,v.width);assert.equal(e.length,v.length);}}assert.ok(VEHICLES.truck.length>VEHICLES.sedan.length*1.5);assert.ok(VEHICLES.motorcycle.width<1);});
test('stationary pickups move exactly by road distance, independent of braking and old speed',()=>{for(const brake of [false,true]){const s=run();s.x=4.5;const p=makePickup(s,'energy',-4.5,150);p.speed=99;s.entities=[p];stepGame(s,{brake},.05);assert.ok(Math.abs(p.z+s.distance-150)<1e-8);}});
test('distance, not time, controls capped progression and lower encounter spacing',()=>{const early=difficultyAt(0),late=difficultyAt(DIFFICULTY.rampDistance);assert.ok(late.waveSpacing<early.waveSpacing*.6);assert.ok(late.density>early.density);assert.deepEqual(late,difficultyAt(1e9));});
test('oncoming reward is forward progress only and clears across center line',()=>{const a=run(),b=run();a.x=-1.5;b.x=1.5;stepGame(a,{},.05);stepGame(b,{},.05);assert.equal(a.score/b.score,ONCOMING.reward);assert.equal(a.oncoming,true);a.x=0;stepGame(a,{},.05);assert.equal(a.oncoming,false);a.mode='paused';const score=a.score;stepGame(a,{},.05);assert.equal(a.score,score);});
test('headlights warn in a relevant path, with a brief white double flash',()=>{const s=run();s.x=-1.5;const e=makeTraffic(s,1,100,1,'sedan');s.entities=[e];stepTraffic(s,.01);assert.ok(e.warningTime>0);assert.ok(headlightOn(e));s.x=4.5;for(let i=0;i<200;i++)stepTraffic(s,.01);assert.equal(headlightOn(e),false);assert.equal(e.warned,true);});
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
 const early=[],late=[],earlyEncounters=new Set(),lateEncounters=new Set(),types=new Set(),warnings=new Set(),changes=new Set();let input={},peak=0;
 for(let i=0;i<120*300&&s.distance<14000;i++){
  if(i%12===0)input=drive(s);stepGame(s,input,1/120);s.events=[];
  const cars=s.entities.filter(e=>e.kind==='traffic');peak=Math.max(peak,cars.length);
  for(const e of cars){types.add(e.vehicleType);if(e.warned)warnings.add(e.id);if(e.change)changes.add(e.id);assert.equal(directionForLane(e.lane),e.direction);if(e.change)assert.equal(directionForLane(e.change.to),e.direction);}
  if(i%120===0){const nearby=cars.filter(e=>e.z>0&&e.z<320);if(s.distance>500&&s.distance<2500){early.push(nearby.length);for(const e of nearby)earlyEncounters.add(e.id);}if(s.distance>8000){late.push(nearby.length);for(const e of nearby)lateEncounters.add(e.id);}}
  assert.notEqual(s.mode,'over');
 }
 const mean=a=>a.reduce((n,v)=>n+v,0)/a.length;
 assert.ok(s.distance>13000);assert.equal(types.size,6);assert.ok(mean(late)>mean(early),`${mean(early)} -> ${mean(late)}`);assert.ok(lateEncounters.size/late.length>earlyEncounters.size/early.length*1.25,'higher speeds must deliver more encounters per second, not just more cars per snapshot');assert.ok(peak<DIFFICULTY.maxTraffic,'cap must not be limiting density');assert.ok(warnings.size>0);assert.ok(changes.size>5);assert.ok(s.respawnId<6);
});
test('braking recognizes partial-width overlap with a wide truck',()=>{const s=run();s.x=-.45;const e=makeTraffic(s,2,55,1,'truck');e.speed=20;e.cruiseSpeed=20;s.entities=[e];for(let i=0;i<120*8;i++)stepGame(s,{brake:true},1/120);assert.equal(s.shield,100);assert.equal(s.respawnId,0);assert.ok(s.speed<22);});
test('stationary orb stays anchored until collected or passed, even on a long wait',()=>{const s=run();s.x=1.5;const p=makePickup(s,'nitro',-4.5,100);p.age=10000;s.entities=[p];stepGame(s,{brake:true},.01);assert.equal(s.entities.length,1);assert.ok(Math.abs(p.z+s.distance-100)<1e-9);});
test('oncoming warnings repeat while blocked, brake without stopping and recover at 30/60/120 Hz',()=>{
 for(const hz of [30,60,120])for(const type of Object.keys(VEHICLES)){
  const s=run();s.x=-1.5;s.laneChangeTimer=100;const e=makeTraffic(s,1,100,1,type);s.entities=[e];const initial=e.speed;
  for(let i=0;i<hz;i++)stepTraffic(s,1/hz);
  assert.equal(s.events.filter(e=>e.type==='horn').length,1);assert.ok(e.speed<initial*.85);assert.ok(e.speed>=initial*ONCOMING.brakeSpeedRatio);assert.ok(e.brakeVisual>.5);
  for(let i=0;i<hz*3;i++)stepTraffic(s,1/hz);
  assert.ok(s.events.filter(e=>e.type==='horn').length>=3);assert.ok(e.speed>=initial*ONCOMING.brakeSpeedRatio);
  const horns=s.events.length;s.x=4.5;stepTraffic(s,1/hz);assert.equal(headlightOn(e),false);
  for(let i=0;i<hz*8;i++)stepTraffic(s,1/hz);
  assert.equal(s.events.length,horns);assert.ok(e.speed>initial*.97);assert.ok(e.brakeVisual<.01);
 }
});
test('traffic brake pose and lights reset on model reuse',async()=>{
 const {createTrafficModel,updateTrafficModel}=await import('../src/traffic-model.js');
 const m=createTrafficModel('sedan'),e={direction:-1,brakeVisual:1};updateTrafficModel(m,e,false,true);
 assert.ok(m.userData.body.rotation.x<0);assert.ok(m.userData.tailMaterial.color.r>1);
 updateTrafficModel(m,{direction:1},false,false);assert.ok(m.userData.body.rotation.x===0);assert.equal(m.userData.body.position.y,0);assert.equal(m.userData.tailMaterial.color.r,1);
});

test('warning hysteresis, rapid reentry and passing never spam horns',()=>{
 const s=run();s.x=-1.5;s.laneChangeTimer=100;const e=makeTraffic(s,1,120,1,'truck');s.entities=[e];
 stepTraffic(s,.01);assert.equal(s.events.length,1);
 s.x=e.x+2.1;stepTraffic(s,.01);assert.ok(e.warningActive,'retain a shallow lane-edge obstruction');
 s.x=4.5;stepTraffic(s,.01);assert.equal(e.warningActive,false);assert.equal(headlightOn(e),false);
 s.x=-1.5;stepTraffic(s,.01);assert.equal(s.events.length,1,'reentry must respect the existing horn cycle');
 e.z=-1;stepTraffic(s,.01);assert.equal(e.warningActive,false);assert.equal(headlightOn(e),false);
});
test('all braking noses dip visibly while wheels and collision roots remain grounded',async()=>{
 const THREE=await import('three'),{createTrafficModel,updateTrafficModel}=await import('../src/traffic-model.js');
 for(const type of Object.keys(VEHICLES)){
  const m=createTrafficModel(type),front=new THREE.Vector3(0,.75,-VEHICLES[type].length/2);
  m.updateMatrixWorld(true);const before=m.userData.body.localToWorld(front.clone()).y;
  const wheelY=m.userData.wheels.children.map(w=>w.getWorldPosition(new THREE.Vector3()).y);
  updateTrafficModel(m,{direction:1,brakeVisual:1,change:{from:0,to:1,phase:'moving'}},true,true);m.updateMatrixWorld(true);
  const after=m.userData.body.localToWorld(front.clone()).y;
  assert.ok(before-after>.16,type);assert.equal(m.rotation.x,0);assert.equal(m.position.y,0);
  assert.deepEqual(m.userData.wheels.children.map(w=>w.getWorldPosition(new THREE.Vector3()).y),wheelY);
  assert.equal(m.userData.wheels.rotation.y,m.userData.body.rotation.y);
  assert.ok(new THREE.Box3().setFromObject(m).min.y>=-.001,type+' clears road');
 }
});
