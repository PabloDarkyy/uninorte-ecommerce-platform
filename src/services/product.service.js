import { apiRequest } from './api.client.js';
import { createMockProductRepository } from './products/mock-product-repository.js';
import { displayText } from '../utils/product-display.js';
import { DEMO_MODE } from '../config/api.js';

function quantity(value) { const n = Number(value); if (!Number.isSafeInteger(n) || n < 0) throw new Error('El stock debe ser un entero mayor o igual a cero.'); return n; }
function price(value) { const n = Number(value); if (!Number.isFinite(n) || n < 0 || n > 1e12) throw new Error('Introduce un precio válido mayor o igual a cero.'); return n; }
function validate(p) {
  if (!displayText(p.name).trim() || !displayText(p.category).trim()) throw new Error('Nombre y categoría son obligatorios.');
  if (!['PYG', 'USD', 'EUR'].includes(p.baseCurrency)) throw new Error('Moneda no admitida.');
  p.basePrice = price(p.basePrice); p.stock = quantity(p.stock);
  const ids = new Set();
  p.variants = (p.variants || []).map(v => {
    if (!v.id || ids.has(v.id) || !displayText(v.name).trim()) throw new Error('Cada variante necesita un identificador único y un nombre.');
    ids.add(v.id); return { ...v, stock: quantity(v.stock ?? 0), price: v.price == null || v.price === '' ? null : price(v.price) };
  });
  return p;
}

// Factoría mock conservada para las pruebas existentes.
export function createProductService(repository) {
  let pending = Promise.resolve();
  function mutate(operation) {
    const next = pending.then(async () => { const all = await repository.read(); const result = operation(all); await repository.write(all); return structuredClone(result); });
    pending = next.catch(() => {}); return next;
  }
  const service = {
    async list({ includeInactive = false } = {}) { await pending; return (await repository.read()).filter(p => includeInactive || p.active !== false); },
    async getById(id) { await pending; return (await repository.read()).find(p => p.id === id) ?? null; },
    createProduct(data) { return mutate(all => { const id = crypto.randomUUID(); const p = validate({ active: true, featured: false, image: null, images: [], model: null, stock: 0, variants: [], ...data, model: data.model3dUrl ?? data.model ?? null, id, slug: id }); delete p.model3dUrl; all.push(p); return p; }); },
    updateProduct(id, data) { return mutate(all => { const i = all.findIndex(p => p.id === id); if (i < 0) throw new Error('Producto no encontrado.'); const media = Object.hasOwn(data, 'model3dUrl') ? { model: data.model3dUrl } : {}; all[i] = validate({ ...all[i], ...data, ...media, id, slug: all[i].slug }); delete all[i].model3dUrl; return all[i]; }); },
    deactivateProduct(id) { return service.updateProduct(id, { active: false }); },
    setProductFeatured(id, featured) { return service.updateProduct(id, { featured: Boolean(featured) }); },
    async getInventory() { return (await service.list({ includeInactive: true })).flatMap(p => [{ productId: p.id, name: p.name, active: p.active, variantId: null, variantName: 'Stock general', stock: p.stock }, ...p.variants.map(v => ({ productId: p.id, name: p.name, active: p.active, variantId: v.id, variantName: v.name, stock: v.stock }))]).map(row => ({ ...row, status: row.stock === 0 ? 'Sin stock' : row.stock <= 5 ? 'Stock bajo' : 'Disponible' })); },
    updateStock(productId, variantId, stock) { return mutate(all => { const p = all.find(p => p.id === productId); if (!p) throw new Error('Producto no encontrado.'); const value = quantity(stock); if (variantId) { const target = p.variants.find(v => v.id === variantId); if (!target) throw new Error('Variante no encontrada.'); target.stock = value; } else { p.stock = value; p.variants.forEach(v => { v.stock = value; }); } return p; }); },
  };
  return service;
}

export function createApiProductService() {
  const service = {
    async list({ includeInactive = false } = {}) { return apiRequest(`/api/products${includeInactive ? '?includeInactive=true' : ''}`); },
    async getById(id) { return apiRequest(`/api/products/${encodeURIComponent(id)}`); },
    async createProduct(data) { return apiRequest('/api/products', { method: 'POST', body: data }); },
    async updateProduct(id, data) { return apiRequest(`/api/products/${encodeURIComponent(id)}`, { method: 'PUT', body: data }); },
    async deactivateProduct(id) { return apiRequest(`/api/products/${encodeURIComponent(id)}/deactivate`, { method: 'POST' }); },
    async setProductFeatured(id, featured) { return apiRequest(`/api/products/${encodeURIComponent(id)}/featured`, { method: 'PUT', body: { featured: Boolean(featured) } }); },
    async getInventory() { return apiRequest('/api/products/inventory'); },
    async updateStock(productId, variantId, stock) {
      if (!variantId) {
        const product = await service.getById(productId);
        await Promise.all(product.variants.map(variant => service.updateStock(productId, variant.id, stock)));
      }
      return apiRequest(`/api/products/${encodeURIComponent(productId)}/stock`, { method: 'PUT', body: { variantId: variantId || null, stock } });
    },
  };
  return service;
}

export const productService = typeof window === 'undefined' || DEMO_MODE
  ? createProductService(createMockProductRepository())
  : createApiProductService();
