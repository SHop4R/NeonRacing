// Meters and seconds. Keep gameplay and visual budgets together for tuning.
export const DRIVING=Object.freeze({initialSpeed:140/3.6,brakeSpeed:55/3.6,followGap:16,followResponse:.8,minFollowSpeed:0,acceleration:2.6,brakeResponse:7,
  steeringSpeed:12,steeringResponse:10,cameraRoadHalfWidth:5.45,maxBrakePitch:.055,pitchResponse:8});
export const NITRO=Object.freeze({refillSeconds:30,drainSeconds:10,rechargeDelay:.75,
  autoSeconds:7,bonusSeconds:7,scorePerSecond:25,overdriveScorePerSecond:75,expiryGrace:.3,speedMultiplier:1.42,orbChance:.14,orbCooldown:12});
export const DIFFICULTY=Object.freeze({rampDistance:8000,maxSpeed:400/3.6,trafficSpeed:24,
  initialDensity:.45,maxDensity:.92,initialSpacing:150,finalSpacing:65,
  minReactionSeconds:3.2,minSpawnDistance:320,escapeSeconds:1.1,carClearance:8,maxTraffic:48});
export const ONCOMING=Object.freeze({reward:2,brakeSpeedRatio:.75,brakeResponse:2.5,warningSeconds:1.1,warningTtc:2.5,minWarningDistance:85,maxWarningDistance:340,clearanceMargin:.22,brakeNoseDrop:.17});
export const VEHICLES=Object.freeze({
 truck:{min:60/3.6,max:75/3.6,width:2.35,length:7.4,height:3.1,acceleration:.65,agility:.22,turnSeconds:2.6},
 van:{min:65/3.6,max:85/3.6,width:2.05,length:5.1,height:2.35,acceleration:.9,agility:.35,turnSeconds:2.2},
 pickup:{min:75/3.6,max:95/3.6,width:2.05,length:4.8,height:1.65,acceleration:1.3,agility:.55,turnSeconds:1.8},
 sedan:{min:80/3.6,max:100/3.6,width:1.85,length:4.4,height:1.4,acceleration:1.5,agility:.65,turnSeconds:1.65},
 hatchback:{min:90/3.6,max:110/3.6,width:1.75,length:3.5,height:1.5,acceleration:1.9,agility:.8,turnSeconds:1.45},
 motorcycle:{min:115/3.6,max:130/3.6,width:.75,length:2.25,height:1.45,acceleration:3.5,agility:1,turnSeconds:1.3}
});
export const TRAFFIC=Object.freeze({warningSeconds:2.4,changeSeconds:1.25,launchBlendSeconds:2.5,
  initialChangeDelay:2,minChangeDelay:2.4,maxChangeDelay:4.5,minDecisionZ:120,
  abortZ:60,neighborGap:24,globalCooldown:2.4,signalHz:1.25,signalDuty:.5});
export const CRASH=Object.freeze({duration:.85,speed:14,respawnSpeed:32,recoverySeconds:2.2,blinkHz:2.5,
  clearAhead:125,clearBehind:22,damage:34,spin:.32});
export const EFFECTS=Object.freeze({normalIntensity:.55,fullIntensity:1,fullBurstSeconds:.6,fullBurstGain:.45,shieldRadius:2.05,shieldCenterY:.6,blendIn:16,blendOut:7,trailSamples:36,trailLife:.42,
  trailWidth:.085,particleCount:96,particleAdvection:.28,streakCount:44,boostFov:70,
  signSpacing:105,signCount:4,signBehind:20});
export function difficultyAt(distance){
  const t=Math.max(0,Math.min(1,distance/DIFFICULTY.rampDistance)),curve=t*t*(3-2*t);
  return {progress:curve,speed:DRIVING.initialSpeed+(DIFFICULTY.maxSpeed-DRIVING.initialSpeed)*curve,
    density:DIFFICULTY.initialDensity+(DIFFICULTY.maxDensity-DIFFICULTY.initialDensity)*curve,
    spawnDistance:DIFFICULTY.minSpawnDistance,
    waveSpacing:DIFFICULTY.initialSpacing+(DIFFICULTY.finalSpacing-DIFFICULTY.initialSpacing)*curve,
    maneuverDelay:5-2.5*curve};
}

export const PICKUPS=Object.freeze({score:100,worldSpeed:0,laneHalfWidth:1.5,carHalfWidth:1.05,longitudinalReach:2.5,magnetReach:1.5,spawnDistance:760,spawnLeadSeconds:.75,fadeFar:650,fadeNear:420,maxActive:40,spacing:12,maxAhead:1000});
export const ENVIRONMENT=Object.freeze({groundY:-.36,groundSize:8000,nearSpeed:1,midSpeed:1,farSpeed:1,recycleBehind:820,citySpan:1680});

// Factors apply to the visible chassis, before conservative yaw projection.
export const COLLISION=Object.freeze({playerWidth:1.72,playerLength:3.4,playerWidthScale:.88,playerLengthScale:.96,
 nearWidth:.85,nearLength:.3,pinchTolerance:.2,
 playerExtraWidth:.94,playerExtraLength:.99,minPlayerWidthScale:.76,minPlayerLengthScale:.93,
 lowHealthThreshold:25,lowHealthWidth:.07,lowHealthLength:.015,assistInResponse:8,assistOutResponse:3,
 extra:{truck:[.95,.995],van:[.94,.99],pickup:[.94,.99],sedan:[.93,.99],hatchback:[.93,.99],motorcycle:[.95,.995]},
 classes:{truck:[.9,.97],van:[.88,.96],pickup:[.88,.96],sedan:[.87,.95],hatchback:[.87,.95],motorcycle:[.9,.97]}});

export const BARRIER=Object.freeze({center:6.9,width:.22,releaseDistance:.06,impactSpeed:1.2});
