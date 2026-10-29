import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../src/server.js';
import { openDatabase, closeDatabase } from '../src/db/database.js';
import { requireTestDatabaseUrl } from './support/database-guard.js';

async function withServer(fn) {
  const databaseUrl = requireTestDatabaseUrl();
  const dir = await mkdtemp(path.join(tmpdir(), 'globalizat-backend-'));
  const resetDb = await openDatabase(databaseUrl);
  try {
    await resetDb.exec(`TRUNCATE TABLE tracking_events, order_items, order_shipping_addresses, orders, product_variant_translations, product_variants, product_images, product_translations, products, addresses, account_preferences, user_profiles, user_credentials, users CASCADE;`);
  } finally {
    await closeDatabase(resetDb);
  }
  const { server, config } = await createApp({
    port: 0,
    databaseUrl,
    uploadsDir: path.join(dir, 'uploads'),
    legacyDataFile: path.join(dir, 'sin-datos-legados.json'),
    corsOrigin: '*',
  });
  await new Promise(resolve => server.listen(0, resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    await fn(base, config);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
}

async function call(base, method, url, { token, body } = {}) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  return { status: response.status, json };
}

test('URLs malformadas responden 400 sin detener el servidor', async () => {
  await withServer(async base => {
    const root = await call(base, 'GET', '/%E0');
    assert.equal(root.status, 400);
    assert.equal(root.json.code, 'BAD_REQUEST');
    const parameter = await call(base, 'GET', '/api/products/%E0');
    assert.equal(parameter.status, 400);
    assert.equal(parameter.json.code, 'BAD_REQUEST');
    const health = await call(base, 'GET', '/api/health');
    assert.equal(health.status, 200);
  });
});

test('release no permite escapar de uploads con una URL absoluta', async () => {
  await withServer(async (base, config) => {
    const outside = path.join(path.dirname(config.uploadsDir), 'outside.txt');
    await writeFile(outside, 'conservar');
    const admin = await call(base, 'POST', '/api/auth/login', { body: { email: config.seedAdminEmail, password: config.seedAdminPassword } });
    const release = await call(base, 'POST', '/api/uploads/release', {
      token: admin.json.token,
      body: { url: 'https://example.com/uploads/../../outside.txt' },
    });
    assert.equal(release.status, 200);
    assert.equal(await readFile(outside, 'utf8'), 'conservar');
  });
});

test('registro, login y sesion', async () => {
  await withServer(async base => {
    const register = await call(base, 'POST', '/api/auth/register', {
      body: { firstName: 'Ana', lastName: 'Gómez', email: 'ana@example.com', password: 'clave1234' },
    });
    assert.equal(register.status, 201);
    assert.ok(register.json.token);
    assert.equal(register.json.user.email, 'ana@example.com');

    const duplicate = await call(base, 'POST', '/api/auth/register', {
      body: { firstName: 'Ana', lastName: 'Gómez', email: 'ana@example.com', password: 'clave1234' },
    });
    assert.equal(duplicate.status, 409);

    const badLogin = await call(base, 'POST', '/api/auth/login', { body: { email: 'ana@example.com', password: 'incorrecta' } });
    assert.equal(badLogin.status, 401);

    const login = await call(base, 'POST', '/api/auth/login', { body: { email: 'ana@example.com', password: 'clave1234' } });
    assert.equal(login.status, 200);

    const me = await call(base, 'GET', '/api/auth/me', { token: login.json.token });
    assert.equal(me.json.email, 'ana@example.com');

    const logout = await call(base, 'POST', '/api/auth/logout', { token: login.json.token });
    assert.equal(logout.status, 200);
    const afterLogout = await call(base, 'GET', '/api/auth/me', { token: login.json.token });
    assert.equal(afterLogout.status, 401);
  });
});

test('catalogo visible solo activo salvo administracion', async () => {
  await withServer(async (base, config) => {
    const publicList = await call(base, 'GET', '/api/products');
    assert.ok(publicList.json.length > 0);
    assert.ok(publicList.json.every(p => p.active !== false));

    const demo = await call(base, 'POST', '/api/auth/login-demo');
    const order = await call(base, 'POST', '/api/orders', {
      token: demo.json.token,
      body: {
        items: [{ productId: 'mani', variantId: 'demo', quantity: 1, unitPrice: 10000 }],
        currency: 'PYG',
        requestId: 'req-1',
        shippingAddress: { recipientName: 'Ana', phone: '0981000000', addressLine: 'Calle 1', city: 'Asunción', country: 'Paraguay' },
      },
    });
    assert.equal(order.status, 201);
    assert.equal(order.json.total, 10000);
    assert.equal(order.json.items[0].product.id, 'mani');

    const db = await openDatabase(config.databaseUrl);
    try {
      assert.equal(Number((await db.prepare("SELECT stock FROM products WHERE id = 'mani'").get()).stock), 9);
      assert.equal(Number((await db.prepare("SELECT stock FROM product_variants WHERE product_id = 'mani' AND id = 'demo'").get()).stock), 9);
      assert.equal(Number((await db.prepare('SELECT COUNT(*) AS count FROM orders').get()).count), 7);
      assert.equal(Number((await db.prepare('SELECT COUNT(*) AS count FROM order_items').get()).count), 12);
      assert.equal(Number((await db.prepare("SELECT COUNT(*) AS count FROM pg_constraint WHERE contype = 'f' AND convalidated = false").get()).count), 0);
    } finally {
      await closeDatabase(db);
    }

    const idempotent = await call(base, 'POST', '/api/orders', {
      token: demo.json.token,
      body: {
        items: [{ productId: 'mani', variantId: 'demo', quantity: 1, unitPrice: 10000 }],
        currency: 'PYG',
        requestId: 'req-1',
        shippingAddress: { recipientName: 'Ana', phone: '0981000000', addressLine: 'Calle 1', city: 'Asunción', country: 'Paraguay' },
      },
    });
    assert.equal(idempotent.json.id, order.json.id);

    const dbAfterRetry = await openDatabase(config.databaseUrl);
    try {
      assert.equal(Number((await dbAfterRetry.prepare("SELECT stock FROM products WHERE id = 'mani'").get()).stock), 9);
      assert.equal(Number((await dbAfterRetry.prepare('SELECT COUNT(*) AS count FROM orders').get()).count), 7);
    } finally {
      await closeDatabase(dbAfterRetry);
    }

    const orders = await call(base, 'GET', '/api/orders', { token: demo.json.token });
    assert.ok(orders.json.some(o => o.id === order.json.id));
  });
});

test('administracion requiere rol admin', async () => {
  await withServer(async (base, config) => {
    const demo = await call(base, 'POST', '/api/auth/login-demo');
    const forbidden = await call(base, 'POST', '/api/products', { token: demo.json.token, body: {} });
    assert.equal(forbidden.status, 403);

    const admin = await call(base, 'POST', '/api/auth/login', { body: { email: config.seedAdminEmail, password: config.seedAdminPassword } });
    assert.equal(admin.status, 200);
    const created = await call(base, 'POST', '/api/products', {
      token: admin.json.token,
      body: { name: { es: 'Nuevo' }, category: { es: 'Alimentos' }, baseCurrency: 'PYG', basePrice: 5000, stock: 3, variants: [] },
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.active, true);

    const inventory = await call(base, 'GET', '/api/products/inventory', { token: admin.json.token });
    assert.equal(inventory.status, 200);
    assert.ok(Array.isArray(inventory.json));
  });
});

test('seguimiento avanza por pedidos activos', async () => {
  await withServer(async base => {
    const demo = await call(base, 'POST', '/api/auth/login-demo');
    const enter = await call(base, 'POST', '/api/tracking/enter', { token: demo.json.token });
    assert.equal(enter.status, 200);
    const orderIds = Object.keys(enter.json);
    assert.ok(orderIds.length > 0);
    const snapshot = enter.json[orderIds[0]];
    assert.ok(snapshot.events.some(e => e.status === 'current'));
  });
});
