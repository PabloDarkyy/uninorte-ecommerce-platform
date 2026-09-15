import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockProductRepository } from '../src/services/products/mock-product-repository.js';
import { createProductService } from '../src/services/product.service.js';
import { createProductAssetService } from '../src/services/products/product-assets.js';
import { createMockAnalyticsService } from '../src/services/analytics/mock-analytics.service.js';
import { createMockAccountServices } from '../src/features/account/services/mock-services.js';
import { createAccountRepository } from '../src/features/account/services/repository.js';
const setup = () => { const products = createProductService(createMockProductRepository()); const accounts = createMockAccountServices(createAccountRepository(),products); return { products, accounts }; };
test('admin mutations use the catalog repository and preserve historical prices',async()=>{
 const {products,accounts}=setup();
 const old=await accounts.orderService.getById('ORD-0006');
 const item=await products.getById('licor'); await products.updateProduct(item.id,{basePrice:12345,name:{...item.name,es:'Nombre editado'}});
 const changed=await accounts.orderService.getById('ORD-0006');assert.equal(changed.total,old.total);assert.equal(changed.items[0].product.name.es,'Nombre editado');
 const created=await products.createProduct({name:{es:'Nuevo'},category:{es:'Alimentos'},basePrice:2000,baseCurrency:'PYG',stock:8,variants:[{id:'v1',name:{es:'Bolsa'},stock:4,price:500}]});
 assert.equal((await products.list()).length,7);assert.ok((await products.list()).find(p=>p.id===created.id));
 await Promise.all([products.updateStock(created.id,null,2),products.updateStock(created.id,'v1',3),products.setProductFeatured(created.id,true)]);
 const saved=await products.getById(created.id);assert.equal(saved.stock,2);assert.equal(saved.variants[0].stock,3);assert.equal(saved.featured,true);
 await products.deactivateProduct(created.id);assert.equal((await products.list()).length,6);assert.equal((await products.list({includeInactive:true})).length,7);assert.equal((await products.getById(created.id)).active,false);
 await products.updateProduct(created.id,{active:true});assert.equal((await products.list()).length,7);
 saved.name.es='Mutated caller';assert.equal((await products.getById(created.id)).name.es,'Nuevo');
});
test('invalid writes are atomic and repository failures are surfaced',async()=>{
 const {products}=setup();const old=await products.getById('mani');
 for(const data of [{stock:-1},{stock:1.5},{basePrice:NaN},{baseCurrency:'XYZ'},{name:{es:' '}},{variants:[{id:'x',name:'A',stock:1},{id:'x',name:'B',stock:2}]}]) await assert.rejects(products.updateProduct('mani',data));
 await assert.rejects(products.updateStock('mani','missing',1));await assert.rejects(products.updateStock('mani',null,-1));assert.deepEqual(await products.getById('mani'),old);
 const repo=createMockProductRepository();const broken=createProductService({read:repo.read,async write(){throw new Error('Sin conexión');}});await assert.rejects(broken.updateProduct('mani',{stock:4}),/Sin conexión/);assert.equal((await broken.getById('mani')).stock,10);
});
test('each analytics snapshot is coherent, isolated and separates currencies',async()=>{
 const {products,accounts}=setup();await products.updateProduct('miel',{baseCurrency:'USD',basePrice:3.25});
 let random=0; const service=createMockAnalyticsService(products,accounts.orderService,()=>{random=(random+.17)%1;return random;},()=>new Date('2026-09-13T12:00:00Z'));
 const first=await service.createSnapshot(),copy=structuredClone(first),second=await service.createSnapshot();assert.notEqual(first.id,second.id);assert.deepEqual(first,copy);assert.notDeepEqual(first.salesByProduct,second.salesByProduct);
 assert.equal(first.units,first.salesByPeriod.reduce((sum,p)=>sum+p.units,0));assert.equal(first.units,first.salesByProduct.reduce((sum,p)=>sum+p.units,0));
 for(const row of first.salesByProduct)assert.equal(row.revenue,row.units*row.unitPrice);
 for(const total of first.revenue)assert.equal(total.amount,first.salesByProduct.filter(p=>p.currency===total.currency).reduce((sum,p)=>sum+p.revenue,0));
 assert.equal(first.ordersCount,2);assert.equal(first.topProducts[0].units,Math.max(...first.salesByProduct.map(p=>p.units)));
 for(const p of await products.list())await products.deactivateProduct(p.id);
 const empty=await service.createSnapshot();assert.equal(empty.units,0);assert.deepEqual(empty.revenue,[]);assert.equal(empty.salesByPeriod.reduce((sum,p)=>sum+p.units,0),0);
});
test('asset previews validate files and release owned URLs only once',async()=>{
 const revoked=[];let n=0;const assets=createProductAssetService({createObjectURL:()=>`blob:demo-${++n}`,revokeObjectURL:url=>revoked.push(url)});
 await assert.rejects(assets.uploadProductImage({size:3,type:'text/html',name:'x.html'}));await assert.rejects(assets.uploadProductModel({size:3,name:'x.gltf'}));
 const image=await assets.uploadProductImage({size:3,type:'image/png',name:'photo.png'});const model=await assets.uploadProductModel({size:3,name:'product.glb'});
 assert.deepEqual(assets.references({image:image.url,images:[],model:model.url,variants:[]}),[image.url,model.url]);
 assets.release(image.url);assets.release(image.url);assets.release('https://example.com/a.png');assert.deepEqual(revoked,[image.url]);
});
