import { renderRoute, navigateToSection } from './router.js';
window.addEventListener('hashchange', () => navigateToSection());
document.querySelector('#skip-link').addEventListener('click', event => { event.preventDefault(); document.querySelector('#main').focus(); });
// Los enlaces a la sección actual también deben desplazar la página.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#/"]');
  if (link?.closest('#header nav') && link.hash === '#/catalog' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    navigateToSection({ cinematic: true });
    return;
  }
  if (link && link.hash === location.hash) { event.preventDefault(); navigateToSection(); }
});
renderRoute();
