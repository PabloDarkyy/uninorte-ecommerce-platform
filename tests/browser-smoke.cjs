const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [], external = [], requested = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      requested.push(url.pathname);
      if (url.origin !== 'http://127.0.0.1:4173') { external.push(url.href); return route.abort(); }
      return route.continue();
    });
    // Las preferencias de Fase 1 no deben activar idioma ni moneda en esta preview.
    await page.addInitScript(() => { localStorage.setItem('uninorte.language', 'en'); localStorage.setItem('uninorte.currency', 'USD'); });
    await page.goto('http://127.0.0.1:4173');
    await page.locator('.product-card').last().waitFor();
    await page.waitForFunction(() => document.querySelector('.hero [data-model-mount]')?.dataset.viewerState === 'ready');
    assert.equal(await page.locator('.product-card').count(), 6);
    assert.equal(await page.locator('html').getAttribute('lang'), 'es');
    assert.ok(await page.locator('#language').isDisabled());
    assert.ok(await page.locator('#currency').isDisabled());
    assert.ok(await page.locator('.cart-preview').isDisabled());
    assert.match(await page.locator('.card-price').first().textContent(), /PYG/);
    fs.mkdirSync('.verification', { recursive: true });
    await page.screenshot({ path: '.verification/visual-desktop.png', fullPage: true });
    for (const [index, name] of ['Maní', 'Miel de abeja', 'Harina de trigo', 'Esencia de petitgrain', 'Licor de mandioca', 'Mix de yuyo'].entries()) {
      const button = page.locator('[data-product-preview]').nth(index);
      await button.click();
      await page.locator('dialog[open]').waitFor();
      if (name === 'Licor de mandioca') await page.waitForFunction(() => document.querySelector('dialog [data-model-mount]')?.dataset.viewerState === 'ready');
      assert.equal(await page.locator('#preview-title').textContent(), name);
      assert.equal(await page.locator('dialog [data-model-mount]').count(), 1);
      assert.ok(await page.locator('dialog [autofocus]').evaluate(element => element === document.activeElement));
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        assert.ok(await page.evaluate(() => !!document.activeElement.closest('dialog')), 'Focus must stay inside the modal');
      }
      await page.locator('#details-toggle').click();
      assert.ok(await page.locator('#preview-details').isVisible());
      await page.locator('#details-toggle').click();
      assert.ok(await page.locator('#preview-details').isHidden());
      if (index === 1) await page.screenshot({ path: '.verification/modal-desktop.png' });
      await page.keyboard.press('Escape');
      await page.locator('dialog').waitFor({ state: 'detached' });
      assert.ok(await button.evaluate(element => element === document.activeElement), 'Focus returns to the card button');
      assert.equal(await page.locator('html').evaluate(element => element.classList.contains('modal-open')), false);
    }
    await page.locator('.product-card h3').first().click();
    await page.locator('dialog[open]').waitFor();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.locator('dialog').waitFor({ state: 'detached' });
    await page.locator('[data-product-preview]').first().click();
    await page.locator('dialog[open]').waitFor();
    await page.mouse.click(5, 5);
    await page.locator('dialog').waitFor({ state: 'detached' });
    await page.locator('[data-product-preview]').first().click();
    await page.locator('dialog[open]').waitFor();
    await page.evaluate(() => { location.hash = '/contact'; });
    await page.locator('dialog').waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.activeElement.id), 'contact');
    for (const [width, height] of [[320,700], [375,812], [768,1024], [1024,768], [1440,1000]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.evaluate(() => window.scrollTo(0,0));
      const columns = await page.locator('.product-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      assert.equal(columns, width <= 600 ? 1 : width <= 900 ? 2 : 3);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow at ' + width);
      await page.locator('[data-product-preview]').nth(1).click();
      await page.locator('dialog[open]').waitFor();
      const bounds = await page.locator('dialog').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1, 'Dialog fits viewport ' + width);
      assert.ok(await page.locator('dialog').evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'No horizontal modal overflow');
      if (width === 375) await page.screenshot({ path: '.verification/modal-mobile.png' });
      await page.locator('[data-close]').first().click();
      await page.locator('dialog').waitFor({ state: 'detached' });
      if (width <= 900) {
        await page.locator('#menu-toggle').click();
        await page.locator('#global-nav a[href="#/catalog"]').click();
        assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'false');
        await page.locator('#menu-toggle').click();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'false');
      }
      if (width === 375) { await page.evaluate(() => window.scrollTo(0,0)); await page.screenshot({ path: '.verification/visual-mobile.png', fullPage: true }); }
    }
    await page.locator('#header a[href="#/contact"]').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'contact');
    await page.locator('#header nav a[href="#/home"]').click();
    await page.goBack();
    assert.match(page.url(), /#\/contact$/);
    await page.goto('http://127.0.0.1:4173/#/admin');
    await page.locator('.admin-sidebar').waitFor();
    assert.equal(await page.locator('.admin-sidebar nav a').count(), 5);
    assert.equal(await page.locator('#add-form, #auth-form, .product-grid canvas').count(), 0);
    assert.ok(!requested.some(path => /cart.service|auth.service|features\/currency|features\/i18n/.test(path)), 'Previous functional modules are not loaded');
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log('PASS: 6 generic previews, Escape/buttons/backdrop close, details disclosure, focus trap/restoration, visual controls, section navigation, 5 responsive sizes, local resources only, no JS errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

