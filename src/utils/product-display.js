// Presentación fija: no convierte moneda ni guarda preferencias.
export const displayText = value => typeof value === 'object' && value !== null ? value.es ?? '' : value ?? '';
export const displayPrice = product => new Intl.NumberFormat('es-PY', { style: 'currency', currency: product.baseCurrency, currencyDisplay: 'code', maximumFractionDigits: product.baseCurrency === 'PYG' ? 0 : 2 }).format(product.basePrice);
export const productAccent = product => /^#[0-9a-f]{6}$/i.test(product.accentColor) ? product.accentColor : '#70864B';
