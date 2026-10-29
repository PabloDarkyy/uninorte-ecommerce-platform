import { HttpError, sendJson } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { buildTracking, isActiveOrder, advanceTrackingCycle } from '../domain/tracking.js';

export function registerTrackingRoutes(router, { store }) {
  // Avanza el escenario ficticio de cada pedido activo del usuario y
  // devuelve el snapshot resultante, igual que trackingService.enter().
  router.post('/api/tracking/enter', requireAuth(store), async ctx => {
    const snapshots = await store.commit(state => {
      const active = state.orders.filter(o => o.userId === ctx.user.id && isActiveOrder(o));
      const result = {};
      for (const order of active) {
        advanceTrackingCycle(order);
        result[order.id] = buildTracking(order);
      }
      return result;
    });
    sendJson(ctx.response, 200, snapshots);
  });

  router.get('/api/tracking/:orderId', requireAuth(store), async ctx => {
    const state = store.read();
    const order = state.orders.find(o => o.id === ctx.params.orderId);
    if (!order) throw new HttpError(404, 'No encontramos ese pedido.', 'NOT_FOUND');
    if (order.userId !== ctx.user.id && ctx.user.role !== 'admin') throw new HttpError(403, 'No tienes acceso a este pedido.', 'FORBIDDEN');
    if (!isActiveOrder(order)) throw new HttpError(409, 'Este pedido ya no tiene un seguimiento activo.', 'ORDER_NOT_ACTIVE');
    sendJson(ctx.response, 200, buildTracking(order));
  });
}
