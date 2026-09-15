import { t } from '../../features/i18n/i18n.js';
const fields = {
  firstName: ['text', 'given-name'], lastName: ['text', 'family-name'], email: ['email', 'email'],
  password: ['password', 'new-password'], birthDate: ['date', 'bday'], phone: ['tel', 'tel'], address: ['text', 'street-address'],
};
export function authPage(mode) {
  const isRegister = mode === 'register';
  const keys = isRegister ? Object.keys(fields) : ['email', 'password'];
  return {
    html: `<div class="auth-layout"><h1>${t(mode)}</h1><p id="auth-notice">${t('authNotice')}</p><form class="panel" id="auth-form" aria-describedby="auth-notice">${keys.map(key => `<label for="${key}">${t(key)}</label><input id="${key}" type="${fields[key][0]}" autocomplete="${key === 'password' && !isRegister ? 'current-password' : fields[key][1]}">`).join('')}<button type="button" disabled>${t('authPending')}</button></form><p><a href="#/${isRegister ? 'login' : 'register'}">${t(isRegister ? 'login' : 'register')}</a></p></div>`,
    mount(root) { root.querySelector('form').addEventListener('submit', event => event.preventDefault()); },
  };
}
