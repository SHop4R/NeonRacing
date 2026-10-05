import {COLLISION} from './tuning.js';
export const playerBounds={halfWidth:COLLISION.playerWidth*COLLISION.playerWidthScale*COLLISION.playerExtraWidth/2,halfLength:COLLISION.playerLength*COLLISION.playerLengthScale*COLLISION.playerExtraLength/2};
export function playerCollisionBounds(s){
 const amount=Math.max(0,Math.min(1,s.collisionAssist??0));
 return {halfWidth:Math.max(COLLISION.playerWidth*COLLISION.minPlayerWidthScale/2,playerBounds.halfWidth*(1-COLLISION.lowHealthWidth*amount)),
 halfLength:Math.max(COLLISION.playerLength*COLLISION.minPlayerLengthScale/2,playerBounds.halfLength*(1-COLLISION.lowHealthLength*amount))};
}
export function stepCollisionAssist(s,dt){
 const target=Math.max(0,Math.min(1,(COLLISION.lowHealthThreshold-s.shield)/COLLISION.lowHealthThreshold));
 const response=target>(s.collisionAssist??0)?COLLISION.assistInResponse:COLLISION.assistOutResponse;
 s.collisionAssist=(s.collisionAssist??0)+(target-(s.collisionAssist??0))*(1-Math.exp(-response*dt));
}
function bounds(e,extra){
 const [widthScale,lengthScale]=COLLISION.classes[e.vehicleType]??[.88,.96];
 const [extraWidth,extraLength]=extra?(COLLISION.extra[e.vehicleType]??[.94,.99]):[1,1];
 const w=(e.width??1.58)*widthScale*extraWidth/2,l=(e.length??1.9)*lengthScale*extraLength/2,yaw=e.change?.phase==='moving'?.12:0;
 return {halfWidth:w*Math.cos(yaw)+l*Math.sin(yaw),halfLength:l*Math.cos(yaw)+w*Math.sin(yaw)};
}
export const collisionBounds=e=>bounds(e,true);
// Keep the pre-assist proximity envelope unchanged by collider or health tuning.
export const nearMissWidth=e=>COLLISION.playerWidth*COLLISION.playerWidthScale/2+bounds(e,false).halfWidth+COLLISION.nearWidth;
// Minimum lateral separation only while the two longitudinal envelopes overlap.
export function sweptGap(oldZ,newZ,oldRelative,newRelative,reach){
 const dz=newZ-oldZ;let enter=0,leave=1;
 if(Math.abs(dz)<1e-10){if(Math.abs(oldZ)>reach)return Infinity;}
 else{const a=(-reach-oldZ)/dz,b=(reach-oldZ)/dz;enter=Math.max(0,Math.min(a,b));leave=Math.min(1,Math.max(a,b));if(enter>leave)return Infinity;}
 const a=oldRelative+(newRelative-oldRelative)*enter,b=oldRelative+(newRelative-oldRelative)*leave;
 return a*b<=0?0:Math.min(Math.abs(a),Math.abs(b));
}
