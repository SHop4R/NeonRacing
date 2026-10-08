import {TRAFFIC,DIFFICULTY,ONCOMING,VEHICLES,NITRO,COLLISION,difficultyAt} from './tuning.js';
export {VEHICLES};
export const LANES=[-4.5,-1.5,1.5,4.5];
export const directionForLane=lane=>lane<2?-1:1;
export const relativeSpeed=(playerSpeed,e)=>e.kind&&e.kind!=='traffic'?playerSpeed:playerSpeed-(e.direction??1)*e.speed;
export const trafficBounds=e=>{const yaw=e.change?.phase==='moving'?.12:0,w=(e.width??1.58)/2,l=(e.length??1.9)/2;return {halfWidth:w*Math.cos(yaw)+l*Math.sin(yaw),halfLength:l*Math.cos(yaw)+w*Math.sin(yaw)};};
const smooth=t=>t*t*(3-2*t);
// Reserve clearance throughout the warning and crossing, not only at decision time.
export function destinationClear(s,car,lane){
 const duration=TRAFFIC.warningSeconds+(VEHICLES[car.vehicleType]?.turnSeconds??TRAFFIC.changeSeconds);
 return !s.entities.some(other=>{
  if(other===car||other.kind!=='traffic'||(Math.abs(other.x-LANES[lane])>=2.2&&other.change?.to!==lane))return false;
  const gap=other.z-car.z,delta=((other.direction??1)*other.speed-(car.direction??1)*car.speed)*duration;
  const clearance=(trafficBounds(car).halfLength+trafficBounds(other).halfLength)+TRAFFIC.neighborGap;
  return Math.min(gap,gap+delta)<=clearance&&Math.max(gap,gap+delta)>=-clearance;
 });
}
export function signalOn(car){if(!car.change)return false;const elapsed=car.change.phase==='signal'?TRAFFIC.warningSeconds-car.change.time:TRAFFIC.warningSeconds+car.change.time;return (elapsed*TRAFFIC.signalHz)%1<TRAFFIC.signalDuty;}
export function headlightOn(car){const t=ONCOMING.warningSeconds-(car.warningTime??0);return car.warningActive&&car.warningTime>0&&((t<.18)||(t>.32&&t<.5));}
export function stepTraffic(s,dt){
 if(s.tutorialSafe){paceOpeningTraffic(s);return;}
 s.laneChangeTimer-=dt;
 const cars=s.entities.filter(e=>e.kind==='traffic');
 for(const car of cars){
  car.oldX=car.x;
  car.warningTime=Math.max(0,(car.warningTime??0)-dt);
  const closing=relativeSpeed(s.speed,car);
  const distance=Math.min(ONCOMING.maxWarningDistance,Math.max(ONCOMING.minWarningDistance,closing*ONCOMING.warningTtc));
  const width=trafficBounds(car).halfWidth+COLLISION.playerWidth/2;
  const margin=car.warningActive?ONCOMING.clearanceMargin:0;
  car.warningActive=car.direction===-1&&car.z>0&&car.z<distance+margin*40&&Math.abs(car.x-s.x)<width+margin;
  if(car.warningActive&&car.warningTime===0){
   car.warned=true;car.warningTime=ONCOMING.warningSeconds;s.events?.push({type:'horn',distance:car.z});
  }
  if(car.cruiseSpeed!==undefined){
   const dir=car.direction??1;
   const lead=cars.filter(e=>e!==car&&(e.direction??1)===dir&&(e.z-car.z)*dir>0&&(Math.abs(e.x-car.x)<2.3||e.change?.to===car.lane)).sort((a,b)=>(a.z-b.z)*dir)[0];
   let target=car.cruiseSpeed*(car.warningActive?ONCOMING.brakeSpeedRatio:1);
   if(car.launchTime>0){
    car.launchTime=Math.max(0,car.launchTime-dt);
    target+=(car.launchSpeed-target)*(1-smooth(1-car.launchTime/TRAFFIC.launchBlendSeconds));
    if(car.launchTime===0){delete car.launchTime;delete car.launchSpeed;}
   }
   const oldSpeed=car.speed;
   if(lead){const bumper=(lead.z-car.z)*dir-trafficBounds(lead).halfLength-trafficBounds(car).halfLength;
    target=Math.min(target,Math.max(0,lead.speed+(bumper-(8+car.speed*.45))*.65));}
   car.speed+=(target-car.speed)*(1-Math.exp(-dt*(target<car.speed?(car.warningActive?ONCOMING.brakeResponse:4):VEHICLES[car.vehicleType].acceleration)));
   const braking=car.speed<oldSpeed-.001;
   car.brakeVisual=(car.brakeVisual??0)+(Number(braking||car.warningActive)-(car.brakeVisual??0))*(1-Math.exp(-dt*8));
  }
  if(!car.change)continue;
  const c=car.change;
  if(c.phase==='signal'){
   const needed=Math.max(TRAFFIC.abortZ,closing*(c.time+c.duration+.6));
   if(car.z<needed||!destinationClear(s,car,c.to)){car.change=null;continue;}
   c.time-=dt;if(c.time<=0){c.phase='moving';c.time=0;}
  }else{
   c.time+=dt;car.x=LANES[c.from]+(LANES[c.to]-LANES[c.from])*smooth(Math.min(1,c.time/c.duration));
   if(c.time>=c.duration){car.lane=c.to;car.x=LANES[c.to];car.change=null;}
  }
 }
 if(s.laneChangeTimer>0||cars.some(e=>e.change)||s.crashTime>0)return;
 const d=difficultyAt(s.distance);
 s.laneChangeTimer=d.maneuverDelay*(.8+s.random()*.4);
 const candidates=cars.filter(e=>!e.contact&&e.lane!==undefined&&e.z>Math.max(TRAFFIC.minDecisionZ,relativeSpeed(s.speed,e)*(TRAFFIC.warningSeconds+(VEHICLES[e.vehicleType]?.turnSeconds??TRAFFIC.changeSeconds)+.8)));
 if(!candidates.length)return;
 const overtakers=candidates.filter(e=>e.vehicleType==='motorcycle'&&e.cruiseSpeed-e.speed>3&&destinationClear(s,e,e.lane%2===0?e.lane+1:e.lane-1));
 const car=overtakers[0]??candidates[Math.floor(s.random()*candidates.length)],type=VEHICLES[car.vehicleType];
 if(type&&s.random()>type.agility)return;
 const to=car.lane%2===0?car.lane+1:car.lane-1;
 if(!destinationClear(s,car,to))return;
 // Do not begin a maneuver alongside traffic occupying both opposing lanes.
 const row=cars.filter(e=>e!==car&&Math.abs(e.z-car.z)<TRAFFIC.neighborGap+12);
 if(new Set(row.filter(e=>(e.direction??1)!==(car.direction??1)).map(e=>e.lane)).size>=2)return;
 car.change={from:car.lane,to,phase:'signal',time:TRAFFIC.warningSeconds,duration:(type?.turnSeconds??TRAFFIC.changeSeconds)*(.95+s.random()*.1)};
}
export function makeTraffic(s,lane,z,wave,type){
 const types=['sedan','hatchback','pickup','van','motorcycle','truck'];
 type??=types[Math.floor(s.random()*types.length)];const v=VEHICLES[type];
 const speed=v.min+s.random()*(v.max-v.min);
 return {id:s.nextId++,kind:'traffic',wave,lane,x:LANES[lane],z,direction:directionForLane(lane),
 vehicleType:type,width:v.width,length:v.length,speed,cruiseSpeed:speed,color:Math.floor(s.random()*4),change:null,warningTime:0,warningActive:false,brakeVisual:0,warned:false};
}
export function seedOpeningTraffic(s){
 for(const [lane,z,type] of [[3,80,'van'],[2,140,'pickup']]){
  const car=makeTraffic(s,lane,z,0,type);
  car.z=Math.max(z,relativeSpeed(s.speed,car)*DIFFICULTY.minReactionSeconds+DIFFICULTY.carClearance);
  car.speed=car.launchSpeed=s.speed;car.launchTime=TRAFFIC.launchBlendSeconds;
  s.entities.push(car);
 }
}
export function paceOpeningTraffic(s){
 // Matching the moving road keeps the opening gaps stable through launch/practice.
 for(const car of s.entities)if(car.launchTime!==undefined)car.speed=car.launchSpeed=s.speed;
}
// Predict approach windows. An encounter must always leave a whole lane free
// for at least a full-width escape at the player's actual (or maximum boost) pace.
export function encounterSafe(s,candidate){
 const cars=[...s.entities.filter(e=>e.kind==='traffic'),candidate];
 for(const pace of [s.speed,DIFFICULTY.maxSpeed*NITRO.speedMultiplier]){
  const events=[];
  for(const e of cars){const closing=relativeSpeed(pace,e);if(closing<=0)continue;const t=e.z/closing;if(t<0||t>18)continue;
   const half=DIFFICULTY.escapeSeconds/2+(trafficBounds(e).halfLength+1.8)/closing;
   events.push({t:t-half,lane:e.lane,n:1},{t:t+half,lane:e.lane,n:-1});
   if(e.change)events.push({t:t-half,lane:e.change.to,n:1},{t:t+half,lane:e.change.to,n:-1});
  }
  const occupied=[0,0,0,0];for(const event of events.sort((a,b)=>a.t-b.t||b.n-a.n)){if(event.lane===undefined)continue;occupied[event.lane]+=event.n;if(occupied.every(n=>n>0))return false;}
 }
 return true;
}
