import {DRIVING} from './tuning.js';
export const LAUNCH=Object.freeze({hold:.8,seconds:4.5,retryHold:.32,retrySeconds:2.2});
export function launchFrame(elapsed,quick=false){
 const hold=quick?LAUNCH.retryHold:LAUNCH.hold,seconds=quick?LAUNCH.retrySeconds:LAUNCH.seconds;
 const p=Math.max(0,Math.min(1,(elapsed-hold)/seconds));
 // Smooth velocity with zero acceleration at both ends; integral is road travel.
 const ease=p*p*(3-2*p);
 return {introElapsed:elapsed,introQuick:quick,introProgress:p,speed:DRIVING.initialSpeed*ease,
  introDistance:DRIVING.initialSpeed*seconds*(p*p*p-.5*p*p*p*p),done:elapsed>=hold+seconds};
}
