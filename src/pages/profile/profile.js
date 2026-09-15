import { t } from '../../features/i18n/i18n.js';
import { authService } from '../../services/auth.service.js';
import { sectionPlaceholder } from '../../components/section-placeholder/section-placeholder.js';
export async function profilePage() {
  await authService.getCurrentUser();
  return { html: `<h1>${t('profile')}</h1><p>${t('authPending')} · <a href="#/login">${t('login')}</a></p><div class="section-grid">${['personal', 'addresses', 'settings'].map(sectionPlaceholder).join('')}<section class="panel"><h2>${t('orders')}</h2><a href="#/orders">${t('orderList')}</a></section></div>` };
}
