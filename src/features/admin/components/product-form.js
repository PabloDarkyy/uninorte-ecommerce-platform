import { e, displayText, field } from './shared.js';
import { createDialog } from '../../../modules/ui-motion.js';
import { mountMediaFields } from './media-fields.js';
import { mountVariantFields } from './variant-fields.js';
const textFields = [['name','Nombre'],['category','Categoría'],['brand','Empresa / proveedor'],['origin','Origen']];
const longFields = [['description','Descripción'],['nutrition','Información nutricional'],['ingredients','Ingredientes'],['benefits','Beneficios']];
export function openProductForm(product, services, onSaved, onDisposed = () => {}) {
  const draft = structuredClone(product || { active: true, featured: false, baseCurrency: 'PYG', basePrice: 0, stock: 0, variants: [], image: null, images: [], model: null, availability: 'available' });
  draft.images ||= [];
  const staged = new Set(); let committed = false, saving = false;
  const { assets, products } = services;
  const oldReferences = product ? assets.references(product) : [];
  const modal = createDialog({ title: product ? 'Editar producto' : 'Nuevo producto', className: 'admin-product-dialog', html: `<form data-product-form><p class="admin-muted">Datos de la colección · Vista previa local de archivos</p><p class="admin-form-error" role="alert" tabindex="-1" hidden></p><div class="admin-form-grid">${textFields.map(([key,label]) => field(key,label,displayText(draft[key]),'text',['name','category'].includes(key) ? 'required maxlength="180"' : 'maxlength="180"')).join('')}${field('basePrice','Precio base',draft.basePrice,'number','min="0" max="1000000000000" step=".01" required')}<label class="admin-field">Moneda base<select name="baseCurrency">${['PYG','USD','EUR'].map(c => `<option ${c === draft.baseCurrency ? 'selected' : ''}>${c}</option>`).join('')}</select></label>${field('stock','Stock general',draft.stock,'number','min="0" step="1" required')}<label class="admin-field">Disponibilidad<select name="availability">${[['available','Disponible'],['preorder','Por encargo'],['unavailable','No disponible']].map(([v,l]) => `<option value="${v}" ${draft.availability === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>${longFields.map(([key,label]) => `<label class="admin-field admin-wide">${label}<textarea name="${key}" rows="${key === 'description' ? 3 : 2}" maxlength="6000">${e(displayText(draft[key]))}</textarea></label>`).join('')}</div><div class="admin-form-checks"><label><input type="checkbox" name="active" ${draft.active !== false ? 'checked' : ''}> Producto activo</label><label class="admin-switch"><input type="checkbox" role="switch" name="featured" ${draft.featured ? 'checked' : ''}> Producto destacado</label></div><div data-media-fields></div><div data-variant-fields></div><footer class="admin-form-footer"><button class="button button-secondary" type="button" data-dismiss>Cancelar</button><button class="button" type="submit">${product ? 'Guardar cambios' : 'Crear producto'}</button></footer></form>`, onDispose() { if (!committed && !saving) staged.forEach(url => assets.release(url)); onDisposed(); } });
  const form = modal.dialog.querySelector('form');
  const report = message => { if (modal.signal.aborted) return; const error = form.querySelector('[role="alert"]'); error.hidden = false; error.textContent = message; error.focus(); };
  const track = url => staged.add(url);
  mountMediaFields(form.querySelector('[data-media-fields]'), draft, assets, track, report, modal.signal);
  const variants = mountVariantFields(form.querySelector('[data-variant-fields]'), draft.variants, assets, track, report, modal.signal);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (form.dataset.saving) return;
    const data = new FormData(form);
    for (const [key] of [...textFields,...longFields]) draft[key] = { ...(typeof draft[key] === 'object' ? draft[key] : {}), es: data.get(key).trim() };
    draft.shortDescription = { ...draft.shortDescription, es: draft.description.es };
    Object.assign(draft, { basePrice: Number(data.get('basePrice')), baseCurrency: data.get('baseCurrency'), stock: Number(data.get('stock')), availability: data.get('availability'), active: data.has('active'), featured: data.has('featured'), variants: variants.read() });
    form.dataset.saving = 'true'; saving = true;
    const controls = [...form.querySelectorAll('input, select, textarea, button')]; controls.forEach(control => { control.disabled = true; });
    // Keep ownership until an async repository resolves, including navigation away.
    const retained = new Set(assets.references(draft));
    try {
      const saved = product ? await products.updateProduct(product.id, draft) : await products.createProduct(draft);
      committed = true;
      [...oldReferences, ...staged].filter(url => !retained.has(url)).forEach(url => assets.release(url));
      staged.clear();
      modal.close(true); onSaved(saved);
    } catch (error) { saving = false; if (modal.signal.aborted) staged.forEach(url => assets.release(url)); report(error.message); delete form.dataset.saving; controls.forEach(control => { control.disabled = false; }); }
  }, { signal: modal.signal });
  return modal.close;
}
