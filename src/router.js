import { routes } from './config/routes.js';
import { homePage } from './pages/home/home.js';
import { renderNavbar } from './components/navbar/navbar.js';
import { renderFooter } from './components/footer/footer.js';
import { closeProductModal } from './components/product-modal/product-modal.js';
import { animateToCatalog, cancelCatalogNavigation } from './modules/catalog-navigation.js';
let disposePage = () => {}, currentPage, navigation = 0;
export async function navigateToSection({ focus = true, cinematic = false } = {}) {
  const request = ++navigation;
  document.dispatchEvent(new Event('navigationstart'));
  const path = location.hash.slice(1).split('?')[0] || '/home';
  const account = /^\/account(?:\/|$)/.test(path);
  const admin = /^\/admin(?:\/|$)/.test(path);
  const pageName = admin ? 'admin' : account ? 'account' : 'home';
  const route = admin ? { target: 'admin' } : account ? { target: 'account' } : routes[path] || routes['/home'];
  if (!cinematic || account || admin) cancelCatalogNavigation();
  closeProductModal();
  document.querySelectorAll('#header nav a').forEach(link => {
    if (link.hash === `#/${route.target}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  const main = document.querySelector('#main');
  let mounted = false;
  if (currentPage !== pageName || account || admin) {
    disposePage();
    disposePage = () => {};
    currentPage = null;
    main.innerHTML = '<p class="shell error-message" role="status">Cargando…</p>';
    try {
      const view = admin ? await (await import('./features/admin/admin.js')).adminPage(path) : account ? await (await import('./features/account/account.js')).accountPage(path) : await homePage();
      if (request !== navigation) return;
      const container = document.createElement('div');
      container.className = 'page shell';
      container.innerHTML = view.html;
      main.replaceChildren(container);
      disposePage = view.mount(container) || (() => {});
      currentPage = pageName;
      mounted = true;
    } catch (error) {
      if (request !== navigation) return;
      console.error(error);
      main.innerHTML = '<div class="shell error-message" role="alert"><p>No se pudo abrir esta vista.</p><button class="button" data-retry>Volver a intentar</button><p><a href="#/account">Ir a mi cuenta</a> · <a href="#/home">Volver al inicio</a></p></div>';
      main.querySelector('[data-retry]').addEventListener('click', () => navigateToSection(), { once: true });
      return;
    }
  }
  document.title = admin ? 'Administración · UniNorte' : account ? 'Mi cuenta · UniNorte' : 'UniNorte · Tierra & Origen';
  if (mounted && cinematic && !account && !admin) {
    // El nuevo hero mide su sticky antes de calcular el recorrido hacia Catálogo.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (request !== navigation) return;
  }
  const target = document.getElementById(route.target);
  if (focus && cinematic && !account && !admin && target) animateToCatalog(target);
  else if (focus) { target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'start' }); }
}
export async function renderRoute() {
  document.documentElement.lang = 'es';
  renderNavbar(document.querySelector('#header'));
  renderFooter(document.querySelector('#footer'));
  await navigateToSection({ focus: Boolean(location.hash) });
}
