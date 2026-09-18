import { productService } from './product.service.js';
import { convertPrice, getCurrency } from '../features/currency/currency.js';
export function createCartService(products) {
  let items = [], pending = Promise.resolve(), revision = 0;
  const listeners = new Set();
  const notify = () => { revision++; listeners.forEach(fn => fn()); };
  function mutate(fn) { const task = pending.then(fn); pending = task.catch(() => {}); return task; }
  async function resolve(item, collection = items) {
    const product = await products.getById(item.productId), variant = product?.variants.find(v => v.id === item.variantId);
    if (!product || product.active === false || product.availability === 'unavailable' || (item.variantId && !variant)) throw new Error('INVALID_CART_ITEM');
    const total = collection.filter(i => i.productId === item.productId).reduce((n,i) => n+i.quantity,0);
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || total > product.stock || item.quantity > (variant?.stock ?? product.stock)) throw new Error('INSUFFICIENT_STOCK');
    return { ...item, product, variant, unitPrice: variant?.price ?? product.basePrice, baseCurrency: product.baseCurrency };
  }
  async function summary(currency = getCurrency()) {
    const rows = await Promise.all(items.map(item => resolve(item)));
    rows.forEach(row => { row.unitPrice = Math.round(convertPrice(row.unitPrice,row.baseCurrency,currency)*(currency==='PYG'?1:100))/(currency==='PYG'?1:100); row.subtotal = row.unitPrice*row.quantity; });
    const total = Math.round(rows.reduce((n,row)=>n+row.subtotal,0)*100)/100;
    return { rows, total, subtotal: total, currency, revision, count: rows.reduce((n,row)=>n+row.quantity,0) };
  }
  const service = {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async list() { await pending; return structuredClone(items); },
    async getCart() { return service.list(); },
    async getItemCount() { return (await service.list()).reduce((n,i)=>n+i.quantity,0); },
    async getSummary(currency) { await pending; return summary(currency); },
    addItem(productId, variantId, quantity) { return mutate(async () => {
      if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('INVALID_CART_ITEM');
      const id = JSON.stringify([productId,variantId || null]), next = structuredClone(items), existing = next.find(i=>i.id===id);
      const item = existing || { id, productId, variantId: variantId || null, quantity: 0 };
      item.quantity += quantity; if(!existing)next.push(item);
      const row = await resolve(item,next); item.unitPrice = row.unitPrice; item.baseCurrency = row.baseCurrency;
      items = next; notify(); return structuredClone(item);
    }); },
    updateQuantity(id, quantity) { return mutate(async()=>{ const next=structuredClone(items), item=next.find(i=>i.id===id); if(!item)throw new Error('INVALID_CART_ITEM');item.quantity=quantity;await resolve(item,next);items=next;notify(); }); },
    removeItem(id) { return mutate(()=>{items=items.filter(i=>i.id!==id);notify();}); },
    clearCart() { return mutate(()=>{items=[];notify();}); },
    confirm(expected, currency, createOrder) { return mutate(async()=>{ if(revision!==expected)throw new Error('CART_CHANGED');const current=await summary(currency);if(!current.rows.length)throw new Error('EMPTY_CART');const order=await createOrder(current);items=[];notify();return order; }); },
    add(...args) { return service.addItem(...args); },
    remove(productId,variantId) { return service.removeItem(JSON.stringify([productId,variantId || null])); },
  };
  return service;
}
export const cartService = createCartService(productService);
