import { displayText } from '../../utils/product-display.js';
export function createMockAnalyticsService(products, orders, random = Math.random, now = () => new Date()) {
  let generation = 0;
  return { async createSnapshot() {
    const [catalog, purchases, inventory] = await Promise.all([products.list(), orders.list(), products.getInventory()]);
    const date = now();
    const periods = Array.from({ length: 6 }, (_, i) => ({ label: `Periodo ${i + 1}`, units: 0 }));
    const salesByProduct = catalog.map(p => {
      const byPeriod = periods.map(() => 1 + Math.floor(random() * 8));
      byPeriod.forEach((units, i) => { periods[i].units += units; });
      const units = byPeriod.reduce((sum, n) => sum + n, 0);
      return { productId: p.id, name: displayText(p.name), units, unitPrice: p.basePrice, currency: p.baseCurrency, revenue: p.basePrice * units };
    });
    const revenue = Object.entries(salesByProduct.reduce((totals, r) => { totals[r.currency] = (totals[r.currency] || 0) + r.revenue; return totals; }, {})).map(([currency, amount]) => ({ currency, amount }));
    return {
      id: ++generation, generatedAt: date.toISOString(), period: date.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' }),
      activeProducts: catalog.length, units: salesByProduct.reduce((sum, r) => sum + r.units, 0), revenue,
      ordersCount: purchases.filter(o => ['preparing', 'in_transit'].includes(o.status)).length,
      lowStockProducts: new Set(inventory.filter(r => r.active !== false && r.stock <= 5).map(r => r.productId)).size,
      stockAlerts: inventory.filter(r => r.active !== false && r.stock <= 5), salesByProduct, salesByPeriod: periods,
      topProducts: [...salesByProduct].sort((a, b) => b.units - a.units).slice(0, 3),
      recentActivity: purchases.slice(0, 3).map(o => ({ id: o.id, createdAt: o.createdAt, status: o.status, total: o.total, currency: o.currency })),
    };
  } };
}
