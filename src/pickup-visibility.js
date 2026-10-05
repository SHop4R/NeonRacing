import {PICKUPS,DIFFICULTY,NITRO} from './tuning.js';
export const pickupSpawnDistance=speed=>Math.max(PICKUPS.spawnDistance,PICKUPS.fadeFar+Math.max(speed,DIFFICULTY.maxSpeed*NITRO.speedMultiplier)*PICKUPS.spawnLeadSeconds);
export function pickupOpacity(z){const t=Math.max(0,Math.min(1,(PICKUPS.fadeFar-z)/(PICKUPS.fadeFar-PICKUPS.fadeNear)));return t*t*(3-2*t);}
export function updatePickupVisibility(mesh,z,trafficFade=1){
 const fade=pickupOpacity(z);mesh.visible=fade>0;mesh.userData.pickupFade=fade;
 mesh.traverse(o=>{if(!o.material)return;for(const material of Array.isArray(o.material)?o.material:[o.material]){
  material.userData.pickupBaseOpacity??=material.opacity;
  if(!material.transparent){material.transparent=true;material.depthWrite=false;material.needsUpdate=true;}
  material.opacity=material.userData.pickupBaseOpacity*fade*trafficFade;
 }});
}

// Screen rectangles, rather than lane identity, also cover changing lanes and magnet motion.
export function pickupTrafficOverlap(orb,traffic){
 return traffic.some(t=>t.depth>orb.depth-.8&&orb.right>=t.left&&orb.left<=t.right&&orb.bottom>=t.top&&orb.top<=t.bottom);
}
export function approachVisibility(current,blocked,dt){
 const target=blocked?.12:1;
 return current+(target-current)*(1-Math.exp(-Math.max(0,dt)*(blocked?18:5)));
}
