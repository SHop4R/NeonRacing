import * as THREE from 'three';
import {VEHICLES,ONCOMING} from './tuning.js';
const geometry=new THREE.BoxGeometry(1,1,1),bikeWheel=new THREE.CylinderGeometry(.34,.34,.2,12),helmetGeometry=new THREE.SphereGeometry(.23,12,10);
export function createTrafficModel(type='sedan',color=0x2e7b8b){
 const bike=type==='motorcycle';
 if(bike)color=({[0x2e7b8b]:0x36dcca,[0xbb486c]:0xff786f,[0xc39152]:0xffc458,[0x5d558d]:0xa8a0ff})[color]??0x36dcca;
 const v=VEHICLES[type],root=new THREE.Group(),body=new THREE.Group(),wheels=new THREE.Group();root.add(body,wheels);
 const paint=new THREE.MeshStandardMaterial({color,roughness:.45,metalness:.2}),dark=new THREE.MeshStandardMaterial({color:0x070d16,roughness:.85}),glass=new THREE.MeshStandardMaterial({color:0x102f42,metalness:.6,roughness:.2});
 const light=new THREE.MeshBasicMaterial({color:new THREE.Color(0xc8e8ff).multiplyScalar(1.5)}),tail=new THREE.MeshBasicMaterial({color:0xff3048}),amber=new THREE.MeshBasicMaterial({color:new THREE.Color(0xffae26).multiplyScalar(2)});
 const box=(p,m,x,y,z,w,h,d)=>{const mesh=new THREE.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);p.add(mesh);return mesh;};
 const w=v.width,l=v.length,h=v.height;
 if(bike){
  const rider=new THREE.MeshStandardMaterial({color:0xffecd0,roughness:.7}),helmetMat=new THREE.MeshStandardMaterial({color:0x8edcff,roughness:.4});
  for(const z of [-l*.34,l*.34]){
   const wheel=new THREE.Mesh(bikeWheel,dark);wheel.rotation.z=Math.PI/2;wheel.position.set(0,.34,z);wheels.add(wheel);
   box(body,paint,0,.69,z,.31,.11,.62);
  }
  box(body,paint,0,.72,-.15,.6,.47,1.12);box(body,paint,0,.88,.68,.5,.18,.52);
  box(body,rider,0,1.15,.13,.48,.59,.4).rotation.x=-.18;
  for(const side of [-1,1]){
   box(body,rider,side*.25,.82,.15,.12,.5,.5).rotation.x=.3;
   box(body,rider,side*.23,1.12,-.24,.12,.15,.58).rotation.x=-.35;
  }
  const helmet=new THREE.Mesh(helmetGeometry,helmetMat);helmet.position.set(0,1.49,-.06);body.add(helmet);
  box(body,glass,0,1.5,-.257,.32,.12,.07);
  box(body,dark,0,1.03,-.61,w,.065,.12);box(body,paint,0,.95,-.84,.5,.36,.36);
  box(body,glass,0,1.19,-.73,.39,.26,.07);
 }else{
  box(wheels,dark,0,.3,0,w*.95,.35,l*.98);box(body,paint,0,.66,0,w,.58,l);
  if(type==='truck'){
   box(body,paint,0,1.4,-l*.33,w,1.65,l*.3);box(body,glass,0,1.68,-l*.483,w*.86,.65,.045);
   box(body,new THREE.MeshStandardMaterial({color:0x9eacb9,roughness:.8}),0,1.85,l*.14,w*.97,2.5,l*.66);
   for(const x of [-w*.35,w*.35])box(body,tail,x,2.94,l*.474,.13,.1,.04);
   box(body,dark,0,.75,-l*.501,w*.7,.3,.035);
  }else if(type==='van'){
   box(body,paint,0,1.5,.12,w*.97,1.65,l*.91);box(body,glass,0,1.63,-l*.46,w*.85,.74,.05);
   for(const x of [-w*.493,w*.493])box(body,glass,x,1.6,-l*.24,.04,.66,l*.24);
   box(body,dark,0,1.5,l*.48,.035,1.5,.04);
  }else if(type==='pickup'){
   box(body,glass,0,1.17,-l*.2,w*.87,.82,l*.4);box(body,paint,0,1.63,-l*.2,w*.9,.09,l*.42);
   box(body,dark,0,.98,l*.3,w*.82,.12,l*.34);
   for(const x of [-w*.46,w*.46])box(body,paint,x,1.08,l*.28,w*.08,.4,l*.4);
  }else{
   const hatch=type==='hatchback';box(body,glass,0,1.03,hatch?.15:0,w*.84,h*.55,l*(hatch?.62:.49));
   box(body,paint,0,h-.05,hatch?.15:.04,w*.8,.1,l*(hatch?.52:.35));
   box(body,paint,0,.94,l*.39,w*.96,.12,l*.19);
  }
  for(const x of [-w*.46,w*.46])for(const z of [-l*.31,l*.32])box(wheels,dark,x,.36,z,w*.12,.65,.76);
  if(type==='truck')for(const x of [-w*.46,w*.46])box(wheels,dark,x,.36,l*.18,w*.12,.65,.76);
 }
 const lightingY=type==='truck'?.95:type==='motorcycle'?.95:.75,lights=[];
 for(const x of type==='motorcycle'?[0]:[-w*.32,w*.32]){
  lights.push(box(body,light,x,lightingY,-l/2-.015,bike?.38:w*.22,.17,.035));
  box(body,tail,x,type==='van'?1.25:.74,l/2+.015,bike?.34:w*.18,type==='van'?.5:bike?.18:.14,.035);
 }
 const signals=[-1,1].map(side=>{const g=new THREE.Group();body.add(g);for(const end of [-1,1])box(g,amber,side*w*.43,lightingY,end*(l/2+.04),Math.max(.13,w*.15),.18,.06);box(g,amber,side*w*.51,lightingY,-l*.25,.04,.15,.35);g.visible=false;return g;});
 root.userData={paint,body,wheels,signals,headlightMaterial:light,tailMaterial:tail,lights,type,width:w,length:l};return root;
}
export function updateTrafficModel(m,e,signal,warning){
 const brake=e.brakeVisual??0;
 m.userData.body.rotation.x=-Math.atan(ONCOMING.brakeNoseDrop*2/m.userData.length)*brake;
 m.userData.body.position.y=brake?-.02*brake:0;
 m.userData.tailMaterial.color.set(0xff3048).multiplyScalar(1+brake*2.5);
 m.rotation.y=e.direction===-1?Math.PI:0;
 const dir=e.change?Math.sign(e.change.to-e.change.from):0,local=dir*(e.direction??1);
 m.userData.signals.forEach((lamp,i)=>lamp.visible=local===(i?1:-1)&&signal);
 m.userData.wheels.rotation.y=m.userData.body.rotation.y=e.change?.phase==='moving'?-local*.12:0;
 m.userData.headlightMaterial.color.set(0xc8e8ff).multiplyScalar(warning?7:m.userData.type==='motorcycle'?2.2:1.5);
 for(const lamp of m.userData.lights){lamp.scale.y=warning?.27:.17;}
}
