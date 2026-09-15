const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 const page = await browser.newPage({viewport:{width:1440,height:1050}}); const errors=[], external=[];
 page.on('pageerror',e=>errors.push(e.message)); page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:4173'))external.push(r.url());});
 const go=async section=>{await page.evaluate(s=>location.hash='/admin/'+s,section);await page.locator('.admin-sidebar nav a[aria-current]').filter({hasText:{dashboard:'Dashboard',products:'Productos',sales:'Ventas',orders:'Pedidos',inventory:'Inventario'}[section]}).waitFor();};
 try {
  await page.goto('http://127.0.0.1:4173/#/admin'); await page.locator('[data-snapshot]').waitFor();
  await page.waitForTimeout(550);await page.screenshot({path:'.verification/admin-dashboard.png',fullPage:true});
  const first=await page.locator('[data-snapshot]').getAttribute('data-snapshot');
  await go('sales'); const sales=await page.locator('[data-snapshot]').getAttribute('data-snapshot');assert.notEqual(first,sales);
  const snapshotText=await page.locator('[data-snapshot]').innerText(); await page.waitForTimeout(600);assert.equal(await page.locator('[data-snapshot]').innerText(),snapshotText);
  await go('products');await page.locator('[data-create]').click();
  const form=page.locator('[data-product-form]');await form.locator('[name=name]').fill('Yerba de prueba');await form.locator('[name=category]').fill('Hierbas');
  await form.locator('[name=description]').fill('Una mezcla de prueba para compartir.');await form.locator('[name=basePrice]').fill('25000');await form.locator('[name=stock]').fill('12');await form.locator('[name=ingredients]').fill('Hojas seleccionadas');
  const image={name:'producto.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')};
  await form.locator('[data-asset=image]').setInputFiles(image);await form.locator('.admin-image-preview img').waitFor();
  await form.locator('[data-asset=images]').setInputFiles([image,image]);await page.waitForFunction(()=>document.querySelectorAll('.admin-image-gallery img').length===2);
  await form.locator('[data-remove-image="0"]').click();
  await form.locator('[data-asset=model]').setInputFiles('src/assets/models/licor-mandioca.glb');await form.getByText('Modelo actual:').waitFor();
  await form.locator('[data-add-variant]').click();await form.locator('[data-v=name]').fill('Bolsa de 250 g');await form.locator('[data-v=price]').fill('28000');await form.locator('[data-v=stock]').fill('5');
  await form.locator('[data-add-variant]').click();await form.locator('[data-v=name]').last().fill('Variante descartada');await form.locator('[data-remove-variant="1"]').click();
  await page.screenshot({path:'.verification/admin-form.png',fullPage:true});
  await form.locator('[type=submit]').click();await page.locator('.admin-dialog').waitFor({state:'detached'});
  let row=page.locator('.admin-product').filter({hasText:'Yerba de prueba'});await row.waitFor();const id=await row.getAttribute('data-product');
  await row.locator('[data-featured]').check();await page.locator('[data-admin-notice]').filter({hasText:'Preferencia'}).waitFor();
  await row.locator('[data-edit]').click();await form.locator('[name=name]').fill('Yerba edición');await form.locator('[name=basePrice]').fill('27000');await form.locator('[data-remove-model]').click();await form.locator('[type=submit]').click();await page.locator('.admin-dialog').waitFor({state:'detached'});
  row=page.locator(`[data-product="${id}"]`);assert.match(await row.innerText(),/27.000/);
  await go('inventory');const stock=page.locator(`[data-stock][data-product="${id}"][data-variant=""]`);await stock.locator('input').fill('2');await stock.locator('button').click();await page.locator('[data-admin-notice]').filter({hasText:'Stock actualizado'}).waitFor();assert.match(await stock.innerText(),/Stock bajo/);
  await page.evaluate(()=>location.hash='/catalog');await page.locator(`[data-product-preview="${id}"]`).waitFor();await page.locator(`[data-product-preview="${id}"]`).click();await page.locator('.product-modal[open]').waitFor();assert.match(await page.locator('#preview-title').innerText(),/Yerba edición/);assert.match(await page.locator('.modal-stock').innerText(),/2 unidades/);assert.match(await page.locator('.modal-additional').innerText(),/Hojas seleccionadas/);await page.keyboard.press('Escape');await page.locator('.product-modal').waitFor({state:'detached'});
  await go('products');await row.locator('[data-deactivate]').click();await page.locator('.admin-dialog [data-dismiss]').last().click();await page.locator('.admin-dialog').waitFor({state:'detached'});assert.match(await row.innerText(),/Activo/);
  await row.locator('[data-deactivate]').click();await page.locator('[data-confirm]').click();await page.locator('.admin-dialog').waitFor({state:'detached'});await page.locator('[data-admin-notice]').filter({hasText:'desactivado'}).waitFor();assert.match(await row.innerText(),/Inactivo/);
  await page.evaluate(()=>location.hash='/catalog');await page.locator('.product-grid').waitFor();assert.equal(await page.locator(`[data-product-preview="${id}"]`).count(),0);
  await go('orders');await page.locator('a[href="#/admin/orders/ORD-0006"]').click();await page.locator('.admin-order-items').waitFor();assert.match(await page.locator('.admin-main').innerText(),/30.000/);assert.match(await page.locator('.admin-main').innerText(),/Mariscal López/);
  for(const width of [320,375,768,1024,1440]) {
   await page.setViewportSize({width,height:950});
   for(const section of ['dashboard','products','inventory','orders','sales']) {await go(section);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${section} overflow ${width}`);}
   await go('products');await page.locator('[data-create]').click();assert.ok(await page.locator('.admin-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1),`form overflow ${width}`);await page.keyboard.press('Escape');await page.locator('.admin-dialog').waitFor({state:'detached'});
   if(width===375){await go('dashboard');await page.screenshot({path:'.verification/admin-mobile.png',fullPage:true});}
  }
  await page.emulateMedia({reducedMotion:'reduce'});await go('products');await page.locator('[data-create]').click();await page.keyboard.press('Escape');await page.locator('.admin-dialog').waitFor({state:'detached'});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('PASS admin CRUD, images/GLB, variants, stock, shared catalog, orders, stable snapshots, responsive/reduced motion, offline resources.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
