import { webcrypto as crypto } from 'node:crypto';

// Mismos parametros que src/services/auth.service.js en el frontend, para que
// el criterio de fuerza de contraseña y el costo de derivacion sean coherentes
// en toda la plataforma. Aqui la derivacion ocurre en el servidor: es el
// backend real que docs/auth-contracts.md pide para sustituir el mock local.
const ITERATIONS = 120000;
const HASH = 'SHA-256';

const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

export async function deriveDigest(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = new TextEncoder().encode(saltHex);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH }, key, 256);
  return hex(new Uint8Array(bits));
}

export function randomSalt() {
  return hex(crypto.getRandomValues(new Uint8Array(16)));
}

export function randomId(prefix) {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}-${id}` : id;
}

export function randomToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashPassword(password) {
  const salt = randomSalt();
  const digest = await deriveDigest(password, salt);
  return { salt, digest };
}

export async function verifyPassword(password, salt, digest) {
  const candidate = await deriveDigest(password, salt);
  return timingSafeEqualHex(candidate, digest);
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
