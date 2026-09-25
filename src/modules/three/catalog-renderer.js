import { WebGLRenderer, SRGBColorSpace, ACESFilmicToneMapping } from 'three';
import { createStudioEnvironment } from './studio-environment.js';
// Un recurso por catálogo, compartido con su detalle. Las tarjetas nunca lo poseen.
export function createCatalogRenderer() {
  let renderer, environment, broken = false, disposed = false, users = 0, disposeRequested = false;
  function destroy() {
    if (disposed || users) return;
    disposed = true; environment?.dispose(); renderer?.domElement.remove(); renderer?.dispose(); renderer?.forceContextLoss();
  }
  return {
    acquire() {
      if (disposed || disposeRequested || broken) throw new Error('El catálogo ya se cerró.');
      if (!renderer) {
        renderer = new WebGLRenderer({ alpha:true, antialias:true, powerPreference:'low-power' });
        renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();broken=true;environment?.dispose();});
        renderer.domElement.addEventListener('webglcontextrestored',()=>{
          if(disposed)return;
          environment=createStudioEnvironment(renderer); broken=false;
          document.dispatchEvent(new Event('product3drestore'));
        });
        renderer.setClearColor(0x000000,0); renderer.outputColorSpace=SRGBColorSpace;
        renderer.toneMapping=ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
        environment=createStudioEnvironment(renderer);
      }
      users++; let released=false;
      return { renderer, get environment(){return environment;}, release() { if(released)return;released=true;users--;if(disposeRequested)destroy(); } };
    },
    dispose() { disposeRequested=true;destroy(); },
  };
}
