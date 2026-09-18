import { t } from '../i18n/i18n.js';
export function createPaymentFeedback(dialog) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panel=document.createElement('div');panel.className='payment-feedback';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
  panel.innerHTML=`<div class="payment-symbol" aria-hidden="true"><span class="payment-spinner"></span><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30"/><path d="m18 33 9 9 19-21"/></svg></div><h3>${t('paymentProcessing')}</h3><p>${t('paymentWait')}</p><small>${t('simulated')}</small>`;
  dialog.querySelector('form').replaceChildren(panel);
  const timers=new Map();
  const wait=ms=>new Promise(resolve=>{const timer=setTimeout(()=>{timers.delete(timer);resolve()},ms);timers.set(timer,resolve)});
  return {
    ready:wait(reduced?100:1150),
    async success(){panel.classList.add('is-success');panel.querySelector('h3').textContent=t('paymentProcessed');panel.querySelector('p').textContent=t('confirmedText');await wait(reduced?150:700);},
    dispose(){for(const [timer,resolve] of timers){clearTimeout(timer);resolve()}timers.clear();panel.remove();},
  };
}
