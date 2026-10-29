import { randomToken } from '../lib/crypto.js';
import { HttpError } from '../lib/http.js';
import { config } from '../config.js';

// Las sesiones viven en memoria del proceso del servidor (igual de efimeras
// que "la identidad activa vive en memoria" en auth-contracts.md, pero ahora
// respaldadas por un servidor real en vez del navegador). Reiniciar el
// backend cierra todas las sesiones activas.
const sessions = new Map();

export function createSession(userId) {
  const token = randomToken();
  const expiresAt = Date.now() + config.sessionTtlHours * 3600000;
  sessions.set(token, { userId, expiresAt });
  return token;
}

export function destroySession(token) {
  sessions.delete(token);
}

export function resolveSession(token) {
  const record = sessions.get(token);
  if (!record) return null;
  if (record.expiresAt < Date.now()) { sessions.delete(token); return null; }
  return record;
}

function tokenFromRequest(request) {
  const header = request.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1] : null;
}

export function requireAuth(store) {
  return async (ctx, next) => {
    const token = tokenFromRequest(ctx.request);
    const session = token ? resolveSession(token) : null;
    if (!session) throw new HttpError(401, 'Debes iniciar sesión para continuar.', 'UNAUTHENTICATED');
    const user = store.read().users.find(u => u.id === session.userId);
    if (!user) throw new HttpError(401, 'La sesión ya no es válida.', 'UNAUTHENTICATED');
    ctx.user = { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role };
    ctx.token = token;
    await next();
  };
}

export function requireAdmin() {
  return async (ctx, next) => {
    if (ctx.user?.role !== 'admin') throw new HttpError(403, 'Esta acción requiere una cuenta de Administración.', 'FORBIDDEN');
    await next();
  };
}

export function optionalAuth(store) {
  return async (ctx, next) => {
    const token = tokenFromRequest(ctx.request);
    const session = token ? resolveSession(token) : null;
    if (session) {
      const user = store.read().users.find(u => u.id === session.userId);
      if (user) ctx.user = { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role };
    }
    await next();
  };
}
