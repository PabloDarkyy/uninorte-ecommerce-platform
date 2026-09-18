import { productModel } from '../../utils/product-media.js';
import { displayText } from '../../utils/product-display.js';
import { motionOptions } from '../../modules/ui-motion.js';
export const HERO_MODEL_INTERVAL = 8000;
export function mountHeroRotation(root,viewer,products,initial) {
  const abort=new AbortController(),signal=abort.signal,wrapper=root.querySelector('.hero-transition'),overlay=root.querySelector('.hero-canvas-overlay'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  const seen=new Set(),models=products.filter(p=>{const url=productModel(p);if(!url||seen.has(url))return false;seen.add(url);return true;});
  let index=Math.max(0,models.findIndex(p=>p.id===initial.id)),timer,animation,hover=false,generation=0,disposed=false;
  wrapper.dataset.heroModel=initial.id;
  const idle=()=>!disposed&&!document.hidden&&!motion.matches&&!hover&&!document.querySelector('dialog[open]')&&Number(wrapper.dataset.scrollProgress||0)<.001&&!viewer.getState()?.interacting;
  function schedule(){clearTimeout(timer);if(!disposed&&!document.hidden&&!motion.matches)timer=setTimeout(change,HERO_MODEL_INTERVAL);}
  function activity(){generation++;animation?.cancel();schedule();}
  async function change(){
    if(!idle()){schedule();return;}
    const version=generation,nextIndex=(index+1)%models.length,next=models[nextIndex],canvas=overlay.querySelector('canvas');
    if(!canvas||models.length<2){schedule();return;}
    const permitted=()=>idle()&&version===generation;
    try{
      const changed=await viewer.setModel(productModel(next),{retainOnError:true,canCommit:permitted,beforeCommit:async()=>{animation=canvas.animate([{opacity:1},{opacity:0}],{...motionOptions('fast'),fill:'forwards'});await animation.finished;}});
      animation?.cancel();
      if(changed&&!disposed){index=nextIndex;wrapper.dataset.heroModel=next.id;canvas.setAttribute('aria-label',`${displayText(next.name)}, 3D`);animation=canvas.animate([{opacity:0},{opacity:1}],motionOptions('normal'));await animation.finished;}
    }catch{/* User interaction or navigation cancels the visual change. */}finally{if(!disposed)schedule();}
  }
  for(const event of ['scroll','wheel','touchmove','keydown','resize'])window.addEventListener(event,activity,{passive:true,signal});
  overlay.addEventListener('pointerenter',()=>{hover=true;activity();},{signal});overlay.addEventListener('pointerleave',()=>{hover=false;activity();},{signal});
  overlay.addEventListener('pointerdown',activity,{signal});overlay.addEventListener('pointermove',activity,{signal});window.addEventListener('pointerup',activity,{signal});
  document.addEventListener('visibilitychange',activity,{signal});document.addEventListener('productmodalchange',activity,{signal});motion.addEventListener('change',activity,{signal});
  viewer.ready?.then(ready=>{if(ready&&!disposed)schedule();});
  return()=>{disposed=true;clearTimeout(timer);animation?.cancel();abort.abort();};
}
