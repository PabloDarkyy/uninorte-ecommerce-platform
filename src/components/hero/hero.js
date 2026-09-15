import { productStage, mountProductStage } from '../product-stage/product-stage.js';
import { createHeroScroll } from './hero-scroll.js';
import { icon } from '../../utils/icons.js';
export function hero(product) {
  return `<section class="hero-transition" id="home" aria-labelledby="hero-title" tabindex="-1"><div class="hero-sticky"><div class="hero"><div class="hero-copy"><p class="eyebrow"><span></span> Productos paraguayos</p>
    <h1 id="hero-title">Sabores de<br>nuestra tierra,<br><em>hechos para<br class="hero-break"> el mundo.</em></h1>
    <p class="hero-description">Descubre productos auténticos, elaborados localmente y preparados para llegar a nuevos mercados.</p>
    <a class="button" href="#/catalog">Explorar productos ${icon('arrow')}</a><p class="hero-origin">${icon('leaf')} Raíces locales. Nuevos horizontes.</p></div>
    <div class="hero-exhibit">${productStage(product, { context: 'hero' })}<div class="exhibit-bottomline"><span>Una colección con raíces.</span><span class="exhibit-seal">PY</span></div></div></div><div class="hero-canvas-overlay" aria-label="Botella 3D del hero"></div></div></section>`;
}

export function mountHero(root, product) {
  const section = root.querySelector('.hero');
  if (!section) return () => {};
  const viewer = mountProductStage(section, product, { context: 'hero' });
  const disposeScroll = createHeroScroll(section, root.querySelector('#catalog'), viewer);
  return () => { disposeScroll(); viewer.dispose(); };
}
