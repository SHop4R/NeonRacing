// Test-only driver. Chooses a route using visible traffic, never grants protection.
import {DRIVING} from '../src/tuning.js';
import {LANES,relativeSpeed,trafficBounds} from '../src/traffic.js';
export function drive(s){
 let best={cost:Infinity,target:s.x,brake:false};
 for(const brake of [false,true])for(const target of LANES){
  let cost=Math.abs(target-s.x)*.12+(target<0?.3:0)+(brake?.8:0);
  let x=s.x,vx=s.vx,speed=s.speed;
  for(let t=.1;t<=3.5;t+=.1){
   vx+=(Math.max(-1,Math.min(1,(target-x)*2-vx*.14))*12-vx)*(1-Math.exp(-1));x+=vx*.1;
   if(brake)speed+=(DRIVING.brakeSpeed-speed)*(1-Math.exp(-DRIVING.brakeResponse*.1));
   for(const e of s.entities){if(e.kind!=='traffic'||e.z< -10)continue;
    const z=e.z-relativeSpeed((s.speed+speed)/2,e)*t;
    const ex=e.change?.phase==='moving'?LANES[e.change.to]:e.x;
    const b=trafficBounds(e);
    if(Math.abs(z)<b.halfLength+4&&Math.abs(ex-x)<b.halfWidth+1.05)cost+=100*(4-t);
   }
  }
  if(cost<best.cost)best={cost,target,brake};
 }
 return {steer:Math.max(-1,Math.min(1,(best.target-s.x)*2-s.vx*.14)),brake:best.brake};
}
