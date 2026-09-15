import { adminServices } from './services.js';
import { analyticsView, productsView, inventoryView, ordersView, orderDetailView } from './components/views.js';
import { e, icon, displayText } from './components/shared.js';
import { openProductForm } from './components/product-form.js';
import { openProductModal } from '../../components/product-modal/product-modal.js';
import { createDialog } from '../../modules/ui-motion.js';
const sections = [['dashboard','Dashboard','◈'],['products','Productos',icon('leaf')],['sales','Ventas','↗'],['orders','Pedidos','▤'],['inventory','Inventario','▦']];
const introductions = { dashboard: ['Cada origen, una oportunidad.','Una mirada a tu colección y al movimiento de la tienda.'], products: ['Tu colección','Cuida los detalles de cada producto, desde su origen hasta su presentación.'], sales: ['El pulso de la tienda','Explora un reporte ficticio, creado para esta demostración.'], orders: ['Pedidos de la tienda','Toda la información de compra, reunida en un lugar.'], inventory: ['Cada unidad cuenta','Consulta y actualiza las existencias de tu colección.'] };
export async function adminPage(path, services = adminServices) {
  const [, , part, orderId] = path.split('/');
  const current = sections.some(([key]) => key === part) ? part : 'dashboard';
  async function content() {
    if (current === 'dashboard' || current === 'sales') return analyticsView(await services.analytics.createSnapshot(), current === 'dashboard');
    if (current === 'products') return productsView(await services.products.list({ includeInactive: true }));
    if (current === 'inventory') return inventoryView(await services.products.getInventory());
    const user = await services.users.getCurrentUser();
    return orderId ? orderDetailView(await services.orders.getById(orderId), user) : ordersView(await services.orders.list(), user);
  }
  const initial = await content();
  return {
    html: `<section id="admin" class="admin" tabindex="-1" aria-labelledby="admin-title"><aside class="admin-sidebar"><a class="admin-identity" href="#/admin"><span>un<span>·</span></span><strong>Estudio de origen<small>ADMINISTRACIÓN</small></strong></a><nav aria-label="Administración">${sections.map(([key,label,mark]) => `<a href="#/admin/${key}" ${key === current ? 'aria-current="page"' : ''}><span aria-hidden="true">${mark}</span>${label}</a>`).join('')}</nav><div class="admin-sidebar-bottom"><p>De nuestra tierra.<br>Hacia nuevos horizontes.</p><a href="#/catalog">← Volver a la tienda</a><small>Espacio de demostración</small></div></aside><div class="admin-main"><header class="admin-heading"><p class="eyebrow">UNINORTE / ${sections.find(([key]) => key === current)[1]}</p><h1 id="admin-title">${introductions[current][0]}</h1><p>${introductions[current][1]}</p></header><p data-admin-notice class="admin-notice" role="status" tabindex="-1" hidden></p><div data-admin-content class="admin-content">${initial}</div></div></section>`,
    mount(root) {
      const abort = new AbortController(); let disposed = false, revision = 0;
      const modals = new Set();
      function edit(product) {
        if (modals.size) return;
        const close = openProductForm(product, services, () => { if (!disposed) refresh(product ? 'Cambios guardados en la colección.' : 'Producto creado. Ya está disponible en la colección compartida.').catch(err => notice(err.message,true)); }, () => modals.delete(close));
        modals.add(close);
      }
      const notice = (message, error = false) => { if (disposed) return; const node = root.querySelector('[data-admin-notice]'); node.hidden = false; node.textContent = message; node.setAttribute('role',error ? 'alert' : 'status'); node.focus({ preventScroll: true }); };
      async function refresh(message) { const request = ++revision; const html = await content(); if (disposed || request !== revision) return; root.querySelector('[data-admin-content]').innerHTML = html; if (message) notice(message); }
      root.addEventListener('click', async event => {
        const button = event.target.closest('button'); if (!button || button.disabled) return;
        const row = button.closest('[data-product]');
        try {
          if (button.hasAttribute('data-create')) { edit(null); return; }
          if (!row) return;
          const product = await services.products.getById(row.dataset.product); if (disposed) return;
          if (button.hasAttribute('data-edit')) edit(product);
          if (button.hasAttribute('data-view')) openProductModal(product, button);
          if (button.hasAttribute('data-deactivate')) {
            if (modals.size) return;
            const modal = createDialog({ title: 'Desactivar producto', onDispose: () => modals.delete(modal.close), html: `<p>¿Deseas desactivar <strong>${e(displayText(product.name))}</strong>?</p><p class="admin-muted">Dejará de mostrarse en el catálogo. Podrás activarlo nuevamente desde Editar.</p><p data-confirm-error role="alert" hidden></p><div class="admin-form-footer"><button class="button button-secondary" data-dismiss>Cancelar</button><button class="button" data-confirm>Desactivar producto</button></div>` });
            modals.add(modal.close);
            modal.dialog.querySelector('[data-confirm]').addEventListener('click', async ev => {
              ev.target.disabled = true;
              try { await services.products.deactivateProduct(product.id); modal.close(true); if (!disposed) await refresh('Producto desactivado.'); }
              catch (error) { if (modal.signal.aborted) return; const node = modal.dialog.querySelector('[data-confirm-error]'); node.hidden = false; node.textContent = error.message; ev.target.disabled = false; }
            }, { signal: modal.signal });
          }
        } catch (error) { notice(error.message,true); }
      }, { signal: abort.signal });
      root.addEventListener('change', async event => {
        if (!event.target.matches('[data-featured]')) return;
        const input = event.target; input.disabled = true;
        try { await services.products.setProductFeatured(input.closest('[data-product]').dataset.product,input.checked); notice('Preferencia de destacado guardada.'); }
        catch (error) { input.checked = !input.checked; notice(error.message,true); }
        finally { input.disabled = false; }
      }, { signal: abort.signal });
      root.addEventListener('submit', async event => {
        const form = event.target.closest('[data-stock]'); if (!form) return;
        event.preventDefault(); const button = form.querySelector('button'); if (button.disabled) return; button.disabled = true;
        try { await services.products.updateStock(form.dataset.product,form.dataset.variant || null,new FormData(form).get('stock')); await refresh('Stock actualizado.'); }
        catch (error) { notice(error.message,true); button.disabled = false; }
      }, { signal: abort.signal });
      return () => { disposed = true; abort.abort(); modals.forEach(close => close(true)); modals.clear(); };
    },
  };
}
