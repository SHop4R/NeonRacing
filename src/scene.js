import {createHeroCar} from './hero-car.js';
import {instanceBoxes,createVisualPool,sceneryVisibility,projectBounds} from './render-reuse.js';
import {createMenuCamera} from './menu-camera.js';
import {updatePickupVisibility,pickupTrafficOverlap,approachVisibility} from './pickup-visibility.js';
import {createTrafficModel,updateTrafficModel} from './traffic-model.js';
import {EFFECTS,ENVIRONMENT,BARRIER} from './tuning.js';
import {signalOn,headlightOn} from './traffic.js';
import {advanceBuilding} from './environment-motion.js';
import {createNitroShield,updateProtection} from './protection.js';
import {createDrivingEffects} from './scene-effects.js';
import {advanceSign} from './road-motion.js';
import {updateVehiclePose,applyCameraPose} from './vehicle-motion.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
const CYAN=0x43ffef, PINK=0xff2388;
const basic = (color, extra={}) => new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(color===CYAN||color===PINK?1.9:1),...extra});
const lit = (color, extra={}) => new THREE.MeshStandardMaterial({color,roughness:.32,metalness:.3,...extra});
const boxGeometry = new THREE.BoxGeometry(1,1,1);
function box(parent, material, x,y,z,w,h,d) {
  const mesh=new THREE.Mesh(boxGeometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;
}
let sharedGlow;
function glowTexture() {
  if(sharedGlow)return sharedGlow;
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');
  const gradient=ctx.createRadialGradient(32,32,3,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.4,'rgba(255,255,255,.5)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);sharedGlow=new THREE.CanvasTexture(c);return sharedGlow;
}
const pickupRing=new THREE.TorusGeometry(.56,.025,5,6),pickupCore=new THREE.OctahedronGeometry(.27),pickupShell=new THREE.OctahedronGeometry(.48);
function pickup(kind) {
  const g=new THREE.Group(), color=kind==='repair'?0xff62bc:kind==='nitro'?CYAN:0xffc35c;
  const glow=basic(color), center=basic(color,{transparent:true,opacity:.07});
  const ring=new THREE.Mesh(pickupRing,glow);g.add(ring);
  if(kind==='energy')g.add(new THREE.Mesh(pickupCore,glow));
  else if(kind==='repair'){box(g,glow,0,0,0,.52,.16,.1);box(g,glow,0,0,0,.16,.52,.1);}
  else {const bolt=box(g,glow,0,0,0,.14,.65,.12);bolt.rotation.z=-.35;box(g,glow,.09,0,0,.3,.1,.12);}
  g.add(new THREE.Mesh(pickupShell,center));
  return g;
}
function windowsTexture() {
  const c=document.createElement('canvas');c.width=128;c.height=256;const ctx=c.getContext('2d');
  ctx.fillStyle='#060b17';ctx.fillRect(0,0,128,256);
  let seed=7;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let y=5;y<256;y+=12)for(let x=5;x<128;x+=12){const r=random();ctx.fillStyle=r>.76?'#6989ad':r>.4?'#153143':'#091221';ctx.fillRect(x,y,3,6);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function createScene(canvas) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.info.autoReset=false;let renderMs=0;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x070917);scene.fog=new THREE.Fog(0x090e23,80,650);
  const camera=new THREE.PerspectiveCamera(58,1,.1,1200);
  const menuCamera=createMenuCamera(camera);
  const ambient=new THREE.HemisphereLight(0x6784d6,0x18263a,2.6);scene.add(ambient);
  const moon=new THREE.DirectionalLight(0xadbfff,3);moon.position.set(-12,25,12);scene.add(moon);
  const pinkLight=new THREE.DirectionalLight(PINK,.65);pinkLight.position.set(8,3,-10);scene.add(pinkLight);
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(800,600),.4,.4,1);composer.addPass(bloom);composer.addPass(new OutputPass());
  const sky=new THREE.Mesh(new THREE.SphereGeometry(1050,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{day:{value:0}},vertexShader:'varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v; uniform float day; void main(){float h=clamp(normalize(v).y*2.,0.,1.); vec3 night=mix(vec3(.035,.008,.063),vec3(.003,.006,.018),h);vec3 dawn=mix(vec3(.55,.22,.24),vec3(.045,.11,.24),h);gl_FragColor=vec4(mix(night,dawn,day),1.);}'}));scene.add(sky);
  const sun=new THREE.Mesh(new THREE.CircleGeometry(29,64),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{day:{value:0}},vertexShader:'varying vec2 uvv;void main(){uvv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 uvv;uniform float day;void main(){if(uvv.y<.52&&mod(uvv.y*30.,1.)<.27)discard;vec3 c=mix(vec3(1.,.09,.38),vec3(1.,.55,.24),uvv.y+day*.2);gl_FragColor=vec4(c,.7);}'}));sun.position.set(0,40,-320);scene.add(sun);
  // Matte continuous ground eliminates the exposed, glossy magenta-lit slab.
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(ENVIRONMENT.groundSize,ENVIRONMENT.groundSize),new THREE.MeshLambertMaterial({color:0x101722}));
  ground.rotation.x=-Math.PI/2;ground.position.set(0,ENVIRONMENT.groundY,-120);scene.add(ground);
  const roadMat=lit(0x09131f,{roughness:.28,metalness:.5});box(scene,roadMat,0,-.12,0,13,.2,1800);
  box(scene,new THREE.MeshLambertMaterial({color:0x0a1121}),0,-.35,0,19,.32,1800);
  const cyan=basic(CYAN), pink=basic(PINK), dim=basic(0x294e64), white=basic(0x90aabb);
  for(const side of [-1,1]) {
    box(scene,new THREE.MeshLambertMaterial({color:0x14273b}),side*BARRIER.center,.27,0,BARRIER.width,.52,1800);
    box(scene,cyan,side*(BARRIER.center+.02),.58,0,.085,.055,1800);
    box(scene,pink,side*6.32,.012,0,.035,.022,1800);
    box(scene,dim,side*6.62,.05,0,.18,.035,1800);
    const refl=new THREE.Mesh(new THREE.PlaneGeometry(.75,1800),basic(CYAN,{transparent:true,opacity:.055,depthWrite:false}));refl.rotation.x=-Math.PI/2;refl.position.set(side*6.1,.007,-120);scene.add(refl);
  }
  const marks=new THREE.Group();scene.add(marks);
  for(let z=-880;z<880;z+=7)for(const x of [-3,3])box(marks,white,x,.013,z,.045,.022,2.4);
  const divider=basic(0xffba50);for(const x of [-.13,.13])box(scene,divider,x,.018,0,.09,.025,1800);
  const arrows=new THREE.Group();scene.add(arrows);
  for(let z=-850;z<880;z+=70)for(const x of [-4.5,-1.5,1.5,4.5]){
    const direction=x<0?1:-1;box(arrows,dim,x,.019,z,.11,.025,3);
    for(const side of [-1,1]){const wing=box(arrows,dim,x+side*.38,.019,z+direction*.9,.1,.025,1.2);wing.rotation.y=-side*direction*.72;}
  }
  const edgePosts=new THREE.Group();scene.add(edgePosts);
  for(let z=-880;z<880;z+=6)for(const side of [-1,1])box(edgePosts,dim,side*BARRIER.center,.27,z,BARRIER.width,.55,.14);
  const lampPole=lit(0x102137),lampArm=lit(0x182d43);
  const lamps=new THREE.Group();scene.add(lamps);
  for(let z=-870;z<880;z+=26)for(const side of [-1,1]) {
    box(lamps,lampPole,side*7.8,4,z,.13,8,.13);
    box(lamps,lampArm,side*6.1,8,z,3.5,.14,.17);
    box(lamps,cyan,side*5.7,7.9,z,2.5,.055,.2);
    box(lamps,cyan,side*7.78,3.8,z+.08,.045,2.6,.03);
  }
  const city=new THREE.Group();scene.add(city);const tex=windowsTexture(),contactGeometry=new THREE.PlaneGeometry(1,1);
  const buildingMats=[0x52677d,0x796384,0x344f65].map(c=>new THREE.MeshStandardMaterial({color:c,map:tex,emissiveMap:tex,emissive:0x598da2,emissiveIntensity:.5,roughness:.8}));
  let seed=918;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<252;i++) {
    // Uniform rows fill the entire recycling span in each independent depth layer.
    const side=i%2?1:-1,layer=Math.floor(i/84),row=Math.floor(i%84/2);
    const x=side*([14,32,65][layer]+rand()*[12,25,28][layer]);
    const z=780-row*(ENVIRONMENT.citySpan/42)-rand()*12,h=8+rand()*60,w=4+rand()*9,d=5+rand()*10;
    const b=new THREE.Group();b.position.set(x,ENVIRONMENT.groundY,z);
    const contact=new THREE.Mesh(contactGeometry,basic(0x000000,{map:glowTexture(),transparent:true,opacity:.55,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.scale.set(w+3,d+3,1);contact.position.y=.008;b.add(contact);
    box(b,lit(0x0b1320,{roughness:1,metalness:0}),0,.12,0,w+.35,.24,d+.35);
    box(b,buildingMats[i%3],0,h/2,0,w,h,d);
    const accent=i%3===0?pink:cyan;
    if(i%3===0){box(b,accent,-w/2,h/2,d/2+.01,.04,h,.04);box(b,accent,0,h,d/2+.01,w,.06,.06);}
    if(i%7===0) {box(b,accent,0,h+2,0,.06,4,.06);box(b,basic(i%2?PINK:CYAN),0,h*.65,d/2+.02,w*.6,.3,.05);}
    b.userData={height:h,radius:Math.hypot(w,h,d)/2,details:b.children.filter((m,i)=>i!==2)};city.add(b);
  }
  for(const group of [marks,arrows,edgePosts,lamps])instanceBoxes(group);
  const updateScenery=sceneryVisibility(camera);
  const skyline=new THREE.Group();scene.add(skyline);const silhouetteMat=new THREE.MeshLambertMaterial({color:0x152033});
  for(let row=0;row<21;row++){
    const strip=new THREE.Group();strip.position.z=-800+row*80;skyline.add(strip);
    for(const side of [-1,1])for(let layer=0;layer<2;layer++){
      const height=38+rand()*85;box(strip,silhouetteMat,side*(140+layer*100+rand()*45),ENVIRONMENT.groundY+height/2,0,18+rand()*28,height,20+rand()*18);
    }
    instanceBoxes(strip);
  }
  const gantries=new THREE.Group();scene.add(gantries);
  for(let i=0;i<EFFECTS.signCount;i++) {
    const z=-55-i*EFFECTS.signSpacing;
    const frame=new THREE.Group();frame.position.z=z;
    for(const side of [-1,1]){box(frame,lit(0x27304a),side*7.2,4.4,0,.25,8.8,.3);box(frame,pink,side*7.02,4.4,.17,.04,8.8,.02);}
    box(frame,lit(0x242d41),0,8.65,0,14.7,.32,.5);box(frame,pink,0,8.43,.27,14,.045,.03);
    const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#081725';ctx.fillRect(0,0,512,96);ctx.strokeStyle='#457d8b';ctx.strokeRect(2,2,508,92);ctx.fillStyle='#97ffe9';ctx.font='bold 22px monospace';ctx.textAlign='center';ctx.fillText('都心環状  /  INNER LOOP',256,37);ctx.fillStyle='#b5cbd2';ctx.font='16px monospace';ctx.fillText('↓     SHUTO EXPRESSWAY     ↓',256,70);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(5.4,1),basic(0xffffff,{map:t}));sign.position.set(0,7.72,.3);frame.add(sign);gantries.add(frame);
  }
  const player=createHeroCar(glowTexture());scene.add(player);
  const playerLight=new THREE.PointLight(0x76dfff,22,12,2);playerLight.position.set(0,3,3);scene.add(playerLight);
  const aura=createNitroShield();scene.add(aura);
  const effects=createDrivingEffects(scene,player);
  const types=['truck','pickup','motorcycle','van','hatchback','sedan'];
  const limits=Object.fromEntries([...types.map(t=>[`traffic-${t}`,48]),['energy',40],['nitro',40],['repair',40]]);
  const pool=createVisualPool(key=>key.startsWith('traffic-')?createTrafficModel(key.slice(8)):pickup(key),limits),active=new Map();
  for(const type of types)pool.prewarm(`traffic-${type}`,4);
  for(const kind of ['energy','nitro','repair'])pool.prewarm(kind,kind==='energy'?12:4);
  const colors=[0x2e7b8b,0xbb486c,0xc39152,0x5d558d];
  const streaks=new THREE.Group();scene.add(streaks);for(let i=0;i<EFFECTS.streakCount;i++){const p=box(streaks,basic(i%2?CYAN:PINK,{transparent:true,opacity:.55}), (i%2?1:-1)*(7+rand()*12),rand()*7, -rand()*130,.018,.018,5+rand()*10);p.userData.offset=rand()*150;}
  let lastElapsed=0, visualDistance=0,lastDistance=0,lastIntroDistance=0,lastRun=-1;
  const fogNight=new THREE.Color(0x101126),fogDay=new THREE.Color(0x61475c);
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.userData.viewportHeight=h;camera.updateProjectionMatrix();}
  resize();
  function render(s,elapsed) {
    const dt=Math.min(.05,Math.max(0,elapsed-lastElapsed));lastElapsed=elapsed;
    const moving=s.mode==='running'||s.mode==='ready'||s.mode==='intro';
    const motionTime=s.mode==='ready'?elapsed:s.time;
    const travel=s.mode==='intro'?Math.max(0,s.introDistance-lastIntroDistance):s.mode==='running'?Math.max(0,s.distance-(s.runId===lastRun?lastDistance:0)):0;
    lastIntroDistance=s.mode==='intro'?s.introDistance:0;
    lastDistance=s.distance;
    if(lastRun!==s.runId){for(const item of active.values()){pool.release(item.poolKey,item.mesh);}active.clear();lastRun=s.runId;}
    visualDistance+=travel;
    const d=visualDistance;for(const strip of skyline.children)strip.position.z=advanceBuilding(strip.position.z,travel,160,camera.position.z);
    marks.position.z=d%7;arrows.position.z=d%70;edgePosts.position.z=d%6;lamps.position.z=d%26;
    for(const frame of gantries.children)frame.position.z=advanceSign(frame.position.z,travel,camera.position.z);
    for(const b of city.children)b.position.z=advanceBuilding(b.position.z,travel,b.position.x,camera.position.z);
    const day=(1-Math.cos(s.time/90*Math.PI*2))*.5;
    sky.material.uniforms.day.value=day;sun.material.uniforms.day.value=day;scene.fog.color.copy(fogNight).lerp(fogDay,day);
    ambient.intensity=2.6+day*1.8;moon.intensity=3+day*1.7;
    const boosting=s.boost>0;
    playerLight.position.x=s.x;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    updateVehiclePose(player,s,moving?dt:0,motionTime,reduced);
    if(s.mode==='ready'){player.userData.body.position.y=.025;player.userData.body.rotation.set(0,0,0);}
    const ignition=s.mode==='intro'?s.introElapsed:0;
    if(s.mode==='intro'&&!reduced){const catchMotor=Math.max(0,1-Math.abs(ignition-(s.introQuick?.21:.54))/.18);player.userData.body.rotation.z=Math.sin(ignition*85)*.018*catchMotor;}
    const lightDip=s.mode==='intro'&&ignition>(s.introQuick?.14:.42)&&ignition<(s.introQuick?.21:.55)&&!reduced?.35:1;
    player.userData.tail.color.multiplyScalar(lightDip);player.userData.edge.color.setHex(player.userData.headlightColor??CYAN).multiplyScalar(1.9*lightDip);
    player.visible=true;
    updateProtection(aura,player,s,reduced);
    const power=effects.update(s,moving?dt:0,travel,motionTime,Math.min(1.5,Math.max(1,1/camera.aspect)));
    const ids=new Set(s.entities.map(e=>e.id));
    for(const [id,item] of active)if(!ids.has(id)){pool.release(item.poolKey,item.mesh);active.delete(id);}
    for(const e of s.entities){
      let item=active.get(e.id);
      if(!item){const poolKey=e.kind==='traffic'?`traffic-${e.vehicleType??'sedan'}`:e.kind;
        const mesh=pool.acquire(poolKey);
        mesh.userData.trafficFade=1;if(e.kind==='traffic'){const color=colors[e.color||0];mesh.userData.paint.color.setHex(e.vehicleType==='motorcycle'?([0x36dcca,0xff786f,0xffc458,0xa8a0ff][e.color||0]):color);}item={mesh,kind:e.kind,poolKey};active.set(e.id,item);scene.add(mesh);}
      const m=item.mesh;m.position.set(e.x,e.kind==='traffic'?0:(e.kind==='nitro'?1.7:1.35)+Math.sin(motionTime*3+e.id)*.14,-e.z);
      if(e.kind==='traffic')updateTrafficModel(m,e,signalOn(e),headlightOn(e));
      else{m.rotation.y=motionTime*1.5;m.rotation.z=Math.sin(motionTime+e.id)*.12;}
    }
    for(const p of streaks.children){p.visible=power>.01;p.material.opacity=power*.6;p.position.z=20-((p.userData.offset-d*1.8)%150+150)%150;}
    const targetFov=!reduced?58+(EFFECTS.boostFov-58)*power:58;camera.fov+=(targetFov-camera.fov)*(moving?dt:0)*4;camera.updateProjectionMatrix();
    // Moving-world simulation keeps the player at Z=0; no lateral target or shake.
    applyCameraPose(camera,player.position.z,camera.userData.viewportHeight);
    menuCamera.update(s,elapsed,reduced);
    camera.updateMatrixWorld();
    for(const b of city.children)updateScenery(b);
    const projectBox=(x,y,z,w,h,l)=>projectBounds(camera,x,y,z,w,h,l);
    const trafficRects=s.entities.filter(e=>e.kind==='traffic'&&e.z>1).map(e=>projectBox(e.x,0,-e.z,(e.width??1.8)+.35,e.vehicleType==='truck'?3.6:e.vehicleType==='motorcycle'?1.8:2.2,e.length??4.4));
    for(const e of s.entities){if(e.kind==='traffic')continue;const m=active.get(e.id).mesh;
      const rect=projectBox(m.position.x,m.position.y-.7,m.position.z,1.5,1.5,.5);
      const blocked=e.z>1&&pickupTrafficOverlap(rect,trafficRects);
      m.userData.trafficFade=approachVisibility(m.userData.trafficFade,blocked,moving?dt:0);
      updatePickupVisibility(m,e.z,m.userData.trafficFade);
    }
    renderer.info.reset();const renderStart=performance.now();composer.render();renderMs+=(performance.now()-renderStart-renderMs)*.05;
    return day;
  }
  function dispose(){
    const geometries=new Set(),materials=new Set();const collect=root=>root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
    collect(scene);pool.each(collect);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());tex.dispose();composer.dispose();renderer.dispose();
  }
  return {beginIntro:()=>menuCamera.begin(),pickupScreen:position=>{const p=new THREE.Vector3(position.x,position.y,-position.z).project(camera);return {x:(p.x+1)*canvas.clientWidth/2,y:(1-p.y)*canvas.clientHeight/2};},playerScreen:()=>{const p=new THREE.Vector3(player.position.x,1.35,player.position.z).project(camera);return {x:(p.x+1)*canvas.clientWidth/2,y:(1-p.y)*canvas.clientHeight/2};},render,resize,dispose,handleEvent:effects.handleEvent,inspect:()=>({
    camera:camera.position.toArray(),direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),
    body:player.userData.body.rotation.toArray().slice(0,3),glowY:player.userData.glow.getWorldPosition(new THREE.Vector3()).y,
    shield:{warning:aura.material.uniforms.warning.value,pulse:aura.material.uniforms.pulse.value,visible:aura.visible,scale:aura.scale.toArray(),position:aura.position.toArray(),radius:EFFECTS.shieldRadius},bodyVisible:player.userData.body.visible,groundY:ground.position.y,buildingBases:city.children.map(b=>b.position.y),signals:[...active.values()].filter(i=>i.kind==='traffic').map(i=>i.mesh.userData.signals.map(m=>m.visible)),
    pickupVisibility:[...active.entries()].filter(([,i])=>i.kind!=='traffic').map(([id,i])=>({id,z:-i.mesh.position.z,fade:i.mesh.userData.pickupFade,trafficFade:i.mesh.userData.trafficFade,visible:i.mesh.visible})),
    pool:pool.inspect(),visibleBuildings:city.children.filter(b=>b.visible).length,renderMs,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,signs:gantries.children.map(g=>g.position.z),drawCalls:renderer.info.render.calls,...effects.inspect()
  })};
}
