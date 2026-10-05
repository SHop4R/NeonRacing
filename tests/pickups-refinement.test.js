import test from 'node:test';
import assert from 'node:assert/strict';
import {canCollectPickup,makePickup} from '../src/pickups.js';
import {createGame,startGame,stepGame} from '../src/simulation.js';
import {PICKUPS,DIFFICULTY,DRIVING} from '../src/tuning.js';
const run=()=>{const s=createGame();startGame(s);s.spawnTimer=1e6;return s;};
test('any car/lane overlap collects, but adjacent nonoverlap and distant pickup do not',()=>{
 const p={x:1.5,laneX:1.5};assert.ok(canCollectPickup(p,3,2,-1.04,-1.04));assert.ok(!canCollectPickup(p,3,2,-1.06,-1.06));assert.ok(!canCollectPickup(p,40,39,1.5,1.5));
 assert.ok(!canCollectPickup(p,-4,-5,-3,1.5));assert.ok(canCollectPickup(p,4,-4,-1.04,-1.04));
});
test('magnet remains separate from the original lane area',()=>{const p={x:-3,laneX:4.5};assert.ok(!canCollectPickup(p,1,0,-3,-3));assert.ok(canCollectPickup(p,1,0,-3,-3,true));});
test('brake behind a same-lane traffic car and collect its trailing orb without ramming or overtaking',()=>{
 const s=run();s.x=-1.5;s.entities=[{id:100,kind:'traffic',x:-1.5,z:100,speed:DIFFICULTY.trafficSpeed},makePickup(s,'nitro',-1.5,20)];
 let minGap=Infinity,arrival=0;for(let i=0;i<120*8;i++){stepGame(s,{brake:true},1/120);minGap=Math.min(minGap,s.entities.find(e=>e.id===100)?.z??Infinity);if(s.pickups){arrival=s.time;break;}}
 assert.equal(s.pickups,1);assert.equal(s.shield,100);assert.equal(s.crashTime,0);assert.ok(minGap>20);assert.ok(arrival>.2&&arrival<2);assert.ok(s.events.some(e=>e.type==='orb'));assert.ok(!s.entities.some(e=>e.kind==='nitro'));
});
test('stationary pickup approach follows actual road speed',()=>{
 const normal=DRIVING.initialSpeed-PICKUPS.worldSpeed,braking=DRIVING.brakeSpeed-PICKUPS.worldSpeed;
 assert.equal(normal,DRIVING.initialSpeed);assert.ok(braking>0&&braking<normal);
 const s=run();s.entities=[makePickup(s,'energy',4.5,130)];const p=s.entities[0];stepGame(s,{},.05);assert.ok(Math.abs((130-p.z)-(s.speed-PICKUPS.worldSpeed)*.05)<1e-9);
});
test('passed pickups are removed',()=>{const s=run();s.entities=[makePickup(s,'energy',4.5,-56)];stepGame(s,{brake:true},.05);assert.equal(s.entities.length,0);});
test('braking safely waits behind an intervening car until the orb beyond it is collected',()=>{
 for(const speed of [DRIVING.initialSpeed,DRIVING.brakeSpeed]){
 const s=run();s.x=-1.5;s.speed=speed;s.entities=[{id:100,kind:'traffic',x:-1.5,z:30,speed:DIFFICULTY.trafficSpeed},makePickup(s,'nitro',-1.5,35)];
 let minGap=Infinity;for(let i=0;i<120*12&&!s.pickups;i++){stepGame(s,{brake:true},1/120);minGap=Math.min(minGap,s.entities.find(e=>e.id===100)?.z??Infinity);}
 assert.equal(s.pickups,1);assert.equal(s.shield,100);assert.equal(s.respawnId,0);assert.ok(minGap>8);assert.ok(s.speed<DRIVING.brakeSpeed+.1);assert.ok(s.time>.2);
 }
});
