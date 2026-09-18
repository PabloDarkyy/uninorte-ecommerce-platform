import { cartService } from '../../services/cart.service.js';
import { productMedia } from '../../utils/product-media.js';
import { displayText, displayPrice } from '../../utils/product-display.js';
import { escapeHtml as e } from '../../utils/html.js';
import { t } from '../../features/i18n/i18n.js';
import { captureProduct, flyProduct } from '../../modules/product-entrance.js';
import { openCart, rememberCartPreview } from '../../features/cart/cart-drawer.js';
import { errorText } from '../../features/cart/presentation.js';
import { motionOptions } from '../../modules/ui-motion.js';
export function mountProductCommerce(dialog,product,viewer,onModelReady){
  const abort=new AbortController(),signal=abort.signal,mount=dialog.querySelector('[data-model-mount]');
  let variant=product.variants[0],busy=false,animation;
  const panel=document.createElement('div');panel.className='product-commerce';
  dialog.querySelector('.variant-list').parentElement.querySelector('.variant-list').replaceWith(panel);
  panel.innerHTML=`<label class="commerce-field"><span data-i18n="variants"></span><select data-variant>${product.variants.map(v=>`<option value="${e(v.id)}">${e(displayText(v.name))}</option>`).join('')}</select></label><label class="commerce-field"><span data-i18n="quantity"></span><input data-quantity type="number" min="1" step="1" value="1" required></label><div class="commerce-buy-actions"><button class="button" data-add data-i18n="add"></button><button class="button button-secondary" data-buy data-i18n="buyNow"></button></div><p class="commerce-feedback" role="status" aria-live="polite"></p>`;
  if(!product.variants.length)panel.querySelector('[data-variant]').closest('label').hidden=true;
  const status=()=>panel.querySelector('[role=status]');
  function refresh(){
    dialog.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
    dialog.querySelector('#preview-title').textContent=displayText(product.name);
    dialog.querySelector('#preview-description').textContent=displayText(product.description)||displayText(product.shortDescription);
    dialog.querySelector('.modal-content > .eyebrow').textContent=`${displayText(product.category)} · ${displayText(product.origin)||t('origin')}`;
    dialog.querySelector('.modal-price').innerHTML=`${e(displayPrice({...product,basePrice:variant?.price ?? product.basePrice}))}<small>${t('examplePrice')}</small>`;
    const stock=Math.min(product.stock,variant?.stock ?? product.stock),available=stock>0&&product.active!==false&&product.availability!=='unavailable';
    dialog.querySelector('.modal-stock').innerHTML=`${t(available?'available':'unavailable')}<small>${stock} ${t('units')}</small>`;
    panel.querySelector('[data-quantity]').max=stock;
    for(const button of panel.querySelectorAll('button'))button.disabled=busy||!available;
    panel.querySelector('select').disabled=busy;panel.querySelector('input').disabled=busy;
    for(const option of panel.querySelectorAll('option'))option.textContent=displayText(product.variants.find(v=>v.id===option.value).name);
    dialog.querySelectorAll('[data-close]').forEach(b=>b.setAttribute('aria-label',t('close')));
  }
  async function switchVariant(){
    if(busy)return;variant=product.variants.find(v=>v.id===panel.querySelector('select').value);busy=true;refresh();status().textContent=t('variantLoading');
    try{
      animation=mount.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.98)'}],{...motionOptions('fast'),fill:'forwards'});await animation.finished;
      if(signal.aborted)return;
      const media=productMedia(product,variant);let image=mount.querySelector('.stage-product-image');if(media.image){if(!image){image=document.createElement('img');image.className='stage-product-image';mount.prepend(image);}image.src=media.image;image.alt=displayText(product.name);}else image?.remove();
      const ready=await viewer.setModel(media.model);if(signal.aborted)return;
      const conceptual=mount.querySelector('.concept-product');if(conceptual)conceptual.hidden=Boolean(media.image);
      onModelReady(ready);animation.cancel();animation=mount.animate([{opacity:0,transform:'scale(.98)'},{opacity:1,transform:'scale(1)'}],motionOptions('fast'));await animation.finished;
      status().textContent=media.model&&!ready?t('variantError'):'';
    }catch{/* A closed dialog cancels its animation. */}finally{busy=false;if(!signal.aborted)refresh();}
  }
  panel.querySelector('select').addEventListener('change',switchVariant,{signal});
  panel.addEventListener('click',async event=>{
    const action=event.target.closest('[data-add],[data-buy]');if(!action||busy)return;
    const quantity=Number(panel.querySelector('[data-quantity]').value);if(!panel.querySelector('input').reportValidity())return;
    busy=true;refresh();status().textContent='';
    try{
      const item=await cartService.addItem(product.id,variant?.id || null,quantity);if(signal.aborted)return;
      const capture=captureProduct(viewer,mount);rememberCartPreview(item.id,capture);
      if(action.hasAttribute('data-buy')){
        const drawer=await openCart({defer:true,itemId:item.id});if(signal.aborted){drawer.close();return;}
        const combined=new AbortController(),cancel=()=>combined.abort();signal.addEventListener('abort',cancel,{once:true});drawer.dialog.addEventListener('close',cancel,{once:true});
        try { await flyProduct({capture,target:drawer.target(),host:drawer.dialog,signal:combined.signal,start:drawer.start}); }
        finally { signal.removeEventListener('abort',cancel);drawer.dialog.removeEventListener('close',cancel); }
      }else{
        const target=document.querySelector('[data-cart-open]');await flyProduct({capture,target,host:dialog,signal});
        if(!signal.aborted)target?.animate([{transform:'scale(1)'},{transform:'scale(1.16)'},{transform:'scale(1)'}],motionOptions('normal'));
      }
      if(!signal.aborted){status().textContent=t('added');document.dispatchEvent(new Event('cartfeedback'));}
    }catch(error){if(!signal.aborted)status().textContent=errorText(error);}
    finally{busy=false;if(!signal.aborted)refresh();}
  },{signal});
  window.addEventListener('preferenceschange',refresh,{signal});refresh();
  // Select the initial variant only after the catalog hero transfer has completed.
  const dispose=()=>{abort.abort();animation?.cancel();};
  dispose.activate=()=>{if(productMedia(product,variant).model!==productMedia(product).model)switchVariant();};
  return dispose;
}
