import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { fileURLToPath } from 'node:url';

const schemaFile = fileURLToPath(new URL('./schema.sql', import.meta.url));

// Convierte el formato '?' usado históricamente por el repositorio a los
// placeholders nativos $1, $2... de PostgreSQL.
function toPgPlaceholders(sql) {
  let index = 0;
  let out = '';
  let singleQuoted = false;
  let doubleQuoted = false;
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];
    if (char === "'" && !doubleQuoted) {
      if (singleQuoted && next === "'") { out += "''"; i += 1; continue; }
      singleQuoted = !singleQuoted;
      out += char;
      continue;
    }
    if (char === '"' && !singleQuoted) {
      if (doubleQuoted && next === '"') { out += '""'; i += 1; continue; }
      doubleQuoted = !doubleQuoted;
      out += char;
      continue;
    }
    if (char === '?' && !singleQuoted && !doubleQuoted) {
      index += 1;
      out += `$${index}`;
    } else {
      out += char;
    }
  }
  return out;
}

function makeAdapter(executor) {
  return {
    async query(text, values = []) {
      return executor.query(toPgPlaceholders(text), values);
    },
    async exec(text) {
      return executor.query(text);
    },
    prepare(text) {
      return {
        async run(...values) { return executor.query(toPgPlaceholders(text), values); },
        async all(...values) { const result = await executor.query(toPgPlaceholders(text), values); return result.rows; },
        async get(...values) { const result = await executor.query(toPgPlaceholders(text), values); return result.rows[0]; },
      };
    },
  };
}

export async function openDatabase(connectionString) {
  const pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
  await pool.query('SELECT 1');
  const schema = await readFile(schemaFile, 'utf8');
  await pool.query(schema);
  const database = makeAdapter(pool);
  database.transaction = async callback => {
    const client = await pool.connect();
    const tx = makeAdapter(client);
    try {
      await client.query('BEGIN');
      const result = await callback(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* noop */ }
      throw error;
    } finally {
      client.release();
    }
  };
  database.pool = pool;
  return database;
}

export async function closeDatabase(database) {
  await database?.pool?.end();
}
