import { apiRequest } from '../api.client.js';

function validate(file, model) {
  if (!file || !file.size) throw new Error('Selecciona un archivo con contenido.');
  if (model ? !/\.glb$/i.test(file.name) : !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error(model ? 'Selecciona un archivo .glb.' : 'Utiliza una imagen JPG, PNG o WebP.');
  }
  if (file.size > (model ? 100 : 10) * 1024 * 1024) throw new Error(model ? 'El modelo supera 100 MB.' : 'La imagen supera 10 MB.');
}

// Factoría local conservada para pruebas de frontend. No interviene en la instancia real.
export function createProductAssetService(urls = URL) {
  const owned = new Set();
  function select(file, model) {
    validate(file, model);
    const url = urls.createObjectURL(file); owned.add(url); return { url, name: file.name };
  }
  return {
    async uploadProductImage(file) { return select(file, false); },
    async uploadProductModel(file) { return select(file, true); },
    release(url) { if (owned.delete(url)) urls.revokeObjectURL(url); },
    references(p) { return [p.image, ...(p.images || []), p.model, p.model3dUrl, ...(p.variants || []).flatMap(v => [v.image, v.model3dUrl, v.model])].filter(Boolean); },
  };
}

export function createApiProductAssetService() {
  return {
    async uploadProductImage(file) {
      validate(file, false);
      const form = new FormData(); form.append('file', file);
      return apiRequest('/api/uploads/image', { method: 'POST', body: form, formData: true });
    },
    async uploadProductModel(file) {
      validate(file, true);
      const form = new FormData(); form.append('file', file);
      return apiRequest('/api/uploads/model', { method: 'POST', body: form, formData: true });
    },
    async release(url) {
      if (!url || /^blob:/.test(url)) return;
      try { await apiRequest('/api/uploads/release', { method: 'POST', body: { url } }); } catch { /* liberación idempotente */ }
    },
    references(p) { return [p.image, ...(p.images || []), p.model, p.model3dUrl, ...(p.variants || []).flatMap(v => [v.image, v.model3dUrl, v.model])].filter(Boolean); },
  };
}

export const productAssets = typeof window !== 'undefined' ? createApiProductAssetService() : createProductAssetService();
