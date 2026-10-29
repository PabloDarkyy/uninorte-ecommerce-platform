import { HttpError, sendJson } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

const LANGUAGES = ['es', 'en'];
const CURRENCIES = ['PYG', 'USD', 'EUR'];

export function registerPreferenceRoutes(router, { store }) {
  router.get('/api/account/preferences', requireAuth(store), async ctx => {
    sendJson(ctx.response, 200, store.read().accounts[ctx.user.id].preferences);
  });

  router.put('/api/account/preferences', requireAuth(store), async ctx => {
    const data = ctx.body || {};
    if (!LANGUAGES.includes(data.language) || !CURRENCIES.includes(data.currency)) {
      throw new HttpError(400, 'Selecciona un idioma y una moneda válidos.', 'VALIDATION');
    }
    const preferences = {
      language: data.language, currency: data.currency,
      rememberCurrency: Boolean(data.rememberCurrency), showFeatured: Boolean(data.showFeatured), receiveNews: Boolean(data.receiveNews),
    };
    await store.commit(state => { state.accounts[ctx.user.id].preferences = preferences; });
    sendJson(ctx.response, 200, preferences);
  });
}
