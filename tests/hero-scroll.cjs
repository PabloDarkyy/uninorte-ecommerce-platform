// Integración del scroll real: ida/vuelta, un canvas, navegación y movimiento reducido.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = 'http://127.0.0.1:4173';
(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  try {
    fs.mkdirSync('.verification', { recursive: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const seek = async p => {
      await page.evaluate(p => {
        const wrapper = document.querySelector('.hero-transition');
        const sticky = wrapper.querySelector('.hero-sticky');
        const start = wrapper.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(sticky).top);
        scrollTo({ top: start + (wrapper.getBoundingClientRect().height - sticky.offsetHeight) * p, behavior: 'instant' });
      }, p);
      await page.waitForFunction(p => Math.abs(Number(document.querySelector('.hero-transition').dataset.scrollProgress) - p) < 0.002, p);
      await page.waitForTimeout(150);
    };
    for (const [width, height] of [[375,812], [768,1024], [1440,1000]]) {
      await page.setViewportSize({ width, height });
      await page.goto(base);
      await page.waitForFunction(() => document.querySelector('.hero [data-viewer-state="ready"]'));
      await page.waitForTimeout(150);
      assert.equal(await page.locator('.hero-scroll-debug').count(), 0);
      await page.evaluate(() => window.originalCanvas = document.querySelector('canvas'));
      await seek(0.4);
      const forward = await page.screenshot({ path: `.verification/cinematic-${width}-forward.png` });
      for (const p of [0.7, 0.8, 0.9, 1]) {
        await seek(p);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.equal(await page.locator('canvas').count(), 1);
        assert.ok(await page.evaluate(() => originalCanvas === document.querySelector('canvas')));
        assert.equal(await page.locator('canvas').getAttribute('tabindex'), '-1');
        await page.screenshot({ path: `.verification/cinematic-${width}-${p}.png` });
      }
      assert.equal(await page.locator('canvas').evaluate(el => getComputedStyle(el).opacity), '0');
      await seek(0.4);
      const backward = await page.screenshot({ path: `.verification/cinematic-${width}-backward.png` });
      assert.ok(forward.equals(backward), `Scroll back must render identical pixels at ${width}px`);
      await seek(0);
      assert.equal(await page.locator('canvas').getAttribute('tabindex'), '0');
      assert.equal(await page.locator('.hero-copy').evaluate(el => getComputedStyle(el).opacity), '1');
      assert.equal(await page.locator('canvas').evaluate(el => getComputedStyle(el).pointerEvents), 'auto');
    }
    await page.goto(base + '/?debugScroll=1#/catalog');
    await page.waitForFunction(() => document.querySelector('.hero [data-viewer-state="ready"]'));
    await page.waitForFunction(() => document.querySelector('.hero-transition').dataset.scrollProgress === '1.000000');
    assert.equal(await page.locator('.hero-scroll-debug').count(), 1);
    await page.locator('#header nav a[href="#/home"]').click();
    await page.waitForFunction(() => scrollY <= 4 && Number(document.querySelector('.hero-transition').dataset.scrollProgress) < 0.12);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(150);
    await seek(0.9);
    const small = await page.screenshot();
    await seek(0.4);
    await seek(0.9);
    assert.ok(small.equals(await page.screenshot()), 'Reduced motion is reversible');
    assert.equal(await page.locator('.hero-copy').evaluate(el => getComputedStyle(el).opacity), '1');
    assert.equal(await page.locator('canvas').getAttribute('tabindex'), '0');
    assert.deepEqual(errors, []);
    console.log('PASS: identical forward/back pixels at 375/768/1440, macro phases, single canvas, controls restored, no overflow, deep links/Home, debug opt-in, reduced motion, no JS errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
