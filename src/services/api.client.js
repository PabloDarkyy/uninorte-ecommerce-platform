import { API_BASE_URL } from '../config/api.js';

let authToken = null;

export function setApiToken(token) {
  authToken = token || null;
}

export function getApiToken() {
  return authToken;
}

export async function apiRequest(path, { method = 'GET', body, formData = false, signal } = {}) {
  const headers = {};
  if (!formData) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let payload = body;
  if (!formData && body !== undefined) payload = JSON.stringify(body);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: payload, signal });
  } catch (error) {
    const unavailable = new Error('No se pudo conectar con el servidor. Verifica que el Backend esté ejecutándose.');
    unavailable.code = 'NETWORK_ERROR';
    unavailable.cause = error;
    throw unavailable;
  }

  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }

  if (!response.ok) {
    const error = new Error(data?.error || `Solicitud rechazada (${response.status}).`);
    error.code = data?.code || `HTTP_${response.status}`;
    error.status = response.status;
    throw error;
  }
  return data;
}
