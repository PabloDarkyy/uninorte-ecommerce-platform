import { hashPassword, verifyPassword, randomId } from '../lib/crypto.js';
import { HttpError, sendJson } from '../lib/http.js';
import { createSession, destroySession, requireAuth } from '../middleware/auth.js';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const identity = user => ({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role });

function emptyAccount(user) {
  return {
    profile: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: '', birthDate: '', avatar: null },
    addresses: [],
    preferences: { language: 'es', currency: 'PYG', rememberCurrency: true, showFeatured: true, receiveNews: false },
  };
}

export function registerAuthRoutes(router, { store }) {
  router.post('/api/auth/register', async ctx => {
    let { firstName, lastName, email, password } = ctx.body || {};
    firstName = String(firstName || '').trim();
    lastName = String(lastName || '').trim();
    email = String(email || '').trim().toLowerCase();
    if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80 || !EMAIL_RE.test(email) || email.length > 160
      || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      throw new HttpError(400, 'Revisa los datos de registro: nombre, apellido, correo y una contraseña de al menos 8 caracteres.', 'VALIDATION');
    }
    const { salt, digest } = await hashPassword(password);
    const user = { id: randomId('customer'), firstName, lastName, email, role: 'customer', salt, digest, createdAt: new Date().toISOString() };
    await store.commit(state => {
      if (state.users.some(u => u.email === email)) throw new HttpError(409, 'Ya existe una cuenta registrada con ese correo.', 'ALREADY_EXISTS');
      state.users.push(user);
      state.accounts[user.id] = emptyAccount(user);
    });
    const token = createSession(user.id);
    sendJson(ctx.response, 201, { token, user: identity(user) });
  });

  router.post('/api/auth/login', async ctx => {
    const { email, password } = ctx.body || {};
    const normalized = String(email || '').trim().toLowerCase();
    const user = store.read().users.find(u => u.email === normalized);
    if (!user || !(await verifyPassword(String(password || ''), user.salt, user.digest))) {
      throw new HttpError(401, 'Correo o contraseña incorrectos.', 'INVALID_CREDENTIALS');
    }
    const token = createSession(user.id);
    sendJson(ctx.response, 200, { token, user: identity(user) });
  });

  router.post('/api/auth/login-demo', async ctx => {
    const user = store.read().users.find(u => u.id === 'customer-demo');
    if (!user) throw new HttpError(500, 'La cuenta de demostración no está disponible.', 'SEED_MISSING');
    const token = createSession(user.id);
    sendJson(ctx.response, 200, { token, user: identity(user) });
  });

  router.post('/api/auth/logout', requireAuth(store), async ctx => {
    destroySession(ctx.token);
    sendJson(ctx.response, 200, {});
  });

  router.get('/api/auth/me', requireAuth(store), async ctx => {
    sendJson(ctx.response, 200, ctx.user);
  });
}
