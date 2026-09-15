import { animateSurface } from '../../modules/ui-motion.js';
import { productStage, mountProductStage } from '../product-stage/product-stage.js';
import { displayText, displayPrice, productAccent } from '../../utils/product-display.js';
import { escapeHtml as e } from '../../utils/html.js';
import { icon } from '../../utils/icons.js';
import { mountExpandedViewer } from './expanded-viewer.js';
let activeDialog = null;
export function closeProductModal() {
  if (!activeDialog) return;
  activeDialog.restoreTriggerFocus = false;
  activeDialog.closeExpanded?.();
  activeDialog.close();
}
export function openProductModal(product, trigger) {
  if (!product || activeDialog) return;
  const dialog = document.createElement('dialog');
  let viewer, disposeExpanded, surfaceAnimation, closing = false;
  function requestClose() {
    if (closing) return; closing = true; surfaceAnimation?.cancel(); dialog.classList.add('is-closing');
    surfaceAnimation = animateSurface(dialog.querySelector('.modal-card'), false);
    surfaceAnimation.finished.then(() => dialog.close()).catch(() => {});
  }
  dialog.className = 'product-modal';
  dialog.setAttribute('aria-labelledby', 'preview-title');
  dialog.setAttribute('aria-describedby', 'preview-description');
  dialog.style.setProperty('--product-accent', productAccent(product));
  dialog.innerHTML = `<div class="modal-card"><button class="icon-button modal-x" data-close aria-label="Cerrar vista previa" autofocus>${icon('close')}</button>
    <div class="modal-visual"><span class="modal-eyebrow">VISTA PREVIA</span>${productStage(product, { context: 'modal' })}</div>
    <div class="modal-content"><p class="eyebrow">${e(displayText(product.category))} · ${e(displayText(product.origin) || 'Origen paraguayo')}</p><h2 id="preview-title">${e(displayText(product.name))}</h2>
      <div class="modal-price-row"><p class="modal-price">${e(displayPrice(product))}<small>Precio de ejemplo</small></p><p class="modal-stock">${product.availability === 'unavailable' ? 'No disponible' : product.availability === 'preorder' ? 'Por encargo' : product.stock > 0 ? 'Disponible' : 'Sin stock'}<small>${e(product.stock)} unidades · Stock de ejemplo</small></p></div>
      <p id="preview-description">${e(displayText(product.description) || displayText(product.shortDescription))}</p>
      <div class="modal-additional"><h3>Información adicional</h3>${[product.ingredients, product.nutrition, product.benefits].some(value => displayText(value)) ? [['Ingredientes',product.ingredients],['Información nutricional',product.nutrition],['Beneficios',product.benefits]].filter(([,value]) => displayText(value)).map(([label,value]) => `<p><strong>${label}:</strong> ${e(displayText(value))}</p>`).join('') : '<p>Ingredientes, composición y beneficios pendientes de confirmación.</p>'}<h3>Variantes disponibles</h3><div class="variant-list">${product.variants.map(variant => `<span>${e(displayText(variant.name))}</span>`).join('')}</div></div>
      <div id="preview-details" class="preview-details" hidden><dl><div><dt>Empresa / marca</dt><dd>${e(displayText(product.brand))}</dd></div><div><dt>Moneda base</dt><dd>${e(product.baseCurrency)}</dd></div></dl><p>La ficha definitiva se incorporará en una próxima fase.</p></div>
      <div class="modal-actions"><button class="button" id="details-toggle" aria-expanded="false" aria-controls="preview-details">Ver detalles ${icon('arrow')}</button><button class="button button-secondary" data-close>Cerrar</button></div>
    </div></div>`;
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', requestClose));
  const detailsToggle = dialog.querySelector('#details-toggle');
  detailsToggle.addEventListener('click', () => {
    const expanded = detailsToggle.getAttribute('aria-expanded') !== 'true';
    detailsToggle.setAttribute('aria-expanded', String(expanded));
    dialog.querySelector('#preview-details').hidden = !expanded;
    detailsToggle.innerHTML = `${expanded ? 'Ocultar detalles' : 'Ver detalles'} ${icon('arrow')}`;
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) requestClose(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled), a[href], input, select, [tabindex="0"]')].filter(element => element.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  dialog.addEventListener('close', () => {
    surfaceAnimation?.cancel();
    disposeExpanded?.();
    viewer?.dispose();
    document.documentElement.classList.remove('modal-open');
    document.dispatchEvent(new Event('productmodalchange'));
    activeDialog = null;
    dialog.remove();
    if (dialog.restoreTriggerFocus !== false && trigger?.isConnected) trigger.focus({ preventScroll: true });
  }, { once: true });
  document.body.append(dialog);
  activeDialog = dialog;
  document.documentElement.classList.add('modal-open');
  document.dispatchEvent(new Event('productmodalchange'));
  dialog.showModal(); // Dialog nativo: Escape, foco contenido y fondo inerte.
  surfaceAnimation = animateSurface(dialog.querySelector('.modal-card'));
  viewer = mountProductStage(dialog, product);
  viewer.ready?.then(ready => {
    if (ready && dialog.open) {
      disposeExpanded = mountExpandedViewer(dialog, viewer, displayText(product.name));
      dialog.closeExpanded = () => disposeExpanded?.();
    }
  });
}
