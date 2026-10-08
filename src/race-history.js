import {ONCOMING} from './tuning.js';
// A short record of completed rewards, separate from the safety/status popup.
export function createRaceHistory(container,reduced=()=>false){
 const items=[];let lastCombo=1,activeBoost=null;
 function remove(item){if(activeBoost===item)activeBoost=null;item.node.remove();items.splice(items.indexOf(item),1);}
 function write(item){item.node.textContent=item.boost?`${item.boost} +${item.amount}`:item.oncoming?`ONCOMING TRAFFIC ×${ONCOMING.reward}`:item.count?`NEAR MISS${item.count>1?' ×'+item.count:''}  +${item.amount}${item.combo?'  ·  COMBO ×'+item.combo:''}`:`COMBO ×${item.combo}`;}
 function add(s,event){
  let item=items.at(-1);
  if(!event.oncoming&&!event.boost&&item&&s.time-item.born<.4&&item.count){
   item.count+=event.count??0;item.amount+=event.amount??0;item.combo=event.combo??item.combo;write(item);return;
  }
  if(items.length>=3)remove(items.find(item=>item!==activeBoost)??items[0]);
  const node=container.ownerDocument.createElement('div');node.className='race-reward';container.append(node);
  item={node,born:s.time,until:s.time+4,count:0,amount:0,...event};items.push(item);write(item);return item;
 }
 return {
  reset(){items.slice().forEach(remove);lastCombo=1;},
  event(s,event){if(event.type==='boost'&&!s.tutorialSafe)activeBoost=add(s,{boost:event.mode==='auto'?'OVERDRIVE':'NITRO',amount:Math.floor(s.boostScore+1e-8)});if(event.type==='oncoming')add(s,{oncoming:true});if(event.type==='near')add(s,{count:1,amount:event.amount});if(event.type==='hit')this.reset();},
  update(s){
   if(s.mode==='ready'||s.mode==='over'||s.mode==='intro'){this.reset();container.hidden=true;return;}
   container.hidden=s.mode!=='running';
   if(activeBoost){activeBoost.amount=Math.floor(s.boostScore+1e-8);activeBoost.until=s.time+4;write(activeBoost);if(!s.boost)activeBoost=null;}
   const combo=Math.floor(s.combo);if(combo>lastCombo)add(s,{combo});lastCombo=combo;
   for(const item of [...items]){
    const age=s.time-item.born;if(s.time>=item.until){remove(item);continue;}
    item.node.style.opacity=String(Math.min(1,age/.12)*(1-Math.max(0,(s.time-item.until+.7)/.7)));
    item.node.style.transform=`translateX(${reduced()?0:-10*(1-Math.min(1,age/.18))}px)`;
   }
  }
 };
}
