import { localize } from '../features/i18n/i18n.js';
import { formatPrice } from '../features/currency/currency.js';
export const displayText = value => localize(value) ?? '';
export const displayPrice = product => formatPrice(product.basePrice,product.baseCurrency);
export const productAccent = product => /^#[0-9a-f]{6}$/i.test(product.accentColor) ? product.accentColor : '#70864B';
