import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from '../src/audio.js';

test('PLAY unlocks audio without a separate sound click; an explicit mute survives subsequent plays',async()=>{
 const old=globalThis.AudioContext,oscillators=[];
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
 globalThis.AudioContext=class {constructor(){this.currentTime=0;this.destination={};}async resume(){}createGain(){return {gain:param(),connect(){},disconnect(){}};}createBiquadFilter(){return {frequency:param(),connect(){}};}createOscillator(){const o={frequency:param(),connect(){},disconnect(){},start(){},stop(){}};oscillators.push(o);return o;}};
 try {
  const audio=createAudio();assert.equal(oscillators.length,0);
  assert.equal(await audio.unlock(),true);audio.ignition();assert.equal(oscillators.length,2);
  assert.equal(await audio.toggle(),false);
  assert.equal(await audio.unlock(),false);audio.ignition();assert.equal(oscillators.length,2);
 }finally{globalThis.AudioContext=old;}
});
test('unavailable audio does not prevent PLAY',async()=>{
 const old=globalThis.AudioContext;globalThis.AudioContext=class{constructor(){throw Error('Audio unavailable');}};
 try{assert.equal(await createAudio().unlock(),false);}finally{globalThis.AudioContext=old;}
});
