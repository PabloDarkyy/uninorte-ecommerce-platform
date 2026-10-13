// URL del Backend. En GitHub Pages se inyecta desde el workflow de despliegue.
// En local usa el Backend local, salvo que window.__GLOBALIZAT_API_URL__ se configure.
export const API_BASE_URL = String(globalThis.__GLOBALIZAT_API_URL__ || 'http://127.0.0.1:4000').replace(/\/$/, '');
