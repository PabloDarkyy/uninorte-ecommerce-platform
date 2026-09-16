// QA opcional. Usa Playwright externo; el sitio conserva sus dependencias locales.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = 'http://127.0.0.1:4173';
const modelUrl = './src/assets/models/licor-mandioca.glb';
const fixture = `<!doctype html><html><head><script type="importmap">{"imports":{"three":"/src/vendor/three/build/three.module.min.js","three/addons/":"/src/vendor/three/examples/jsm/"}}</script><link rel="stylesheet" href="/src/styles/main.css"></head><body><div class="product-stage" style="position:absolute;top:0;left:0;width:350px;height:420px"><div id="fixture" class="model-mount"><span class="concept-product">Fallback</span></div></div></body></html>`;

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true });
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/*', route => {
      if (new URL(route.request().url()).origin !== base) { external.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector('.hero [data-viewer-state="ready"]'));
    assert.equal(await page.locator('canvas.product-canvas').count(), 1);
    assert.equal(await page.locator('.exhibit-topline').count(), 0);
    assert.ok(await page.locator('.hero .concept-product').isHidden());
    assert.equal(await page.locator('.product-grid canvas').count(), 0);
    const initial = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.evaluate(() => {
      const wrapper = document.querySelector('.hero-transition');
      const sticky = wrapper.querySelector('.hero-sticky');
      const start = wrapper.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(sticky).top);
      scrollTo({ top: start + (wrapper.getBoundingClientRect().height - sticky.offsetHeight) * 0.95, behavior: 'instant' });
    });
    await page.waitForFunction(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nature-mix')) > 30);
    const middle = await page.evaluate(() => ({ color: getComputedStyle(document.body).backgroundColor, fade: Number(document.querySelector('.hero-transition').style.getPropertyValue('--hero-model-opacity')) }));
    assert.notEqual(middle.color, initial);
    assert.ok(middle.fade < 1);
    await page.screenshot({ path: '.verification/three-scroll.png' });
    await page.locator('#catalog').scrollIntoViewIfNeeded();
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-product-preview="licor"]').click();
      await page.waitForFunction(() => document.querySelector('dialog[data-product-transition="ready"] [data-viewer-state="ready"]'));
      assert.equal(await page.locator('canvas.product-canvas').count(), 2);
      await page.keyboard.press('Escape');
      await page.locator('dialog').waitFor({ state: 'detached' });
      assert.equal(await page.locator('canvas.product-canvas').count(), 1);
    }
    for (const [width, height] of [[375,812], [768,1024], [1440,1000]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(120);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `.verification/three-hero-${width}.png` });
      await page.locator('[data-product-preview="licor"]').click();
      await page.waitForFunction(() => document.querySelector('dialog [data-viewer-state="ready"]'));
      await page.waitForTimeout(100);
      assert.ok(await page.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
      await page.screenshot({ path: `.verification/three-modal-${width}.png` });
      await page.keyboard.press('Escape');
      await page.locator('dialog').waitFor({ state: 'detached' });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);

    // Fixture aislado para inspeccionar el ciclo de vida sin exponer objetos Three en la aplicación.
    await page.route('**/viewer-test', route => route.fulfill({ contentType: 'text/html', body: fixture }));
    await page.goto(base + '/viewer-test');
    const mount = async () => page.evaluate(async modelUrl => {
      const { createProductViewer } = await import('/src/modules/three/product-viewer.js');
      window.viewer = createProductViewer({ container: document.querySelector('#fixture'), modelUrl });
      return viewer.ready;
    }, modelUrl);
    assert.equal(await mount(), true);
    await page.waitForFunction(() => viewer.getState().speed > 0.05);
    const canvas = page.locator('canvas.product-canvas');
    const bounds = await canvas.boundingBox();
    const azimuth = await page.evaluate(() => viewer.getState().azimuth);
    await page.mouse.move(bounds.x + 100, bounds.y + 170);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 220, bounds.y + 185, { steps: 8 });
    await page.mouse.up();
    assert.notEqual(await page.evaluate(() => viewer.getState().azimuth), azimuth);
    assert.ok(await page.evaluate(() => viewer.getState().speed < 0.01));
    await page.waitForFunction(() => viewer.getState().speed > 0.06, { timeout: 6000 });
    const touchAzimuth = await page.evaluate(() => viewer.getState().azimuth);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 100, y: 170 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 160, y: 175 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    assert.notEqual(await page.evaluate(() => viewer.getState().azimuth), touchAzimuth);
    const distance = await page.evaluate(() => viewer.getState().distance);
    await page.mouse.wheel(0, -4000);
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(distance => viewer.getState().distance >= distance * 0.92, distance));
    await page.evaluate(() => viewer.setExpanded(true));
    const expandedDistance = await page.evaluate(() => viewer.getState().distance);
    await page.mouse.move(170, 280);
    await page.mouse.down();
    await page.mouse.move(170, 20, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => viewer.getState().polar < Math.PI * 0.4 || viewer.getState().polar > Math.PI * 0.6), 'Expanded rotation exceeds normal vertical limits');
    await page.mouse.wheel(0, -1200);
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(before => viewer.getState().distance < before * 0.9, expandedDistance), 'Expanded wheel zoom is useful');
    const pinch = await page.context().newCDPSession(page);
    const beforePinch = await page.evaluate(() => viewer.getState().distance);
    await pinch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 130, y: 200, id: 1 }, { x: 230, y: 200, id: 2 }] });
    await pinch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 80, y: 200, id: 1 }, { x: 280, y: 200, id: 2 }] });
    await pinch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await pinch.detach();
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(before => viewer.getState().distance < before, beforePinch), 'Pinch zoom works');
    assert.ok(await page.evaluate(() => { const s = viewer.getState(); return s.distance >= s.minDistance && s.distance <= s.maxDistance; }));
    await page.evaluate(() => viewer.setExpanded(false));
    await page.evaluate(() => document.querySelector('.product-stage').style.top = '4000px');
    await page.waitForFunction(() => !viewer.getState().rendering);
    const frames = await page.evaluate(() => viewer.getState().frames);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => viewer.getState().frames), frames);
    await page.evaluate(() => document.querySelector('.product-stage').style.top = '0px');
    await page.waitForFunction(frames => viewer.getState().frames > frames, frames);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !viewer.getState().rendering);
    const rotation = await page.evaluate(() => viewer.getState().rotation);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => viewer.getState().rotation), rotation);
    await page.evaluate(() => {
      window.gpuDeletes = { buffer: 0, texture: 0, program: 0 };
      for (const [name, key] of [['deleteBuffer','buffer'], ['deleteTexture','texture'], ['deleteProgram','program']]) {
        const original = WebGL2RenderingContext.prototype[name];
        WebGL2RenderingContext.prototype[name] = function (...args) { gpuDeletes[key]++; return original.apply(this, args); };
      }
      window.disposedContext=document.querySelector('#fixture canvas').getContext('webgl2');
      viewer.dispose();
    });
    assert.equal(await canvas.count(), 0);
    assert.ok(await page.evaluate(() => viewer.getState().disposed && !viewer.getState().rendering));
    assert.ok(await page.evaluate(() => disposedContext.isContextLost() && gpuDeletes.texture > 0 && gpuDeletes.program > 0));
    assert.equal(await mount(), true);
    await page.evaluate(() => viewer.dispose());
    // Cerrar mientras el GLB está en tránsito no crea un canvas después del cierre.
    await page.route('**/licor-mandioca.glb', async route => {
      await new Promise(resolve => setTimeout(resolve, 300));
      await route.fulfill({ body: fs.readFileSync('src/assets/models/licor-mandioca.glb'), contentType: 'model/gltf-binary' }).catch(() => {});
    });
    await page.evaluate(async modelUrl => {
      const { createProductViewer } = await import('/src/modules/three/product-viewer.js');
      viewer = createProductViewer({ container: document.querySelector('#fixture'), modelUrl });
      viewer.dispose();
      await viewer.ready;
    }, modelUrl);
    await page.waitForTimeout(350);
    assert.equal(await canvas.count(), 0);
    assert.deepEqual(errors, []);

    // Fallos intencionales: el error se registra solo en consola y se conserva el respaldo.
    const fallback = await browser.newPage();
    const fallbackErrors = [];
    fallback.on('pageerror', error => fallbackErrors.push(error.message));
    await fallback.route('**/*.glb', route => route.fulfill({ status: 404, body: 'Missing' }));
    await fallback.goto(base);
    await fallback.waitForFunction(() => document.querySelector('.hero [data-viewer-state="fallback"]'));
    assert.ok(await fallback.locator('.hero .concept-product').isVisible());
    await fallback.locator('[data-product-preview="licor"]').click();
    await fallback.waitForFunction(() => document.querySelector('dialog[data-product-transition="ready"] [data-viewer-state="fallback"]'));
    assert.ok(await fallback.locator('dialog .concept-product').isVisible());
    assert.equal(await fallback.locator('canvas').count(), 0);
    assert.deepEqual(fallbackErrors, []);
    await fallback.close();
    const noWebGL = await browser.newPage();
    await noWebGL.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
    });
    await noWebGL.goto(base);
    await noWebGL.waitForFunction(() => document.querySelector('.hero [data-viewer-state="fallback"]'));
    assert.ok(await noWebGL.locator('.hero .concept-product').isVisible());
    assert.equal(await noWebGL.locator('.product-card').count(), 6);
    await noWebGL.close();
    console.log('PASS: real GLB in hero/modal, 5 open/close cycles, mouse/touch/inertia/resume, limited zoom, visibility pause, reduced motion, resize, GPU disposal, early close, scroll/palette, fallback 404/WebGL unavailable, offline resources.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
