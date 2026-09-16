import { escapeHtml as e } from '../../utils/html.js';
import { displayText, productAccent } from '../../utils/product-display.js';
import { icon } from '../../utils/icons.js';

export function productStage(product, { context = 'card' } = {}) {
  // El placeholder se mantiene hasta que el visor renderiza correctamente.
  // Las tarjetas reciben su captura GLB del renderer compartido del catálogo.
  return `<div class="product-stage product-stage--${context}" style="--product-accent:${productAccent(product)}">
    <div class="stage-orbit" aria-hidden="true"></div><div class="stage-halo" aria-hidden="true"></div>
    <span class="stage-leaf stage-leaf--one" aria-hidden="true"></span><span class="stage-leaf stage-leaf--two" aria-hidden="true"></span><div class="stage-shadow" aria-hidden="true"></div>
    <div class="model-mount" data-model-mount data-product-id="${e(product.id)}" role="img" aria-label="Placeholder conceptual de ${e(displayText(product.name))}. Modelo 3D pendiente.">
      ${product.image ? `<img class="stage-product-image" src="${e(product.image)}" alt="${e(displayText(product.name))}">` : ''}<div class="concept-product" aria-hidden="true" ${product.image ? 'hidden' : ''}><div class="concept-cap"></div><div class="concept-body"><div class="concept-label"><span class="concept-brand">UNINORTE</span>${icon('leaf')}<strong>${e(displayText(product.name))}</strong><span class="concept-origin">TIERRA & ORIGEN</span></div></div></div>
    </div><span class="stage-caption">${context === 'hero' ? `${icon('cube')} Espacio para modelo 3D` : 'Presentación conceptual'}</span>
  </div>`;
}

export function mountProductStage(root, product, { context = 'modal', resources, startPaused = false, disableModel = false } = {}) {
  const container = root.querySelector('[data-model-mount]');
  let viewer, disposed = false, progress = 0, transitionLayout, transitionFrame;
  const controller = {
    getState() { return viewer?.getState(); },
    setFlightFrame(value) { viewer?.setFlightFrame(value); },
    finishFlight() { viewer?.finishFlight(); },
    setExpanded(value) { viewer?.setExpanded(value); },
    setScrollProgress(value) { progress = value; viewer?.setScrollProgress(value); },
    configureTransition(value) { transitionLayout = value; viewer?.configureTransition(value); },
    setTransitionFrame(value) { transitionFrame = value; viewer?.setTransitionFrame(value); },
    dispose() { disposed = true; viewer?.dispose(); },
  };
  if(disableModel && container)container.dataset.viewerState='fallback';
  if (!container || !product?.model || disableModel || context === 'card') return controller;
  // Importación diferida: el modal no crea un contexto ni carga su GLB antes de abrirse.
  controller.ready = import('../../modules/three/product-viewer.js').then(({ createProductViewer }) => {
    if (disposed) return;
    viewer = createProductViewer({ container, modelUrl: product.model, label: displayText(product.name),
      resources, startPaused, autoRotate: true, interactive: true, initialRotation: { z: -0.12 },
      camera: { zoom: context === 'modal', fill: context === 'hero' ? 0.8 : 0.9 },
    });
    viewer.setScrollProgress(progress);
    if (transitionLayout) viewer.configureTransition(transitionLayout);
    if (transitionFrame) viewer.setTransitionFrame(transitionFrame);
    return viewer.ready;
  }).catch(error => { if (!disposed) console.error('No se pudo iniciar el visor 3D:', error); });
  return controller;
}
