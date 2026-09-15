// Recursos temporales: el editor descarta lo no guardado y transfiere lo guardado al catálogo.
export function createProductAssetService(urls = URL) {
  const owned = new Set();
  function select(file, model) {
    if (!file || !file.size) throw new Error('Selecciona un archivo con contenido.');
    if (model ? !/\.glb$/i.test(file.name) : !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error(model ? 'Selecciona un archivo .glb.' : 'Utiliza una imagen JPG, PNG o WebP.');
    if (file.size > (model ? 100 : 10) * 1024 * 1024) throw new Error(model ? 'El modelo supera 100 MB.' : 'La imagen supera 10 MB.');
    const url = urls.createObjectURL(file); owned.add(url); return { url, name: file.name };
  }
  return {
    async uploadProductImage(file) { return select(file, false); },
    async uploadProductModel(file) { return select(file, true); },
    release(url) { if (owned.delete(url)) urls.revokeObjectURL(url); },
    references(p) { return [p.image, ...(p.images || []), p.model, ...(p.variants || []).map(v => v.image)].filter(Boolean); },
  };
}
export const productAssets = createProductAssetService();
