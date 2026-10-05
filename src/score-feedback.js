// One vehicle-anchored message, no queue. Safety takes precedence over rewards.
export const MESSAGE_PRIORITY={hit:100,respawn:90,'shield-hit':85,health:80,boost:60,'nitro-ready':50,'shield-full':55,near:40,combo:35,repair:30,orb:25,brake:20,energy:10};
export function createScoreFeedback(element,reduced=()=>false){
 let until=0,born=0,lastCombo=1,nearUntil=0,current=null,previous={};
 const label=element.querySelector('span'),number=element.querySelector('strong'),detail=element.querySelector('small');
 const api={
  reset(){until=0;lastCombo=1;nearUntil=0;current=null;previous={};element.hidden=true;},
  clear(){until=0;current=null;element.hidden=true;},
  message(s,event){
   const key=event.type,priority=MESSAGE_PRIORITY[key]??20;
   if(current&&s.time<until&&priority<current.priority)return false;
   if(current?.key===key&&s.time-born<.25)return false;
   current={key,priority};born=s.time;until=s.time+(key==='near'||key==='combo'?1.4:1.65);
   label.textContent=event.text??'';number.textContent=event.value??'';if(detail)detail.textContent=event.detail??'';
   element.dataset.level=String(Math.floor(s.combo));element.dataset.kind=key;
   return true;
  },
  notify(s,near=false){
   if(near)nearUntil=s.time+1.4;
   const level=Math.floor(s.combo);
   api.message(s,{type:near||s.time<nearUntil?'near':'combo',text:s.time<nearUntil?'NEAR MISS':'COMBO UP',value:`×${level}`});lastCombo=level;
   // Coalesce a multiplier change even inside the entrance debounce.
   if(current?.key==='near'||current?.key==='combo')number.textContent=`×${level}`;
  },
  event(s,event){
   if(event.type==='oncoming')return;
   if(event.type==='shield-full'&&current?.key==='health')api.clear();
   if(event.type==='hit'){api.clear();nearUntil=0;lastCombo=1;}
   if(event.type==='near'){api.notify(s,true);return;}
   if(event.type==='respawn'){api.clear();previous.recovery=true;}
   api.message(s,event);
  },
  update(s,point,w,h){
   const level=Math.floor(s.combo),recovery=s.recovery>0,boost=s.boost>0,critical=s.shield<=25;
   if(s.mode!=='running'){api.clear();return;}
   // A state ending invalidates its own notification, never an unrelated reward.
   if(current&&((current.key==='respawn'&&!recovery)||(current.key==='boost'&&!boost)||(current.key==='nitro-ready'&&(boost||s.nitro<1))||(current.key==='brake'&&!s.braking)||(current.key==='health'&&!critical)||(current.key==='shield-full'&&s.shield<100)))api.clear();
   if(level>lastCombo)api.notify(s);
   if(critical&&!previous.critical)api.message(s,{type:'health',text:'Shield Critical'});
   if(recovery&&!previous.recovery)api.message(s,{type:'respawn',text:'Recovery Protection'});
   previous={recovery,braking:s.braking,critical};lastCombo=level;
   element.hidden=s.time>=until||(s.crashTime>0&&current?.key!=='hit');
   if(element.hidden)return;
   const age=s.time-born,exit=Math.max(0,(s.time-(until-.35))/.35);
   const punch=reduced()?1:age<.16?1+Math.sin(age/.16*Math.PI)*(.18+level*.015):1;
   const kick=reduced()?0:Math.min(1,age/.18)*9+exit*9;
   // Reserve room for the maximum punch so long messages never leave the viewport.
   const half=Math.min(150,(w-24)/2)/1.26;
   element.style.width=`${half*2}px`;
   const margin=half*1.26+12;
   element.style.left=`${Math.max(margin,Math.min(w-margin,point.x))}px`;
   element.style.top=`${Math.max(h*.38,Math.min(h*.64,point.y-36))-kick}px`;
   element.style.opacity=String(1-exit);element.style.transform=`translate(-50%,-100%) scale(${punch})`;
  }
 };return api;
}
