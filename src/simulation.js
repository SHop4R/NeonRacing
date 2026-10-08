import {resolveBarriers} from './barriers.js';
import {pickupSpawnDistance} from './pickup-visibility.js';
import {collisionBounds,playerCollisionBounds,stepCollisionAssist,nearMissWidth,sweptGap} from './collision-bounds.js';
import {brakingTarget} from './braking.js';
import {makePickup,canCollectPickup,pickupLane} from './pickups.js';
import {DRIVING,NITRO,DIFFICULTY,CRASH,difficultyAt,TRAFFIC,PICKUPS,ONCOMING,VEHICLES,COLLISION} from './tuning.js';
import {LANES,makeTraffic,stepTraffic,relativeSpeed,trafficBounds,encounterSafe} from './traffic.js';
import {chargeNitro,stopBoost,stepNitro,hasNitroBonus} from './nitro.js';
export {LANES};export {activateBoost,hasNitroBonus} from './nitro.js';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createGame(random=Math.random){return {random,mode:'ready',runId:0,respawnId:0,x:1.5,vx:0,
  speed:DRIVING.initialSpeed,distance:0,time:0,score:0,shield:100,nitro:0,nitroReserve:0,boost:0,boostMode:'off',bonusTime:0,boostScore:0,
  chargeDelay:0,boostWasHeld:false,boostLocked:false,nitroPress:false,crashTime:0,crashDirection:1,impactPosition:null,nitroGrace:0,collisionAssist:0,
  barrierContacts:[{touching:false},{touching:false}],barrierScrape:0,tutorialSafe:false,
  recovery:0,shieldFlash:0,combo:1,braking:false,deceleration:0,nextOrbTime:4,wave:0,
  laneChangeTimer:TRAFFIC.initialChangeDelay,oncoming:false,nextWaveDistance:0,nearMisses:0,pickups:0,spawnTimer:.1,nextId:1,entities:[],events:[]};}
export function startGame(s,keepTraffic=false){
  const retained=keepTraffic?{entities:s.entities,nextId:s.nextId,runId:s.runId,speed:s.speed}:{};
  const runId=s.runId+1;Object.assign(s,createGame(s.random),{mode:'running',runId},retained);
}
export function collectPickup(s,kind,pickup=null){
  s.pickups++;
  const position={x:pickup?.x??s.x,y:kind==='nitro'?1.7:1.35,z:pickup?.z??0};
  const scoreAmount=PICKUPS.score*Math.floor(s.combo);s.score+=scoreAmount;
  let amount=0,resource=kind;
  if(kind==='repair'){
    const before=s.shield;s.shield=Math.min(100,s.shield+25);amount=s.shield-before;
    if(before<100&&s.shield===100)s.events.push({type:'shield-full',text:'Shield Fully Restored'});
  }else if(kind==='nitro'){
    if(s.boostMode==='auto'&&s.boost>0){
      const before=s.nitroReserve??0;s.nitroReserve=1;amount=(1-before)*100;resource='reserve';
    }else{
      const before=s.nitro;chargeNitro(s,1);amount=(s.nitro-before)*100;
    }
  }else amount=scoreAmount;
  s.events.push({type:kind==='nitro'?'orb':kind,pickup:true,resource,amount,scoreAmount,position});
}

function spawn(s){
  const r=s.random,d=difficultyAt(s.distance),cars=s.entities.filter(e=>e.kind==='traffic');
  if(s.distance<s.nextWaveDistance)return;
  s.nextWaveDistance=s.distance+d.waveSpacing;s.wave++;s.spawnTimer=.05;
  // Independent per-direction encounters: density is governed by road distance,
  // not a fixed timer or the furthest surviving slow vehicle.
  const same=2+Math.floor(r()*2),opposite=Math.floor(r()*2);
  const lanes=[same,opposite];
  if(r()<d.density)lanes.push(r()<.6?5-same:1-opposite);
  for(const lane of lanes){
    if(s.entities.filter(e=>e.kind==='traffic').length>=DIFFICULTY.maxTraffic)break;
    const car=makeTraffic(s,lane,0,s.wave);
    const closing=relativeSpeed(s.speed,car),v=VEHICLES[car.vehicleType];
    car.z=Math.max(d.spawnDistance,closing*DIFFICULTY.minReactionSeconds);
    // Opposing vehicles need time for a complete signal and crossing too.
    if(car.direction<0)car.z=Math.max(car.z,closing*(TRAFFIC.warningSeconds+v.turnSeconds+1.1));
    if(cars.some(e=>Math.abs(e.x-car.x)<2.3&&Math.abs(e.z-car.z)<35+(e.length??4)/2+car.length/2))continue;
    if(!encounterSafe(s,car))continue;
    s.entities.push(car);cars.push(car);
  }
  const roll=r(),orbAllowed=s.time>=s.nextOrbTime&&!s.entities.some(e=>e.kind==='nitro');
  const kind=orbAllowed&&roll<NITRO.orbChance?'nitro':roll<.24?'repair':'energy';
  if(kind==='nitro')s.nextOrbTime=s.time+NITRO.orbCooldown;
  const pickupZ=pickupSpawnDistance(s.speed),free=Math.floor(r()*4),pickupX=LANES[free];
  if(s.entities.filter(e=>e.kind!=='traffic').length<PICKUPS.maxActive-2){
    s.entities.push(makePickup(s,kind,pickupX,pickupZ));
    if(kind==='energy')for(let n=1;n<3;n++)s.entities.push(makePickup(s,kind,pickupX,pickupZ+n*PICKUPS.spacing));
  }
}
function respawn(s){
  if(s.shield<=0){s.mode='over';s.events.push({type:'over'});return;}
  // The world stops advancing during impact; Z=0 remains the recorded road point.
  s.x=s.impactPosition?.x??s.x;s.vx=0;s.speed=CRASH.respawnSpeed;s.deceleration=0;s.recovery=CRASH.recoverySeconds;s.respawnId++;
  s.entities=s.entities.filter(e=>{
    if(e.kind!=='traffic')return true;
    const width=trafficBounds(e).halfWidth+COLLISION.playerWidth/2+.4;
    const overlaps=Math.abs(e.x-s.x)<width||(e.change&&Math.abs(LANES[e.change.to]-s.x)<width);
    const ahead=Math.max(CRASH.clearAhead,relativeSpeed(CRASH.respawnSpeed,e)*CRASH.recoverySeconds+10);
    return !overlaps||e.z>ahead||e.z< -CRASH.clearBehind;
  });
  s.events.push({type:'respawn',text:'Recovery Protection'});
}
function collision(s,e){
  e.contact=true;
  if(hasNitroBonus(s)||s.recovery>0){s.shieldFlash=.4;s.events.push({type:'shield-hit',text:'Impact Absorbed'});return;}
  if(s.crashTime>0)return;
  s.impactPosition={x:s.x,distance:s.distance,z:0};
  s.shield=Math.max(0,s.shield-CRASH.damage);s.combo=1;s.crashTime=CRASH.duration;
  s.crashDirection=Math.sign(s.x-e.x)||((e.id%2)?1:-1);s.vx=0;
  stopBoost(s);s.boostLocked=true;
  s.events.push({type:'hit',text:'CRASH',x:s.x,direction:s.crashDirection});
}
export function stepGame(s,input,dt){
  if(s.mode!=='running')return;dt=clamp(dt,0,.05);if(!dt)return;
  s.time+=dt;s.braking=Boolean(input.brake);s.recovery=Math.max(0,s.recovery-dt);s.shieldFlash=Math.max(0,s.shieldFlash-dt);
  const previousPlayerBounds=playerCollisionBounds(s);
  stepCollisionAssist(s,dt);const currentPlayerBounds=playerCollisionBounds(s);
  s.nitroGrace=Math.max(0,s.nitroGrace-dt);if(s.nitroGrace<1e-10)s.nitroGrace=0;
  const crashing=s.crashTime>0;
  stepNitro(s,input,dt);
  const cruise=difficultyAt(s.distance).speed;
  const target=crashing?CRASH.speed:s.braking?brakingTarget(s):s.boost?cruise*NITRO.speedMultiplier:cruise;
  const oldSpeed=s.speed;s.speed+=(target-s.speed)*(1-Math.exp(-dt*(crashing?7:s.braking?DRIVING.brakeResponse:DRIVING.acceleration)));
  if(crashing)s.speed=0;
  s.deceleration=Math.max(0,(oldSpeed-s.speed)/dt);
  const oldX=s.x;
  let barrierImpact=null;s.barrierScrape=0;
  if(!crashing){s.vx+=(clamp(input.steer||0,-1,1)*DRIVING.steeringSpeed-s.vx)*(1-Math.exp(-dt*DRIVING.steeringResponse));barrierImpact=resolveBarriers(s,oldX,s.x+s.vx*dt,previousPlayerBounds,currentPlayerBounds);}
  s.oncoming=s.x<0&&s.speed>0&&s.crashTime===0;
  s.distance+=s.speed*dt;s.score+=Math.max(0,s.speed)*dt*.45*Math.floor(s.combo)*(s.oncoming?ONCOMING.reward:1);if(!crashing)s.combo=Math.min(5,s.combo+dt*.055);
  if(barrierImpact&&!s.tutorialSafe&&s.nitroGrace===0)collision(s,barrierImpact);
  s.spawnTimer-=dt;if(s.spawnTimer<=0&&s.crashTime===0)spawn(s);
  stepTraffic(s,dt);
  // Skin forgiveness must not turn a visibly too-narrow two-car gap into a lane.
  const penetrating=s.entities.filter(e=>{
    if(e.kind!=='traffic')return false;const v=trafficBounds(e);
    return COLLISION.playerWidth/2+v.halfWidth-Math.abs(e.x-s.x)>COLLISION.pinchTolerance&&
      Math.abs(e.z-relativeSpeed(s.speed,e)*dt)<COLLISION.playerLength/2+v.halfLength;
  });
  const pinched=penetrating.some(e=>e.x<s.x)&&penetrating.some(e=>e.x>s.x)?new Set(penetrating.map(e=>e.id)):new Set();
  for(const e of s.entities){
    const oldZ=e.z;e.z-=relativeSpeed(s.speed,e)*dt;
    if(e.kind==='traffic'){
      const bounds=collisionBounds(e),visual=trafficBounds(e);
      const reachZ=currentPlayerBounds.halfLength+bounds.halfLength,reachX=currentPlayerBounds.halfWidth+bounds.halfWidth;
      const oldRelative=(e.oldX??e.x)-oldX,newRelative=e.x-s.x;
      let physicalGap=sweptGap(oldZ,e.z,oldRelative,newRelative,reachZ);
      const passZ=COLLISION.playerLength/2+visual.halfLength+COLLISION.nearLength;
      const proximity=sweptGap(oldZ,e.z,oldRelative,newRelative,passZ);
      if(Number.isFinite(proximity)){
        e.passEntrySide??=relativeSpeed(s.speed,e)>=0?1:-1;
        e.closestGap=Math.min(e.closestGap??Infinity,proximity);
        // Protected body overlaps cannot turn into points after protection expires.
        if((hasNitroBonus(s)||s.recovery>0||s.crashTime>0)&&proximity<COLLISION.playerWidth/2+visual.halfWidth)e.nearDisqualified=true;
      }
      // A growth-only contact retains its previous collider for this vehicle.
      // Actual inward movement against that retained boundary still causes damage.
      const growing=currentPlayerBounds.halfWidth>previousPlayerBounds.halfWidth||currentPlayerBounds.halfLength>previousPlayerBounds.halfLength;
      const previousGap=sweptGap(oldZ,e.z,oldRelative,newRelative,previousPlayerBounds.halfLength+bounds.halfLength);
      if(!e.expansionBounds&&growing&&physicalGap<reachX&&previousGap>=previousPlayerBounds.halfWidth+bounds.halfWidth)e.expansionBounds={...previousPlayerBounds};
      let contactWidth=reachX;
      if(e.expansionBounds){
        contactWidth=Math.min(currentPlayerBounds.halfWidth,e.expansionBounds.halfWidth)+bounds.halfWidth;
        physicalGap=sweptGap(oldZ,e.z,oldRelative,newRelative,Math.min(currentPlayerBounds.halfLength,e.expansionBounds.halfLength)+bounds.halfLength);
      }
      let contactLength=reachZ;
      if(pinched.has(e.id)){
        physicalGap=0;contactWidth=Math.max(contactWidth,COLLISION.playerWidth/2+visual.halfWidth-COLLISION.pinchTolerance);
        contactLength=Math.max(reachZ,COLLISION.playerLength/2+visual.halfLength);e.nearDisqualified=true;
      }
      if(physicalGap<contactWidth&&!e.contact&&s.crashTime===0){
        if(s.nitroGrace>0||e.graceContact){e.graceContact=true;e.graceWidth=Math.max(e.graceWidth??0,contactWidth);e.graceLength=Math.max(e.graceLength??0,contactLength);e.nearDisqualified=true;}
        else collision(s,e);
      }
      const separated=Math.abs(newRelative)>=Math.max(reachX,e.graceWidth??0)||Math.abs(e.z)>=Math.max(reachZ,e.graceLength??0);
      if(separated){e.graceContact=false;e.graceWidth=0;e.graceLength=0;e.expansionBounds=null;}

      const completed=e.passEntrySide>0?e.z< -passZ:e.passEntrySide<0?e.z>passZ:false;
      if(completed&&!e.passed){e.passed=true;if(!e.contact&&!e.nearDisqualified&&s.crashTime===0&&e.closestGap<nearMissWidth(e)){const points=200*Math.floor(s.combo);s.score+=points;s.nearMisses++;s.combo=Math.min(5,s.combo+.3);s.events.push({type:'near',amount:points,text:`NEAR MISS +${points}`,detail:'RISK REWARDED'});}}
    }else {
      e.age=(e.age??0)+dt;e.laneX??=pickupLane(e.x);
      if(e.z>PICKUPS.maxAhead){e.dead=true;continue;}
      if(s.crashTime>0)continue;
      const oldPickupX=e.x;
      if(hasNitroBonus(s)&&e.z<24&&e.z> -3&&Math.abs(e.x-s.x)<6)e.x+=(s.x-e.x)*(1-Math.exp(-dt*9));
      if(canCollectPickup(e,oldZ,e.z,oldX,s.x,hasNitroBonus(s),oldPickupX)){collectPickup(s,e.kind,e);e.dead=true;}
    }
  }
  // Oncoming traffic can spawn farther out at high speed and always approaches.
  s.entities=s.entities.filter(e=>e.z> -55&&(e.direction<0||e.z<1100)&&!e.dead);
  if(crashing){s.crashTime=Math.max(0,s.crashTime-dt);if(s.crashTime<1e-10){s.crashTime=0;respawn(s);}}
}
