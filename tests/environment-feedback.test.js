import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGame,startGame} from '../src/simulation.js';
import {createNitroShield,updateProtection,recoveryVisible} from '../src/protection.js';
import {buildingParallax,advanceBuilding} from '../src/environment-motion.js';
import {signalOn} from '../src/traffic.js';
import {TRAFFIC,ENVIRONMENT,EFFECTS,CRASH} from '../src/tuning.js';
import {createDrivingEffects} from '../src/scene-effects.js';
import {nitroReadyScale} from '../src/hud.js';
test('true shield sphere is independent of body transforms and exclusive to active full bonuses',()=>{
 const scene=new THREE.Scene(),player=new THREE.Group(),body=new THREE.Group(),glow=new THREE.Group();player.add(body,glow);player.userData={body,glow};scene.add(player);const shield=createNitroShield();scene.add(shield);
 const s=createGame();startGame(s);s.boost=1;s.boostMode='auto';s.bonusTime=10;s.x=4.5;body.rotation.set(.1,.4,.3);body.scale.set(2,.5,3);player.rotation.y=.2;
 updateProtection(shield,player,s);scene.updateMatrixWorld(true);assert.ok(shield.visible);assert.deepEqual(shield.getWorldScale(new THREE.Vector3()).toArray(),[1,1,1]);assert.deepEqual(shield.rotation.toArray().slice(0,3),[0,0,0]);assert.equal(shield.position.x,s.x);
 shield.geometry.computeBoundingSphere();assert.ok(Math.abs(shield.geometry.boundingSphere.radius-EFFECTS.shieldRadius)<1e-6);
 for(const [mode,bonus,recovery] of [['hold',0,0],['off',0,CRASH.recoverySeconds],['auto',0,0]]){s.boostMode=mode;s.bonusTime=bonus;s.recovery=recovery;updateProtection(shield,player,s);assert.equal(shield.visible,false);}
});
test('recovery blinks moderately for exactly the protection interval with no sphere',()=>{
 const s=createGame();s.recovery=CRASH.recoverySeconds;assert.ok(recoveryVisible(s));let transitions=0,prev=true;
 for(let i=0;i<CRASH.recoverySeconds*120;i++){s.recovery=Math.max(0,CRASH.recoverySeconds-i/120);const visible=recoveryVisible(s);if(visible!==prev)transitions++;prev=visible;}
 assert.ok(transitions>=8&&transitions<=12);s.recovery=0;assert.ok(recoveryVisible(s));
});
test('signals show three deliberate flashes before movement and keep flashing during it',()=>{
 const car={change:{phase:'signal',time:TRAFFIC.warningSeconds}};let rising=0,prev=false,on=0,off=0;
 for(let i=0;i<TRAFFIC.warningSeconds*120;i++){car.change.time=TRAFFIC.warningSeconds-i/120;const lit=signalOn(car);if(lit&&!prev)rising++;prev=lit;if(lit)on++;else off++;}
 assert.equal(rising,3);assert.ok(Math.abs(on-off)<=2);car.change={phase:'moving',time:.1};assert.ok(signalOn(car));car.change.time=.5;assert.equal(signalOn(car),false);car.change=null;assert.equal(signalOn(car),false);
});
test('stationary scenery tracks road distance at every depth; perspective supplies parallax',()=>{
 assert.equal(buildingParallax(15),1);assert.equal(buildingParallax(45),1);assert.equal(buildingParallax(80),1);
 for(const travel of [0,36,62,114]){assert.equal(advanceBuilding(-100,travel,15,11),-100+travel);assert.equal(advanceBuilding(-100,travel,80,11),-100+travel);}
 assert.equal(advanceBuilding(100,1,15,30),101);assert.equal(advanceBuilding(31+ENVIRONMENT.recycleBehind,0,15,30),31+ENVIRONMENT.recycleBehind-ENVIRONMENT.citySpan);
 assert.ok(ENVIRONMENT.groundSize/2>600*3.56*Math.tan(70*Math.PI/360));
});
test('partial effects are restrained; full activation stays stronger even after fuel drops or bonuses expire',()=>{
 const scene=new THREE.Scene(),player=new THREE.Group(),body=new THREE.Group();player.add(body);scene.add(player);player.userData={body};const fx=createDrivingEffects(scene,player),s=createGame();startGame(s);fx.update(s,.01,0,0);
 s.boost=1;s.boostMode='hold';s.nitro=.3;for(let i=0;i<120;i++)fx.update(s,1/120,.5,i/120);const normal=fx.inspect().intensity;
 s.boostMode='auto';s.nitro=.1;s.bonusTime=0;fx.handleEvent({type:'boost'},s);assert.ok(fx.inspect().burst>0);for(let i=0;i<120;i++)fx.update(s,1/120,.5,i/120);
 assert.ok(fx.inspect().intensity>normal*1.7);assert.equal(fx.inspect().burst,0);assert.ok(normal<.6);
});
test('Nova-inspired ready pulse remains within mobile-safe scale bounds',()=>{for(let i=0;i<500;i++){const scale=nitroReadyScale(i/120);assert.ok(scale>=1.01-1e-9&&scale<=1.06+1e-9);}});
