import {DRIVING,CRASH} from './tuning.js';

// The root carries only road heading. Body pitch/roll cannot reach the glow.
export function updateVehiclePose(vehicle, state, dt, elapsed, reduced=false) {
  const body=vehicle.userData.body;
  if(vehicle.userData.respawnId!==state.respawnId){body.rotation.set(0,0,0);vehicle.userData.respawnId=state.respawnId;}
  vehicle.position.set(state.x,0,0);
  vehicle.rotation.set(0,-state.vx*.015,0);
  body.position.y=.025+(reduced?0:Math.sin(elapsed*12)*.007);
  const crash=state.crashTime>0?Math.sin((1-state.crashTime/CRASH.duration)*Math.PI):0;
  body.position.x=reduced?0:crash*state.crashDirection*.18;
  body.rotation.y=reduced?0:crash*state.crashDirection*CRASH.spin;
  body.rotation.z=reduced?0:-state.vx*.017+crash*state.crashDirection*.12;
  const targetPitch=reduced?0:-DRIVING.maxBrakePitch*Math.min(1,state.deceleration/45);
  body.rotation.x+=(targetPitch-body.rotation.x)*(1-Math.exp(-dt*DRIVING.pitchResponse));
  vehicle.userData.tail.color.setHex(vehicle.userData.tailColor??(state.braking?0xff356a:0xff2388)).multiplyScalar(state.braking?4.5:1.9);
}
export function cameraPose(aspect, forwardZ=0, viewportHeight=900) {
  // Wider portrait framing keeps both road edges visible with a fixed camera X.
  const distance=Math.max(11,(DRIVING.cameraRoadHalfWidth+1.6)/(Math.tan(29*Math.PI/180)*aspect));
  return {x:0,y:distance*.436,z:forwardZ+distance,targetX:0,targetY:.5,targetZ:forwardZ-(aspect<.8&&viewportHeight<680?5:20)};
}
export function applyCameraPose(camera, forwardZ=0, viewportHeight=900) {
  const pose=cameraPose(camera.aspect,forwardZ,viewportHeight);
  camera.position.set(pose.x,pose.y,pose.z);
  camera.lookAt(pose.targetX,pose.targetY,pose.targetZ);
}
