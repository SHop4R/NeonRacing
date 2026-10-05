import test from 'node:test';
import assert from 'node:assert/strict';
import {createControlState} from '../src/input.js';
test('pointer release does not cancel keyboard steering',()=>{const c=createControlState();c.key('KeyA',true);c.pointer(1,'left');c.pointer(1,null);assert.equal(c.read().steer,-1);});
test('independent pointers support simultaneous steering and boost',()=>{const c=createControlState();c.pointer(1,'right');c.pointer(2,'boost');assert.equal(c.read().steer,1);c.pointer(2,null);assert.equal(c.read().steer,1);});
test('opposing directions cancel, clear resets every input',()=>{const c=createControlState();c.key('ArrowLeft',true);c.pointer(1,'right');assert.equal(c.read().steer,0);c.clear();assert.equal(c.read().steer,0);c.key('ArrowLeft',false);assert.equal(c.read().steer,0);});
test('keyboard and pointer brakes stay independent of steering and release',()=>{const c=createControlState();c.key('KeyS',true);c.pointer(1,'brake');c.pointer(2,'left');c.pointer(1,null);assert.deepEqual(c.read(),{boost:false,steer:-1,brake:true});c.key('KeyS',false);assert.equal(c.read().brake,false);c.key('ArrowDown',true);assert.equal(c.read().brake,true);c.clear();assert.deepEqual(c.read(),{boost:false,steer:0,brake:false});});
import {createInput} from '../src/input.js';
import {createGame,startGame,stepGame,activateBoost,collectPickup} from '../src/simulation.js';
test('keyboard hold activates partial fuel, release stops, repeat cannot cancel auto',()=>{
 const w=new EventTarget(),d=new EventTarget(),root={querySelectorAll:()=>[]},s=createGame();startGame(s);s.spawnTimer=1e6;s.nitro=.5;
 const input=createInput(root,{boost:()=>s.nitroPress=true,pause(){},restart(){},start(){},blur(){}},{windowTarget:w,documentTarget:d});
 const key=(type,repeat=false)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{code:'Space',repeat});w.dispatchEvent(e);};
 const tick=()=>stepGame(s,input.read(),1/120);
 key('keydown');tick();assert.equal(s.boostMode,'hold');key('keyup');tick();assert.equal(s.boost,0);
 collectPickup(s,'nitro');key('keydown');tick();assert.equal(s.boostMode,'auto');
 for(let i=0;i<60;i++){key('keydown',true);tick();}assert.equal(s.boostMode,'auto');
 key('keyup');tick();assert.equal(s.boostMode,'auto');key('keydown');tick();assert.equal(s.boost,0);input.destroy();
});
test('mouse and touch holds share nitro behavior and cancellation clears input',()=>{
 class Button extends EventTarget {constructor(control){super();this.dataset={control};this.captures=new Set();this.held=false;this.classList={add:()=>this.held=true,remove:()=>this.held=false};}setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}}
 const left=new Button('left'),brake=new Button('brake'),boost=new Button('boost'),buttons=[left,brake,boost];
 const w=new EventTarget(),d=new EventTarget(),root={querySelectorAll:s=>s==='.held'?buttons.filter(b=>b.held):buttons};
 const s=createGame();startGame(s);s.spawnTimer=1e6;let blurs=0;
 const c=createInput(root,{boost:()=>s.nitroPress=true,pause(){},restart(){},start(){},blur(){blurs++;}},{windowTarget:w,documentTarget:d});
 const pointer=(button,type,id)=>{const e=new Event(type,{cancelable:true});e.pointerId=id;button.dispatchEvent(e);};
 const tick=()=>stepGame(s,c.read(),1/120);
 pointer(left,'pointerdown',1);pointer(brake,'pointerdown',2);collectPickup(s,'nitro');pointer(boost,'pointerdown',3);tick();
 assert.deepEqual(c.read(),{boost:true,steer:-1,brake:true});assert.equal(s.boost,0);
 pointer(brake,'pointercancel',2);tick();assert.equal(s.boost,0);
 pointer(boost,'pointerup',3);tick();pointer(boost,'pointerdown',4);tick();assert.equal(s.boostMode,'auto');
 pointer(boost,'pointerup',4);tick();assert.equal(s.boostMode,'auto');pointer(boost,'pointerdown',5);tick();assert.equal(s.boost,0);
 w.dispatchEvent(new Event('blur'));assert.equal(blurs,1);assert.deepEqual(c.read(),{boost:false,steer:0,brake:false});assert.ok(buttons.every(b=>!b.held));c.destroy();
});
test('clearing transition input ignores held-key repeats until a fresh press',()=>{
 const w=new EventTarget(),d=new EventTarget(),root={querySelectorAll:()=>[]};let presses=0;
 const c=createInput(root,{boost(){presses++;},pause(){},restart(){},start(){},blur(){}},{windowTarget:w,documentTarget:d});
 const key=(type,repeat=false)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{code:'Space',repeat});w.dispatchEvent(e);};
 key('keydown');c.clear();key('keydown',true);assert.equal(c.read().boost,false);assert.equal(presses,1);key('keyup');key('keydown');assert.equal(c.read().boost,true);assert.equal(presses,2);c.destroy();
});
test('Escape can dismiss instructions without triggering pause; P retains pause behavior',()=>{
 const w=new EventTarget(),d=new EventTarget(),root={querySelectorAll:()=>[]};let escapes=0,pauses=0;
 const c=createInput(root,{escape(){escapes++;},pause(){pauses++;},boost(){},restart(){},start(){},blur(){}},{windowTarget:w,documentTarget:d});
 for(const code of ['Escape','KeyP'])for(const type of ['keydown','keyup']){const e=new Event(type,{cancelable:true});Object.assign(e,{code,repeat:false});w.dispatchEvent(e);}
 assert.equal(escapes,1);assert.equal(pauses,1);c.destroy();
});
