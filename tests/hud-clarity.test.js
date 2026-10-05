import test from 'node:test';
import assert from 'node:assert/strict';
import {shieldWarning,createNitroShield,updateProtection} from '../src/protection.js';
import {createOncomingHud} from '../src/oncoming-hud.js';
test('shield warning follows actual protection time, not fuel, and remains bounded',()=>{
 const s={boost:1,boostMode:'auto',bonusTime:2.1,nitro:.01};assert.equal(shieldWarning(s).strength,0);
 s.bonusTime=1.8;assert.ok(shieldWarning(s).strength>.99);const a=shieldWarning(s);s.nitro=1;assert.deepEqual(shieldWarning(s),a);
 for(let t=.001;t<=2;t+=.01){s.bonusTime=t;const v=shieldWarning(s);assert.ok(v.pulse>=.65&&v.pulse<=1);assert.equal(shieldWarning(s,true).pulse,1);}
 s.bonusTime=0;s.nitroGrace=.3;assert.equal(shieldWarning(s).strength,0);
});
test('shield hides at expiry and manual cancel despite grace or fuel remaining',()=>{
 const shield=createNitroShield(),player={userData:{body:{},glow:{}}},s={x:0,time:6,boost:1,boostMode:'auto',bonusTime:1,nitro:1,recovery:0,shieldFlash:0};
 updateProtection(shield,player,s);assert.equal(shield.visible,true);assert.equal(shield.material.uniforms.warning.value,1);
 s.bonusTime=0;s.nitroGrace=.3;updateProtection(shield,player,s);assert.equal(shield.visible,false);
 s.bonusTime=1;s.boost=0;updateProtection(shield,player,s);assert.equal(shield.visible,false);
});
test('oncoming HUD stays steady through boundary jitter, clears after departure, and resets',()=>{
 const element={dataset:{},setAttribute(){}},ui=createOncomingHud(element),s={time:0,mode:'running',oncoming:true};ui.reset();ui.update(s);assert.equal(element.dataset.active,'false');
 s.time=.2;ui.update(s);assert.equal(element.dataset.active,'true');assert.match(element.textContent,/ONCOMING TRAFFIC ×2/);
 s.oncoming=false;s.time=.3;ui.update(s);s.oncoming=true;s.time=.4;ui.update(s);assert.equal(element.dataset.active,'true');
 s.oncoming=false;s.time=.5;ui.update(s);s.time=.8;ui.update(s);assert.equal(element.dataset.active,'false');
 s.mode='paused';ui.update(s);assert.equal(element.dataset.active,'false');
});
