import {DRIVING} from './tuning.js';
import {LANES,trafficBounds} from './traffic.js';
export function brakingLeader(s){
  return s.entities.filter(e=>e.kind==='traffic'&&(e.direction??1)===1&&e.z>0&&
    (Math.abs(e.x-s.x)<trafficBounds(e).halfWidth+.86+.05||(e.change&&Math.abs(LANES[e.change.to]-s.x)<trafficBounds(e).halfWidth+.86+.05)))
    .reduce((lead,e)=>!lead||e.z<lead.z?e:lead,null);
}
export function brakingTarget(s){
  const lead=brakingLeader(s);if(!lead)return DRIVING.brakeSpeed;
  return Math.min(DRIVING.brakeSpeed,Math.max(DRIVING.minFollowSpeed,lead.speed+(lead.z-(DRIVING.followGap+Math.max(0,(lead.length??4)-4)/2))*DRIVING.followResponse));
}
