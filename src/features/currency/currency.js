import { currencyConfig } from '../../config/currency.js';
import { readPreference, savePreference } from '../../utils/preferences.js';
import { getLanguage } from '../i18n/i18n.js';
let currency = readPreference('uninorte.currency', 'PYG');
if (!Object.hasOwn(currencyConfig.rates, currency)) currency = 'PYG';
export const getCurrency = () => currency;
export function convertPrice(amount, base = 'PYG', target = currency) {
  if (!Object.hasOwn(currencyConfig.rates, base) || !Object.hasOwn(currencyConfig.rates, target)) throw new Error('Unsupported currency');
  return amount / currencyConfig.rates[base] * currencyConfig.rates[target];
}
export const formatPrice = (amount, base = 'PYG') => new Intl.NumberFormat(getLanguage() === 'es' ? 'es-PY' : 'en-US', {
  style: 'currency', currency, currencyDisplay: 'code', maximumFractionDigits: currency === 'PYG' ? 0 : 2,
}).format(convertPrice(amount, base));
export function setCurrency(value) {
  if (!Object.hasOwn(currencyConfig.rates, value)) return;
  currency = value;
  savePreference('uninorte.currency', value);
  window.dispatchEvent(new Event('preferenceschange'));
}
