import * as THREE from 'three';
// Spatial batches retain frustum culling instead of one giant always-visible batch.
export function instanceBoxes(group,span=130){
 const batches=new Map();group.updateMatrixWorld(true);
 for(const m of [...group.children]){if(!m.isMesh)continue;const key=`${m.geometry.uuid}/${m.material.uuid}/${Math.floor(m.position.z/span)}`;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(m);group.remove(m);}
 for(const list of batches.values()){const mesh=new THREE.InstancedMesh(list[0].geometry,list[0].material,list.length);list.forEach((m,i)=>{m.updateMatrix();mesh.setMatrixAt(i,m.matrix);});mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);}
}
export function createVisualPool(factory,limits){
 const idle=new Map(),counts=new Map();let created=0,reused=0;
 function acquire(key){const list=idle.get(key)??[];idle.set(key,list);if(list.length){reused++;return list.pop();}if((counts.get(key)??0)>=limits[key])throw new Error(`Visual pool capacity exceeded: ${key}`);counts.set(key,(counts.get(key)??0)+1);created++;return factory(key);}
 function release(key,mesh){mesh.removeFromParent();mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.set(1,1,1);mesh.visible=true;mesh.userData.trafficFade=1;mesh.userData.body?.rotation.set(0,0,0);mesh.userData.body?.position.set(0,0,0);mesh.userData.body?.scale.set(1,1,1);mesh.userData.headlightMaterial?.color.setHex(0xc8e8ff).multiplyScalar(mesh.userData.type==='motorcycle'?2.2:1.5);mesh.userData.lights?.forEach(m=>m.scale.y=.17);mesh.traverse(o=>{if(o.material?.userData.pickupBaseOpacity!==undefined)o.material.opacity=o.material.userData.pickupBaseOpacity;});mesh.userData.pickupFade=1;mesh.userData.signals?.forEach(s=>s.visible=false);(idle.get(key)??idle.set(key,[]).get(key)).push(mesh);}
 return {acquire,release,prewarm(key,n){const items=Array.from({length:n},()=>acquire(key));items.forEach(m=>release(key,m));},inspect:()=>({created,reused,idle:[...idle.values()].reduce((n,a)=>n+a.length,0)}),each(fn){for(const list of idle.values())list.forEach(fn);}};
}
export function sceneryVisibility(camera){
 const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),sphere=new THREE.Sphere();
 return (group)=>{sphere.center.copy(group.position);sphere.center.y+=group.userData.height/2;sphere.radius=group.userData.radius+18;
  matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);
  group.visible=sphere.center.distanceTo(camera.position)<720+sphere.radius&&frustum.intersectsSphere(sphere);
  const detailed=sphere.center.distanceTo(camera.position)<450;group.userData.details.forEach(m=>m.visible=detailed);
 };
}
const projectedPoint=new THREE.Vector3();
export function projectBounds(camera,x,y,z,w,h,l){
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(let i=0;i<8;i++){projectedPoint.set(x+(i&1?w/2:-w/2),y+(i&2?h:0),z+(i&4?l/2:-l/2)).project(camera);left=Math.min(left,projectedPoint.x);right=Math.max(right,projectedPoint.x);top=Math.min(top,projectedPoint.y);bottom=Math.max(bottom,projectedPoint.y);}
 return {left,right,top,bottom,depth:-z};
}
