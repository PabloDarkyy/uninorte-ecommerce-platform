export const productFlightDuration = 900;
import { motionOptions } from './ui-motion.js';

// Commerce reuses this transition module; a 2D capture needs no new WebGL context.
export function captureProduct(viewer, mount) {
  const canvas=document.createElement('canvas');
  if(viewer.snapshot(canvas)){
    const context=canvas.getContext('2d'),pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
    let left=canvas.width,top=canvas.height,right=0,bottom=0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>4){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    const rect=mount.getBoundingClientRect();
    if(right>left&&bottom>top){const cropped=document.createElement('canvas');cropped.width=right-left+1;cropped.height=bottom-top+1;cropped.getContext('2d').drawImage(canvas,left,top,cropped.width,cropped.height,0,0,cropped.width,cropped.height);return {node:cropped,url:cropped.toDataURL('image/png'),rect:{left:rect.left+left/canvas.width*rect.width,top:rect.top+top/canvas.height*rect.height,width:cropped.width/canvas.width*rect.width,height:cropped.height/canvas.height*rect.height}};}
  }
  const source=mount.querySelector('.stage-product-image') || mount.querySelector('.concept-product');
  if(!source)return null;
  const rect=source.getBoundingClientRect(),copy=freezeCopy(source),node=document.createElement('div');
  const matrix=new DOMMatrix(getComputedStyle(source).transform==='none'?undefined:getComputedStyle(source).transform);
  Object.assign(copy.style,{position:'absolute',left:'50%',top:'50%',right:'auto',bottom:'auto',margin:'0',width:`${source.offsetWidth}px`,height:`${source.offsetHeight}px`,transform:`translate(-50%,-50%) matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},0,0)`});node.append(copy);
  return {node,rect};
}
export async function flyProduct({capture,target,host,signal,start=()=>{}}) {
  if(!capture || !target || signal?.aborted || matchMedia('(prefers-reduced-motion: reduce)').matches){await start();return;}
  const from=capture.rect,to=target.getBoundingClientRect(),a=center(from),b=center(to);
  const layer=document.createElement('div');layer.className='product-flight-layer commerce-flight';layer.setAttribute('aria-hidden','true');
  const node=capture.node;Object.assign(node.style,{position:'fixed',left:'0',top:'0',width:`${from.width}px`,height:`${from.height}px`,margin:'0',maxWidth:'none',maxHeight:'none',transformOrigin:'center',objectFit:'contain'});layer.append(node);host.append(layer);
  const scale=Math.min(to.width/from.width,to.height/from.height),arc=Math.min(110,Math.hypot(b.x-a.x,b.y-a.y)*.2);
  const frames=Array.from({length:25},(_,i)=>{const p=i/24;return {offset:p,transform:`translate(${a.x+(b.x-a.x)*p-from.width/2}px,${a.y+(b.y-a.y)*p-Math.sin(p*Math.PI)*arc-from.height/2}px) scale(${1+(scale-1)*p})`,opacity:1};});
  const animation=node.animate(frames,{...motionOptions(),duration:780,fill:'forwards'});
  const cancel=()=>animation.cancel();window.addEventListener('resize',cancel);signal?.addEventListener('abort',cancel,{once:true});
  const previous=target.style.visibility;target.style.visibility='hidden';
  try{await Promise.all([animation.finished,start()]);}catch{/* Closing or resize completes the visual transfer. */}finally{animation.cancel();layer.remove();target.style.visibility=previous;window.removeEventListener('resize',cancel);signal?.removeEventListener('abort',cancel);}
}
const clamp = value => Math.min(1,Math.max(0,value));
export function productFlightFrame(from,to,progress) {
  const t=clamp(progress), ease=t*t*(3-2*t);
  return { x:from.x+(to.x-from.x)*ease, y:from.y+(to.y-from.y)*ease, scale:from.scale+(1-from.scale)*ease, reveal:clamp((t-.42)/.58), ...(from.distance === undefined ? {} : { distance:from.distance+(to.distance-from.distance)*ease }) };
}
function center(rect){return{x:rect.left+rect.width/2,y:rect.top+rect.height/2};}
function freezeCopy(source) {
  const copy=source.cloneNode(true), originals=[source,...source.querySelectorAll('*')], copies=[copy,...copy.querySelectorAll('*')];
  originals.forEach((node,i)=>{const style=getComputedStyle(node);for(const key of style)copies[i].style.setProperty(key,style.getPropertyValue(key));copies[i].removeAttribute('id');});
  if(source instanceof HTMLCanvasElement){copy.width=source.width;copy.height=source.height;copy.getContext('2d').drawImage(source,0,0);}
  return copy;
}
export function createProductEntrance(dialog,viewer,selection) {
  const abort=new AbortController(), card=dialog.querySelector('.modal-card'), mount=dialog.querySelector('[data-model-mount]');
  let frame=0,done=false,started=false,layer,source,copy,copyHolder,resizeCopy,finishPromise;
  const finished=new Promise(resolve=>{finishPromise=resolve;});
  const catalog=selection.card?.closest('.catalog-section');
  function complete(cancelled=false) {
    if(done)return;done=true;cancelAnimationFrame(frame);abort.abort();
    if(!cancelled) {
      viewer.finishFlight();
      if(copy && copyHolder){
        card.style.transform='';
        const rect=mount.getBoundingClientRect(), currentTarget=copyHolder.target.getBoundingClientRect(), destination=center(currentTarget);
        copyHolder.scale*=Math.min(currentTarget.width/copyHolder.targetRect.width,currentTarget.height/copyHolder.targetRect.height);
        copyHolder.node.style.position='absolute';copyHolder.node.style.left=`${(destination.x-rect.left)/rect.width*100}%`;copyHolder.node.style.top=`${(destination.y-rect.top)/rect.height*100}%`;copyHolder.node.style.transform='none';
        mount.append(copyHolder.node);copyHolder.target.remove();
        const fit=()=>{const current=mount.getBoundingClientRect();const scale=copyHolder.scale*Math.min(current.width/rect.width,current.height/rect.height);copy.style.transform=`translate(-50%,-50%) ${copyHolder.rotation} scale(${scale})`;};
        fit();resizeCopy=new ResizeObserver(fit);resizeCopy.observe(mount);
      }
    }
    layer?.remove();
    dialog.classList.remove('is-product-entering');dialog.style.removeProperty('--entrance-backdrop');card.style.opacity='';card.style.transform='';card.inert=false;
    dialog.dataset.productTransition=cancelled?'cancelled':'ready';
    if(!cancelled && dialog.open)dialog.querySelector('[data-close]')?.focus({preventScroll:true});
    finishPromise(!cancelled);
  }
  const dispose=()=>{complete(true);resizeCopy?.disconnect();copyHolder?.node.remove();if(source)source.style.visibility='';catalog?.classList.remove('catalog-in-product');};
  (async()=>{
    const modelReady=await viewer.ready;
    if(done || !dialog.open)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){complete();return;}
    const targetRect=mount.getBoundingClientRect();
    layer=document.createElement('div');layer.className='product-flight-layer';layer.setAttribute('aria-hidden','true');dialog.append(layer);
    let from,to;
    if(modelReady && selection.pose && selection.source) {
      source=selection.source;
      const rect=selection.rect;
      from={...center(rect),distance:selection.pose.distance,scale:rect.height/targetRect.height*viewer.getState().cameraDistance/selection.pose.distance};
      to={...center(targetRect),distance:viewer.getState().cameraDistance};
    } else {
      viewer.finishFlight();
      source=selection.fallback;
      let target=mount.querySelector('.stage-product-image') || mount.querySelector('.concept-product');
      if(selection.source){
        source=selection.source;mount.closest('.product-stage').classList.add('has-model');
        target=document.createElement('div');Object.assign(target.style,{position:'absolute',inset:'0'});mount.append(target);
      }
      if(!source || !target || modelReady){complete();return;}
      const rect=selection.source ? selection.rect : selection.fallbackRect, destination=target.getBoundingClientRect();
      copy=freezeCopy(source);
      const computed=getComputedStyle(source), matrix=new DOMMatrix(computed.transform==='none'?undefined:computed.transform);
      const rotation=`matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},0,0)`;
      Object.assign(copy.style,{position:'absolute',left:'0',top:'0',right:'auto',bottom:'auto',margin:'0',width:`${source.offsetWidth}px`,height:`${source.offsetHeight}px`,transition:'none',animation:'none',visibility:'visible',transformOrigin:'center',transform:`translate(-50%,-50%) ${rotation}`});
      const holder=document.createElement('div');Object.assign(holder.style,{position:'fixed',left:'0',top:'0',width:'0',height:'0'});holder.append(copy);layer.append(holder);
      const finalScale=Math.min(destination.width/rect.width,destination.height/rect.height);
      from={...center(rect),scale:1/finalScale};to=center(destination);
      copyHolder={node:holder,target,rotation,scale:finalScale,targetRect:destination};
      target.style.visibility='hidden';
    }
    const width=document.documentElement.clientWidth,height=innerHeight;
    source.style.visibility='hidden';catalog?.classList.add('catalog-in-product');
    dialog.dataset.productTransition='travelling';started=true;
    const start=performance.now();
    const tick=time=>{
      if(done)return;
      const progress=Math.min(1,(time-start)/productFlightDuration),state=productFlightFrame(from,to,progress);
      dialog.dataset.flightProgress=String(progress);card.style.opacity=String(state.reveal);card.style.transform=`translateY(${(1-state.reveal)*8}px)`;dialog.style.setProperty('--entrance-backdrop',String(Math.min(1,progress*2.5)));
      if(copyHolder) {
        copyHolder.node.style.transform=`translate3d(${state.x}px,${state.y}px,0)`;
        copy.style.transform=`translate(-50%,-50%) ${copyHolder.rotation} scale(${state.scale*copyHolder.scale})`;
      } else viewer.setFlightFrame({layer,width,height,targetHeight:targetRect.height,x:state.x,y:state.y,scale:state.scale,distance:state.distance});
      if(progress<1)frame=requestAnimationFrame(tick);else complete();
    };
    tick(start);
    window.addEventListener('resize',()=>complete(),{signal:abort.signal});
    dialog.addEventListener('scroll',()=>{if(started)complete();},{signal:abort.signal,once:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)complete();},{signal:abort.signal});
  })().catch(()=>complete());
  return {finished,dispose,finish:()=>complete()};
}
