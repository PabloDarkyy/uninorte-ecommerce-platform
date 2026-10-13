import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

test('GET /api/health informa que el Backend está disponible', async t => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    t.skip('Define TEST_DATABASE_URL para comprobar el API con una base PostgreSQL de pruebas.');
    return;
  }
  const { server, store } = await createApp({ databaseUrl, port: 0, corsOrigin: '*' });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, resolve);
  });
  try {
    const address = server.address();
    const response = await fetch('http://127.0.0.1:' + address.port + '/api/health');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, service: 'globalizat-backend' });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await store.close();
  }
});
