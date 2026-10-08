import {NITRO} from './tuning.js';
export const hasNitroBonus=s=>s.boost>0&&s.boostMode==='auto'&&s.bonusTime>0;
export function chargeNitro(s,amount){
  const full=s.nitro>=1;s.nitro=Math.min(1,s.nitro+amount);
  if(s.nitro>1-1e-10)s.nitro=1;
  if(!full&&s.nitro===1)s.events.push({type:'nitro-ready',text:'Nitro Full'});
}
export function stopBoost(s){
  if(s.boost>0)s.chargeDelay=NITRO.rechargeDelay;
  const bank=s.nitroReserve??0;s.nitroReserve=0;
  s.boost=0;s.boostMode='off';s.bonusTime=0;
  if(bank>0){chargeNitro(s,bank);s.boostLocked=true;}
}
export function activateBoost(s,input={brake:s.braking}){
  if(s.mode!=='running'||s.crashTime>0||input.brake)return false;
  if(s.boostMode==='auto'){stopBoost(s);s.boostLocked=true;return false;}
  if(s.boost>0||s.boostLocked)return false;
  if(s.nitro<=0){s.boostLocked=true;return false;}
  const full=s.nitro>=1;
  s.boostScore=0;s.boost=1;s.boostMode=full?'auto':'hold';s.bonusTime=full?NITRO.bonusSeconds:0;
  s.events.push({type:'boost',mode:s.boostMode,text:full?'Shield + Magnet':'Nitro Boost'});return true;
}
export function stepNitro(s,input,dt){
  const held=Boolean(input.boost),pressed=Boolean(input.boostPressed||s.nitroPress||(held&&!s.boostWasHeld));
  s.nitroPress=false;s.boostWasHeld=held;
  if(!held)s.boostLocked=false;
  if(input.brake||s.crashTime>0){stopBoost(s);if(held)s.boostLocked=true;}
  else {
    if(pressed)activateBoost(s,input);
    if(s.boostMode==='hold'&&!held)stopBoost(s);
    // Depleted or cancelled boosts require release before re-arming, avoiding sputter.
    if(held&&!s.boost&&!s.boostLocked)activateBoost(s,input);
  }
  if(s.boost>0){
    const full=s.boostMode==='auto',duration=full?NITRO.autoSeconds:NITRO.drainSeconds;
    // Count only fuel-backed active time, including the final fractional frame.
    const activeTime=Math.min(dt,s.nitro*duration,full?s.bonusTime:Infinity);
    if(!s.tutorialSafe&&s.speed>0){
      const points=activeTime*(full?NITRO.overdriveScorePerSecond:NITRO.scorePerSecond);
      s.score+=points;s.boostScore+=points;
    }
    s.nitro=Math.max(0,s.nitro-dt/(s.boostMode==='auto'?NITRO.autoSeconds:NITRO.drainSeconds));
    s.bonusTime=Math.max(0,s.bonusTime-dt);
    if(s.nitro<1e-10||(s.boostMode==='auto'&&s.bonusTime<1e-10)){if(s.boostMode==='auto')s.nitroGrace=NITRO.expiryGrace;s.nitro=0;stopBoost(s);s.boostLocked=held;}
  }else{
    const waiting=Math.min(s.chargeDelay,dt);s.chargeDelay=Math.max(0,s.chargeDelay-dt);
    if(dt>waiting)chargeNitro(s,(dt-waiting)/NITRO.refillSeconds);
  }
}
