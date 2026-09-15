import es from '../../locales/es.js';
import en from '../../locales/en.js';
import { readPreference, savePreference } from '../../utils/preferences.js';
const dictionaries = { es, en };
let language = readPreference('uninorte.language', 'es');
if (!dictionaries[language]) language = 'es';
export const getLanguage = () => language;
export const t = key => dictionaries[language][key] ?? es[key] ?? key;
export const localize = value => typeof value === 'object' && value !== null ? value[language] ?? value.es ?? '' : value;
export function setLanguage(value) {
  if (!dictionaries[value]) return;
  language = value;
  savePreference('uninorte.language', value);
  window.dispatchEvent(new Event('preferenceschange'));
}
