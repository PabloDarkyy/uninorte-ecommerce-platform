import { apiRequest, setApiToken } from './api.client.js';

// La factoría local se conserva para pruebas unitarias; la instancia exportada
// usa la autenticación real del Backend.
export function createAuthService(storage, onLogin = async () => {}) {
  const key = 'globalizat.auth.demo.v1'; let current = null;
  const read = () => { try { const records = JSON.parse(storage?.getItem(key) || '[]'); return Array.isArray(records) ? records.filter(r => r && typeof r.email === 'string' && typeof r.salt === 'string' && typeof r.digest === 'string') : []; } catch { return []; } };
  const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  async function derive(password, salt) { const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']); return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' }, cryptoKey, 256))); }
  const identity = r => ({ id: r.id, firstName: r.firstName, lastName: r.lastName, email: r.email, role: r.role || 'customer' });
  async function enter(user) { await onLogin(user); current = identity(user); return { ...current }; }
  return {
    async getCurrentUser() { return current ? { ...current } : null; },
    async login(email, password) { const normalized = String(email || '').trim().toLowerCase(); const record = read().find(u => u.email === normalized); if (!record || await derive(String(password || ''), record.salt) !== record.digest) throw new Error('authInvalid'); return enter(record); },
    async register({ firstName, lastName, email, password }) { firstName = String(firstName || '').trim(); lastName = String(lastName || '').trim(); email = String(email || '').trim().toLowerCase(); if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 160 || typeof password !== 'string' || password.length < 8 || password.length > 128) throw new Error('authFields'); if (read().some(u => u.email === email)) throw new Error('authExists'); const salt = hex(crypto.getRandomValues(new Uint8Array(16))), digest = await derive(password, salt), records = read(); if (records.some(u => u.email === email)) throw new Error('authExists'); const record = { id: crypto.randomUUID(), firstName, lastName, email, salt, digest }; try { if (!storage) throw new Error(); storage.setItem(key, JSON.stringify([...records, record])); } catch { throw new Error('authStorage'); } return enter(record); },
    async loginDemo() { return enter({ id: 'customer-demo', firstName: 'Lucía', lastName: 'Benítez', email: 'lucia.benitez@example.com' }); },
    async logout() { current = null; },
  };
}

export function createApiAuthService() {
  let current = null;
  const mapAuthError = (error, operation) => { const mapped = new Error(operation === 'login' && error.code === 'INVALID_CREDENTIALS' ? 'authInvalid' : operation === 'register' && error.code === 'ALREADY_EXISTS' ? 'authExists' : operation === 'register' && error.code === 'VALIDATION' ? 'authFields' : operation === 'login' && error.code === 'VALIDATION' ? 'authFields' : 'authFailure'); mapped.code = error.code; mapped.cause = error; return mapped; };
  const identity = user => ({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role || 'customer' });
  return {
    async getCurrentUser() { if (!current) return null; try { current = identity(await apiRequest('/api/auth/me')); return { ...current }; } catch { current = null; setApiToken(null); return null; } },
    async login(email, password) { try { const data = await apiRequest('/api/auth/login', { method: 'POST', body: { email, password } }); setApiToken(data.token); current = identity(data.user); return { ...current }; } catch (error) { throw mapAuthError(error, 'login'); } },
    async register(data) { try { const response = await apiRequest('/api/auth/register', { method: 'POST', body: data }); setApiToken(response.token); current = identity(response.user); return { ...current }; } catch (error) { throw mapAuthError(error, 'register'); } },
    async loginDemo() { try { const data = await apiRequest('/api/auth/login-demo', { method: 'POST' }); setApiToken(data.token); current = identity(data.user); return { ...current }; } catch (error) { throw mapAuthError(error, 'login'); } },
    async logout() { try { await apiRequest('/api/auth/logout', { method: 'POST' }); } finally { setApiToken(null); current = null; } },
  };
}
export const authService = createApiAuthService();
