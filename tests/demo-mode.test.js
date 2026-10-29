import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { DEMO_MODE } from '../src/config/api.js';

test('demo mode is disabled unless the runtime config explicitly enables it', () => {
  assert.equal(DEMO_MODE, false);
});

test('explicit browser demo mode uses product and auth mocks without fetch', t => {
  const script = `
    globalThis.window = {};
    globalThis.__GLOBALIZAT_DEMO__ = true;
    globalThis.fetch = () => { throw new Error('fetch must not be called in demo mode'); };
    const { productService } = await import('./src/services/product.service.js');
    const { authService } = await import('./src/services/auth.service.js');
    const products = await productService.list();
    const user = await authService.loginDemo();
    console.log(JSON.stringify({ products: products.length > 0, loginDemo: user?.id === 'customer-demo' }));
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (child.error?.code === 'EPERM') {
    t.skip('This sandbox blocks the child Node process required by this regression test.');
    return;
  }
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const result = JSON.parse(child.stdout.trim().split(/\r?\n/).at(-1));
  assert.deepEqual(result, { products: true, loginDemo: true });
});
