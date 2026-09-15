import { e } from './shared.js';
// Administración del archivo; la escena 3D permanece en el visor compartido.
export function modelField(product) {
  const name = product.modelName || product.model?.split('/').at(-1) || '';
  return `<fieldset class="admin-media-block"><legend>Modelo 3D opcional</legend><p>${product.model ? `Modelo actual: <strong>${e(name)}</strong>` : 'Sin modelo 3D'}</p><label class="admin-file">${product.model ? 'Reemplazar modelo' : 'Seleccionar modelo'}<input type="file" accept=".glb" data-asset="model"></label>${product.model ? '<button class="admin-action" type="button" data-remove-model>Eliminar modelo</button>' : ''}<small>Archivo GLB local · Máximo 100 MB · Se puede ver al guardar.</small></fieldset>`;
}
export async function selectModel(file, assets) { return assets.uploadProductModel(file); }
