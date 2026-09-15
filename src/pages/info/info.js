import { t } from '../../features/i18n/i18n.js';
export const infoPage = key => ({ html: `<h1>${t(key)}</h1><section class="panel"><p>${t(key + 'Text')}</p></section>` });
export const notFoundPage = () => ({ html: `<h1>${t('notFound')}</h1><a href="#/home">${t('home')}</a>` });
