export const AUDIO_PREFERENCE_KEY='shutoko-audio';
export function createAudio(storage) {
  let ctx,master,engine,engineGain,startup=null,pending=null,enabled=true,volume=.45;
  try {
    storage??=globalThis.localStorage;
    const saved=JSON.parse(storage?.getItem(AUDIO_PREFERENCE_KEY)??'null');
    if(typeof saved?.enabled==='boolean')enabled=saved.enabled;
    if(typeof saved?.volume==='number'&&Number.isFinite(saved.volume))volume=Math.max(0,Math.min(1,saved.volume));
  }catch{}
  const audible=()=>enabled&&ctx?.state==='running';
  function save(){try{storage?.setItem(AUDIO_PREFERENCE_KEY,JSON.stringify({enabled,volume}));}catch{}}
  async function unlock() {
    if(!enabled)return false;
    if(pending){master.gain.setTargetAtTime(volume,ctx.currentTime,.1);return pending;}
    try {
      if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);engine=ctx.createOscillator();engine.type='sawtooth';const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=240;engineGain=ctx.createGain();engineGain.gain.value=0;engine.connect(filter);filter.connect(engineGain);engineGain.connect(master);engine.start();}
      master.gain.setTargetAtTime(volume,ctx.currentTime,.1);
      pending=ctx.resume().then(()=>audible(),()=>false);
      return await pending;
    }catch{return false;}finally{pending=null;}
  }
  async function toggle() {
    enabled=!enabled;save();
    if(!enabled){stopIgnition();if(master)master.gain.setTargetAtTime(0,ctx.currentTime,.1);}
    else void unlock();
    return enabled;
  }
  function update(s){if(!ctx)return;engine.frequency.setTargetAtTime(35+s.speed*.85,ctx.currentTime,.1);engineGain.gain.setTargetAtTime(s.mode==='running'?.025:s.mode==='intro'?.012+.013*s.introProgress:0,ctx.currentTime,.1);}
  function event(type){if(!audible())return;const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(master);o.type=type==='hit'?'sawtooth':'sine';const freq=type==='hit'?100:type==='boost'?180:type==='near'?650:880;o.frequency.setValueAtTime(freq,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(type==='hit'?35:freq*1.7,ctx.currentTime+.18);g.gain.setValueAtTime(.07,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.25);o.start();o.stop(ctx.currentTime+.26);o.onended=()=>{o.disconnect();g.disconnect();};}
  function ignition(quick=false){
    if(!audible())return;
    stopIgnition();const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.connect(g);g.connect(master);
    const catchAt=quick?.15:.48;o.frequency.setValueAtTime(45,t);o.frequency.linearRampToValueAtTime(75,t+catchAt);o.frequency.setValueAtTime(135,t+catchAt+.06);o.frequency.exponentialRampToValueAtTime(40,t+(quick?.45:1.2));
    g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.025,t+.05);for(let beat=.08;beat<catchAt;beat+=.08){g.gain.setValueAtTime(.012,t+beat);g.gain.linearRampToValueAtTime(.028,t+beat+.035);}g.gain.setValueAtTime(.045,t+catchAt);g.gain.exponentialRampToValueAtTime(.001,t+(quick?.5:1.3));startup=o;o.start(t);o.stop(t+(quick?.55:1.35));o.onended=()=>{if(startup===o)startup=null;o.disconnect();g.disconnect();};
  }
  function stopIgnition(){if(startup){try{startup.stop();}catch{}startup=null;}}
  return {toggle,unlock,update,event,ignition,stopIgnition,get enabled(){return enabled;},get volume(){return volume;}};
}
