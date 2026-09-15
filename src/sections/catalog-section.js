import { motionOptions } from '../modules/ui-motion.js';
import { productCard } from '../components/product-card/product-card.js';
import { openProductModal } from '../components/product-modal/product-modal.js';
export const catalogSection = products => `<section class="catalog-section" id="catalog" aria-labelledby="catalog-title" tabindex="-1"><div class="section-heading"><div><p class="eyebrow">DE NUESTRA TIERRA</p><h2 id="catalog-title">Nuestros productos<span>.</span></h2></div><p>Una colección, un mismo origen.<br>Conoce la colección de UniNorte.</p></div><div class="product-grid">${products.map(productCard).join('')}</div><p class="catalog-note">Colección académica · Imágenes conceptuales, precios y existencias de demostración.</p></section>`;
export function mountCatalog(root, products) {
  const abort = new AbortController(); let animation, pending = false;
  document.addEventListener('navigationstart', () => animation?.cancel(), { signal: abort.signal });
  root.querySelectorAll('[data-product-preview]').forEach(button => {
    const product = products.find(item => item.id === button.dataset.productPreview);
    const card = button.closest('.product-card');
    card.addEventListener('click', async () => {
      if (pending) return; pending = true;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      animation = card.animate([{ transform: reduced ? 'none' : 'scale(.985)', opacity: .92 }, { transform: 'none', opacity: 1 }], motionOptions('fast'));
      try { await animation.finished; if (!abort.signal.aborted && card.isConnected) openProductModal(product, button); }
      catch { /* La navegación canceló la respuesta de la tarjeta. */ }
      finally { pending = false; }
    }, { signal: abort.signal });
  });
  return () => { abort.abort(); animation?.cancel(); };
}
