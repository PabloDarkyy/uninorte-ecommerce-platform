import test from 'node:test';
import assert from 'node:assert/strict';
import { getTransitionState } from '../src/components/hero/hero-transition.js';

const viewport = { width: 1440, height: 1000, origin: { x: 980, y: 450, width: 450, height: 420 } };
test('scroll clamps, restores the hero, centers horizontally and finishes the wipe', () => {
  const start = getTransitionState(-1, viewport);
  assert.equal(start.scale, 1);
  assert.equal(start.x, viewport.origin.x);
  assert.equal(start.locked, false);
  const horizontal = getTransitionState(0.7, viewport);
  assert.equal(horizontal.x, 720);
  assert.equal(horizontal.y, 500);
  assert.equal(horizontal.rotationZ, Math.PI / 2);
  assert.equal(horizontal.textOpacity, 0);
  const macro = getTransitionState(0.9, viewport);
  assert.ok(macro.scale > horizontal.scale * 5);
  assert.equal(macro.opacity, 1);
  const end = getTransitionState(2, viewport);
  assert.equal(end.opacity, 0);
  assert.equal(end.colorMix, 1);
  assert.equal(end.decorationOpacity, 0);
});
test('all locked phases are independent of travel direction and continuous at boundaries', () => {
  const progress = [0.12, 0.15, 0.3, 0.4, 0.55, 0.65, 0.7, 0.8, 0.82, 0.9, 0.95, 1];
  const forward = progress.map(p => getTransitionState(p, viewport));
  const backward = [...progress].reverse().map(p => getTransitionState(p, viewport)).reverse();
  assert.deepEqual(backward, forward);
  for (const p of progress) {
    const before = getTransitionState(p - 0.000001, viewport);
    const after = getTransitionState(p + 0.000001, viewport);
    for (const key of ['x', 'y', 'scale', 'rotationZ', 'opacity', 'colorMix']) {
      assert.ok(Math.abs(before[key] - after[key]) < 0.02, `${key} jumps at ${p}`);
    }
  }
});
test('mobile keeps all phases and reduced motion preserves position and size', () => {
  const mobile = { ...viewport, width: 375, height: 812, origin: { x: 187, y: 540, width: 300, height: 340 } };
  const middle = getTransitionState(0.7, mobile);
  assert.equal(middle.x, 187.5);
  assert.equal(middle.rotationZ, Math.PI / 2);
  assert.ok(getTransitionState(0.9, mobile).scale > middle.scale * 4);
  for (const p of [0, 0.4, 0.7, 0.9, 1]) {
    const state = getTransitionState(p, { ...mobile, reducedMotion: true });
    assert.equal(state.scale, 1);
    assert.equal(state.x, mobile.origin.x);
    assert.equal(state.y, mobile.origin.y);
    assert.equal(state.locked, false);
  }
  assert.equal(getTransitionState(1, { ...mobile, reducedMotion: true }).colorMix, 1);
});
