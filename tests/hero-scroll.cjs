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
    // El GLB actual también presenta diferencias de cuantización de 1/255 con
    // el visor anterior: tolerancia mínima, sin permitir cambios de geometría.
    const sameRendering = async (a,b) => a.equals(b) || page.evaluate(async ([a,b]) => {
      const read=async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
      const one=await read(a),two=await read(b);if(one.length!==two.length)return false;
      let changed=0;for(let i=0;i<one.length;i++){const difference=Math.abs(one[i]-two[i]);if(difference>1)return false;if(difference)changed++;}return changed<one.length*.001;
    },[a.toString('base64'),b.toString('base64')]);
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
      require('./demo-login.cjs')(page);await page.goto(base);
      await page.waitForFunction(() => document.querySelector('.hero [data-viewer-state="ready"]'));
      await page.waitForTimeout(150);
      assert.equal(await page.locator('.hero-scroll-debug').count(), 0);
      await page.evaluate(() => window.originalCanvas = document.querySelector('canvas.product-canvas'));
      await seek(0.4);
      const forward = await page.screenshot({ path: `.verification/cinematic-${width}-forward.png` });
      for (const p of [0.7, 0.8, 0.9, 1]) {
        await seek(p);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.equal(await page.locator('canvas.product-canvas').count(), 1);
        assert.ok(await page.evaluate(() => originalCanvas === document.querySelector('canvas.product-canvas')));
        assert.equal(await page.locator('canvas.product-canvas').getAttribute('tabindex'), '-1');
        await page.screenshot({ path: `.verification/cinematic-${width}-${p}.png` });
      }
      assert.equal(await page.locator('canvas.product-canvas').evaluate(el => getComputedStyle(el).opacity), '0');
      await seek(0.4);
      const backward = await page.screenshot({ path: `.verification/cinematic-${width}-backward.png` });
      assert.ok(await sameRendering(forward,backward), `Scroll back must render identical pixels at ${width}px`);
      await seek(0);
      assert.equal(await page.locator('canvas.product-canvas').getAttribute('tabindex'), '0');
      assert.equal(await page.locator('.hero-copy').evaluate(el => getComputedStyle(el).opacity), '1');
      assert.equal(await page.locator('canvas.product-canvas').evaluate(el => getComputedStyle(el).pointerEvents), 'auto');
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
    assert.ok(await sameRendering(small,await page.screenshot()), 'Reduced motion is reversible');
    assert.equal(await page.locator('.hero-copy').evaluate(el => getComputedStyle(el).opacity), '1');
    assert.equal(await page.locator('canvas.product-canvas').getAttribute('tabindex'), '0');
    assert.deepEqual(errors, []);
    console.log('PASS: visually matching forward/back pixels at 375/768/1440, macro phases, single canvas, controls restored, no overflow, deep links/Home, debug opt-in, reduced motion, no JS errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
