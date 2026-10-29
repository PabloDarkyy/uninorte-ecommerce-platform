import { HttpError, sendJson } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { validateAddress, assertCurrency } from '../domain/validation.js';
import { convertPrice, roundForCurrency } from '../domain/currency.js';
import { hydrateOrder } from '../domain/orders.js';
import { randomId } from '../lib/crypto.js';

export function registerOrderRoutes(router, { store }) {
  router.post('/api/orders', requireAuth(store), async ctx => {
    const { items, currency, shippingAddress, requestId } = ctx.body || {};
    if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'El carrito está vacío.', 'INVALID_ORDER');
    assertCurrency(currency);
    if (!shippingAddress) throw new HttpError(400, 'Falta la dirección de envío.', 'INVALID_ORDER');

    const state = store.read();
    const existing = requestId && state.orders.find(o => o.requestId === requestId && o.userId === ctx.user.id);
    if (existing) return sendJson(ctx.response, 200, hydrateOrder(existing, state.products));

    const address = validateAddress(shippingAddress, ctx.user.id, undefined);
    delete address.id; delete address.isPrimary;
    address.postalCode = String(shippingAddress.postalCode || '').slice(0, 24);

    const normalized = [];
    const counts = new Map();
    const identities = new Set();
    for (const item of items) {
      const product = state.products.find(p => p.id === item.productId);
      const variant = product?.variants.find(v => v.id === item.variantId);
      const identity = JSON.stringify([item.productId, item.variantId]);
      counts.set(item.productId, (counts.get(item.productId) || 0) + item.quantity);
      const validQuantity = Number.isSafeInteger(item.quantity) && item.quantity >= 1;
      if (!product || product.active === false || product.availability === 'unavailable'
        || (item.variantId && !variant) || identities.has(identity) || !validQuantity
        || counts.get(product.id) > product.stock || item.quantity > (variant?.stock ?? product.stock)) {
        throw new HttpError(409, 'Alguno de los productos ya no tiene el stock solicitado.', 'INSUFFICIENT_STOCK');
      }
      identities.add(identity);
      const unitPrice = roundForCurrency(convertPrice(variant?.price ?? product.basePrice, product.baseCurrency, currency), currency);
      if (unitPrice !== item.unitPrice) throw new HttpError(409, 'Los precios del carrito cambiaron. Revisa el resumen antes de confirmar.', 'CART_CHANGED');
      normalized.push({ productId: product.id, variantId: variant?.id || null, quantity: item.quantity, unitPrice });
    }

    const createdAt = new Date().toISOString();
    const estimatedFrom = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const estimatedTo = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    const estimatedDelivery = `${estimatedFrom} / ${estimatedTo}`;
    const order = {
      id: `ORD-${randomId().slice(0, 8).toUpperCase()}`, requestId: requestId || null, userId: ctx.user.id,
      items: normalized, currency, total: normalized.reduce((n, i) => n + i.unitPrice * i.quantity, 0),
      shippingAddress: address, createdAt, status: 'preparing', estimatedDelivery, trackingStep: 0,
    };

    const stored = await store.commit(next => {
      const duplicate = requestId && next.orders.find(o => o.requestId === requestId && o.userId === ctx.user.id);
      if (duplicate) return duplicate;

      // Revalida el estado comercial dentro de la misma operación serializada
      // y descuenta inventario solo cuando el pedido se confirma.
      const productsById = new Map(next.products.map(product => [product.id, product]));
      for (const item of normalized) {
        const product = productsById.get(item.productId);
        const variant = product?.variants.find(v => v.id === item.variantId);
        if (!product || product.active === false || product.availability === 'unavailable'
          || (item.variantId && !variant) || item.quantity > (variant?.stock ?? product.stock) || item.quantity > product.stock) {
          throw new HttpError(409, 'Alguno de los productos ya no tiene el stock solicitado.', 'INSUFFICIENT_STOCK');
        }
        const currentUnitPrice = roundForCurrency(convertPrice(variant?.price ?? product.basePrice, product.baseCurrency, currency), currency);
        if (currentUnitPrice !== item.unitPrice) throw new HttpError(409, 'Los precios del carrito cambiaron. Revisa el resumen antes de confirmar.', 'CART_CHANGED');
      }
      for (const item of normalized) {
        const product = productsById.get(item.productId);
        product.stock -= item.quantity;
        const variant = product.variants.find(v => v.id === item.variantId);
        if (variant) variant.stock -= item.quantity;
      }
      next.orders.unshift(order);
      return order;
    });
    sendJson(ctx.response, existing ? 200 : 201, hydrateOrder(stored, store.read().products));
  });

  router.get('/api/orders', requireAuth(store), async ctx => {
    const state = store.read();
    const wantsAll = ctx.query.get('all') === 'true' && ctx.user.role === 'admin';
    const orders = state.orders
      .filter(o => wantsAll || o.userId === ctx.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(o => hydrateOrder(o, state.products));
    sendJson(ctx.response, 200, orders);
  });

  router.get('/api/orders/:id', requireAuth(store), async ctx => {
    const state = store.read();
    const order = state.orders.find(o => o.id === ctx.params.id);
    if (!order) throw new HttpError(404, 'No encontramos ese pedido.', 'NOT_FOUND');
    if (order.userId !== ctx.user.id && ctx.user.role !== 'admin') throw new HttpError(403, 'No tienes acceso a este pedido.', 'FORBIDDEN');
    sendJson(ctx.response, 200, hydrateOrder(order, state.products));
  });
}
