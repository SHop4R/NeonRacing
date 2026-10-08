import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,startGame,stepGame,collectPickup,hasNitroBonus} from '../src/simulation.js';
import {makeTraffic,stepTraffic,VEHICLES} from '../src/traffic.js';
import {DRIVING,NITRO,CRASH} from '../src/tuning.js';
import {nitroPresentation} from '../src/hud.js';
const run=()=>{const s=createGame(()=>.1);startGame(s);s.spawnTimer=1e6;return s;};
const tick=(s,t,input={})=>{for(let i=0;i<Math.round(t*120);i++)stepGame(s,input,1/120);};
test('automatic nitro and bonuses last seven seconds, while partial drain is unchanged',()=>{const s=run();s.nitro=1;tick(s,3.5,{boost:true});assert.ok(Math.abs(s.nitro-.5)<1e-8);assert.equal(nitroPresentation(s).percent,50);tick(s,3.5);assert.equal(s.boost,0);assert.equal(s.bonusTime,0);assert.equal(hasNitroBonus(s),false);const p=run();p.nitro=.8;tick(p,2,{boost:true});assert.ok(Math.abs(p.nitro-.6)<1e-8);});
test('orb during auto cannot extend seven-second window or desynchronize active HUD',()=>{const s=run();s.nitro=1;tick(s,3.5,{boost:true});collectPickup(s,'nitro');assert.equal(nitroPresentation(s).percent,50);tick(s,3.5);assert.equal(s.boost,0);assert.equal(s.bonusTime,0);assert.equal(s.nitro,1);assert.equal(s.nitroReserve,0);});
test('respawn preserves exact impact position across lanes and between them',()=>{for(const x of [-4.5,-3,-1.5,-.3,0,1.5,3,4.5]){const s=run();s.x=x;s.distance=12345;s.entities=[{id:9,kind:'traffic',x,z:0,speed:24}];tick(s,1/120);const impact=s.distance;assert.ok(s.crashTime>0);tick(s,CRASH.duration);assert.equal(s.x,x);assert.equal(s.distance,impact);assert.equal(s.vx,0);assert.equal(s.speed,CRASH.respawnSpeed);assert.equal(s.recovery,CRASH.recoverySeconds);}});
test('braking reaches 55 km/h rapidly and falls below the slowest traffic',()=>{const s=run();s.x=1.5;s.entities=[makeTraffic(s,2,45,1,'truck')];s.entities[0].speed=s.entities[0].cruiseSpeed=VEHICLES.truck.min;tick(s,1,{brake:true});assert.ok(s.speed*3.6<56);assert.equal(s.shield,100);tick(s,5,{brake:true});assert.ok(Math.abs(s.speed*3.6-55)<.01);assert.ok(s.entities[0].z>16);s.entities=[];tick(s,2);assert.ok(s.speed>DRIVING.initialSpeed*.98);});
test('motorcycles have a distinct fastest cruising range and strong acceleration',()=>{assert.ok(VEHICLES.motorcycle.min>Math.max(...Object.entries(VEHICLES).filter(([t])=>t!=='motorcycle').map(([,v])=>v.max)));const s=run(),bike=makeTraffic(s,2,500,1,'motorcycle');bike.speed=20;s.entities=[bike];stepTraffic(s,1);assert.ok(bike.speed>20+.95*(bike.cruiseSpeed-20));assert.ok(bike.speed<=bike.cruiseSpeed);for(const v of Object.values(VEHICLES)){assert.ok(v.max<DRIVING.initialSpeed);assert.ok(v.min>DRIVING.brakeSpeed);}});
import {collisionBounds,playerBounds,nearMissWidth} from '../src/collision-bounds.js';
import {trafficBounds} from '../src/traffic.js';
test('each class gets a forgiving chassis collider and one completed clean-pass reward',()=>{
 for(const type of Object.keys(VEHICLES)){
  const s=run();s.x=0;const e=makeTraffic(s,2,15,1,type);const b=collisionBounds(e);e.x=playerBounds.halfWidth+b.halfWidth+.08;e.cruiseSpeed=e.speed=0;s.entities=[e];
  assert.ok(b.halfWidth<e.width*.435&&b.halfWidth>=e.width*.4);assert.ok(b.halfLength<e.length/2);
  tick(s,1);assert.equal(s.shield,100,type);assert.equal(s.nearMisses,1,type);tick(s,1);assert.equal(s.nearMisses,1,type);
  const hit=run();hit.x=0;const target=makeTraffic(hit,2,0,1,type);target.x=(playerBounds.halfWidth+collisionBounds(target).halfWidth)*.6;hit.entities=[target];tick(hit,.05);assert.equal(hit.shield,66,type);
 }
});
test('lingering, shield overlaps and recovery overlaps never farm near misses',()=>{
 for(const protection of ['shield','recovery','none'])for(const type of Object.keys(VEHICLES)){
  const s=run();s.x=0;if(protection==='shield'){s.nitro=1;tick(s,.01,{boost:true});}if(protection==='recovery')s.recovery=2.2;
  const e=makeTraffic(s,2,0,1,type);e.x=protection==='none'?playerBounds.halfWidth+collisionBounds(e).halfWidth+.1:0;e.speed=s.speed;e.cruiseSpeed=undefined;s.entities=[e];
  tick(s,.05);assert.equal(s.nearMisses,0);e.speed=0;tick(s,1);assert.equal(s.nearMisses,protection==='none'?1:0,`${type}/${protection}`);tick(s,1);assert.ok(s.nearMisses<=1);
 }
});
test('motorcycle signals and overtakes a slower vehicle without crossing direction or overlap',()=>{
 const s=run();s.speed=30;s.laneChangeTimer=0;
 const bike=makeTraffic(s,2,300,1,'motorcycle'),truck=makeTraffic(s,2,350,1,'truck');bike.speed=24;bike.cruiseSpeed=VEHICLES.motorcycle.max;truck.speed=truck.cruiseSpeed=VEHICLES.truck.min;s.entities=[bike,truck];
 let signaled=false,moved=false,passed=false;
 for(let i=0;i<120*12;i++){stepTraffic(s,1/120);for(const e of s.entities)e.z-=(s.speed-e.speed)/120;if(bike.change?.phase==='signal')signaled=true;if(bike.change?.phase==='moving')moved=true;assert.ok(bike.lane>=2);const overlaps=Math.abs(bike.x-truck.x)<(bike.width+truck.width)/2&&Math.abs(bike.z-truck.z)<(bike.length+truck.length)/2;assert.equal(overlaps,false);if(bike.z>truck.z)passed=true;}
 assert.ok(signaled&&moved&&passed);assert.ok(bike.speed>bike.cruiseSpeed*.95);
});
test('respawn only clears hazards near the impact path and retains unrelated traffic/pickups',()=>{const s=run();s.x=3;s.entities=[{id:1,kind:'traffic',x:3,z:0,speed:24},{id:2,kind:'traffic',x:-4.5,z:60,speed:24},{id:3,kind:'nitro',x:-4.5,laneX:-4.5,z:80,speed:0}];tick(s,1/120);tick(s,.85);assert.equal(s.x,3);assert.ok(s.entities.some(e=>e.id===2));assert.ok(s.entities.some(e=>e.id===3));assert.ok(!s.entities.some(e=>e.id===1));});

test('wider near-miss margin rewards clean passes in both directions, but not distant passes',()=>{
 for(const hz of [30,60,120])for(const type of Object.keys(VEHICLES))for(const direction of [1,-1])for(const inside of [false,true]){
  const s=run();s.x=0;const e=makeTraffic(s,2,15,1,type);
  e.x=nearMissWidth(e)+(inside?-.15:.05);e.direction=direction;e.speed=e.cruiseSpeed=20;s.entities=[e];
  stepGame(s,{},1/hz);assert.equal(s.nearMisses,0,'must finish the pass');
  for(let i=0;i<2*hz;i++)stepGame(s,{},1/hz);
  assert.equal(s.shield,100);assert.equal(s.nearMisses,inside?1:0,`${type}/${direction}/${hz}`);
  for(let i=0;i<hz;i++)stepGame(s,{},1/hz);assert.equal(s.nearMisses,inside?1:0,'never twice');
 }
});
