import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from '../src/audio.js';
test('separate channel settings preserve volumes, legacy mute and clamp invalid input',()=>{
 const storage={value:'{"enabled":false,"volume":0.2}',getItem(){return this.value;},setItem(k,v){this.value=v;}};
 const a=createAudio(storage);a.setChannel('music',{volume:.32,enabled:false});a.setChannel('sfx',{volume:.7});
 const b=createAudio(storage);assert.equal(b.enabled,false);assert.equal(b.volume,.2);assert.deepEqual(b.channel('music'),{enabled:false,volume:.32});assert.deepEqual(b.channel('sfx'),{enabled:true,volume:.7});
 b.setChannel('music',{volume:Infinity});assert.equal(b.channel('music').volume,.32);b.setChannel('sfx',{volume:4});assert.equal(b.channel('sfx').volume,1);
});
test('music schedules bounded notes, stops on pause, and effects respect only their own channel',async()=>{
 const original=globalThis.AudioContext;let ctx;const nodes=[],gains=[];
 const param=()=>({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 const source=()=>{const n={frequency:param(),connect(){},disconnect(){},start(){},stop(t){if(t===undefined)this.stopped=true;}};nodes.push(n);return n;};
 globalThis.AudioContext=class{constructor(){ctx=this;this.state='running';this.currentTime=0;this.sampleRate=100;this.destination={};}async resume(){}createOscillator(){return source();}createBufferSource(){return source();}createBuffer(){return{getChannelData(){return new Float32Array(100);}};}createBiquadFilter(){return{frequency:param(),connect(){},disconnect(){}};}createGain(){const n={gain:param(),connect(){},disconnect(){}};gains.push(n);return n;}};
 try{
 const a=createAudio({getItem(){return null;},setItem(){}});await a.unlock();const s={mode:'running',speed:60,boost:0};a.update(s);
 assert.ok(nodes.length>5);const count=nodes.length;a.update(s);assert.equal(nodes.length,count);
 a.update({...s,mode:'paused'});assert.ok(nodes.slice(1).every(n=>n.stopped));
 a.setChannel('music',{enabled:false});ctx.currentTime=200;a.update(s);assert.equal(nodes.length,count);
 a.event('near');assert.ok(nodes.length>count);
 a.event('horn',{distance:100});const horn=nodes.length;assert.ok(horn>count);
 a.update({...s,braking:true,deceleration:20});const brake=nodes.length;assert.ok(brake>horn);a.update({...s,braking:true,deceleration:10});assert.equal(nodes.length,brake);
 a.update(s);a.update({...s,braking:true,deceleration:20});assert.ok(nodes.length>brake);a.setChannel('sfx',{enabled:false});const muted=nodes.length;a.event('hit');a.ignition();assert.equal(nodes.length,muted);
 a.setChannel('music',{enabled:true});a.update(s);assert.ok(nodes.length>muted);const resumed=nodes.length;a.update(s);assert.equal(nodes.length,resumed);
 assert.equal(gains[1].gain.value,0);assert.ok(gains[2].gain.value>0);
 }finally{globalThis.AudioContext=original;}
});
