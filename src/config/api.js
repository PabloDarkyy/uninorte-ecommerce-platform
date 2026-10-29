// URL del Backend. Para despliegues, puede configurarse antes de cargar app.js:
// window.__GLOBALIZAT_API_URL__ = 'https://tu-backend.example.com';
export const API_BASE_URL = String(globalThis.__GLOBALIZAT_API_URL__ || 'http://127.0.0.1:4000').replace(/\/$/, '');
