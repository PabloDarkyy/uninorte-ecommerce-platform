import { t, localize } from '../../features/i18n/i18n.js';
import { productService } from '../../services/product.service.js';
import { filterProducts } from '../../features/products/filter-products.js';
import { productCard } from '../../components/product-card/product-card.js';
import { escapeHtml as e } from '../../utils/html.js';
export async function catalogPage(params) {
  const products = await productService.list();
  const categories = [...new Set(products.map(product => localize(product.category)))];
  return {
    html: `<h1>${t('catalog')}</h1><div class="catalog-layout"><aside class="panel"><h2>${t('filters')}</h2><label for="search">${t('search')}</label><input id="search" type="search"><label for="category">${t('category')}</label><select id="category"><option value="">${t('all')}</option>${categories.map(category => `<option>${e(category)}</option>`).join('')}</select></aside><section aria-label="${t('products')}"><p id="result-count" class="muted" role="status"></p><div id="product-grid" class="product-grid"></div></section></div>`,
    mount(root) {
      const search = root.querySelector('#search');
      const category = root.querySelector('#category');
      const update = () => {
        const result = filterProducts(products, search.value, category.value);
        root.querySelector('#result-count').textContent = `${result.length} / ${products.length}`;
        root.querySelector('#product-grid').innerHTML = result.length ? result.map(productCard).join('') : `<p>${t('empty')}</p>`;
      };
      search.addEventListener('input', update);
      category.addEventListener('change', update);
      update();
      if (params.has('search')) search.focus();
    },
  };
}
