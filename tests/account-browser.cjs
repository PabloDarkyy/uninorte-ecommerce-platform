const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:4173';
const avatar = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCFsAAAAASUVORK5CYII=', 'base64');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/*', route => {
      if (new URL(route.request().url()).origin !== base) { external.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    const nav = async section => {
      await page.locator(`.account-sidebar a[href="#/account/${section}"]`).click();
      await page.waitForFunction(section => document.querySelector(`.account-sidebar a[href="#/account/${section}"]`)?.getAttribute('aria-current') === 'page', section);
    };
    const notice = async text => page.waitForFunction(text => document.querySelector('.account-notice')?.textContent.includes(text), text);
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector('.hero [data-viewer-state="ready"]'));
    await page.locator('#header a[href="#/account"]').click();
    await page.locator('.account-stats').waitFor();
    assert.equal(await page.locator('canvas').count(), 0);
    assert.match(await page.locator('.account-person').textContent(), /Lucía/);
    await nav('profile');
    assert.ok(await page.locator('[name="firstName"]').isDisabled());
    await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
    await page.locator('[name="firstName"]').fill('No guardar');
    await page.locator('[name="avatar"]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: avatar });
    await notice('Foto preparada');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(await page.locator('[name="firstName"]').inputValue(), 'Lucía');
    assert.equal(await page.locator('.account-avatar img').count(), 0);
    await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
    await page.locator('[name="firstName"]').fill('Ana');
    await page.locator('[name="phone"]').fill('+595 981 222 333');
    await page.locator('[name="avatar"]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: avatar });
    await notice('Foto preparada');
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await notice('Tu perfil se guardó');
    await page.reload();
    await page.locator('[data-form="profile"]').waitFor();
    assert.equal(await page.locator('[name="firstName"]').inputValue(), 'Ana');
    assert.equal(await page.locator('.account-avatar img').count(), 2);
    await nav('summary');
    assert.match(await page.locator('.account-person').textContent(), /Hola, Ana/);

    await nav('addresses');
    await page.getByRole('button', { name: 'Agregar dirección' }).click();
    for (const [name, value] of Object.entries({ recipientName: 'Ana Benítez', phone: '+595 981 222 333', addressLine: 'Calle Jardín 123', city: 'Luque', country: 'Paraguay' })) await page.locator(`[name="${name}"]`).fill(value);
    await page.locator('[name="isPrimary"]').check();
    await page.getByRole('button', { name: 'Guardar dirección' }).click();
    await notice('Dirección guardada');
    assert.equal(await page.locator('.account-address-grid article').count(), 3);
    const address = page.locator('.account-address-grid article').filter({ hasText: 'Calle Jardín 123' });
    assert.equal(await address.locator('.account-badge').textContent(), 'Principal');
    await address.getByRole('button', { name: 'Editar', exact: true }).click();
    await page.locator('[name="city"]').fill('San Lorenzo');
    await page.getByRole('button', { name: 'Guardar dirección' }).click();
    await notice('Dirección guardada');
    assert.match(await address.textContent(), /San Lorenzo/);
    await address.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('button', { name: 'Conservar', exact: true }).click();
    assert.equal(await page.locator('.account-address-grid article').count(), 3);
    await address.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('button', { name: 'Sí, eliminar', exact: true }).click();
    await notice('Dirección eliminada');
    assert.equal(await page.locator('.account-address-grid article').count(), 2);
    assert.equal(await page.locator('.account-address-grid .account-badge').count(), 1);

    await nav('preferences');
    await page.locator('#account-language').selectOption('en');
    await page.locator('#account-currency').selectOption('EUR');
    await page.locator('[name="receiveNews"]').check();
    await page.getByRole('button', { name: 'Guardar preferencias' }).click();
    await notice('Preferencias guardadas');
    await page.reload();
    await page.locator('#account-language').waitFor();
    assert.equal(await page.locator('#account-language').inputValue(), 'en');
    assert.equal(await page.locator('#account-currency').inputValue(), 'EUR');
    assert.ok(await page.locator('[name="receiveNews"]').isChecked());
    assert.ok(await page.locator('#language').isEnabled());
    assert.equal(await page.locator('#language').inputValue(),'en');
    assert.equal(await page.locator('#currency').inputValue(),'EUR');

    await nav('tracking');
    assert.equal(await page.locator('.account-order').count(), 2);
    const firstStatus = await page.locator('.account-tracking-status').first().textContent();
    await page.getByRole('link', { name: 'Ver seguimiento' }).first().click();
    await page.locator('.account-timeline').waitFor();
    assert.equal(await page.locator('.account-timeline li').count(), 15);
    assert.equal(await page.locator('.account-timeline .is-current').count(), 1);
    assert.equal(await page.locator('.account-tracking-lead h3').textContent(), firstStatus);
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.account-tracking-lead h3').textContent(), firstStatus);
    await page.screenshot({ path: '.verification/account-timeline.png', fullPage: true });
    await nav('summary');
    await nav('tracking');
    assert.notEqual(await page.locator('.account-tracking-status').first().textContent(), firstStatus);
    await nav('history');
    assert.equal(await page.locator('.account-order').count(), 4);
    await page.getByRole('link', { name: 'Ver detalles' }).first().click();
    await page.locator('.account-total').waitFor();
    assert.match(await page.locator('.account-body').textContent(), /Bee honey/);
    assert.match(await page.locator('.account-body').textContent(), /por unidad/);
    assert.match(await page.locator('.account-delivery').textContent(), /Mariscal López/);
    await page.goBack();
    await page.locator('.account-order').first().waitFor();

    for (const [width, height] of [[320,700], [375,812], [768,1024], [1024,768], [1440,1000]]) {
      await page.setViewportSize({ width, height });
      for (const section of ['summary','profile','tracking','history','addresses','preferences']) {
        await nav(section);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${section} overflow at ${width}`);
      }
    }
    await page.locator('#header a[href="#/home"]').first().click();
    await page.waitForFunction(() => document.querySelector('.hero [data-viewer-state="ready"]'));
    assert.equal(await page.locator('.product-card').count(), 6);
    assert.equal(await page.locator('canvas').count(), 1);
    await page.locator('#header a[href="#/account"]').click();
    await page.locator('.account-stats').waitFor();
    assert.equal(await page.locator('canvas').count(), 0);
    await page.locator('#header a[href="#/catalog"]').click();
    await page.waitForFunction(() => document.querySelector('.hero [data-viewer-state="ready"]'));
    assert.equal(await page.evaluate(() => document.activeElement.id), 'catalog');
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log('PASS: account entry, profile edit/cancel/save/avatar/reload, address CRUD/default, preferences persistence, stable and varying mock tracking, 15-step timeline, history details, back navigation, 6 views at 5 widths, Three cleanup/return, offline and no JS errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
