import { createAccountSeed } from '../mocks/account-data.js';
const KEY = 'uninorte.account.demo.v1';

export function createAccountRepository(storage) {
  let key = KEY;
  let state = createAccountSeed();
  try {
    const saved = JSON.parse(storage?.getItem(KEY) || 'null');
    if (saved?.version === 1 && saved.user?.id && Array.isArray(saved.addresses) && Array.isArray(saved.orders) && saved.preferences) state = saved;
  } catch { /* Un almacenamiento no disponible/corrupto conserva la demostración en memoria. */ }
  return {
    activate(user) {
      key=user.id==='customer-demo'?KEY:`globalizat.account.${user.id}.v1`;
      state=createAccountSeed();
      if(user.id!=='customer-demo') {state.user={...state.user,...user,phone:'',birthDate:'',avatar:null};state.addresses=[];state.orders=[];}
      try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved?.version===1&&saved.user?.id===user.id&&Array.isArray(saved.addresses)&&Array.isArray(saved.orders)&&saved.preferences)state=saved;}catch{/* Use this user's fresh local profile. */}
    },
    read: () => structuredClone(state),
    commit(update) {
      const next = structuredClone(state);
      update(next);
      if (storage) {
        try { storage.setItem(key, JSON.stringify(next)); }
        catch { throw new Error('No se pudieron guardar los cambios. Intenta con una foto más pequeña o libera espacio del navegador.'); }
      }
      state = next;
      return structuredClone(state);
    },
  };
}
