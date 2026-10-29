import test from 'node:test';
import assert from 'node:assert/strict';
import { API_BASE_URL, assetUrl } from '../src/config/api.js';

test('assetUrl solo dirige las cargas del backend al origen de la API', () => {
  assert.equal(assetUrl('/uploads/products/images/file-x.png'), `${API_BASE_URL}/uploads/products/images/file-x.png`);
  for (const value of [null, undefined, '', './src/assets/image.png', 'https://cdn.example.com/image.png', 'http://cdn.example.com/image.png', 'blob:https://example.com/id', 'data:image/png;base64,AA==']) {
    assert.equal(assetUrl(value), value);
  }
});
