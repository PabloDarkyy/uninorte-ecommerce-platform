import { t } from '../../features/i18n/i18n.js';
import { orderService } from '../../services/order.service.js';
export async function ordersPage() {
  await orderService.list();
  return { html: `<h1>${t('orders')}</h1><div class="table-wrap"><table><caption>${t('orderList')}</caption><thead><tr>${['orders', 'status', 'tracking', 'eta'].map(key => `<th scope="col">${t(key)}</th>`).join('')}</tr></thead><tbody><tr><td colspan="4">${t('noOrders')}</td></tr></tbody></table></div>` };
}
