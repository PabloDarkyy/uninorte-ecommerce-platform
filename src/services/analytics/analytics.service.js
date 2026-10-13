import { apiRequest } from '../api.client.js';
export const analyticsService = { async createSnapshot() { return apiRequest('/api/analytics/snapshot'); } };
