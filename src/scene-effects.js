import * as THREE from 'three';
import {EFFECTS} from './tuning.js';
// Moving-world ribbons retain their own world samples, never inheriting body roll.
export function createDrivingEffects(scene,player){
  let intensity=0,lastRun=-1,lastRespawn=-1,burst=0;
  const histories=[[],[]],samples=[Array.from({length:EFFECTS.trailSamples},()=>({})),Array.from({length:EFFECTS.trailSamples},()=>({}))],ribbons=[],flames=[];
  for(let side=0;side<2;side++){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((EFFECTS.trailSamples-1)*18),3));
    geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array((EFFECTS.trailSamples-1)*18),3));
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
    mesh.frustumCulled=false;scene.add(mesh);ribbons.push(mesh);
  }
  for(const anchor of player.userData.exhaustAnchors??[[-.54,.28,1.7],[.54,.28,1.7]]){
    for(let inner=0;inner<2;inner++){
      const flame=new THREE.Mesh(new THREE.ConeGeometry(inner?.085:.15,1,7),new THREE.MeshBasicMaterial({color:inner?0xcaffff:0xff8833,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
      flame.rotation.x=Math.PI/2;flame.position.set(...anchor);flame.userData.outletZ=anchor[2];player.userData.body.add(flame);flames.push(flame);
    }
  }
  const particles=new THREE.InstancedMesh(new THREE.BoxGeometry(.11,.11,.24),new THREE.MeshBasicMaterial({color:0xffffff}),EFFECTS.particleCount);
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);particles.frustumCulled=false;scene.add(particles);
  const bits=[],freeBits=Array.from({length:EFFECTS.particleCount},()=>({})),dummy=new THREE.Object3D(),color=new THREE.Color(),point=new THREE.Vector3();
  function emit(x,y,z,vx,vy,vz,life,shield){const p=freeBits.pop()??bits.shift();p.x=x;p.y=y;p.z=z;p.vx=vx;p.vy=vy;p.vz=vz;p.life=life;p.shield=shield;bits.push(p);}
  function clear(){histories.forEach((h,i)=>{samples[i].push(...h);h.length=0;});ribbons.forEach(r=>r.geometry.setDrawRange(0,0));}
  function handleEvent(event,s){
    if(event.type==='boost'&&s.boostMode==='auto')burst=EFFECTS.fullBurstSeconds;
    if(event.type==='hit'||event.type==='shield-hit'){
      if(event.type==='hit')clear();
      const shield=event.type==='shield-hit';
      for(let i=0;i<(shield?28:60);i++){
        emit(s.x,.5,-.8,(Math.random()-.5)*12,2+Math.random()*6,(Math.random()-.5)*9,.45+Math.random()*.4,shield);
      }
    }
    if(event.type==='respawn')clear();
  }
  let scrapeTime=0;
  function update(s,dt,travel,elapsed,scale=1){
    if(s.mode==='running'&&s.barrierScrape&&s.crashTime===0&&s.nitroGrace===0&&!s.tutorialSafe){
      scrapeTime+=dt;
      if(scrapeTime>=.12){scrapeTime%=.12;if(bits.length<EFFECTS.particleCount)emit(s.x+s.barrierScrape*.72,.3,0,-s.barrierScrape*.6,.8,2,.22,false);}
    }else scrapeTime=0;
    if(s.runId!==lastRun){clear();freeBits.push(...bits);bits.length=0;intensity=0;burst=0;lastRun=s.runId;}
    if(s.respawnId!==lastRespawn){clear();lastRespawn=s.respawnId;}
    burst=Math.max(0,burst-dt);
    const target=s.boost>0?(s.boostMode==='auto'?EFFECTS.fullIntensity:EFFECTS.normalIntensity):0;intensity+=(target-intensity)*(1-Math.exp(-dt*(target?EFFECTS.blendIn:EFFECTS.blendOut)));
    const surge=s.boostMode==='auto'?burst/EFFECTS.fullBurstSeconds*EFFECTS.fullBurstGain:0;
    const power=intensity+surge;
    player.updateWorldMatrix(true,true);
    histories.forEach((history,side)=>{
      for(const p of history){p.z+=travel;p.age+=dt;}
      while(history.length&&(history[0].age>EFFECTS.trailLife||(dt>0&&history.length>=EFFECTS.trailSamples)))samples[side].push(history.shift());
      if(dt>0&&intensity>.03&&s.crashTime===0){point.set(...(player.userData.trailAnchors?.[side]??[side?.54:-.54,.6,1.68]));player.userData.body.localToWorld(point);const p=samples[side].pop();p.x=point.x;p.y=point.y;p.z=point.z;p.age=0;p.power=power;history.push(p);}
      const ribbon=ribbons[side],positions=ribbon.geometry.attributes.position,colors=ribbon.geometry.attributes.color;
      let n=0;const width=EFFECTS.trailWidth*scale*(.65+power*.65);
      for(let i=1;i<history.length;i++){
        const a=history[i-1],b=history[i];
        for(let vertex=0;vertex<6;vertex++){const p=vertex===0||vertex===1||vertex===4?a:b,offset=vertex===1||vertex===4||vertex===5?1:-1;
          positions.setXYZ(n,p.x+offset*width,p.y,p.z);
          const power=(1-p.age/EFFECTS.trailLife)*p.power;
          colors.setXYZ(n,2*power,.05*power,.65*power);n++;
        }
      }
      positions.needsUpdate=true;colors.needsUpdate=true;ribbon.geometry.setDrawRange(0,n);
    });
    flames.forEach((f,i)=>{const inner=i%2;const length=(inner?1:1.65)*power*(.85+.15*Math.sin(elapsed*43+i))*scale;f.scale.set(scale*(.75+power*.35),length,scale*(.75+power*.35));f.position.z=f.userData.outletZ+length/2;f.material.opacity=Math.min(1,power)*(inner?.95:.72);f.visible=intensity>.01;});
    for(let i=bits.length-1;i>=0;i--){const p=bits[i];p.life-=dt;if(p.life<=0){freeBits.push(p);bits.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt+travel*EFFECTS.particleAdvection;p.vy-=14*dt;if(p.y<.06){p.y=.06;p.vy=Math.abs(p.vy)*.3;}}
    bits.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.life*8,p.life*5,0);dummy.scale.setScalar(Math.min(1,p.life*4));dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);particles.setColorAt(i,color.setHex(p.shield?0x79fff4:i%3?0xffbb55:0xff477e).multiplyScalar(2));});
    particles.count=bits.length;particles.instanceMatrix.needsUpdate=true;if(particles.instanceColor)particles.instanceColor.needsUpdate=true;
    return power;
  }
  return {update,handleEvent,inspect:()=>({particleCapacity:freeBits.length+bits.length,trailCapacity:samples.map((p,i)=>p.length+histories[i].length),intensity,burst,particles:bits.length,trailSamples:histories.map(h=>h.length),trailExtent:histories.map(h=>h.length?Math.max(...h.map(p=>p.z))-Math.min(...h.map(p=>p.z)):0)})};
}
