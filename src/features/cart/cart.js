import { cartService } from '../../services/cart.service.js';
import { productService } from '../../services/product.service.js';
import { convertPrice } from '../currency/currency.js';
export async function getCartSummary() {
  const items = await cartService.list();
  const rows = await Promise.all(items.map(async item => {
    const product = await productService.getById(item.productId);
    if (!product) return null;
    return { ...item, product, variant: product.variants.find(variant => variant.id === item.variantId), subtotal: convertPrice(product.basePrice, product.baseCurrency, 'PYG') * item.quantity };
  }));
  const validRows = rows.filter(Boolean);
  return { rows: validRows, total: validRows.reduce((sum, row) => sum + row.subtotal, 0) };
}
