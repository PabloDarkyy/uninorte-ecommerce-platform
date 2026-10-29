import { apiRequest } from '../../../services/api.client.js';
import { languageOptions } from '../../../config/languages.js';

const accountError = error => error;

export function createApiAccountServices() {
  const userService = {
    async getCurrentUser() { return apiRequest('/api/account/me'); },
    async updateCurrentUser(data) { return apiRequest('/api/account/me', { method: 'PUT', body: data }); },
    async updateAvatar(file) {
      if (!file || !file.size) throw new Error('Selecciona un archivo con contenido.');
      const formData = new FormData(); formData.append('file', file);
      try { return await apiRequest('/api/account/avatar', { method: 'POST', body: formData, formData: true }); }
      catch (error) { throw accountError(error); }
    },
  };
  const addressService = {
    async list() { return apiRequest('/api/account/addresses'); },
    async save(data) { return data.id ? apiRequest(`/api/account/addresses/${encodeURIComponent(data.id)}`, { method: 'PUT', body: data }) : apiRequest('/api/account/addresses', { method: 'POST', body: data }); },
    async remove(id) { return apiRequest(`/api/account/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
    async setPrimary(id) { return apiRequest(`/api/account/addresses/${encodeURIComponent(id)}/primary`, { method: 'POST' }); },
  };
  const orderService = {
    async create({ items, currency, shippingAddress, requestId }) { return apiRequest('/api/orders', { method: 'POST', body: { items, currency, shippingAddress, requestId } }); },
    async list() { return apiRequest('/api/orders'); },
    async getById(id) { return apiRequest(`/api/orders/${encodeURIComponent(id)}`); },
  };
  const trackingService = {
    async enter() { return apiRequest('/api/tracking/enter', { method: 'POST' }); },
    async getByOrderId(id) { return apiRequest(`/api/tracking/${encodeURIComponent(id)}`); },
  };
  const preferenceService = {
    async get() { return apiRequest('/api/account/preferences'); },
    async update(data) {
      if (!languageOptions.some(option => option.value === data.language)) throw new Error('Selecciona un idioma válido.');
      if (!['PYG', 'USD', 'EUR'].includes(data.currency)) throw new Error('Selecciona una moneda válida.');
      return apiRequest('/api/account/preferences', { method: 'PUT', body: data });
    },
  };
  const userAdminService = {
    async getCurrentUser() { return apiRequest('/api/auth/me'); },
    async list() { return apiRequest('/api/admin/customers'); },
    async getById(id) { return apiRequest(`/api/admin/customers/${encodeURIComponent(id)}`); },
  };
  return { userService, addressService, orderService, trackingService, preferenceService, userAdminService, resetSession() {} };
}
