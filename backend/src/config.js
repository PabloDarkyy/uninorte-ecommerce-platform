import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const root = fileURLToPath(new URL('../', import.meta.url));

function loadEnvFile(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

const fileEnv = loadEnvFile(path.join(root, '.env'));
const env = key => process.env[key] ?? fileEnv[key];

const databaseUrl = env('DATABASE_URL') || 'postgresql://postgres:postgres@127.0.0.1:5432/globalizat';

export const config = {
  root,
  port: Number(env('PORT') || 4000),
  corsOrigin: env('CORS_ORIGIN') || '*',
  databaseUrl,
  legacyDataFile: path.resolve(root, env('LEGACY_DATA_FILE') || './data/store.json'),
  // Alias conservado para adaptadores o scripts antiguos. Ahora representa
  // la URL de PostgreSQL y ya no una ruta SQLite.
  dataFile: databaseUrl,
  uploadsDir: path.resolve(root, env('UPLOADS_DIR') || './uploads'),
  sessionTtlHours: Number(env('SESSION_TTL_HOURS') || 12),
  seedAdminEmail: (env('SEED_ADMIN_EMAIL') || 'admin@globalizat.demo').toLowerCase(),
  seedAdminPassword: env('SEED_ADMIN_PASSWORD') || 'Admin12345!',
};
