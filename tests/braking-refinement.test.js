import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,stepGame} from '../src/simulation.js';
import {brakingTarget} from '../src/braking.js';
import {DRIVING} from '../src/tuning.js';
const run=()=>{const s=createGame();startGame(s);s.spawnTimer=1e6;return s;};
test('following brake ignores other lanes and anticipates a signaled merge',()=>{const s=run();s.entities=[{kind:'traffic',x:4.5,z:20,speed:24}];assert.equal(brakingTarget(s),DRIVING.brakeSpeed);s.entities[0].change={to:2};s.entities[0].speed=6;s.entities[0].z=12;assert.ok(brakingTarget(s)<DRIVING.brakeSpeed);});
test('holding brake settles safely behind traffic; releasing restores normal acceleration',()=>{const s=run();s.x=1.5;s.entities=[{id:10,kind:'traffic',x:1.5,z:30,speed:24}];for(let i=0;i<10*120;i++)stepGame(s,{brake:true},1/120);assert.equal(s.shield,100);assert.ok(s.entities[0].z>DRIVING.followGap);assert.ok(Math.abs(s.speed-DRIVING.brakeSpeed)<.1);s.entities=[];for(let i=0;i<120;i++)stepGame(s,{},1/120);assert.ok(s.speed>DRIVING.initialSpeed*.95);});
