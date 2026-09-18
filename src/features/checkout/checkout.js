import { createPaymentFeedback } from './payment-feedback.js';
import { accountServices } from '../account/services/index.js';
import { cartService } from '../../services/cart.service.js';
import { checkoutService } from '../../services/checkout.service.js';
import { t } from '../i18n/i18n.js';
import { displayText } from '../../utils/product-display.js';
import { escapeHtml as e } from '../../utils/html.js';
import { money, field } from '../cart/presentation.js';
import { animateSurface } from '../../modules/ui-motion.js';
let active;
export async function openCheckout(){
  if(active)return;
  const dialog=document.createElement('dialog'),abort=new AbortController(),trigger=document.activeElement;
  active=dialog;dialog.className='checkout-dialog';dialog.setAttribute('aria-labelledby','checkout-title');
  let step=0,user,addresses,review,order,busy=false,disposed=false,animation,pendingClose=false;
  const personal={},shipping={},requestId=crypto.randomUUID();
  function close(){if(disposed)return;if(busy){pendingClose=true;return;}disposed=true;abort.abort();animation?.cancel();dialog.querySelector('form')?.reset();dialog.close();dialog.remove();active=null;if(trigger?.isConnected)trigger.focus({preventScroll:true});}
  document.addEventListener('navigationstart',close,{signal:abort.signal});
  function readDetails(){const form=dialog.querySelector('form');if(!form)return;const destination=step===0?personal:step===1?shipping:null;if(destination)for(const input of form.querySelectorAll('input[name]'))destination[input.name]=input.value;}
  const rows=(items,currency)=>`<ul class="checkout-items">${items.map(row=>`<li><span>${e(displayText(row.product?.name)||row.productId)}<small>${e(displayText(row.variant?.name)||row.variantId||'')} · ${row.quantity} × ${e(money(row.unitPrice,currency))}</small></span><strong>${e(money(row.unitPrice*row.quantity,currency))}</strong></li>`).join('')}</ul>`;
  function render(){
    if(disposed)return;
    const steps=['personal','address','payment','review','confirmation'];
    let content='';
    if(step===0)content=`<div class="commerce-fields">${field('firstName',personal.firstName,'text','maxlength="80"')}${field('lastName',personal.lastName,'text','maxlength="80"')}${field('email',personal.email,'email','maxlength="160"')}${field('phone',personal.phone,'tel','pattern="[+0-9 \\(\\)\\-]{6,40}"')}</div>`;
    if(step===1)content=`<label class="commerce-field">${t('savedAddress')}<select data-address><option value="">${t('newAddress')}</option>${addresses.map(a=>`<option value="${e(a.id)}" ${shipping.savedId===a.id?'selected':''}>${e(a.addressLine)}, ${e(a.city)}</option>`).join('')}</select></label><div class="commerce-fields">${field('addressLine',shipping.addressLine,'text','maxlength="250"')}${field('city',shipping.city)}${field('country',shipping.country)}${field('postalCode',shipping.postalCode,'text','maxlength="24"')}${field('phone',shipping.phone,'tel','pattern="[+0-9 \\(\\)\\-]{6,40}"')}</div>`;
    if(step===2)content=`<p class="commerce-notice">${t('simulated')}</p><p>${t('cardNotice')}</p><div class="commerce-fields">${field('holder','','text','autocomplete="off" maxlength="100"')}${field('cardNumber','','text','autocomplete="off" inputmode="numeric" pattern="[0-9 ]{12,23}" maxlength="23"')}${field('expiry','','text','autocomplete="off" placeholder="MM/AA" pattern="(0[1-9]|1[0-2])/[0-9]{2}" maxlength="5"')}${field('cvv','','password','autocomplete="off" inputmode="numeric" pattern="[0-9]{3,4}" maxlength="4"')}</div>`;
    if(step===3)content=`${rows(review.rows,review.currency)}<div class="checkout-address"><h3>${t('address')}</h3><p>${e(personal.firstName)} ${e(personal.lastName)}<br>${e(shipping.addressLine)}, ${e(shipping.city)}<br>${e(shipping.country)} ${e(shipping.postalCode||'')}<br>${e(shipping.phone)}</p></div><div class="commerce-total"><span>${t('total')} · ${e(review.currency)}</span><strong>${e(money(review.total,review.currency))}</strong></div><p class="commerce-notice">${t('simulated')}</p>`;
    if(step===4)content=`<div class="checkout-success"><span aria-hidden="true">✓</span><h3>${t('confirmed')}</h3><p>${t('confirmedText')}</p><strong>#${e(order.id)}</strong></div>${rows(order.items,order.currency)}<div class="commerce-total"><span>${t('total')}</span><strong>${e(money(order.total,order.currency))}</strong></div><p>${e(order.shippingAddress.recipientName)}<br>${e(order.shippingAddress.addressLine)}, ${e(order.shippingAddress.city)}, ${e(order.shippingAddress.country)}</p><p>${t('status')}: ${t('preparing')}<br>${t('eta')}: ${e(order.estimatedDelivery)}</p><div class="checkout-actions"><a class="button" href="#/account/tracking/${e(order.id)}" data-finish>${t('viewTracking')}</a><a class="button button-secondary" href="#/catalog" data-finish>${t('backCatalog')}</a></div>`;
    dialog.innerHTML=`<section class="checkout-panel"><header><div><p class="eyebrow">GLOBALIZAT · DEMO</p><h2 id="checkout-title">${t('checkoutTitle')}</h2></div><button class="icon-button" data-close aria-label="${t('close')}">×</button></header><ol class="checkout-steps">${steps.map((key,i)=>`<li ${i===step?'aria-current="step"':''} class="${i<=step?'is-complete':''}"><span>${i+1}</span><small>${t(key)}</small></li>`).join('')}</ol><form autocomplete="off">${content}<p role="alert" class="commerce-error"></p>${step<4?`<div class="checkout-actions">${step?`<button type="button" class="button button-secondary" data-back>${t('back')}</button>`:''}<button class="button" type="submit">${t(step===3?'confirmPurchase':'next')} →</button></div>`:''}</form></section>`;
    dialog.dataset.checkoutStep=String(step);dialog.querySelector('input, [type=submit], [data-finish]')?.focus({preventScroll:true});
  }
  try{
    [user,addresses,review]=await Promise.all([accountServices.userService.getCurrentUser(),accountServices.addressService.list(),cartService.getSummary()]);
    if(disposed)return;
    if(!review.rows.length){close();return;}
    Object.assign(personal,{firstName:user.firstName,lastName:user.lastName,email:user.email,phone:user.phone});const primary=addresses.find(a=>a.isPrimary)||addresses[0];if(primary)Object.assign(shipping,primary,{savedId:primary.id});
    document.body.append(dialog);dialog.showModal();render();animation=animateSurface(dialog.querySelector('section'));
  }catch{dialog.innerHTML=`<section class="checkout-panel"><p role="alert">${t('checkoutError')}</p><button class="button">${t('close')}</button></section>`;document.body.append(dialog);dialog.showModal();dialog.querySelector('button').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();},{signal:abort.signal});return;}
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();},{signal:abort.signal});
  dialog.addEventListener('click',event=>{if(event.target===dialog||event.target.closest('[data-close],[data-finish]'))close();else if(event.target.closest('[data-back]')&&!busy){readDetails();dialog.querySelector('form')?.reset();step--;render();}},{signal:abort.signal});
  dialog.addEventListener('change',event=>{if(event.target.matches('[data-address]')){readDetails();const chosen=addresses.find(a=>a.id===event.target.value);if(chosen)Object.assign(shipping,chosen,{savedId:chosen.id});else{Object.keys(shipping).forEach(k=>delete shipping[k]);shipping.phone=personal.phone;}render();}},{signal:abort.signal});
  dialog.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    const form=event.target;if(!form.reportValidity())return;readDetails();
    if(step===2){const number=form.elements.cardNumber.value.replace(/\s/g,'');if(!/^\d{12,19}$/.test(number)){form.querySelector('[role=alert]').textContent=t('paymentError');return;}form.reset();}
    busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{
      if(step===3){const feedback=createPaymentFeedback(dialog);try{[order]=await Promise.all([checkoutService.confirm({review,shippingAddress:{...shipping,recipientName:`${personal.firstName} ${personal.lastName}`},userId:user.id,requestId}),feedback.ready]);await feedback.success();step=4;}finally{feedback.dispose();}}
      else{if(step===2){review=await cartService.getSummary();if(!review.rows.length)throw new Error('EMPTY_CART');}step++;}
      render();
    }catch(error){if(step===3){try{review=await cartService.getSummary();render();}catch{step=1;render();}}dialog.querySelector('[role=alert]').textContent=t(error.message==='CART_CHANGED'?'cartChanged':'checkoutError');}
    finally{busy=false;if(pendingClose)close();dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
  },{signal:abort.signal});
  window.addEventListener('preferenceschange',async()=>{if(busy)return;readDetails();if(step===3){try{review=await cartService.getSummary();}catch{step=1;}}render();},{signal:abort.signal});
}
