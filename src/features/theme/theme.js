import { savePreference } from '../../utils/preferences.js';

const preferenceKey = 'uninorte.theme';

export function getTheme() {
  const explicitTheme = document.documentElement.dataset.theme;
  if (explicitTheme === 'dark' || explicitTheme === 'light') return explicitTheme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(value) {
  if (value !== 'dark' && value !== 'light') throw new TypeError('Theme must be "dark" or "light".');
  document.documentElement.dataset.theme = value;
  savePreference(preferenceKey, value);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: value } }));
  return value;
}

export function toggleTheme() {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}
