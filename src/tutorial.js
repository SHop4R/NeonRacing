export const TUTORIAL_KEY='shutoko-tutorial-complete';
export const tutorialPrompts=touch=>[
 touch?'Hold ‹ or › to steer':'Use A / D or ← / → to steer',
 touch?'Hold BRAKE to slow down':'Hold S or ↓ to brake',
 touch?'Hold NITRO for a short boost':'Hold Space for a short boost',
 'Try the left lanes: oncoming traffic earns ×2',
 'Return to the right lanes to start your run'
];
export function createTutorial(){
 return {active:false,step:0,held:0,
  begin(s){this.active=true;this.step=0;this.held=0;s.tutorialSafe=true;},
  update(s,input,dt){
   if(!this.active)return false;
   const done=[Math.abs(input.steer)>0,!!input.brake,s.boost>0,s.x<-.3,s.x>.3][this.step];
   this.held=done?this.held+dt:0;
   if(this.held>.4){this.step++;this.held=0;if(this.step===2)s.nitro=.4;if(this.step>=5){this.active=false;return true;}}
   return false;
  },
  finish(){this.active=false;this.held=0;}
 };
}
