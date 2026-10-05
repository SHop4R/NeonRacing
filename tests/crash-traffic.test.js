import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,stepGame} from '../src/simulation.js';
import {stepTraffic,makeTraffic,LANES} from '../src/traffic.js';
import {CRASH,TRAFFIC,EFFECTS} from '../src/tuning.js';
import {advanceSign} from '../src/road-motion.js';
const run=()=>{const s=createGame(()=>.1);startGame(s);s.spawnTimer=1e6;return s;};
const tick=(s,seconds,input={})=>{for(let i=0;i<Math.round(seconds*120);i++)stepGame(s,input,1/120);};
test('unshielded impact cancels boost, plays one sequence, respawns slower and clears nearby hazards',()=>{
 const s=run();s.nitro=.5;tick(s,.1,{boost:true});s.entities=[{id:1,kind:'traffic',x:s.x,z:1,speed:24},{id:2,kind:'traffic',x:s.x,z:2,speed:24},{id:3,kind:'traffic',x:4.5,z:90,speed:24}];
 tick(s,1/120,{boost:true});assert.equal(s.shield,66);assert.equal(s.boost,0);assert.equal(s.crashTime,CRASH.duration);
 tick(s,.85);assert.equal(s.respawnId,1);assert.equal(s.events.filter(e=>e.type==='hit').length,1);assert.equal(s.speed,CRASH.respawnSpeed);assert.equal(s.recovery,CRASH.recoverySeconds);assert.equal(s.entities.some(e=>Math.abs(e.x-s.x)<2&&e.z<CRASH.clearAhead&&e.z> -CRASH.clearBehind),false);
 s.entities.push({id:4,kind:'traffic',x:s.x,z:0,speed:24});tick(s,1/120);assert.equal(s.shield,66);assert.equal(s.crashTime,0);assert.ok(s.events.some(e=>e.type==='shield-hit'));
 tick(s,1);assert.ok(s.speed>55);
});
test('full nitro shield absorbs impact without interrupting driving; restart clears all state',()=>{
 const s=run();s.nitro=1;tick(s,.1,{boost:true});s.entities=[{id:1,kind:'traffic',x:s.x,z:0,speed:24}];tick(s,1/120);assert.equal(s.shield,100);assert.equal(s.crashTime,0);assert.ok(s.shieldFlash>0);assert.equal(s.boostMode,'auto');
 s.crashTime=.5;s.recovery=1;const runId=s.runId;startGame(s);assert.equal(s.runId,runId+1);for(const key of ['nitro','boost','bonusTime','crashTime','recovery','respawnId'])assert.equal(s[key],0);assert.deepEqual(s.entities,[]);
});
test('traffic signals for at least 2.4 seconds then smoothly changes into a clear neighboring lane',()=>{
 const s=run();s.entities=[makeTraffic(s,0,700,1,'motorcycle'),makeTraffic(s,3,700,1,'motorcycle')];s.laneChangeTimer=0;stepTraffic(s,0);
 const car=s.entities[0];assert.equal(car.change.phase,'signal');const x=car.x;
 for(let i=0;i<Math.round(TRAFFIC.warningSeconds*120)-1;i++)stepTraffic(s,1/120);assert.equal(car.x,x);assert.equal(car.change.phase,'signal');
 for(let i=0;i<10;i++)stepTraffic(s,1/120);assert.ok(car.x>x&&car.x<LANES[1]);
 for(let i=0;i<180;i++){stepTraffic(s,1/120);assert.ok(s.entities.filter(e=>e.change).length<=1);}assert.equal(car.lane,1);assert.equal(car.x,LANES[1]);
});
test('traffic will not occupy the last escape lane, crowd a neighbor or change too near the player',()=>{
 for(const lanes of [[0,1,2],[0,1,3]]){const s=run();s.entities=lanes.map(l=>makeTraffic(s,l,230,1));s.laneChangeTimer=0;stepTraffic(s,0);assert.equal(s.entities.some(e=>e.change),false);}
 const s=run();s.entities=[makeTraffic(s,0,230,1),makeTraffic(s,1,240,2)];s.laneChangeTimer=0;stepTraffic(s,0);assert.equal(s.entities.some(e=>e.change),false);
 s.entities=[makeTraffic(s,0,230,1)];s.laneChangeTimer=0;stepTraffic(s,0);s.entities[0].z=TRAFFIC.abortZ-1;stepTraffic(s,1/120);assert.equal(s.entities[0].change,null);
});
test('signs pass continuously through player and camera, recycling only after leaving view',()=>{
 for(const camera of [11,34]){assert.equal(advanceSign(-1,2,camera),1);assert.equal(advanceSign(camera-1,2,camera),camera+1);const limit=camera+EFFECTS.signBehind;assert.equal(advanceSign(limit-1,1,camera),limit);assert.equal(advanceSign(limit,1,camera),limit+1-EFFECTS.signCount*EFFECTS.signSpacing);}
});
