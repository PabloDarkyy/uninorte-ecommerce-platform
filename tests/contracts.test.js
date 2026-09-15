import test from 'node:test';
import assert from 'node:assert/strict';
import { productService } from '../src/services/product.service.js';
import { cartService } from '../src/services/cart.service.js';
import { getCartSummary } from '../src/features/cart/cart.js';
import { filterProducts } from '../src/features/products/filter-products.js';
import { convertPrice } from '../src/features/currency/currency.js';
import es from '../src/locales/es.js';
import en from '../src/locales/en.js';

test('six unique products resolve independently and unknown IDs return null', async () => {
  const products = await productService.list();
  assert.equal(products.length, 6);
  assert.equal(new Set(products.map(product => product.id)).size, 6);
  for (const product of products) assert.deepEqual(await productService.getById(product.id), product);
  products[0].stock = -1;
  assert.equal((await productService.list())[0].stock, 10);
  assert.equal(await productService.getById('missing'), null);
});
test('search ignores accents and combines category filters', async () => {
  const products = await productService.list();
  assert.equal(filterProducts(products, ' MANI ', '').length, 1);
  assert.equal(filterProducts(products, 'mani', 'Bebidas').length, 0);
  assert.equal(filterProducts(products, '', 'Alimentos').length, 3);
});
test('cart validates stock, variants and integer quantities, calculates totals and removes items', async () => {
  await assert.rejects(cartService.add('missing', 'demo', 1));
  await assert.rejects(cartService.add('mani', 'missing', 1));
  for (const quantity of [0, -1, 1.2, 11, NaN]) await assert.rejects(cartService.add('mani', 'demo', quantity));
  await cartService.add('mani', 'demo', 2);
  await cartService.add('mani', 'demo', 1);
  assert.equal((await cartService.list())[0].quantity, 3);
  await assert.rejects(cartService.add('mani', 'demo', 8));
  assert.equal((await getCartSummary()).total, 30000);
  await cartService.remove('mani', 'demo');
  assert.deepEqual(await cartService.list(), []);
});
test('demo conversion supports three currencies and both locale dictionaries align', () => {
  assert.equal(convertPrice(8000, 'PYG', 'USD'), 1);
  assert.equal(convertPrice(9000, 'PYG', 'EUR'), 1);
  assert.equal(convertPrice(1, 'USD', 'PYG'), 8000);
  assert.throws(() => convertPrice(1, 'INVALID', 'PYG'));
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
});
