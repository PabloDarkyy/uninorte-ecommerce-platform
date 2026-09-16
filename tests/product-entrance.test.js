import test from 'node:test';
import assert from 'node:assert/strict';
import { productFlightFrame, productFlightDuration } from '../src/modules/product-entrance.js';
test('product flight moves and scales together, reaches exact dynamic endpoints',()=>{
 for(const [from,to] of [[{x:200,y:800,scale:.5},{x:700,y:220}],[{x:160,y:600,scale:.65},{x:170,y:190}]]){
  const first=productFlightFrame(from,to,0),last=productFlightFrame(from,to,1),middle=productFlightFrame(from,to,.5);
  assert.deepEqual(first,{...from,reveal:0});assert.deepEqual(last,{...to,scale:1,reveal:1});
  assert.ok(middle.y<from.y && middle.y>to.y);assert.ok(middle.scale>from.scale && middle.scale<1);assert.ok(middle.reveal>0 && middle.reveal<1);
  assert.deepEqual(productFlightFrame(from,to,-1),first);assert.deepEqual(productFlightFrame(from,to,2),last);
 }
 assert.ok(productFlightDuration>=700 && productFlightDuration<=1100);
});
