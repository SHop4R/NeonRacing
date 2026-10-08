import {ONCOMING} from './tuning.js';
// UI-only dwell prevents center-line chatter; driving/reward rules remain exact.
export function createOncomingHud(element){
 let shown=false,pending=false,since=0;
 return {
  reset(){shown=false;pending=false;since=0;element.dataset.active='false';element.setAttribute('aria-hidden','true');},
  update(s){
   if(s.mode!=='running'){
    if(s.mode!=='paused')this.reset();
    else{element.dataset.active='false';element.setAttribute('aria-hidden','true');}
    return false;
   }
   const wasShown=shown;
   const wanted=!!s.oncoming;
   if(wanted!==pending){pending=wanted;since=s.time;}
   if(wanted!==shown&&s.time-since>=(wanted?.18:.28))shown=wanted;
   element.textContent=`ONCOMING TRAFFIC ×${ONCOMING.reward}`;
   element.dataset.active=String(shown);element.setAttribute('aria-hidden',String(!shown));
   return shown&&!wasShown;
  }
 };
}
