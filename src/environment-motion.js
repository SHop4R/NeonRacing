import {ENVIRONMENT} from './tuning.js';
export function buildingParallax(x){return Math.abs(x)<28?ENVIRONMENT.nearSpeed:Math.abs(x)<60?ENVIRONMENT.midSpeed:ENVIRONMENT.farSpeed;}
export function advanceBuilding(z,travel,x,cameraZ){z+=travel*buildingParallax(x);while(z>cameraZ+ENVIRONMENT.recycleBehind)z-=ENVIRONMENT.citySpan;return z;}
