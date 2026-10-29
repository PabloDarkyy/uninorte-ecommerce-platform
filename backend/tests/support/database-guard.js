const REQUIRED_SUFFIX = '_test';

export function requireTestDatabaseUrl(env = process.env) {
  const raw = env.TEST_DATABASE_URL;
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(
      'Falta TEST_DATABASE_URL. Los tests del backend ejecutan TRUNCATE y solo pueden correr contra ' +
      `una base PostgreSQL descartable cuyo nombre termine en "${REQUIRED_SUFFIX}" (por ejemplo globalizat_test). ` +
      'DATABASE_URL no se usa como alternativa.'
    );
  }

  const databaseUrl = raw.trim();
  let databaseName;
  try {
    const parsed = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('Protocolo no soportado.');
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  } catch {
    throw new Error(
      'TEST_DATABASE_URL no es una URL PostgreSQL válida ' +
      '(formato esperado: postgres://usuario:clave@host:puerto/nombre_test). No se modificó ninguna base.'
    );
  }

  const looksLikeTestDb =
    databaseName.length > REQUIRED_SUFFIX.length &&
    databaseName.toLowerCase().endsWith(REQUIRED_SUFFIX);
  if (!looksLikeTestDb) {
    throw new Error(
      `La base "${databaseName || '(sin nombre)'}" no parece de pruebas: su nombre debe terminar en ` +
      `"${REQUIRED_SUFFIX}" (por ejemplo globalizat_test). No se modificó ninguna base.`
    );
  }

  return databaseUrl;
}
