import { HttpError } from '../lib/http.js';

export const required = (value, name, max = 160) => {
  const text = String(value ?? '').trim();
  if (!text || text.length > max) throw new HttpError(400, `Revisa el campo ${name}.`, 'VALIDATION');
  return text;
};

export function localizedText(value) {
  if (value && typeof value === 'object') return String(value.es ?? value.en ?? '').trim();
  return String(value ?? '').trim();
}

export function validateAddress(data, userId, id) {
  return {
    id,
    userId,
    recipientName: required(data.recipientName, 'destinatario'),
    phone: required(data.phone, 'teléfono', 40),
    addressLine: required(data.addressLine, 'dirección', 250),
    city: required(data.city, 'ciudad'),
    country: required(data.country, 'país'),
    isPrimary: Boolean(data.isPrimary),
  };
}

export function quantity(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new HttpError(400, 'El stock debe ser un entero mayor o igual a cero.', 'VALIDATION');
  return n;
}

export function price(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1e12) throw new HttpError(400, 'Introduce un precio válido mayor o igual a cero.', 'VALIDATION');
  return n;
}

const CURRENCIES = ['PYG', 'USD', 'EUR'];

export function validateProduct(input, existing) {
  const p = { active: true, featured: false, image: null, images: [], model: null, stock: 0, variants: [], availability: 'available', ...existing, ...input };
  if (Object.hasOwn(input, 'model3dUrl')) p.model = input.model3dUrl;
  delete p.model3dUrl;
  if (!localizedText(p.name) || !localizedText(p.category)) throw new HttpError(400, 'Nombre y categoría son obligatorios.', 'VALIDATION');
  if (!CURRENCIES.includes(p.baseCurrency)) throw new HttpError(400, 'Moneda no admitida.', 'VALIDATION');
  p.basePrice = price(p.basePrice);
  p.stock = quantity(p.stock);
  if (!['available', 'preorder', 'unavailable'].includes(p.availability)) throw new HttpError(400, 'Disponibilidad no admitida.', 'VALIDATION');
  const ids = new Set();
  p.variants = (p.variants || []).map(v => {
    if (!v.id || ids.has(v.id) || !localizedText(v.name)) throw new HttpError(400, 'Cada variante necesita un identificador único y un nombre.', 'VALIDATION');
    ids.add(v.id);
    return { ...v, stock: quantity(v.stock ?? 0), price: v.price == null || v.price === '' ? null : price(v.price) };
  });
  return p;
}

export function assertCurrency(currency) {
  if (!CURRENCIES.includes(currency)) throw new HttpError(400, 'Moneda no admitida.', 'VALIDATION');
}

export const CURRENCY_CODES = CURRENCIES;
