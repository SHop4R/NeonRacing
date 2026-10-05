export function gainText(kind,amount){
 const value=amount<.1?'<0.1':String(Math.round(amount*10)/10);
 return `+${value}${kind==='reserve'?'% Banked':kind==='score'?' Score':kind==='nitro'?'% Nitro':kind==='repair'?' Shield':' Energy'}`;
}
// Positions are captured once. Neither steering nor camera motion updates them.
export function createPickupFeedback(container,reduced=()=>false){
 const items=[];
 function remove(item){item.node.remove();items.splice(items.indexOf(item),1);}
 return {
  reset(){for(const item of [...items])remove(item);},
  add(event,point,time){
   if(!(event.amount>0))return;
   let item=items.find(i=>i.kind===event.resource&&time-i.born<.3&&Math.hypot(i.x-point.x,i.y-point.y)<70);
   if(item){item.amount+=event.amount;item.node.textContent=gainText(item.kind,item.amount);return;}
   if(items.length>=4)remove(items[0]);
   const node=container.ownerDocument.createElement('div');node.className='pickup-gain';node.dataset.kind=event.resource;node.textContent=gainText(event.resource,event.amount);container.append(node);
   // Separate unlike gains arriving at nearly the same pixel, without a queue.
   let y=point.y;for(const i of items)if(Math.abs(i.x-point.x)<120&&Math.abs(i.y-y)<28)y+=28;
   item={node,kind:event.resource,amount:event.amount,x:point.x,y,born:time};items.push(item);
  },
  update(s,w,h){
   if(s.mode==='ready'||s.mode==='over'||s.crashTime>0){this.reset();return;}
   container.hidden=s.mode!=='running';
   for(const item of [...items]){
    const age=s.time-item.born;if(age>=1.1){remove(item);continue;}
    const hop=reduced()?0:age<.22?10*Math.sin(age/.44*Math.PI):10+(age-.22)*5;
    item.node.style.left=`${Math.max(85,Math.min(w-85,item.x))}px`;
    item.node.style.top=`${Math.max(35,Math.min(h-25,item.y))-hop}px`;
    item.node.style.opacity=String(Math.max(0,1-Math.max(0,age-.4)/.7));
   }
  }
 };
}
