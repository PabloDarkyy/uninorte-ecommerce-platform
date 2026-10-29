import { HttpError, sendJson } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { validateAddress } from '../domain/validation.js';
import { randomId } from '../lib/crypto.js';

export function registerAddressRoutes(router, { store }) {
  router.get('/api/account/addresses', requireAuth(store), async ctx => {
    const account = store.read().accounts[ctx.user.id];
    sendJson(ctx.response, 200, account.addresses);
  });

  // Creacion (sin id) y edicion (con id) comparten el mismo endpoint, como en
  // AddressService.save(data) del contrato documentado.
  router.post('/api/account/addresses', requireAuth(store), async ctx => saveAddress(ctx, store, ctx.body?.id));
  router.put('/api/account/addresses/:id', requireAuth(store), async ctx => saveAddress(ctx, store, ctx.params.id));

  router.delete('/api/account/addresses/:id', requireAuth(store), async ctx => {
    const addresses = await store.commit(state => {
      const account = state.accounts[ctx.user.id];
      if (!account.addresses.some(a => a.id === ctx.params.id)) throw new HttpError(404, 'La dirección ya no existe.', 'NOT_FOUND');
      account.addresses = account.addresses.filter(a => a.id !== ctx.params.id);
      if (account.addresses.length && !account.addresses.some(a => a.isPrimary)) account.addresses[0].isPrimary = true;
      return account.addresses;
    });
    sendJson(ctx.response, 200, addresses);
  });

  router.post('/api/account/addresses/:id/primary', requireAuth(store), async ctx => {
    const addresses = await store.commit(state => {
      const account = state.accounts[ctx.user.id];
      if (!account.addresses.some(a => a.id === ctx.params.id)) throw new HttpError(404, 'La dirección ya no existe.', 'NOT_FOUND');
      account.addresses.forEach(a => { a.isPrimary = a.id === ctx.params.id; });
      return account.addresses;
    });
    sendJson(ctx.response, 200, addresses);
  });
}

async function saveAddress(ctx, store, id) {
  const data = ctx.body || {};
  const addresses = await store.commit(state => {
    const account = state.accounts[ctx.user.id];
    if (id && !account.addresses.some(a => a.id === id)) throw new HttpError(404, 'La dirección ya no existe.', 'NOT_FOUND');
    const address = validateAddress(data, ctx.user.id, id || randomId('address'));
    const index = account.addresses.findIndex(a => a.id === address.id);
    if (!account.addresses.length || (index >= 0 && account.addresses[index].isPrimary)) address.isPrimary = true;
    if (address.isPrimary) account.addresses.forEach(a => { a.isPrimary = false; });
    if (index >= 0) account.addresses[index] = address; else account.addresses.push(address);
    return account.addresses;
  });
  sendJson(ctx.response, id ? 200 : 201, addresses);
}
