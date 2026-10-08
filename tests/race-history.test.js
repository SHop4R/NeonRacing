import test from 'node:test';
import assert from 'node:assert/strict';
import {createRaceHistory} from '../src/race-history.js';
test('recent rewards combine without a queue, freeze while paused and clear on restart/crash',()=>{
 const nodes=[],container={ownerDocument:{createElement:()=>({style:{},remove(){nodes.splice(nodes.indexOf(this),1);}})},append:n=>nodes.push(n)};
 const ui=createRaceHistory(container),s={mode:'running',time:0,combo:1};
 ui.event(s,{type:'near',amount:200});s.time=.1;ui.event(s,{type:'near',amount:200});s.combo=2;ui.update(s);
 assert.equal(nodes.length,1);assert.equal(nodes[0].textContent,'NEAR MISS ×2  +400  ·  COMBO ×2');
 for(let i=1;i<5;i++){s.time=i;ui.event(s,{type:'near',amount:400});ui.update(s);}assert.equal(nodes.length,3);
 s.mode='paused';const opacity=nodes[0].style.opacity;ui.update(s);assert.equal(nodes[0].style.opacity,opacity);assert.ok(container.hidden);
 s.mode='running';s.time=9;ui.update(s);assert.equal(nodes.length,0);
 s.combo=3;ui.update(s);assert.equal(nodes[0].textContent,'COMBO ×3');ui.event(s,{type:'hit'});assert.equal(nodes.length,0);
 s.mode='ready';ui.update(s);assert.ok(container.hidden);ui.reset();assert.equal(nodes.length,0);
});

// Exercise the same debounced transition used by main.js, including pause/resume.
import {createOncomingHud} from '../src/oncoming-hud.js';
test('oncoming entry joins history once, stays separate from near misses and rearms after departure',()=>{
 const nodes=[],container={ownerDocument:{createElement:()=>({style:{},remove(){nodes.splice(nodes.indexOf(this),1);}})},append:n=>nodes.push(n)};
 const history=createRaceHistory(container),hud=createOncomingHud({dataset:{},setAttribute(){}}),s={mode:'running',time:0,combo:1,oncoming:true};
 const update=()=>{if(hud.update(s))history.event(s,{type:'oncoming'});history.update(s);};
 history.event(s,{type:'near',amount:200});update();s.time=.2;update();
 assert.deepEqual(nodes.map(n=>n.textContent),['NEAR MISS  +200','ONCOMING TRAFFIC ×2']);
 s.oncoming=false;s.time=.25;update();s.oncoming=true;s.time=.3;update();assert.equal(nodes.length,2);
 s.mode='paused';update();s.mode='running';update();assert.equal(nodes.length,2,'resume is not a new entry');
 s.time=4.3;update();assert.equal(nodes.length,0);s.time=5;update();assert.equal(nodes.length,0,'no repeated entries while active');
 s.oncoming=false;s.time=5.1;update();s.time=5.4;update();s.oncoming=true;s.time=5.5;update();s.time=5.7;update();
 assert.equal(nodes.length,1);assert.equal(nodes[0].textContent,'ONCOMING TRAFFIC ×2');
 s.mode='ready';update();assert.equal(nodes.length,0);
});

test('nitro and overdrive count actual earned bonus in one row and fade after boosting ends',()=>{
 const nodes=[],container={ownerDocument:{createElement:()=>({style:{},remove(){nodes.splice(nodes.indexOf(this),1);}})},append:n=>nodes.push(n)};
 const ui=createRaceHistory(container),s={mode:'running',time:0,combo:1,boost:1,boostScore:2};
 ui.event(s,{type:'near',amount:200});ui.event(s,{type:'boost',mode:'hold'});ui.update(s);assert.equal(nodes.length,2);assert.equal(nodes[1].textContent,'NITRO +2');
 s.time=2;s.boostScore=50;ui.update(s);assert.equal(nodes.length,2);assert.equal(nodes[1].textContent,'NITRO +50');assert.equal(nodes[1].style.opacity,'1');
 s.mode='paused';ui.update(s);assert.ok(container.hidden);s.mode='running';s.boost=0;ui.update(s);
 s.time=6.1;ui.update(s);assert.equal(nodes.length,0);
 s.boost=1;s.boostScore=75;ui.event(s,{type:'boost',mode:'auto'});ui.update(s);assert.equal(nodes[0].textContent,'OVERDRIVE +75');
 for(let i=0;i<4;i++){s.time+=.5;ui.event(s,{type:'near',amount:200});ui.update(s);}
 s.boostScore=225;ui.update(s);assert.equal(nodes.length,3);assert.ok(nodes.some(n=>n.textContent==='OVERDRIVE +225'));
 s.mode='ready';ui.update(s);assert.equal(nodes.length,0);
});
