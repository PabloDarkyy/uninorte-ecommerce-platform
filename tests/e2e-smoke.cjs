const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173/';
const viewports = [
  { name: 'desktop', viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

async function loginIfNeeded(page) {
  const demo = page.locator('[data-auth-demo]');
  await page.locator('[data-auth-demo], #header [data-theme-toggle]').first().waitFor({ state: 'attached' });
  if (await demo.isVisible().catch(() => false)) {
    await demo.click();
    await page.locator('.auth-screen').waitFor({ state: 'detached' });
  }
  await page.locator('#header [data-theme-toggle]').waitFor({ state: 'attached' });
}

async function openMobileMenu(page, mobile) {
  if (!mobile) return;
  const toggle = page.locator('#menu-toggle');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
}

async function runViewport(browser, config) {
  const context = await browser.newContext({
    viewport: config.viewport,
    isMobile: config.isMobile,
    hasTouch: config.hasTouch,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  await page.addInitScript(() => {
    if (!localStorage.getItem('uninorte.theme')) localStorage.setItem('uninorte.theme', 'light');
  });

  try {
    await page.goto(baseURL);
    await loginIfNeeded(page);

    await openMobileMenu(page, config.isMobile);
    await page.locator('#global-nav a[href="#/catalog"]').click();
    const cards = page.locator('.product-card');
    await cards.first().waitFor();
    assert.ok(await cards.count() > 0, 'catalog must render product cards');

    await cards.first().locator('[data-product-preview]').click();
    await page.locator('dialog[open] canvas.product-canvas').waitFor();
    await page.waitForFunction(async () => {
      const moduleURL = new URL('./src/modules/three/product-model-cache.js', document.baseURI);
      const { getProductModelCacheState } = await import(moduleURL.href);
      return getProductModelCacheState().entries.some(entry => entry.ready);
    });

    await page.locator('dialog[open] [data-add]').click();
    await page.locator('[data-cart-count]').filter({ hasText: '1' }).waitFor();
    await page.locator('dialog[open] [data-close]').first().click();
    await page.locator('dialog.product-modal').waitFor({ state: 'detached' });
    await page.locator('[data-cart-open]').click();
    const cartItem = page.locator('.cart-item');
    await cartItem.waitFor();
    assert.ok((await cartItem.textContent()).trim(), 'cart item must be visible');
    const total = page.locator('.cart-footer .commerce-total').last().locator('strong');
    assert.ok((await total.textContent()).trim(), 'cart total must be visible');
    await cartItem.locator('[data-remove]').click();
    await page.locator('.cart-empty').waitFor();
    await page.locator('.cart-drawer [data-close]').first().click();

    await openMobileMenu(page, config.isMobile);
    const themeToggle = page.locator('#header [data-theme-toggle]');
    const lightBackground = await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor);
    await themeToggle.click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    const darkBackground = await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor);
    assert.notEqual(darkBackground, lightBackground, 'body background must change in dark mode');

    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await loginIfNeeded(page);
    await openMobileMenu(page, config.isMobile);
    await page.locator('#header [data-theme-toggle]').click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');

    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  let failed = false;
  try {
    for (const config of viewports) {
      try {
        await runViewport(browser, config);
        console.log(`PASS [${config.name}]: demo login, catalog/model, cart, and persistent dark mode.`);
      } catch (error) {
        failed = true;
        console.error(`FAIL [${config.name}]: ${error.stack || error}`);
      }
    }
  } finally {
    await browser.close();
  }
  if (failed) process.exitCode = 1;
})().catch(error => {
  console.error(`FAIL [setup]: ${error.stack || error}`);
  process.exitCode = 1;
});
