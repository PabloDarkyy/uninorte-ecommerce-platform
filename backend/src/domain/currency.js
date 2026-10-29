// Mismas tasas ficticias que el frontend (src/config/currency.js), para que un
// pedido creado en el backend calcule el mismo unitPrice que la UI mostro.
export const currencyConfig = {
  base: 'PYG',
  rates: { PYG: 1, USD: 1 / 8000, EUR: 1 / 9000 },
};

export function convertPrice(amount, base = 'PYG', target = 'PYG') {
  if (!Object.hasOwn(currencyConfig.rates, base) || !Object.hasOwn(currencyConfig.rates, target)) {
    throw new Error('Unsupported currency');
  }
  return (amount / currencyConfig.rates[base]) * currencyConfig.rates[target];
}

export function roundForCurrency(amount, currency) {
  const factor = currency === 'PYG' ? 1 : 100;
  return Math.round(amount * factor) / factor;
}
