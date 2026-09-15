import { accountServices } from './services/index.js';
import { isActiveOrder } from './domain.js';
import { e, avatar, icon } from './components/shared.js';
import { summaryView } from './components/summary.js';
import { profileView } from './components/profile.js';
import { ordersView, orderDetail } from './components/orders.js';
import { addressesView } from './components/addresses.js';
import { preferencesView } from './components/preferences.js';

const sections = {
  summary: ['Resumen', 'Todo lo tuyo, en un mismo lugar.'],
  profile: ['Mi perfil', 'Tus datos, siempre al día.'],
  tracking: ['Seguimiento', 'Acompaña el recorrido de tus pedidos.'],
  history: ['Historial de pedidos', 'Productos que ya forman parte de tu historia.'],
  addresses: ['Direcciones', 'Los lugares donde llegan tus favoritos.'],
  preferences: ['Preferencias', 'Pequeños detalles que hacen tu experiencia.'],
};

export async function accountPage(path, services = accountServices) {
  const [, , requested = 'summary', orderId] = path.split('/');
  const section = Object.hasOwn(sections, requested) ? requested : 'summary';
  const { userService, orderService, addressService, trackingService, preferenceService } = services;
  let [user, orders, preferences] = await Promise.all([userService.getCurrentUser(), orderService.list(), preferenceService.get()]);
  let trackings = {}, detail, tracking;
  if (section === 'tracking' && !orderId) trackings = await trackingService.enter();
  if (orderId && ['tracking', 'history'].includes(section)) {
    detail = await orderService.getById(orderId);
    if (section === 'tracking') tracking = await trackingService.getByOrderId(orderId);
  }
  let editingProfile = false, editingAddress = null, deletingAddress = null;
  let avatarPreview, avatarToken = 0, avatarPending = false, busy = false, disposed = false;
  function content() {
    if (detail) return orderDetail(detail, tracking);
    if (section === 'summary') return summaryView(user, orders, orders.filter(isActiveOrder));
    if (section === 'profile') return profileView(user, editingProfile);
    if (section === 'tracking') return ordersView(orders.filter(isActiveOrder), trackings, false);
    if (section === 'history') return ordersView(orders.filter(order => !isActiveOrder(order)), null, true);
    if (section === 'addresses') return addressesView(user.addresses, editingAddress, deletingAddress);
    return preferencesView(preferences);
  }
  return {
    html: `<section class="account" id="account" tabindex="-1" aria-labelledby="account-title"><div class="account-intro"><p class="eyebrow">UniNorte · Tu espacio</p><h1>Mi cuenta</h1><p>Una conexión más cercana con lo nuestro.</p></div><div class="account-layout"><aside class="account-sidebar"><div class="account-sidebar-person"><span data-sidebar-avatar>${avatar(user)}</span><div><strong data-sidebar-name>${e(user.firstName)} ${e(user.lastName)}</strong><small>Cuenta de demostración</small></div></div><nav aria-label="Secciones de mi cuenta">${Object.entries(sections).map(([key, [label]]) => `<a href="#/account/${key}" ${key === section ? 'aria-current="page"' : ''}>${label}${icon('arrow')}</a>`).join('')}</nav><p class="account-demo-note">${icon('leaf')} Hecho para acompañarte.<br>Datos y pedidos ficticios.</p></aside><div class="account-content"><div class="account-section-heading"><div><h2 id="account-title">${sections[section][0]}</h2><p class="account-muted">${sections[section][1]}</p></div></div><p class="account-notice" tabindex="-1" role="status" aria-live="polite"></p><p class="account-error" role="alert" tabindex="-1" hidden></p><div class="account-body">${content()}</div></div></div></section>`,
    mount(root) {
      const abort = new AbortController();
      const body = root.querySelector('.account-body');
      const notice = root.querySelector('.account-notice');
      const error = root.querySelector('.account-error');
      const paint = () => {
        body.innerHTML = content();
        root.querySelector('[data-sidebar-name]').textContent = `${user.firstName} ${user.lastName}`;
        root.querySelector('[data-sidebar-avatar]').innerHTML = avatar(user);
      };
      const clearError = () => { error.hidden = true; error.textContent = ''; };
      const showError = exception => { error.hidden = false; error.textContent = exception.message || 'No se pudo completar la operación.'; error.focus(); };
      async function save(operation, message) {
        if (busy) return;
        busy = true;
        clearError();
        notice.textContent = 'Guardando…';
        body.querySelectorAll('button').forEach(button => { button.disabled = true; });
        try {
          await operation();
          if (disposed) return;
          user = await userService.getCurrentUser();
          if (disposed) return;
          paint();
          notice.textContent = message;
          notice.focus({ preventScroll: true });
        } catch (exception) { if (!disposed) { notice.textContent = ''; showError(exception); } }
        finally { busy = false; if (!disposed) body.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
      }
      root.addEventListener('click', event => {
        const button = event.target.closest('[data-action]');
        if (!button || busy) return;
        clearError();
        notice.textContent = '';
        const action = button.dataset.action, id = button.dataset.id;
        if (action === 'edit-profile') { editingProfile = true; paint(); body.querySelector('[name="firstName"]').focus(); }
        if (action === 'cancel-profile') { editingProfile = false; avatarPreview = undefined; avatarPending = false; avatarToken++; paint(); body.querySelector('[data-action="edit-profile"]').focus(); }
        if (action === 'add-address' || action === 'edit-address') {
          editingAddress = action === 'add-address' ? {} : { ...user.addresses.find(address => address.id === id) };
          paint(); body.querySelector('[name="recipientName"]').focus();
        }
        if (action === 'cancel-address') { editingAddress = null; paint(); body.querySelector('[data-action="add-address"]').focus(); }
        if (action === 'delete-address') { deletingAddress = id; paint(); body.querySelector('[data-action="confirm-delete"]').focus(); }
        if (action === 'cancel-delete') { deletingAddress = null; paint(); }
        if (action === 'confirm-delete') save(async () => { await addressService.remove(id); deletingAddress = null; }, 'Dirección eliminada.');
        if (action === 'primary-address') save(() => addressService.setPrimary(id), 'Dirección principal actualizada.');
        if (action === 'cancel-preferences') { paint(); notice.textContent = 'Cambios descartados.'; }
      }, { signal: abort.signal });
      root.addEventListener('change', async event => {
        if (event.target.name !== 'avatar') return;
        const file = event.target.files[0];
        if (!file) return;
        const token = ++avatarToken;
        avatarPending = true;
        clearError();
        notice.textContent = 'Preparando vista previa…';
        try {
          const result = await userService.updateAvatar(file);
          if (disposed || token !== avatarToken) return;
          avatarPreview = result.url;
          body.querySelector('[data-avatar-preview]').innerHTML = avatar(user, avatarPreview);
          notice.textContent = 'Foto preparada. Guarda los cambios para confirmarla.';
        } catch (exception) { if (!disposed && token === avatarToken) { event.target.value = ''; notice.textContent = ''; showError(exception); } }
        finally { if (token === avatarToken) avatarPending = false; }
      }, { signal: abort.signal });
      root.addEventListener('submit', event => {
        const form = event.target.closest('[data-form]');
        if (!form) return;
        event.preventDefault();
        if (avatarPending) { notice.textContent = 'Espera a que termine la vista previa de la foto.'; return; }
        const data = Object.fromEntries(new FormData(form));
        if (form.dataset.form === 'profile') {
          delete data.avatar;
          if (avatarPreview !== undefined) data.avatar = avatarPreview;
          save(async () => { await userService.updateCurrentUser(data); editingProfile = false; avatarPreview = undefined; }, 'Tu perfil se guardó en esta demostración.');
        }
        if (form.dataset.form === 'address') save(async () => { await addressService.save({ ...data, isPrimary: data.isPrimary === 'on' }); editingAddress = null; }, 'Dirección guardada.');
        if (form.dataset.form === 'preferences') save(async () => {
          preferences = await preferenceService.update({ ...data, rememberCurrency: data.rememberCurrency === 'on', showFeatured: data.showFeatured === 'on', receiveNews: data.receiveNews === 'on' });
        }, 'Preferencias guardadas en esta demostración.');
      }, { signal: abort.signal });
      return () => { disposed = true; avatarToken++; abort.abort(); };
    },
  };
}
