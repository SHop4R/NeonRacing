export function createControlState() {
  const keys=new Set(), pointers=new Map();
  return {
    key(code,down){const fresh=down&&!keys.has(code);if(down)keys.add(code);else keys.delete(code);return fresh;},
    pointer(id,action){if(action)pointers.set(id,action);else pointers.delete(id);},
    hasPointer(action){return [...pointers.values()].includes(action);},
    clear(){keys.clear();pointers.clear();},
    read(){const values=[...pointers.values()];const left=keys.has('ArrowLeft')||keys.has('KeyA')||values.includes('left');const right=keys.has('ArrowRight')||keys.has('KeyD')||values.includes('right');return {boost:keys.has('Space')||keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('Enter')||values.includes('boost'),steer:Number(right)-Number(left),brake:keys.has('KeyS')||keys.has('ArrowDown')||values.includes('brake')};}
  };
}
export function createInput(root, callbacks, environment={windowTarget:window,documentTarget:document}) {
  const {windowTarget,documentTarget}=environment;
  const state=createControlState(), controller=new AbortController(), opts={signal:controller.signal};
  const used=['ArrowLeft','ArrowRight','ArrowDown','KeyA','KeyD','KeyS','Space','ShiftLeft','ShiftRight','KeyP','Escape','KeyR','Enter'];
  const onKey=(e,down)=>{
    if(e.target?.closest?.('dialog[open]'))return;
    if(!used.includes(e.code))return;
    if(down&&e.repeat){e.preventDefault();return;}
    const control=e.target?.dataset?.control;
    // Menu buttons retain native activation; gameplay buttons use the same fresh-press gate.
    if((e.code==='Enter'||e.code==='Space')&&e.target?.tagName==='BUTTON'&&!control)return;
    e.preventDefault();const fresh=state.key(e.code,down);
    if(fresh&&!e.repeat){
      if(['Space','ShiftLeft','ShiftRight'].includes(e.code)||(e.code==='Enter'&&control==='boost'))callbacks.boost();
      if(e.code==='KeyP')callbacks.pause();
      if(e.code==='Escape')(callbacks.escape??callbacks.pause)();
      if(e.code==='KeyR')callbacks.restart();
      if(e.code==='Enter'&&!control)callbacks.start();
    }
  };
  windowTarget.addEventListener('keydown',e=>onKey(e,true),opts);windowTarget.addEventListener('keyup',e=>onKey(e,false),opts);
  const clear=()=>{state.clear();root.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));};
  const blur=()=>{clear();callbacks.blur();};windowTarget.addEventListener('blur',blur,opts);
  documentTarget.addEventListener('visibilitychange',()=>{if(documentTarget.hidden)blur();},opts);
  for(const button of root.querySelectorAll('[data-control]')) {
    button.addEventListener('pointerdown',e=>{e.preventDefault();const held=state.hasPointer(button.dataset.control);button.setPointerCapture(e.pointerId);state.pointer(e.pointerId,button.dataset.control);button.classList.add('held');if(button.dataset.control==='boost'&&!held)callbacks.boost();},opts);
    const release=e=>{state.pointer(e.pointerId,null);if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);if(!state.hasPointer(button.dataset.control))button.classList.remove('held');};
    button.addEventListener('pointerup',release,opts);button.addEventListener('pointercancel',release,opts);button.addEventListener('lostpointercapture',release,opts);
    // Assistive-technology activation has no keydown/pointerdown. Keyboard default
    // clicks are prevented by onKey, so this does not duplicate a held key.
    button.addEventListener('click',e=>{if(e.detail===0&&button.dataset.control==='boost')callbacks.boost();},opts);
    button.addEventListener('contextmenu',e=>e.preventDefault(),opts);
  }
  return {read:state.read,clear,destroy(){controller.abort();clear();}};
}
