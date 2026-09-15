import { escapeHtml as e } from '../../../utils/html.js';
import { displayText } from '../../../utils/product-display.js';
import { icon } from '../../../utils/icons.js';
export { e, displayText, icon };
export const money = (amount, currency) => new Intl.NumberFormat('es-PY', { style: 'currency', currency, currencyDisplay: 'code', maximumFractionDigits: currency === 'PYG' ? 0 : 2 }).format(amount);
export const date = value => value ? new Intl.DateTimeFormat('es-PY', { dateStyle: 'medium', timeZone: 'America/Asuncion' }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) : 'Sin fecha';
export const dateTime = value => value ? new Intl.DateTimeFormat('es-PY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Asuncion' }).format(new Date(value)) : '';
export const statusLabels = { preparing: 'En preparación', in_transit: 'En tránsito', delivered: 'Entregado', cancelled: 'Cancelado', refunded: 'Reembolsado' };
export const statusBadge = status => `<span class="account-badge">${e(statusLabels[status] || status)}</span>`;
export function avatar(user, url = user.avatar) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  return `<span class="account-avatar">${url ? `<img src="${e(url)}" alt="Foto de ${e(user.firstName)} ${e(user.lastName)}">` : `<span role="img" aria-label="Avatar de ${e(user.firstName)} ${e(user.lastName)}">${e(initials)}</span>`}</span>`;
}
export const addressText = address => address ? `${e(address.addressLine)}<br>${e(address.city)}, ${e(address.country)}` : 'Todavía no agregaste una dirección.';
export const field = (name, label, value = '', type = 'text', extra = '') => `<label class="account-field"><span>${label}</span><input name="${name}" type="${type}" value="${e(value)}" ${extra}></label>`;
export const empty = (title, description, href, action) => `<div class="account-panel account-empty">${icon('leaf')}<h3>${e(title)}</h3><p>${e(description)}</p>${href ? `<a class="button button-secondary" href="${href}">${action}</a>` : ''}</div>`;
export const progressBar = tracking => `<div class="account-progress"><label>Progreso simulado <strong>${tracking.progress}%</strong><progress max="100" value="${tracking.progress}">${tracking.progress}%</progress></label></div>`;
