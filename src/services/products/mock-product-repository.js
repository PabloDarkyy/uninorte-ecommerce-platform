import { products } from '../../data/products.js';
export function createMockProductRepository(seed = products) {
  let state = structuredClone(seed).map(p => ({ active: true, images: [], availability: 'available', ...p, variants: p.variants.map(v => ({ stock: 0, ...v })) }));
  return { async read() { return structuredClone(state); }, async write(next) { state = structuredClone(next); } };
}
