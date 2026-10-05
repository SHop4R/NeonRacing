import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from '../src/audio.js';
const storage=value=>({value,getItem(){return this.value;},setItem(k,v){this.value=v;}});
test('new player sound defaults on and saved mute/volume survive reconstruction',async()=>{
 const store=storage(null),a=createAudio(store);assert.equal(a.enabled,true);assert.equal(a.volume,.45);
 await a.toggle();assert.equal(a.enabled,false);assert.equal(createAudio(store).enabled,false);
 const quiet=createAudio(storage(JSON.stringify({enabled:true,volume:.2})));assert.equal(quiet.volume,.2);
});
test('blocked autoplay does not mute the preference or queue gameplay effects',async()=>{
 const old=globalThis.AudioContext;let nodes=0,blocked=true;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
 globalThis.AudioContext=class{constructor(){this.state='suspended';this.currentTime=0;this.destination={};}async resume(){if(blocked)throw Error('blocked');this.state='running';}createGain(){return{gain:param(),connect(){},disconnect(){}};}createBiquadFilter(){return{frequency:param(),connect(){}};}createOscillator(){nodes++;return{frequency:param(),connect(){},disconnect(){},start(){},stop(){}};}};
 try{const a=createAudio(storage(null));assert.equal(await a.unlock(),false);assert.equal(a.enabled,true);a.event('near');a.ignition();assert.equal(nodes,1);blocked=false;assert.equal(await a.unlock(),true);assert.equal(nodes,1);a.ignition();assert.equal(nodes,2);}finally{globalThis.AudioContext=old;}
});
test('mute/unmute updates preference and gain immediately while resume is pending',async()=>{
 const old=globalThis.AudioContext;let resume,master;
 const param=()=>({value:0,setTargetAtTime(v){this.value=v;}});
 globalThis.AudioContext=class{constructor(){this.state='suspended';this.currentTime=0;this.destination={};}resume(){return new Promise(r=>{resume=()=>{this.state='running';r();};});}createGain(){const node={gain:param(),connect(){}};master??=node;return node;}createBiquadFilter(){return{frequency:param(),connect(){}};}createOscillator(){return{connect(){},start(){}};}};
 try{const a=createAudio(storage(null)),unlock=a.unlock();await a.toggle();assert.equal(master.gain.value,0);assert.equal(await a.toggle(),true);assert.equal(a.enabled,true);assert.equal(master.gain.value,.45);resume();assert.equal(await unlock,true);}finally{globalThis.AudioContext=old;}
});
