import { t, getLanguage, setLanguage } from '../../features/i18n/i18n.js';
import { getCurrency, setCurrency } from '../../features/currency/currency.js';
import { cartService } from '../../services/cart.service.js';
import { openCart } from '../../features/cart/cart-drawer.js';
import { authService } from '../../services/auth.service.js';
let disposeNavbar;
import { languageSelector } from '../language-selector/language-selector.js';
import { currencySelector } from '../currency-selector/currency-selector.js';
import { icon } from '../../utils/icons.js';

export function renderNavbar(root) {
  disposeNavbar?.();const abort=new AbortController();
  root.innerHTML = `<div class="navbar shell">
    <a class="brand" href="#/home" aria-label="GlobalizaT, inicio"><span class="brand-mark">GT<span>·</span></span><span>GlobalizaT<small>TIERRA & ORIGEN</small></span></a>
    <button id="menu-toggle" class="icon-button menu-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="global-nav">${icon('menu')}</button>
    <div id="global-nav" class="nav-content"><nav aria-label="Navegación principal"><a href="#/home">${t('home')}</a><a href="#/catalog">${t('catalog')}</a><a href="#/about">${t('about')}</a><a href="#/contact">${t('contact')}</a><a href="#/account">${t('profile')}</a></nav>
      <div class="nav-tools">${icon('globe')}${languageSelector({disabled:false,value:getLanguage()})}<span class="nav-divider" aria-hidden="true"></span>${currencySelector({disabled:false,value:getCurrency()})}<button class="signout-button" data-signout>${t('logout')}</button></div>
    </div><button class="icon-button cart-preview" data-cart-open aria-label="${t('cart')}" aria-haspopup="dialog">${icon('bag')}<span data-cart-count aria-live="polite">0</span></button></div>`;
  root.querySelector('#language').addEventListener('change',event=>setLanguage(event.target.value));
  root.querySelector('#currency').addEventListener('change',event=>setCurrency(event.target.value));
  root.querySelector('[data-cart-open]').addEventListener('click',()=>openCart());
  root.querySelector('[data-signout]').addEventListener('click',async()=>{await authService.logout();await cartService.clearCart();location.reload();});
  const count=async()=>{const value=await cartService.getItemCount();if(!abort.signal.aborted)root.querySelector('[data-cart-count]').textContent=value;};
  const unsubscribe=cartService.subscribe(count);count();disposeNavbar=()=>{abort.abort();unsubscribe();};
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
  root.onkeydown = event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); }
  };
}
