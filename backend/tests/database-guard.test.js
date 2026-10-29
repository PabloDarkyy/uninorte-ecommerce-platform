import test from 'node:test';
import assert from 'node:assert/strict';
import { requireTestDatabaseUrl } from './support/database-guard.js';

const url = name => `postgres://usuario:SECRETO@localhost:5432/${name}`;

test('rechaza si falta TEST_DATABASE_URL, aunque exista DATABASE_URL', () => {
  assert.throws(() => requireTestDatabaseUrl({}), /Falta TEST_DATABASE_URL/);
  assert.throws(() => requireTestDatabaseUrl({ TEST_DATABASE_URL: '   ' }), /Falta TEST_DATABASE_URL/);
  assert.throws(
    () => requireTestDatabaseUrl({ DATABASE_URL: url('globalizat_test') }),
    /Falta TEST_DATABASE_URL/
  );
});

test('rechaza bases cuyo nombre no termina en _test', () => {
  for (const name of ['globalizat', 'globalizat_prod', 'test', '_test', 'globalizat_test_backup', 'mi_testdb']) {
    assert.throws(
      () => requireTestDatabaseUrl({ TEST_DATABASE_URL: url(name) }),
      /no parece de pruebas/,
      `debería rechazar "${name}"`
    );
  }
});

test('rechaza URLs inválidas o de otro protocolo', () => {
  assert.throws(() => requireTestDatabaseUrl({ TEST_DATABASE_URL: 'esto no es una url' }), /no es una URL PostgreSQL válida/);
  assert.throws(() => requireTestDatabaseUrl({ TEST_DATABASE_URL: 'mysql://u:p@localhost/globalizat_test' }), /no es una URL PostgreSQL válida/);
});

test('acepta bases de pruebas válidas', () => {
  assert.equal(requireTestDatabaseUrl({ TEST_DATABASE_URL: url('globalizat_test') }), url('globalizat_test'));
  assert.equal(requireTestDatabaseUrl({ TEST_DATABASE_URL: url('GLOBALIZAT_TEST') }), url('GLOBALIZAT_TEST'));
  const withQuery = `${url('globalizat_test')}?sslmode=disable`;
  assert.equal(requireTestDatabaseUrl({ TEST_DATABASE_URL: withQuery }), withQuery);
  const alt = 'postgresql://u:p@localhost/app_test';
  assert.equal(requireTestDatabaseUrl({ TEST_DATABASE_URL: alt }), alt);
});

test('los mensajes de error no filtran la contraseña', () => {
  assert.throws(
    () => requireTestDatabaseUrl({ TEST_DATABASE_URL: url('produccion') }),
    error => !/SECRETO/.test(error.message)
  );
});
