import * as THREE from 'three';
import {CRASH,EFFECTS} from './tuning.js';
import {hasNitroBonus} from './nitro.js';
export function recoveryVisible(s){return s.recovery<=0||((CRASH.recoverySeconds-s.recovery)*CRASH.blinkHz)%1<.6;}
export function shieldWarning(s,reduced=false){
 const remaining=s.bonusTime;
 if(!hasNitroBonus(s)||remaining>2)return {strength:0,pulse:1};
 const elapsed=2-Math.max(0,remaining),strength=Math.min(1,elapsed/.2);
 // Integrated frequency: 1 Hz at entry, smoothly rising to 2 Hz at expiry.
 const wave=.5+.5*Math.cos(2*Math.PI*(elapsed+.25*elapsed*elapsed));
 return {strength,pulse:reduced?1:.65+.35*wave};
}
export function createNitroShield(){
  return new THREE.Mesh(new THREE.SphereGeometry(EFFECTS.shieldRadius,40,24),new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,uniforms:{time:{value:0},hit:{value:0},warning:{value:0},pulse:{value:1}},
    vertexShader:'varying vec3 n; varying vec3 v; varying vec3 p; void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-mv.xyz);p=position;gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying vec3 n; varying vec3 v; varying vec3 p; uniform float time; uniform float hit; uniform float warning; uniform float pulse; void main(){float rim=pow(1.-max(0.,dot(normalize(n),normalize(v))),3.);float scan=.5+.5*sin(p.y*9.-time*2.);float a=.014+rim*(.2+.035*scan)+hit*.12;vec3 c=mix(vec3(.28,1.,.92),vec3(1.,.78,.25),warning*.7);gl_FragColor=vec4(c*(1.+hit+warning*pulse*.65),a*mix(1.,pulse,warning));}'
  }));
}
export function updateProtection(shield,player,s,reduced=false){
  shield.position.set(s.x,EFFECTS.shieldCenterY,0);shield.rotation.set(0,0,0);shield.scale.setScalar(1);
  shield.visible=hasNitroBonus(s);shield.material.uniforms.time.value=reduced?0:s.time;shield.material.uniforms.hit.value=s.shieldFlash/.4;
  const warning=shieldWarning(s,reduced);shield.material.uniforms.warning.value=warning.strength;shield.material.uniforms.pulse.value=warning.pulse;
  const visible=recoveryVisible(s);player.userData.body.visible=visible;player.userData.glow.visible=visible;
}
