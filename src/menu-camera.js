import * as THREE from 'three';
import {applyCameraPose} from './vehicle-motion.js';
// Slow discrete compositions joined with smooth holds; all shots remain above road.
const shots=[ [5,2.4,6],[-4,1.5,-5],[3,1.15,-3.8],[-4,2.1,5],[2.8,.85,2.8] ];
export function menuCameraPose(time,reduced=false,aspect=1){
 const phase=reduced?0:time/7,index=Math.floor(phase)%shots.length,t=phase%1;
 const blend=Math.max(0,Math.min(1,(t-.35)/.65)),ease=blend*blend*(3-2*blend);
 const a=shots[index],b=shots[(index+1)%shots.length];
 // Spherical interpolation maintains a safe radius between opposing angles.
 const ra=Math.hypot(a[0],a[2]),rb=Math.hypot(b[0],b[2]);let angleA=Math.atan2(a[0],a[2]),delta=Math.atan2(b[0],b[2])-angleA;
 delta=Math.atan2(Math.sin(delta),Math.cos(delta));const angle=angleA+delta*ease,r=(ra+(rb-ra)*ease)*(aspect<.8?1.3:1);
 return {position:[Math.sin(angle)*r,a[1]+(b[1]-a[1])*ease,Math.cos(angle)*r],target:[0,.6,0]};
}
export function createMenuCamera(camera){
 let startPosition,startRotation;
 return {
  begin(){startPosition=camera.position.clone();startRotation=camera.quaternion.clone();},
  update(s,time,reduced){
   if(s.mode==='ready'){
    const pose=menuCameraPose(time,reduced,camera.aspect);camera.position.set(s.x+pose.position[0],pose.position[1],pose.position[2]);camera.lookAt(s.x,.6,0);return;
   }
   if(s.mode==='intro'&&reduced){applyCameraPose(camera,0,camera.userData.viewportHeight);return;}
   if(s.mode==='intro'&&startPosition){
    const p=Math.max(0,Math.min(1,s.introProgress)),e=p*p*(3-2*p),target=camera.clone();applyCameraPose(target,0,camera.userData.viewportHeight);
    // Lift the middle of the pullback above the car when starting from its front.
    camera.position.lerpVectors(startPosition,target.position,e);camera.position.y+=Math.sin(Math.PI*e)*3;
    camera.quaternion.slerpQuaternions(startRotation,target.quaternion,e);
   }
  }
 };
}
