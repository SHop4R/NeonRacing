import {BARRIER} from './tuning.js';
export const barrierLimit=halfWidth=>BARRIER.center-BARRIER.width/2-halfWidth;
// Resolve against continuous rail planes, independent of recycled scenery/body pose.
export function resolveBarriers(s,oldX,proposedX,oldBounds,bounds){
 const limit=barrierLimit(bounds.halfWidth),oldLimit=barrierLimit(oldBounds.halfWidth);
 let impact=null;s.barrierScrape=0;
 for(let i=0;i<2;i++){
  const side=i===0?-1:1,c=s.barrierContacts[i],gap=limit-side*proposedX;
  if(gap>BARRIER.releaseDistance){c.touching=false;continue;}
  if(gap>1e-8)continue;
  const inwardSpeed=Math.max(0,side*s.vx);
  // Growth/respawn placement already touching a rail is resolution, not impact.
  const crossed=oldLimit-side*oldX>1e-8&&side*proposedX>=oldLimit-1e-8;
  if(!c.touching&&crossed&&inwardSpeed>=BARRIER.impactSpeed)impact={id:i,x:side*BARRIER.center};
  c.touching=true;
  if(inwardSpeed>0){s.barrierScrape=side;s.vx-=side*inwardSpeed;}
 }
 s.x=Math.max(-limit,Math.min(limit,proposedX));
 return impact;
}
