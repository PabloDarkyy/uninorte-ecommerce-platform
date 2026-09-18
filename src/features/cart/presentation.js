import { t, getLanguage } from '../i18n/i18n.js';
import { getCurrency } from '../currency/currency.js';
import { escapeHtml as e } from '../../utils/html.js';
export const money = (amount,currency=getCurrency()) => new Intl.NumberFormat(getLanguage()==='es'?'es-PY':'en-US',{style:'currency',currency,currencyDisplay:'code',maximumFractionDigits:currency==='PYG'?0:2}).format(amount);
export const field = (key, value='', type='text', extra='') => `<label class="commerce-field">${e(t(key))}<input name="${key}" type="${type}" value="${e(value)}" ${extra} ${key==='postalCode'?'':'required'}></label>`;
export const errorText = error => t(error?.message==='INSUFFICIENT_STOCK'?'stockError':error?.message==='CART_CHANGED'?'cartChanged':'cartError');
