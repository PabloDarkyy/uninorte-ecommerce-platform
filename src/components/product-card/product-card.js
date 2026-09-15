import { escapeHtml as e } from '../../utils/html.js';
import { displayText, displayPrice, productAccent } from '../../utils/product-display.js';
import { productStage } from '../product-stage/product-stage.js';
import { icon } from '../../utils/icons.js';
export function productCard(product) {
  const available = product.stock > 0 && product.availability !== 'unavailable';
  const availability = product.availability === 'unavailable' ? 'No disponible' : product.availability === 'preorder' ? 'Por encargo' : available ? 'Disponible' : 'Sin stock';
  return `<article class="product-card" style="--product-accent:${productAccent(product)}"><div class="card-visual"><span class="card-category">${e(displayText(product.category))}</span>${productStage(product)}</div>
    <div class="card-body"><p class="card-origin">COLECCIÓN PARAGUAYA</p><h3>${e(displayText(product.name))}</h3><div class="card-price-row"><p class="card-price">${e(displayPrice(product))}<small>Precio de ejemplo</small></p><span class="availability ${available ? '' : 'unavailable'}">${availability}<small>Stock de ejemplo</small></span></div>
    <button class="card-open" data-product-preview="${e(product.id)}" aria-haspopup="dialog" aria-label="Ver producto: ${e(displayText(product.name))}">Ver producto <span>${icon('arrow')}</span></button></div></article>`;
}
