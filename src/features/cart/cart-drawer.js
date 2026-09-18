import { cartService } from '../../services/cart.service.js';
import { productService } from '../../services/product.service.js';
import { productMedia } from '../../utils/product-media.js';
import { displayText } from '../../utils/product-display.js';
import { escapeHtml as e } from '../../utils/html.js';
import { t } from '../i18n/i18n.js';
import { money, errorText } from './presentation.js';
import { motionOptions } from '../../modules/ui-motion.js';
let current,opening;
const previews=new Map();
cartService.subscribe(async()=>{const items=await cartService.list();for(const id of previews.keys())if(!items.some(i=>i.id===id))previews.delete(id);});
export function rememberCartPreview(id,capture){if(capture)previews.set(id,{url:capture.url,node:capture.url?null:capture.node.cloneNode(true),rect:capture.rect});}
export function closeCart(){current?.close();}
export function openCart(options){if(current)return Promise.resolve(current);if(!opening)opening=buildCart(options).finally(()=>{opening=null;});return opening;}
async function buildCart({defer=false,itemId}={}) {
  if(current)return current;
  const trigger=document.activeElement, dialog=document.createElement('dialog'), abort=new AbortController();
  dialog.className='cart-drawer';dialog.setAttribute('aria-labelledby','cart-title');
  dialog.innerHTML=`<section class="cart-panel"><header><div><p class="eyebrow">UNINORTE</p><h2 id="cart-title"></h2></div><button class="icon-button" data-close>×</button></header><div class="cart-items"></div><p role="alert" class="commerce-error"></p><footer class="cart-footer"></footer></section>`;
  let disposed=false,animation,renderId=0,working=false;
  const resize=new ResizeObserver(()=>fitPreviews());
  function fitPreviews(){for(const row of dialog.querySelectorAll('[data-item-id]')){const preview=previews.get(row.dataset.itemId),target=row.querySelector('[data-cart-preview]'),node=target.querySelector('[data-snapshot]');if(!preview||!node)continue;const rect=target.getBoundingClientRect();node.style.transform=`translate(-50%,-50%) scale(${Math.min(rect.width/preview.rect.width,rect.height/preview.rect.height)})`;}}
  function close(){if(disposed)return;disposed=true;animation?.cancel();resize.disconnect();abort.abort();unsubscribe();dialog.close();dialog.remove();current=null;if(trigger?.isConnected)trigger.focus({preventScroll:true});document.dispatchEvent(new Event('productmodalchange'));}
  async function render(){const version=++renderId;let summary,invalid=false;
    try{summary=await cartService.getSummary();}catch{invalid=true;const items=await cartService.list();summary={rows:await Promise.all(items.map(async i=>({...i,product:await productService.getById(i.productId)}))),total:0};}
    if(disposed||version!==renderId)return;
    dialog.querySelector('h2').textContent=t('myCart');dialog.querySelector('[data-close]').setAttribute('aria-label',t('close'));
    dialog.querySelector('.cart-items').innerHTML=summary.rows.length?summary.rows.map(row=>{const p=row.product,v=row.variant || p?.variants.find(v=>v.id===row.variantId), image=previews.get(row.id)?.url|| (p && productMedia(p,v).image);
      return `<article class="cart-item" data-item-id="${e(row.id)}"><div class="cart-item-preview"><div class="cart-preview-content" data-cart-preview>${image?`<img src="${e(image)}" alt="${e(displayText(p?.name))}">`:'<span aria-hidden="true">◇</span>'}</div></div><div class="cart-item-info"><h3>${e(displayText(p?.name)||t('productNotFound'))}</h3><p>${e(displayText(v?.name))}</p><p>${row.subtotal==null?'—':e(money(row.unitPrice,summary.currency))}</p><div class="cart-quantity"><button data-delta="-1" aria-label="${e(t('decrease'))}" ${row.quantity<=1?'disabled':''}>−</button><output>${row.quantity}</output><button data-delta="1" aria-label="${e(t('increase'))}">+</button><button data-remove>${t('remove')}</button></div><strong>${row.subtotal==null?'':e(money(row.subtotal,summary.currency))}</strong></div></article>`;}).join(''):`<p class="cart-empty">${t('emptyCart')}</p>`;
    dialog.querySelector('[role=alert]').textContent=invalid?t('cartInvalid'):'';
    for(const row of dialog.querySelectorAll('[data-item-id]')){const preview=previews.get(row.dataset.itemId);if(!preview?.node)continue;const target=row.querySelector('[data-cart-preview]'),node=preview.node.cloneNode(true);node.dataset.snapshot='';Object.assign(node.style,{position:'absolute',left:'50%',top:'50%',width:`${preview.rect.width}px`,height:`${preview.rect.height}px`});target.replaceChildren(node);}fitPreviews();
    dialog.querySelector('footer').innerHTML=`<div class="commerce-total"><span>${t('subtotal')}</span><strong>${invalid?'—':e(money(summary.total,summary.currency))}</strong></div><div class="commerce-total"><span>${t('total')}</span><strong>${invalid?'—':e(money(summary.total,summary.currency))}</strong></div><button class="button" data-checkout ${invalid||!summary.rows.length?'disabled':''}>${t('checkout')} →</button><button class="button button-secondary" data-close>${t('keepShopping')}</button>`;
  }
  const unsubscribe=cartService.subscribe(()=>{if(!working)render();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();},{signal:abort.signal});
  dialog.addEventListener('click',async event=>{
    if(event.target===dialog||event.target.closest('[data-close]'))return close();
    if(event.target.closest('[data-checkout]')){close();const {openCheckout}=await import('../checkout/checkout.js');return openCheckout();}
    const row=event.target.closest('[data-item-id]');if(!row||working)return;
    const button=event.target.closest('button');if(!button)return;
    working=true;button.disabled=true;
    try{if(button.hasAttribute('data-remove'))await cartService.removeItem(row.dataset.itemId);else if(button.dataset.delta){const items=await cartService.list(),item=items.find(i=>i.id===row.dataset.itemId);await cartService.updateQuantity(item.id,item.quantity+Number(button.dataset.delta));}await render();}catch(error){if(!disposed)dialog.querySelector('[role=alert]').textContent=errorText(error);}finally{working=false;button.disabled=false;}
  },{signal:abort.signal});
  window.addEventListener('preferenceschange',render,{signal:abort.signal});
  document.addEventListener('navigationstart',close,{signal:abort.signal});
  dialog.addEventListener('close',close,{signal:abort.signal});
  document.body.append(dialog);dialog.showModal();await render();
  if(disposed)return {dialog,close,start:()=>Promise.resolve(),target:()=>null};
  resize.observe(dialog.querySelector('.cart-panel'));
  const target=()=>[...dialog.querySelectorAll('[data-item-id]')].find(row=>row.dataset.itemId===itemId)?.querySelector('[data-cart-preview]');
  target()?.scrollIntoView({block:'nearest'});
  function start(){animation=dialog.querySelector('.cart-panel').animate([{transform:'translateX(100%)',opacity:.5},{transform:'translateX(0)',opacity:1}],{...motionOptions('normal'),duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:780});return animation.finished.catch(()=>{});}
  current={dialog,close,start,target};if(!defer)start();return current;
}
