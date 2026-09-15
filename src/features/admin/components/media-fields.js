import { e } from './shared.js';
import { modelField, selectModel } from './model-field.js';
export function mountMediaFields(root, draft, assets, track, report, signal) {
  function render() {
    root.innerHTML = `<fieldset class="admin-media-block"><legend>Imagen principal</legend>${draft.image ? `<div class="admin-image-preview"><img src="${e(draft.image)}" alt="Imagen principal"><button type="button" class="admin-action" data-remove-main>Eliminar imagen</button></div>` : '<p>Sin imagen principal</p>'}<label class="admin-file">${draft.image ? 'Reemplazar imagen' : 'Seleccionar imagen'}<input type="file" accept="image/png,image/jpeg,image/webp" data-asset="image"></label><small>JPG, PNG o WebP · Máximo 10 MB por imagen</small></fieldset><fieldset class="admin-media-block"><legend>Imágenes adicionales</legend><div class="admin-image-gallery">${(draft.images || []).map((url, i) => `<div><img src="${e(url)}" alt="Imagen adicional ${i + 1}"><button type="button" class="admin-action" data-remove-image="${i}">Eliminar</button></div>`).join('')}</div><label class="admin-file">Agregar imágenes<input type="file" multiple accept="image/png,image/jpeg,image/webp" data-asset="images"></label></fieldset>${modelField(draft)}`;
  }
  root.addEventListener('change', async event => {
    const type = event.target.dataset.asset;
    if (!type) return;
    const files = [...event.target.files];
    event.target.disabled = true;
    try {
      for (const file of files) {
        const asset = type === 'model' ? await selectModel(file, assets) : await assets.uploadProductImage(file);
        if (signal.aborted) { assets.release(asset.url); return; }
        track(asset.url);
        if (type === 'images') draft.images.push(asset.url);
        else { draft[type] = asset.url; if (type === 'model') draft.modelName = asset.name; }
      }
      render();
    } catch (error) { report(error.message); if (!signal.aborted) render(); }
  }, { signal });
  root.addEventListener('click', event => {
    if (event.target.closest('[data-remove-main]')) draft.image = null;
    else if (event.target.closest('[data-remove-model]')) { draft.model = null; draft.modelName = null; }
    else if (event.target.dataset.removeImage !== undefined) draft.images.splice(Number(event.target.dataset.removeImage), 1);
    else return;
    render();
  }, { signal });
  render();
}
