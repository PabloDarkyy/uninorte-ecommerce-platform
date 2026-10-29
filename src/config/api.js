// URL del Backend. Para despliegues, puede configurarse antes de cargar app.js:
// window.__GLOBALIZAT_API_URL__ = 'https://tu-backend.example.com';
// Enabled only by the Pages build when no backend is configured; never inferred from network failures.
export const DEMO_MODE = globalThis.__GLOBALIZAT_DEMO__ === true;
export const API_BASE_URL = String(globalThis.__GLOBALIZAT_API_URL__ || 'http://127.0.0.1:4000').replace(/\/$/, '');
export const assetUrl = url => typeof url === 'string' && url.startsWith('/uploads/') ? `${API_BASE_URL}${url}` : url;
