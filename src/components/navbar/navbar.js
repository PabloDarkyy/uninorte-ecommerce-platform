import { languageSelector } from '../language-selector/language-selector.js';
import { currencySelector } from '../currency-selector/currency-selector.js';
import { icon } from '../../utils/icons.js';

export function renderNavbar(root) {
  root.innerHTML = `<div class="navbar shell">
    <a class="brand" href="#/home" aria-label="UniNorte, inicio"><span class="brand-mark">un<span>·</span></span><span>UniNorte<small>TIERRA & ORIGEN</small></span></a>
    <button id="menu-toggle" class="icon-button menu-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="global-nav">${icon('menu')}</button>
    <div id="global-nav" class="nav-content"><nav aria-label="Navegación principal"><a href="#/home">Inicio</a><a href="#/catalog">Catálogo</a><a href="#/about">Nosotros</a><a href="#/contact">Contacto</a><a href="#/account">Perfil</a></nav>
      <div class="nav-tools">${icon('globe')}${languageSelector()}<span class="nav-divider" aria-hidden="true"></span>${currencySelector()}<button class="icon-button cart-preview" disabled aria-label="Carrito (próximamente)" title="Carrito disponible en una próxima fase">${icon('bag')}</button></div>
    </div></div>`;
  const toggle = root.querySelector('#menu-toggle');
  const content = root.querySelector('#global-nav');
  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
    content.classList.remove('is-open');
  };
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Cerrar menú' : 'Abrir menú');
    content.classList.toggle('is-open', expanded);
  });
  content.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); }
  });
}
