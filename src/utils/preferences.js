export function readPreference(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
export function savePreference(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Las preferencias siguen funcionando en memoria. */ }
}
