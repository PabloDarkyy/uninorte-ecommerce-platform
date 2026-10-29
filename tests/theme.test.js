import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function declarations(block) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

function rule(pattern) {
  const match = css.match(pattern);
  assert.ok(match, `Missing token rule matching ${pattern}`);
  return declarations(match[1]);
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map(value => Number.parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test('dark theme text and UI colors meet WCAG contrast targets', () => {
  const dark = rule(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/);
  const pairs = [
    ['text', 'background', 4.5],
    ['text', 'surface', 4.5],
    ['text', 'surface-raised', 4.5],
    ['text-muted', 'background', 4.5],
    ['on-accent', 'green-dark', 4.5],
    ['green-dark', 'background', 3],
  ];

  for (const [foreground, background, minimum] of pairs) {
    const ratio = contrast(dark[foreground], dark[background]);
    assert.ok(ratio >= minimum, `${foreground}/${background} contrast ${ratio.toFixed(2)} is below ${minimum}:1`);
  }
});

test('light theme foundation tokens remain unchanged', () => {
  const light = rule(/^:root\s*\{([\s\S]*?)\}/m);
  assert.deepEqual(
    Object.fromEntries(['background', 'surface', 'text', 'green-dark'].map(name => [name, light[name].toLowerCase()])),
    { background: '#f5f3eb', surface: '#fffef9', text: '#22362c', 'green-dark': '#244b38' },
  );
});
