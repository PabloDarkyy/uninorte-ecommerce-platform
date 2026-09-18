import test from 'node:test';
import assert from 'node:assert/strict';
import { createCartService } from '../src/services/cart.service.js';
import { createProductService } from '../src/services/product.service.js';
import { createMockProductRepository } from '../src/services/products/mock-product-repository.js';
import { createMockAccountServices } from '../src/features/account/services/mock-services.js';
import { createAccountRepository } from '../src/features/account/services/repository.js';
import { productModel } from '../src/utils/product-media.js';
const fixture=()=>{const products=createProductService(createMockProductRepository());return {products,cart:createCartService(products),account:createMockAccountServices(createAccountRepository(),products)};};
test('cart serializes concurrent changes, validates variant/global stock and does not duplicate rows',async()=>{
 const {cart,products}=fixture();await products.updateStock('harina','tipo-0000',2);
 const outcomes=await Promise.allSettled([cart.addItem('harina','tipo-0000',2),cart.addItem('harina','tipo-0000',1)]);
 assert.deepEqual(outcomes.map(r=>r.status),['fulfilled','rejected']);assert.equal((await cart.list()).length,1);
 await cart.addItem('harina','integral',8);await assert.rejects(cart.addItem('harina','demo',1));
 const item=(await cart.list())[0];await assert.rejects(cart.updateQuantity(item.id,-1));await cart.removeItem(item.id);assert.equal(await cart.getItemCount(),8);
});
test('confirmation is serialized; failure preserves cart; order uses shared repository and historical snapshots',async()=>{
 const {cart,products,account}=fixture();await cart.addItem('harina','integral',2);const review=await cart.getSummary('USD');
 await assert.rejects(cart.confirm(review.revision,'USD',()=>{throw new Error('offline backend')}));assert.equal(await cart.getItemCount(),2);
 const user=await account.userService.getCurrentUser(),shippingAddress={...user.addresses[0],cardNumber:'discard-this',cvv:'discard-this'};
 const create=current=>account.orderService.create({items:current.rows,currency:current.currency,userId:user.id,shippingAddress,requestId:'test-order'});
 const order=await cart.confirm(review.revision,'USD',create);assert.equal(order.status,'preparing');assert.equal(order.total,2.5);assert.equal(await cart.getItemCount(),0);
 assert.equal(JSON.stringify(order).includes('discard-this'),false);assert.equal(order.shippingAddress.cardNumber,undefined);
 await assert.rejects(cart.confirm(review.revision,'USD',create));assert.equal((await account.orderService.list()).filter(o=>o.requestId==='test-order').length,1);
 await products.updateProduct('harina',{basePrice:20000});await account.addressService.save({...user.addresses[0],city:'New city'});
 const historical=await account.orderService.getById(order.id);assert.equal(historical.total,2.5);assert.equal(historical.shippingAddress.city,user.addresses[0].city);assert.equal(historical.currency,'USD');
 assert.equal((await account.trackingService.getByOrderId(order.id)).orderId,order.id);
});
test('changed cart cannot confirm an outdated review and models resolve generically',async()=>{
 const {cart}=fixture();await cart.addItem('mani','demo',1);const review=await cart.getSummary('EUR');await cart.addItem('mani','demo',1);await assert.rejects(cart.confirm(review.revision,'EUR',()=>{}),/CART_CHANGED/);
 assert.equal(productModel({model:'default.glb'},{model3dUrl:'variant.glb'}),'variant.glb');assert.equal(productModel({model3dUrl:'default.glb'},{}),'default.glb');assert.equal(productModel({},{}),null);
});
