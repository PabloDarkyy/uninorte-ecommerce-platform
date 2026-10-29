import test from 'node:test';
import assert from 'node:assert/strict';
import { config, assertProductionConfig } from '../src/config.js';

const valid = {
  databaseUrl: 'postgresql://db.example.com/globalizat',
  seedAdminPassword: 'Segura-2026!x',
  corsOrigin: 'https://tienda.example.com',
};

test('desarrollo conserva la configuración predeterminada', () => {
  assert.doesNotThrow(() => assertProductionConfig(config, 'development'));
});

test('producción informa todas las variables faltantes', () => {
  assert.throws(() => assertProductionConfig({}, 'production'), error => {
    assert.match(error.message, /DATABASE_URL/);
    assert.match(error.message, /SEED_ADMIN_PASSWORD/);
    assert.match(error.message, /CORS_ORIGIN/);
    return true;
  });
});

test('producción rechaza cada configuración débil', () => {
  const invalid = [
    { ...valid, databaseUrl: undefined },
    { ...valid, seedAdminPassword: undefined },
    { ...valid, seedAdminPassword: 'Admin12345!' },
    { ...valid, seedAdminPassword: 'Corta123!' },
    { ...valid, corsOrigin: undefined },
    { ...valid, corsOrigin: '*' },
  ];
  for (const candidate of invalid) assert.throws(() => assertProductionConfig(candidate, 'production'));
});

test('producción acepta valores válidos sin revelar contraseñas en errores', () => {
  assert.doesNotThrow(() => assertProductionConfig(valid, 'production'));
  const password = 'Corta123!';
  assert.throws(() => assertProductionConfig({ ...valid, seedAdminPassword: password }, 'production'), error => {
    assert.equal(error.message.includes(password), false);
    return true;
  });
});
