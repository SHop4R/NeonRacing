import {PICKUPS} from './tuning.js';
import {LANES} from './traffic.js';
export function pickupLane(x){return LANES.reduce((best,lane)=>Math.abs(lane-x)<Math.abs(best-x)?lane:best,LANES[0]);}
// Test overlap only during the swept longitudinal collection interval. The lane
// remains fixed even when the bonus magnet attracts the visible pickup sideways.
export function canCollectPickup(p,oldZ,newZ,oldPlayerX,newPlayerX,magnet=false,oldPickupX=p.x){
  const reach=PICKUPS.longitudinalReach,dz=newZ-oldZ;
  let enter=0,leave=1;
  if(Math.abs(dz)<1e-10){if(Math.abs(oldZ)>reach)return false;}
  else{const a=(-reach-oldZ)/dz,b=(reach-oldZ)/dz;enter=Math.max(0,Math.min(a,b));leave=Math.min(1,Math.max(a,b));if(enter>leave)return false;}
  const x1=oldPlayerX+(newPlayerX-oldPlayerX)*enter,x2=oldPlayerX+(newPlayerX-oldPlayerX)*leave;
  const lane=p.laneX??pickupLane(p.x),width=PICKUPS.laneHalfWidth+PICKUPS.carHalfWidth;
  if(Math.min(x1,x2)<=lane+width&&Math.max(x1,x2)>=lane-width)return true;
  if(!magnet)return false;
  const relative=t=>oldPickupX+(p.x-oldPickupX)*t-(oldPlayerX+(newPlayerX-oldPlayerX)*t);
  const a=relative(enter),b=relative(leave);
  return Math.min(a,b)<=PICKUPS.magnetReach&&Math.max(a,b)>=-PICKUPS.magnetReach;
}
export function makePickup(s,kind,x,z){return {id:s.nextId++,kind,x,laneX:pickupLane(x),z,speed:PICKUPS.worldSpeed,age:0};}

