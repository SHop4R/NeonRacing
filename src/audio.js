export const AUDIO_PREFERENCE_KEY='shutoko-audio';
export function createAudio(storage) {
  let ctx,master,engine,engineGain,sfxBus,musicBus,startup=null,pending=null,enabled=true,volume=.45;
  const channels={music:{enabled:true,volume:.55},sfx:{enabled:true,volume:1}};
  let nextBeat=0,step=0,noiseBuffer,wasBraking=false;
  const musicNodes=new Set();
  try {
    storage??=globalThis.localStorage;
    const saved=JSON.parse(storage?.getItem(AUDIO_PREFERENCE_KEY)??'null');
    if(typeof saved?.enabled==='boolean')enabled=saved.enabled;
    if(typeof saved?.volume==='number'&&Number.isFinite(saved.volume))volume=Math.max(0,Math.min(1,saved.volume));
    for(const name of ['music','sfx']){
      if(typeof saved?.[name]?.enabled==='boolean')channels[name].enabled=saved[name].enabled;
      if(Number.isFinite(saved?.[name]?.volume))channels[name].volume=Math.max(0,Math.min(1,saved[name].volume));
    }
  }catch{}
  const audible=()=>enabled&&ctx?.state==='running';
  function save(){try{storage?.setItem(AUDIO_PREFERENCE_KEY,JSON.stringify({enabled,volume,...channels}));}catch{}}
  async function unlock() {
    if(!enabled)return false;
    if(pending){master.gain.setTargetAtTime(volume,ctx.currentTime,.1);return pending;}
    try {
      if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);sfxBus=ctx.createGain();sfxBus.connect(master);musicBus=ctx.createGain();musicBus.connect(master);applyMix();engine=ctx.createOscillator();engine.type='sawtooth';const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=240;engineGain=ctx.createGain();engineGain.gain.value=0;engine.connect(filter);filter.connect(engineGain);engineGain.connect(sfxBus);engine.start();}
      master.gain.setTargetAtTime(volume,ctx.currentTime,.1);
      pending=ctx.resume().then(()=>audible(),()=>false);
      return await pending;
    }catch{return false;}finally{pending=null;}
  }
  async function toggle() {
    enabled=!enabled;save();
    if(!enabled){stopMusic();stopIgnition();if(master)master.gain.setTargetAtTime(0,ctx.currentTime,.1);}
    else void unlock();
    return enabled;
  }
  function applyMix(){
    if(!ctx)return;
    for(const [name,bus] of [['music',musicBus],['sfx',sfxBus]])bus.gain.setTargetAtTime(channels[name].enabled?channels[name].volume:0,ctx.currentTime,.04);
  }
  function setChannel(name,patch){
    if(!Object.hasOwn(channels,name))return;
    if(typeof patch.enabled==='boolean')channels[name].enabled=patch.enabled;
    if(Number.isFinite(patch.volume))channels[name].volume=Math.max(0,Math.min(1,patch.volume));
    applyMix();save();
    if(name==='music'&&(!channels.music.enabled||!channels.music.volume))stopMusic();
    if(name==='sfx'&&!channels.sfx.enabled)stopIgnition();
  }
  function tone(freq,end,duration,level,type='sine',at=ctx.currentTime,bus=sfxBus){
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.connect(g);g.connect(bus);
    o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),at+duration);
    g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(level,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
    o.start(at);o.stop(at+duration+.01);
    if(bus===musicBus)musicNodes.add(o);
    o.onended=()=>{musicNodes.delete(o);o.disconnect();g.disconnect();};
  }
  function noise(duration,level,frequency,at=ctx.currentTime,bus=sfxBus){
    if(!noiseBuffer){noiseBuffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
    const o=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.buffer=noiseBuffer;f.type='bandpass';f.frequency.value=frequency;
    o.connect(f);f.connect(g);g.connect(bus);g.gain.setValueAtTime(level,at);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
    o.start(at);o.stop(at+duration);if(bus===musicBus)musicNodes.add(o);
    o.onended=()=>{musicNodes.delete(o);o.disconnect();f.disconnect();g.disconnect();};
  }
  function stopMusic(){for(const node of musicNodes){try{node.stop();}catch{}}musicNodes.clear();nextBeat=0;}
  function update(s){
    const braking=s.mode==='running'&&s.braking&&s.deceleration>2&&s.speed>8&&!(s.crashTime>0);
    if(braking&&!wasBraking&&ctx)event('brake');
    wasBraking=s.mode==='running'&&s.braking;
    if(!ctx)return;
    const running=s.mode==='running',boosting=s.boost>0;
    engine.frequency.setTargetAtTime(35+s.speed*.85+(boosting?18:0),ctx.currentTime,.12);
    engineGain.gain.setTargetAtTime(globalThis.document?.hidden?0:running?(boosting?.065:.045):s.mode==='intro'?.012+.013*s.introProgress:0,ctx.currentTime,.12);
    if(!audible()||globalThis.document?.hidden||s.mode==='paused'||s.mode==='over'||!channels.music.enabled||channels.music.volume===0){stopMusic();return;}
    // Original 112 BPM synthwave loop. Schedule only the next eighth note; never catch up missed audio.
    if(nextBeat<ctx.currentTime-.1)nextBeat=ctx.currentTime;
    if(nextBeat>ctx.currentTime+.08)return;
    const t=nextBeat,beat=step%16,root=[45,41,48,43][Math.floor(step/16)%4],hz=n=>440*2**((n-69)/12);
    musicBus.gain.setTargetAtTime(channels.music.volume*(s.mode==='intro'?.3:1),t,.1);
    tone(hz(root),hz(root),.23,.095,'triangle',t,musicBus);
    const note=root+24+[0,7,12,7,3,7,10,7][beat%8];
    tone(hz(note),hz(note),.32,.028,'triangle',t,musicBus);
    if(beat%4===0)tone(130,42,.2,.16,'sine',t,musicBus);
    if(beat%4===2)noise(.13,.07,1600,t,musicBus);
    noise(beat%2?.07:.035,.025,7000,t,musicBus);
    if(beat===0)for(const offset of [0,3,7])tone(hz(root+12+offset),hz(root+12+offset),1.8,.014,'sine',t,musicBus);
    step=(step+1)%64;nextBeat+=60/112/2;
  }
  function event(type,detail={}){
    if(!audible()||!channels.sfx.enabled||channels.sfx.volume===0)return;
    const t=ctx.currentTime;
    if(type==='brake'){noise(.4,.12,1800);tone(760,460,.32,.027,'triangle');}
    else if(type==='horn'){const level=.065*Math.max(.35,1-(detail.distance??100)/400);tone(370,355,.38,level,'sawtooth');tone(466,450,.38,level*.7,'sawtooth');}
    else if(type==='hit'||type==='over'){noise(.38,.24,650);tone(115,28,.4,.2,'triangle');}
    else if(type==='near'){noise(.24,.16,2300);tone(700,1150,.14,.035);}
    else if(type==='boost'){noise(.65,.14,1000);tone(65,260,.55,.11,'sawtooth');}
    else if(type==='shield-hit'){noise(.16,.09,4000);tone(1200,260,.25,.085,'triangle');}
    else if(['orb','energy','repair','nitro','respawn'].includes(type)){
      const notes=type==='nitro'?[440,660,880,1320]:type==='repair'?[523,659,784]:type==='respawn'?[330,440]:[880,1320];
      notes.forEach((n,i)=>tone(n,n,.18,.075,'sine',t+i*.065));
    }
  }
  function ignition(quick=false){
    if(!audible()||!channels.sfx.enabled||channels.sfx.volume===0)return;
    stopIgnition();const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.connect(g);g.connect(sfxBus);
    const catchAt=quick?.15:.48;o.frequency.setValueAtTime(45,t);o.frequency.linearRampToValueAtTime(75,t+catchAt);o.frequency.setValueAtTime(135,t+catchAt+.06);o.frequency.exponentialRampToValueAtTime(40,t+(quick?.45:1.2));
    g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.025,t+.05);for(let beat=.08;beat<catchAt;beat+=.08){g.gain.setValueAtTime(.012,t+beat);g.gain.linearRampToValueAtTime(.028,t+beat+.035);}g.gain.setValueAtTime(.045,t+catchAt);g.gain.exponentialRampToValueAtTime(.001,t+(quick?.5:1.3));startup=o;o.start(t);o.stop(t+(quick?.55:1.35));o.onended=()=>{if(startup===o)startup=null;o.disconnect();g.disconnect();};
  }
  function stopIgnition(){if(startup){try{startup.stop();}catch{}startup=null;}}
  return {toggle,unlock,update,event,ignition,stopIgnition,setChannel,channel:name=>({...channels[name]}),get enabled(){return enabled;},get volume(){return volume;}};
}
