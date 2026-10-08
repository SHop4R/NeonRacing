export function gainText(kind,amount){
 const value=amount<.1?'<0.1':String(Math.round(amount*10)/10);
 return `+${value}${kind==='reserve'?'% Banked':kind==='nitro'?'% Nitro':kind==='repair'?' Shield':' Score'}`;
}
// Capture the pickup origin once; score gains then travel to the score instrument.
export function createPickupFeedback(container,reduced=()=>false,score=null){
 const items=[];let arrived=-Infinity;
 function remove(item){item.node.remove();items.splice(items.indexOf(item),1);}
 return {
  reset(){for(const item of [...items])remove(item);arrived=-Infinity;if(score){score.style.transform='';score.style.color='';}},
  add(event,point,time){
   if(event.scoreAmount>0&&event.resource!=='energy'&&event.resource!=='score')this.add({resource:'score',amount:event.scoreAmount},point,time);
   if(!(event.amount>0))return;
   let item=items.find(i=>i.kind===event.resource&&time-i.born<.25&&Math.hypot(i.x-point.x,i.y-point.y)<70);
   if(item){item.amount+=event.amount;item.node.textContent=gainText(item.kind,item.amount);return;}
   if(items.length>=4)remove(items[0]);
   const node=container.ownerDocument.createElement('div');node.className='pickup-gain';node.dataset.kind=event.resource;node.textContent=gainText(event.resource,event.amount);container.append(node);
   let y=point.y;for(const i of items)if(Math.abs(i.x-point.x)<120&&Math.abs(i.y-y)<28)y+=28;
   item={node,kind:event.resource,amount:event.amount,x:point.x,y,born:time,toScore:!!score&&['energy','score'].includes(event.resource)};items.push(item);
  },
  update(s,w,h){
   if(s.mode==='ready'||s.mode==='over'||s.mode==='intro'||s.crashTime>0){this.reset();return;}
   container.hidden=s.mode!=='running';
   const quiet=reduced(),destination=items.some(i=>i.toScore)?score.getBoundingClientRect():null;
   for(const item of [...items]){
    const age=s.time-item.born,duration=item.toScore?.95:1.1;
    if(age>=duration){if(item.toScore)arrived=s.time;remove(item);continue;}
    const hop=quiet?0:age<.22?10*Math.sin(age/.44*Math.PI):10+(age-.22)*5;
    let x=Math.max(85,Math.min(w-85,item.x)),y=Math.max(35,Math.min(h-25,item.y))-hop;
    const flight=item.toScore?Math.max(0,(age-.25)/.7):0,ease=flight*flight*(3-2*flight);
    if(item.toScore&&!quiet){x+=(destination.left+destination.width/2-x)*ease;y+=(destination.top+destination.height*.75-y)*ease;}
    item.node.style.left=`${x}px`;item.node.style.top=`${y}px`;
    item.node.style.transform=`translate(-50%,-100%) scaleX(.88) scale(${quiet?1:1-ease*.35})`;
    item.node.style.opacity=String(item.toScore&&!quiet?1-Math.max(0,(flight-.7)/.3):Math.max(0,1-Math.max(0,age-.4)/.7));
   }
   if(score){const pulse=Math.max(0,1-(s.time-arrived)/.3);score.style.transform=quiet?'':`scale(${1+pulse*.1})`;score.style.color=pulse>0?'#fff471':'';}
  }
 };
}
