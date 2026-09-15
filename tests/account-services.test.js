import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountRepository } from '../src/features/account/services/repository.js';
import { createMockAccountServices } from '../src/features/account/services/mock-services.js';
import { isActiveOrder } from '../src/features/account/domain.js';
import { productService } from '../src/services/product.service.js';
const create = storage => createMockAccountServices(createAccountRepository(storage), productService);

test('account orders reference the original catalog and calculate historical totals', async () => {
  const services = create();
  const orders = await services.orderService.list();
  assert.equal(orders.filter(isActiveOrder).length, 2);
  assert.equal(orders.filter(order => !isActiveOrder(order)).length, 4);
  for (const order of orders) {
    assert.equal(order.total, order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
    for (const item of order.items) {
      assert.deepEqual(item.product, await productService.getById(item.productId));
      assert.equal(item.variant.id, item.variantId);
    }
  }
  orders[0].items[0].product.name.es = 'Mutated';
  assert.notEqual((await services.orderService.list())[0].items[0].product.name.es, 'Mutated');
  await assert.rejects(services.orderService.getById('missing'));
});
test('profile saves atomically, persists through repository recreation and validates data', async () => {
  const data = new Map(), storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const services = create(storage);
  const user = await services.userService.getCurrentUser();
  await services.userService.updateCurrentUser({ ...user, firstName: 'Ana', primaryAddressId: user.addresses[1].id });
  const saved = await create(storage).userService.getCurrentUser();
  assert.equal(saved.firstName, 'Ana');
  assert.equal(saved.addresses.filter(address => address.isPrimary).length, 1);
  assert.equal(saved.addresses[1].isPrimary, true);
  for (const invalid of [{ email: 'invalid' }, { firstName: '' }, { birthDate: '2035-01-01' }, { birthDate: '2026-02-31' }, { primaryAddressId: 'missing' }]) {
    await assert.rejects(services.userService.updateCurrentUser({ ...saved, ...invalid }));
    assert.equal((await services.userService.getCurrentUser()).firstName, 'Ana');
  }
  await assert.rejects(services.userService.updateAvatar({ type: 'text/html', size: 1 }));
  await assert.rejects(services.userService.updateAvatar({ type: 'image/png', size: 3 * 1024 * 1024 }));
});
test('addresses maintain one primary and never rewrite historical delivery addresses', async () => {
  const { addressService, orderService } = create();
  const original = (await orderService.list())[0].shippingAddress;
  let addresses = await addressService.list();
  await addressService.save({ ...addresses[0], addressLine: 'Otra dirección' });
  assert.deepEqual((await orderService.list())[0].shippingAddress, original);
  addresses = await addressService.save({ recipientName: 'Ana', phone: '123', addressLine: 'Calle de prueba', city: 'Luque', country: 'Paraguay', isPrimary: true });
  assert.equal(addresses.filter(address => address.isPrimary).length, 1);
  const last = addresses.at(-1);
  assert.equal(last.isPrimary, true);
  addresses = await addressService.remove(last.id);
  assert.equal(addresses.filter(address => address.isPrimary).length, 1);
  for (const address of addresses) await addressService.remove(address.id);
  assert.deepEqual(await addressService.list(), []);
  await assert.rejects(addressService.setPrimary('missing'));
});
test('tracking changes only on entry, and each snapshot has a coherent ordered timeline', async () => {
  const { trackingService } = create();
  const first = await trackingService.enter();
  for (const tracking of Object.values(first)) {
    assert.deepEqual(await trackingService.getByOrderId(tracking.orderId), tracking);
    assert.equal(tracking.events.filter(event => event.status === 'current').length, 1);
    const current = tracking.events.findIndex(event => event.status === 'current');
    assert.ok(tracking.events.slice(0, current).every(event => event.completed && event.timestamp));
    assert.ok(tracking.events.slice(current + 1).every(event => !event.completed && event.timestamp === null));
    assert.equal(tracking.progress, Math.round((current + 1) / tracking.events.length * 100));
  }
  const second = await trackingService.enter();
  assert.notEqual(second['ORD-0006'].status, first['ORD-0006'].status);
  assert.deepEqual(await trackingService.getByOrderId('ORD-0006'), second['ORD-0006']);
  await assert.rejects(trackingService.getByOrderId('ORD-0004'));
});
test('preferences use supported language/currency configuration and storage failure preserves state', async () => {
  const { preferenceService } = create();
  const values = { language: 'en', currency: 'EUR', rememberCurrency: false, showFeatured: false, receiveNews: true };
  await preferenceService.update(values);
  assert.deepEqual(await preferenceService.get(), values);
  await assert.rejects(preferenceService.update({ ...values, currency: 'INVALID' }));
  const failing = create({ getItem: () => null, setItem: () => { throw new Error('Quota'); } });
  const user = await failing.userService.getCurrentUser();
  await assert.rejects(failing.userService.updateCurrentUser({ ...user, firstName: 'Not saved' }));
  assert.deepEqual(await failing.userService.getCurrentUser(), user);
});
