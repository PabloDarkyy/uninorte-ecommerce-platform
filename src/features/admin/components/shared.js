import { escapeHtml as e } from '../../../utils/html.js';
export { e };
export { icon } from '../../../utils/icons.js';
export { displayText, displayPrice } from '../../../utils/product-display.js';
export { money, date, statusBadge } from '../../account/components/shared.js';
export const empty = text => `<p class="admin-empty">${text}</p>`;
export const field = (name, label, value = '', type = 'text', attrs = '') => `<label class="admin-field">${label}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
