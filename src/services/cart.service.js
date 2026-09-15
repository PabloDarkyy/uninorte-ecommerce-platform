import { productService } from './product.service.js';
let items = [];
export const cartService = {
  async list() { return structuredClone(items); },
  async add(productId, variantId, quantity) {
    const product = await productService.getById(productId);
    const existing = items.find(item => item.productId === productId && item.variantId === variantId);
    const reserved = items.filter(item => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0);
    if (!product || !product.variants.some(variant => variant.id === variantId) || !Number.isInteger(quantity) || quantity < 1 || quantity + reserved > product.stock) {
      throw new Error('INVALID_CART_ITEM');
    }
    if (existing) existing.quantity += quantity;
    else items.push({ productId, variantId, quantity });
  },
  async remove(productId, variantId) { items = items.filter(item => item.productId !== productId || item.variantId !== variantId); },
};
