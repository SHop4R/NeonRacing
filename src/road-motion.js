import {EFFECTS} from './tuning.js';
export function advanceSign(z,travel,cameraZ){
  z+=travel;
  // The whole frame must be behind the camera before it is recycled.
  while(z>cameraZ+EFFECTS.signBehind)z-=EFFECTS.signSpacing*EFFECTS.signCount;
  return z;
}
