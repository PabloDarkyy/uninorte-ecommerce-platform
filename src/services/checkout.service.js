import { cartService } from './cart.service.js';
import { orderService } from './order.service.js';
export const checkoutService = {
  confirm({review,shippingAddress,userId,requestId}) {
    return cartService.confirm(review.revision,review.currency,async current=>{
      const stamp=summary=>JSON.stringify(summary.rows.map(r=>[r.id,r.quantity,r.unitPrice]));
      if(stamp(current)!==stamp(review))throw new Error('CART_CHANGED');
      return orderService.create({items:current.rows.map(({productId,variantId,quantity,unitPrice})=>({productId,variantId,quantity,unitPrice})),currency:current.currency,shippingAddress,userId,requestId});
    });
  },
};
