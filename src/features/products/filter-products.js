import { localize } from '../i18n/i18n.js';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function filterProducts(products, query, category) {
  return products.filter(product => normalize(localize(product.name)).includes(normalize(query)) && (!category || localize(product.category) === category));
}
