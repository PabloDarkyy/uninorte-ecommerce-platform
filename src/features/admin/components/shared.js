import { escapeHtml as e } from '../../../utils/html.js';
export { e };
export { icon } from '../../../utils/icons.js';
// Admin edits the Spanish source fields and the original currency, not storefront preferences.
export const displayText = value => typeof value === 'object' && value !== null ? value.es ?? '' : value ?? '';
export const displayPrice = product => new Intl.NumberFormat('es-PY',{style:'currency',currency:product.baseCurrency,currencyDisplay:'code',maximumFractionDigits:product.baseCurrency==='PYG'?0:2}).format(product.basePrice);
export { money, date, statusBadge } from '../../account/components/shared.js';
export const empty = text => `<p class="admin-empty">${text}</p>`;
export const field = (name, label, value = '', type = 'text', attrs = '') => `<label class="admin-field">${label}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
