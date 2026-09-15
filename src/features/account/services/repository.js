import { createAccountSeed } from '../mocks/account-data.js';
const KEY = 'uninorte.account.demo.v1';

export function createAccountRepository(storage) {
  let state = createAccountSeed();
  try {
    const saved = JSON.parse(storage?.getItem(KEY) || 'null');
    if (saved?.version === 1 && saved.user?.id && Array.isArray(saved.addresses) && Array.isArray(saved.orders) && saved.preferences) state = saved;
  } catch { /* Un almacenamiento no disponible/corrupto conserva la demostración en memoria. */ }
  return {
    read: () => structuredClone(state),
    commit(update) {
      const next = structuredClone(state);
      update(next);
      if (storage) {
        try { storage.setItem(KEY, JSON.stringify(next)); }
        catch { throw new Error('No se pudieron guardar los cambios. Intenta con una foto más pequeña o libera espacio del navegador.'); }
      }
      state = next;
      return structuredClone(state);
    },
  };
}
