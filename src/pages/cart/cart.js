import { t, localize } from '../../features/i18n/i18n.js';
import { formatPrice } from '../../features/currency/currency.js';
import { getCartSummary } from '../../features/cart/cart.js';
import { cartService } from '../../services/cart.service.js';
import { escapeHtml as e } from '../../utils/html.js';
export async function cartPage() {
  const { rows, total } = await getCartSummary();
  return {
    html: `<h1>${t('cart')}</h1>${rows.length ? `<div class="table-wrap"><table><caption class="sr-only">${t('cart')}</caption><thead><tr>${['product', 'variants', 'quantity', 'price', 'subtotal', 'remove'].map(key => `<th scope="col">${t(key)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr><th scope="row"><a href="#/product?id=${encodeURIComponent(row.productId)}">${e(localize(row.product.name))}</a></th><td>${e(localize(row.variant?.name))}</td><td>${row.quantity}</td><td>${formatPrice(row.product.basePrice, row.product.baseCurrency)}</td><td>${formatPrice(row.subtotal)}</td><td><button class="secondary" data-product="${e(row.productId)}" data-variant="${e(row.variantId)}" aria-label="${t('remove')}: ${e(localize(row.product.name))}">${t('remove')}</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="panel"><p>${t('emptyCart')}</p></div>`}<section class="panel cart-summary"><h2>${t('total')}: ${formatPrice(total)}</h2><p>${t('checkoutPending')}</p><a class="button" href="#/catalog">${t('continue')}</a></section>`,
    mount(root) {
      root.querySelectorAll('[data-product]').forEach(button => button.addEventListener('click', async () => {
        await cartService.remove(button.dataset.product, button.dataset.variant);
        const view = await cartPage();
        if (!root.isConnected) return;
        root.innerHTML = view.html;
        view.mount(root);
      }));
    },
  };
}
