import { t } from '../../i18n/i18n.js';
import { e, displayText, field } from './shared.js';
export function mountVariantFields(root, initial, assets, track, report, signal) {
  let variants = structuredClone(initial || []);
  const localized = (old, value) => ({ ...(typeof old === 'object' ? old : {}), es: value.trim() });
  function read() {
    return [...root.querySelectorAll('[data-variant-row]')].map((row, i) => {
      const get = name => row.querySelector(`[data-v="${name}"]`).value;
      return { ...variants[i], id: get('id').trim(), name: localized(variants[i].name, get('name')), description: localized(variants[i].description, get('description')), price: get('price') === '' ? null : Number(get('price')), stock: Number(get('stock')) };
    });
  }
  function render() {
    root.innerHTML = `<div class="admin-row"><h3>Variantes</h3><button class="admin-action" type="button" data-add-variant>+ Agregar variante</button></div>${variants.map((v,i) => `<fieldset class="admin-variant" data-variant-row><legend>Variante ${i + 1}</legend><div class="admin-form-grid">${[['id','Identificador',v.id,'text'],['name','Nombre',displayText(v.name),'text'],['description','Descripción',displayText(v.description),'text'],['price','Precio opcional',v.price ?? '', 'number'],['stock','Stock',v.stock ?? 0,'number']].map(([key,label,value,type]) => field(`variant-${i}-${key}`,label,value,type,`data-v="${key}" ${['id','name','stock'].includes(key) ? 'required' : ''} ${type === 'number' ? `min="0" step="${key === 'price' ? '.01' : '1'}"` : ''}`)).join('')}</div><div class="admin-row">${v.image ? `<img class="admin-variant-image" src="${e(v.image)}" alt="${e(displayText(v.name))}"><button type="button" class="admin-action" data-remove-variant-image="${i}">Quitar imagen</button>` : ''}<label class="admin-file">Imagen opcional<input type="file" accept="image/png,image/jpeg,image/webp" data-variant-image="${i}"></label><label class="admin-file">${t('variantModel')}<input type="file" accept=".glb" data-variant-model="${i}"></label>${v.model3dUrl ? `<span>${t('modelLinked')}</span><button type="button" class="admin-action" data-remove-variant-model="${i}">${t('removeModel')}</button>` : ''}<button type="button" class="admin-action" data-remove-variant="${i}">Eliminar variante</button></div></fieldset>`).join('')}`;
  }
  root.addEventListener('click', event => {
    if (event.target.closest('[data-add-variant]')) { variants = read(); variants.push({ id: crypto.randomUUID(), name: { es: '' }, description: { es: '' }, stock: 0, price: null, image: null }); }
    else if (event.target.dataset.removeVariant !== undefined) { variants = read(); variants.splice(Number(event.target.dataset.removeVariant), 1); }
    else if (event.target.dataset.removeVariantImage !== undefined) { variants = read(); variants[Number(event.target.dataset.removeVariantImage)].image = null; }
    else if (event.target.dataset.removeVariantModel !== undefined) { variants=read();variants[Number(event.target.dataset.removeVariantModel)].model3dUrl=null; }
    else return;
    render();
    if (event.target.closest('[data-add-variant]')) root.querySelector('[data-variant-row]:last-child [data-v="name"]')?.focus();
  }, { signal });
  root.addEventListener('change', async event => {
    const model=event.target.dataset.variantModel !== undefined;
    if ((!model && event.target.dataset.variantImage === undefined) || !event.target.files[0]) return;
    const index = Number(model ? event.target.dataset.variantModel : event.target.dataset.variantImage);
    const rowId = variants[index];
    try {
      const asset = await assets[model ? 'uploadProductModel' : 'uploadProductImage'](event.target.files[0]);
      if (signal.aborted) { assets.release(asset.url); return; }
      track(asset.url); const current = variants.indexOf(rowId);
      if (current < 0) return;
      variants = read(); variants[current][model ? 'model3dUrl' : 'image'] = asset.url; render();
    } catch (error) { report(error.message); }
  }, { signal });
  render(); return { read };
}
