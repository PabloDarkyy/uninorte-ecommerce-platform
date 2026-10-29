import { HttpError, sendJson } from '../lib/http.js';
import { optionalAuth, requireAuth, requireAdmin } from '../middleware/auth.js';
import { validateProduct, quantity } from '../domain/validation.js';
import { randomId } from '../lib/crypto.js';

function rowsForInventory(products) {
  return products.flatMap(p => [
    { productId: p.id, name: p.name, active: p.active, variantId: null, variantName: 'Stock general', stock: p.stock },
    ...p.variants.map(v => ({ productId: p.id, name: p.name, active: p.active, variantId: v.id, variantName: v.name, stock: v.stock })),
  ]).map(row => ({ ...row, status: row.stock === 0 ? 'Sin stock' : row.stock <= 5 ? 'Stock bajo' : 'Disponible' }));
}

export function registerProductRoutes(router, { store }) {
  // list({ includeInactive = false }): solo Administración puede pedir los inactivos.
  router.get('/api/products', optionalAuth(store), async ctx => {
    const wantsInactive = ctx.query.get('includeInactive') === 'true' && ctx.user?.role === 'admin';
    const products = store.read().products.filter(p => wantsInactive || p.active !== false);
    sendJson(ctx.response, 200, products);
  });

  router.get('/api/products/inventory', requireAuth(store), requireAdmin(), async ctx => {
    sendJson(ctx.response, 200, rowsForInventory(store.read().products));
  });

  // getById expone tambien productos inactivos: los pedidos historicos y
  // Administración necesitan poder resolverlos (admin-contracts.md).
  router.get('/api/products/:id', async ctx => {
    const product = store.read().products.find(p => p.id === ctx.params.id) ?? null;
    sendJson(ctx.response, 200, product);
  });

  router.post('/api/products', requireAuth(store), requireAdmin(), async ctx => {
    const product = await store.commit(state => {
      const id = randomId('product');
      const p = validateProduct(ctx.body || {}, {});
      p.id = id; p.slug = id;
      state.products.push(p);
      return p;
    });
    sendJson(ctx.response, 201, product);
  });

  router.put('/api/products/:id', requireAuth(store), requireAdmin(), async ctx => {
    const product = await store.commit(state => {
      const index = state.products.findIndex(p => p.id === ctx.params.id);
      if (index < 0) throw new HttpError(404, 'Producto no encontrado.', 'NOT_FOUND');
      const updated = validateProduct(ctx.body || {}, state.products[index]);
      updated.id = ctx.params.id; updated.slug = state.products[index].slug;
      state.products[index] = updated;
      return updated;
    });
    sendJson(ctx.response, 200, product);
  });

  router.post('/api/products/:id/deactivate', requireAuth(store), requireAdmin(), async ctx => {
    const product = await store.commit(state => {
      const index = state.products.findIndex(p => p.id === ctx.params.id);
      if (index < 0) throw new HttpError(404, 'Producto no encontrado.', 'NOT_FOUND');
      state.products[index] = validateProduct({ active: false }, state.products[index]);
      return state.products[index];
    });
    sendJson(ctx.response, 200, product);
  });

  router.put('/api/products/:id/featured', requireAuth(store), requireAdmin(), async ctx => {
    const product = await store.commit(state => {
      const index = state.products.findIndex(p => p.id === ctx.params.id);
      if (index < 0) throw new HttpError(404, 'Producto no encontrado.', 'NOT_FOUND');
      state.products[index] = validateProduct({ featured: Boolean(ctx.body?.featured) }, state.products[index]);
      return state.products[index];
    });
    sendJson(ctx.response, 200, product);
  });

  // updateStock(productId, variantId, quantity): variantId null actualiza el stock general.
  router.put('/api/products/:id/stock', requireAuth(store), requireAdmin(), async ctx => {
    const { variantId = null, stock } = ctx.body || {};
    const product = await store.commit(state => {
      const p = state.products.find(p => p.id === ctx.params.id);
      if (!p) throw new HttpError(404, 'Producto no encontrado.', 'NOT_FOUND');
      const target = variantId ? p.variants.find(v => v.id === variantId) : p;
      if (!target) throw new HttpError(404, 'Variante no encontrada.', 'NOT_FOUND');
      target.stock = quantity(stock);
      return p;
    });
    sendJson(ctx.response, 200, product);
  });
}
