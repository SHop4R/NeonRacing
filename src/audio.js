export function createAudio() {
  let ctx, master, engine, engineGain, enabled=false,startup=null;
  async function toggle() {
    try {
      if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);engine=ctx.createOscillator();engine.type='sawtooth';const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=240;engineGain=ctx.createGain();engineGain.gain.value=.018;engine.connect(filter);filter.connect(engineGain);engineGain.connect(master);engine.start();}
      await ctx.resume();enabled=!enabled;master.gain.setTargetAtTime(enabled?.45:0,ctx.currentTime,.1);return enabled;
    }catch{return false;}
  }
  function update(s){if(!ctx)return;engine.frequency.setTargetAtTime(35+s.speed*.85,ctx.currentTime,.1);engineGain.gain.setTargetAtTime(s.mode==='running'?.025:s.mode==='intro'?.012+.013*s.introProgress:0,ctx.currentTime,.1);}
  function event(type){if(!enabled||!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(master);o.type=type==='hit'?'sawtooth':'sine';const freq=type==='hit'?100:type==='boost'?180:type==='near'?650:880;o.frequency.setValueAtTime(freq,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(type==='hit'?35:freq*1.7,ctx.currentTime+.18);g.gain.setValueAtTime(.07,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.25);o.start();o.stop(ctx.currentTime+.26);o.onended=()=>{o.disconnect();g.disconnect();};}
  function ignition(quick=false){
    if(!enabled||!ctx)return;
    void ctx.resume();stopIgnition();const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.connect(g);g.connect(master);
    const catchAt=quick?.15:.48;o.frequency.setValueAtTime(45,t);o.frequency.linearRampToValueAtTime(75,t+catchAt);o.frequency.setValueAtTime(135,t+catchAt+.06);o.frequency.exponentialRampToValueAtTime(40,t+(quick?.45:1.2));
    g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.025,t+.05);for(let beat=.08;beat<catchAt;beat+=.08){g.gain.setValueAtTime(.012,t+beat);g.gain.linearRampToValueAtTime(.028,t+beat+.035);}g.gain.setValueAtTime(.045,t+catchAt);g.gain.exponentialRampToValueAtTime(.001,t+(quick?.5:1.3));startup=o;o.start(t);o.stop(t+(quick?.55:1.35));o.onended=()=>{if(startup===o)startup=null;o.disconnect();g.disconnect();};
  }
  function stopIgnition(){if(startup){try{startup.stop();}catch{}startup=null;}}
  return {toggle,update,event,ignition,stopIgnition};
}
