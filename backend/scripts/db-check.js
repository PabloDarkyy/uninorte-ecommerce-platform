import { openDatabase, closeDatabase } from '../src/db/database.js';
import { config } from '../src/config.js';

const db = await openDatabase(config.databaseUrl);
try {
  const tableRows = await db.prepare(`
    SELECT tablename AS name
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `).all();
  const tables = tableRows.map(row => row.name);
  const counts = {};
  for (const table of ['users', 'user_profiles', 'addresses', 'products', 'product_variants', 'orders', 'order_items', 'tracking_events', 'media_files']) {
    counts[table] = Number((await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()).count);
  }
  const foreignKeys = await db.prepare(`
    SELECT conname AS constraint_name, conrelid::regclass::text AS table_name
    FROM pg_constraint
    WHERE contype = 'f' AND convalidated = false
    ORDER BY conrelid::regclass::text, conname
  `).all();
  const connected = await db.prepare('SELECT current_database() AS database, current_user AS user, version() AS version').get();
  console.log(JSON.stringify({
    database: config.databaseUrl.replace(/:[^:@/]+@/, ':***@'),
    connected,
    tables,
    counts,
    postgresql: { unvalidatedForeignKeys: foreignKeys.length, foreignKeys },
    status: foreignKeys.length === 0 ? 'ok' : 'attention_required',
  }, null, 2));
  process.exitCode = foreignKeys.length === 0 ? 0 : 1;
} finally {
  await closeDatabase(db);
}
