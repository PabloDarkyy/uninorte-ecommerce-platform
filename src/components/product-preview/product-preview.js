import { createProductViewer } from '../../modules/three/product-viewer.js';
import { createCatalogRenderer } from '../../modules/three/catalog-renderer.js';
import { displayText } from '../../utils/product-display.js';
export function mountCatalogPreviews(root, products) {
  const resources = createCatalogRenderer(), abort = new AbortController(), records = new Map();
  let disposed = false, paused = false, running, activeViewer;
  const host = document.createElement('div'); host.className='catalog-render-host';host.setAttribute('aria-hidden','true'); document.body.append(host);
  for (const button of root.querySelectorAll('[data-product-preview]')) {
    const product=products.find(p=>p.id===button.dataset.productPreview);
    if (!product?.model) continue;
    const mount=button.closest('.product-card').querySelector('[data-model-mount]');
    records.set(mount,{product,mount,visible:false,dirty:true,failed:false,used:0});
  }
  function trimSnapshots() {
    const snapshots=[...records.values()].filter(r=>r.canvas).sort((a,b)=>a.used-b.used);
    while(snapshots.length>12) {
      const index=snapshots.findIndex(r=>!r.visible); if(index<0)break;
      const [record]=snapshots.splice(index,1);record.canvas.remove();record.canvas.width=record.canvas.height=1;record.canvas=null;record.pose=null;record.dirty=true;record.mount.closest('.product-stage').classList.remove('has-model');
    }
  }
  async function capture(record) {
    const rect=record.mount.getBoundingClientRect();if(!rect.width || !rect.height || disposed)return;
    host.style.width=`${rect.width}px`;host.style.height=`${rect.height}px`;
    const viewer=createProductViewer({container:host,modelUrl:record.product.model,label:displayText(record.product.name),autoRotate:false,interactive:false,initialRotation:{z:-.12},camera:{fill:.68,zoom:false},resources,staticPreview:true});
    activeViewer=viewer;
    try {
      if(!await viewer.ready || disposed) { if(!disposed && activeViewer===viewer)record.failed=true;return; }
      if(document.hidden)return;
      const canvas=record.canvas || document.createElement('canvas');canvas.className='catalog-model-preview';canvas.setAttribute('aria-hidden','true');
      const pose=viewer.snapshot(canvas);if(!pose)return;
      if(!record.canvas)record.mount.append(canvas);
      record.canvas=canvas;record.pose=pose;record.dirty=false;record.used=performance.now();record.width=rect.width;record.height=rect.height;
      record.mount.closest('.product-stage').classList.add('has-model');record.mount.dataset.previewState='ready';record.mount.setAttribute('aria-label',`Vista 3D de ${displayText(record.product.name)}`);
      trimSnapshots();
    } finally { viewer.dispose(); if(activeViewer===viewer)activeViewer=null; }
  }
  function pump() {
    if(running || paused || disposed || document.hidden)return;
    const record=[...records.values()].find(r=>r.visible && r.dirty && !r.failed);if(!record)return;
    running=capture(record).catch(()=>{record.failed=true;}).finally(()=>{running=null;pump();});
  }
  const visibility=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{const record=records.get(entry.target);record.visible=entry.isIntersecting;});trimSnapshots();pump();
  },{threshold:.01});
  const resize=new ResizeObserver(entries=>{
    entries.forEach(entry=>{const r=records.get(entry.target);if(Math.abs(entry.contentRect.width-(r.width||0))>1 || Math.abs(entry.contentRect.height-(r.height||0))>1)r.dirty=true;});pump();
  });
  records.forEach(r=>{visibility.observe(r.mount);resize.observe(r.mount);});
  document.addEventListener('visibilitychange',pump,{signal:abort.signal});
  return {
    async select(product) {
      paused=true; const current=activeViewer;activeViewer=null;current?.dispose();await running;
      if(disposed)return null;
      const record=[...records.values()].find(r=>r.product.id===product.id);
      if(record && (!record.pose || record.dirty) && !record.failed) { try { await capture(record); } catch { record.failed=true; } }
      if(disposed)return null;
      let released=false;
      return { resources, pose:record?.pose, source:record?.canvas, failed:record?.failed,
        release(){if(released)return;released=true;paused=false;pump();} };
    },
    dispose(){disposed=true;abort.abort();visibility.disconnect();resize.disconnect();activeViewer?.dispose();host.remove();resources.dispose();records.forEach(r=>{r.canvas?.remove();if(r.canvas)r.canvas.width=r.canvas.height=1;});},
  };
}
