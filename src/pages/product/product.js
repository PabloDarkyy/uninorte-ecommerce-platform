import { t, localize } from '../../features/i18n/i18n.js';
import { formatPrice } from '../../features/currency/currency.js';
import { productService } from '../../services/product.service.js';
import { cartService } from '../../services/cart.service.js';
import { viewerPlaceholder } from '../../components/viewer-placeholder/viewer-placeholder.js';
import { sectionPlaceholder } from '../../components/section-placeholder/section-placeholder.js';
import { escapeHtml as e } from '../../utils/html.js';
export async function productPage(params) {
  const product = await productService.getById(params.get('id'));
  if (!product) return { html: `<h1>${t('productNotFound')}</h1><a href="#/catalog">${t('catalog')}</a>` };
  return {
    title: localize(product.name),
    html: `<a href="#/catalog">← ${t('catalog')}</a><div class="product-detail">${viewerPlaceholder()}<section><h1>${e(localize(product.name))}</h1><p>${t('brand')}: ${e(localize(product.brand))}</p><h2>${t('description')}</h2><p>${e(localize(product.description))}</p><p class="price">${t('price')}: ${formatPrice(product.basePrice, product.baseCurrency)}</p><p>${t('stock')}: ${product.stock}</p><form id="add-form"><label for="variant">${t('variants')}</label><select id="variant">${product.variants.map(variant => `<option value="${e(variant.id)}">${e(localize(variant.name))}</option>`).join('')}</select><label for="quantity">${t('quantity')}</label><input id="quantity" type="number" min="1" max="${product.stock}" step="1" value="1" required><div class="actions"><button ${product.stock < 1 ? 'disabled' : ''}>${t('add')}</button><a href="#/cart">${t('cart')}</a></div><p id="add-status" role="status"></p></form><button disabled class="secondary">${t('supplier')}</button></section></div><div class="section-grid">${['nutrition', 'ingredients', 'benefits'].map(sectionPlaceholder).join('')}</div>`,
    mount(root) {
      root.querySelector('#add-form').addEventListener('submit', async event => {
        event.preventDefault();
        try {
          await cartService.add(product.id, root.querySelector('#variant').value, Number(root.querySelector('#quantity').value));
          root.querySelector('#add-status').textContent = t('added');
        } catch { root.querySelector('#add-status').textContent = t('invalidQuantity'); }
      });
    },
  };
}
