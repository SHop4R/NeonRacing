import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,stepGame,activateBoost} from '../src/simulation.js';
import {barrierLimit} from '../src/barriers.js';
import {playerCollisionBounds} from '../src/collision-bounds.js';
const limit=s=>barrierLimit(playerCollisionBounds(s).halfWidth);
const run=side=>{const s=createGame();startGame(s);s.spawnTimer=1e6;s.x=side*(limit(s)-.3);return s;};
const tick=(s,seconds,input={},dt=1/120)=>{for(let i=0;i<Math.round(seconds/dt);i++)stepGame(s,input,dt);};
for(const side of [-1,1])for(const dt of [1/30,1/60,1/120]){
 test(`wall ${side} at ${1/dt} Hz: one impact, stable held/parallel contact, separation re-arms`,()=>{
  const s=run(side);tick(s,.3,{steer:side},dt);assert.equal(s.shield,66);assert.equal(s.events.filter(e=>e.type==='hit').length,1);assert.equal(s.distance,s.impactPosition.distance);
  tick(s,8,{steer:side},dt);assert.equal(s.shield,66);assert.equal(s.events.filter(e=>e.type==='hit').length,1);assert.equal(s.vx,0);assert.ok(Math.abs(s.x-side*limit(s))<1e-9);
  tick(s,3,{},dt);assert.equal(s.shield,66);tick(s,.4,{steer:-side},dt);tick(s,.8,{steer:side},dt);assert.equal(s.shield,32);
 });
}
for(const side of [-1,1])for(const speed of [55/3.6,160/3.6,400/3.6]){
 test(`wall ${side}, ${speed} m/s: severity comes from sideways motion`,()=>{
  const s=run(side);s.speed=speed;s.x=side*(limit(s)-.005);s.vx=side*.2;tick(s,.5,{steer:side*.04});assert.equal(s.shield,100);assert.equal(s.crashTime,0);assert.ok(s.barrierContacts.some(c=>c.touching));
  const direct=run(side);direct.speed=speed;tick(direct,.2,{steer:side});assert.equal(direct.shield,66);
 });
}
test('shield expiry, recovery expiry and manual cancellation never re-arm unchanged contact',()=>{
 for(const mode of ['shield','recovery','grace','cancel']){const s=run(1);
  if(mode==='shield'||mode==='cancel'){s.nitro=1;activateBoost(s);}else if(mode==='recovery')s.recovery=2.2;else s.nitroGrace=.3;
  tick(s,.3,{steer:1});tick(s,9,{steer:1,brake:mode==='cancel'});assert.equal(s.shield,100,mode);assert.equal(s.crashTime,0);
  tick(s,.4,{steer:-1});tick(s,.8,{steer:1});assert.equal(s.shield,66,mode);
 }
});
test('spawn placement and collider recovery resolve penetration without manufacturing impacts',()=>{
 const s=run(1);s.collisionAssist=1;s.shield=100;s.x=limit(s);tick(s,4,{steer:1});assert.equal(s.shield,100);assert.ok(s.x<=limit(s)+1e-9);assert.equal(s.events.filter(e=>e.type==='hit').length,0);
 startGame(s);s.spawnTimer=1e6;s.x=limit(s)+.1;tick(s,2);assert.equal(s.shield,100);assert.equal(s.x,limit(s));
});
test('continuous rail remains stable across scenery cycles and restart clears contacts',()=>{
 const s=run(-1);s.x=-limit(s);s.distance=7999;tick(s,30,{steer:-1});assert.equal(s.shield,100);assert.equal(s.x,-limit(s));assert.equal(s.events.filter(e=>e.type==='hit').length,0);
 s.mode='paused';const snap=JSON.stringify(s);tick(s,2,{steer:1});assert.equal(JSON.stringify(s),snap);startGame(s);assert.ok(s.barrierContacts.every(c=>!c.touching));assert.equal(s.barrierScrape,0);
});
test('distinct impacts can deplete shield and tutorial stays safe',()=>{
 const s=run(1);for(let n=0;n<3;n++){tick(s,.8,{steer:1});tick(s,3.5);if(n<2){tick(s,.4,{steer:-1});}}
 assert.equal(s.shield,0);assert.equal(s.mode,'over');assert.equal(s.events.filter(e=>e.type==='hit').length,3);
 const t=run(-1);t.tutorialSafe=true;tick(t,8,{steer:-1});assert.equal(t.shield,100);
});
