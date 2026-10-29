import { sendJson } from '../lib/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { localizedText } from '../domain/validation.js';
import { convertPrice, roundForCurrency } from '../domain/currency.js';

let generation = 0;

function inventoryRows(products) {
  return products.flatMap(p => [
    { productId: p.id, name: p.name, active: p.active, variantId: null, variantName: 'Stock general', stock: p.stock },
    ...p.variants.map(v => ({ productId: p.id, name: p.name, active: p.active, variantId: v.id, variantName: v.name, stock: v.stock })),
  ]).map(row => ({ ...row, status: row.stock === 0 ? 'Sin stock' : row.stock <= 5 ? 'Stock bajo' : 'Disponible' }));
}

function monthKey(value) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('es-PY', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function registerAnalyticsRoutes(router, { store }) {
  router.get('/api/analytics/snapshot', requireAuth(store), requireAdmin(), async ctx => {
    const state = store.read();
    const catalog = state.products.filter(p => p.active !== false);
    const orders = state.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const inventory = inventoryRows(state.products);
    const date = new Date();
    const months = [];
    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - offset, 1));
      months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    const periods = months.map(key => ({ label: monthLabel(key), units: 0 }));
    const sales = new Map(catalog.map(p => [p.id, { productId: p.id, name: localizedText(p.name), units: 0, unitPrice: p.basePrice, currency: p.baseCurrency, revenue: 0 }]));

    for (const order of orders) {
      if (['cancelled', 'refunded'].includes(order.status)) continue;
      const period = periods.find((_, index) => months[index] === monthKey(order.createdAt));
      if (period) {
        for (const item of order.items) period.units += item.quantity;
      }
      for (const item of order.items) {
        const row = sales.get(item.productId);
        const product = catalog.find(p => p.id === item.productId) || state.products.find(p => p.id === item.productId);
        if (!row || !product) continue;
        row.units += item.quantity;
        row.unitPrice = product.basePrice;
        row.revenue += roundForCurrency(convertPrice(item.unitPrice, order.currency, product.baseCurrency), product.baseCurrency) * item.quantity;
      }
    }

    const salesByProduct = [...sales.values()].map(row => ({ ...row, revenue: roundForCurrency(row.revenue, row.currency) }));
    const totalsByCurrency = salesByProduct.reduce((totals, row) => {
      totals[row.currency] = (totals[row.currency] || 0) + row.revenue;
      return totals;
    }, {});
    const revenueByCurrency = Object.entries(totalsByCurrency).map(([currency, amount]) => ({
      currency, amount: roundForCurrency(amount, currency),
    }));

    sendJson(ctx.response, 200, {
      id: ++generation,
      generatedAt: date.toISOString(),
      period: date.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' }),
      activeProducts: catalog.length,
      units: salesByProduct.reduce((sum, r) => sum + r.units, 0),
      revenue: revenueByCurrency,
      ordersCount: orders.filter(o => ['preparing', 'in_transit'].includes(o.status)).length,
      lowStockProducts: new Set(inventory.filter(r => r.active !== false && r.stock <= 5).map(r => r.productId)).size,
      stockAlerts: inventory.filter(r => r.active !== false && r.stock <= 5),
      salesByProduct,
      salesByPeriod: periods,
      topProducts: [...salesByProduct].sort((a, b) => b.units - a.units).slice(0, 3),
      recentActivity: orders.slice(0, 3).map(o => ({ id: o.id, createdAt: o.createdAt, status: o.status, total: o.total, currency: o.currency })),
    });
  });
}
