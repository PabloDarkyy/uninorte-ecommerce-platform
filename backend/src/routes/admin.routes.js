import { HttpError, sendJson } from '../lib/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const publicUser = u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role });

export function registerAdminRoutes(router, { store }) {
  router.get('/api/admin/customers', requireAuth(store), requireAdmin(), async ctx => {
    sendJson(ctx.response, 200, store.read().users.map(publicUser));
  });

  router.get('/api/admin/customers/:id', requireAuth(store), requireAdmin(), async ctx => {
    const user = store.read().users.find(u => u.id === ctx.params.id);
    if (!user) throw new HttpError(404, 'Cliente no encontrado.', 'NOT_FOUND');
    sendJson(ctx.response, 200, publicUser(user));
  });
}
