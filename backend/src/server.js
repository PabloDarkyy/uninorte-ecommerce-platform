import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { createStore } from './lib/store.js';
import { createRouter } from './lib/router.js';
import { HttpError, sendJson, applyCors, readJsonBody, isMultipart } from './lib/http.js';
import { createSeedState } from './data/seed.js';

import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerAccountRoutes } from './routes/account.routes.js';
import { registerAddressRoutes } from './routes/addresses.routes.js';
import { registerPreferenceRoutes } from './routes/preferences.routes.js';
import { registerProductRoutes } from './routes/products.routes.js';
import { registerUploadRoutes } from './routes/uploads.routes.js';
import { registerOrderRoutes } from './routes/orders.routes.js';
import { registerTrackingRoutes } from './routes/tracking.routes.js';
import { registerAnalyticsRoutes } from './routes/analytics.routes.js';
import { registerAdminRoutes } from './routes/admin.routes.js';

const PUBLIC_UPLOADS_PATH = '/uploads';

function notFound(response) {
  response.writeHead(404).end('Not found');
}

async function serveUpload(pathname, uploadsDir, response) {
  const relative = pathname.slice(PUBLIC_UPLOADS_PATH.length + 1);
  const file = path.resolve(uploadsDir, relative);
  const inside = path.relative(uploadsDir, file);
  if (inside.startsWith('..') || path.isAbsolute(inside)) return notFound(response);
  try {
    const data = await readFile(file);
    const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary' };
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
    response.end(data);
  } catch {
    notFound(response);
  }
}

function handleError(error, response) {
  if (error instanceof HttpError) {
    sendJson(response, error.status, { error: error.message, code: error.code });
    return;
  }
  console.error(error);
  sendJson(response, 500, { error: 'Error interno del servidor.', code: 'INTERNAL' });
}

// createApp() construye el servidor de node:http sin escuchar en un puerto
// todavia. Lo usan tanto main() (arranque normal, abajo) como las pruebas de
// contrato en tests/, que prefieren un puerto efimero y un archivo de datos
// temporal para no interferir con data/store.json de desarrollo.
export async function createApp(overrides = {}) {
  const runtimeConfig = { ...config, ...overrides };
  const databaseConnection = overrides.databaseUrl ?? overrides.databaseConnection ?? runtimeConfig.databaseUrl;
  const legacyDataFile = overrides.legacyDataFile ?? runtimeConfig.legacyDataFile;
  const store = await createStore(databaseConnection, createSeedState, legacyDataFile);
  const router = createRouter();
  const deps = { store, uploadsDir: runtimeConfig.uploadsDir, publicUploadsPath: PUBLIC_UPLOADS_PATH };

  router.get('/api/health', async ctx => sendJson(ctx.response, 200, { ok: true, service: 'globalizat-backend' }));

  registerAuthRoutes(router, deps);
  registerAccountRoutes(router, deps);
  registerAddressRoutes(router, deps);
  registerPreferenceRoutes(router, deps);
  registerProductRoutes(router, deps);
  registerUploadRoutes(router, deps);
  registerOrderRoutes(router, deps);
  registerTrackingRoutes(router, deps);
  registerAnalyticsRoutes(router, deps);
  registerAdminRoutes(router, deps);

  const server = createServer(async (request, response) => {
    applyCors(request, response, runtimeConfig.corsOrigin);
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }

    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith(`${PUBLIC_UPLOADS_PATH}/`)) return serveUpload(pathname, runtimeConfig.uploadsDir, response);

    const ctx = { request, response, method: request.method, pathname, query: url.searchParams, params: {} };
    try {
      if (request.method !== 'GET' && request.method !== 'DELETE' && !isMultipart(request)) {
        ctx.body = await readJsonBody(request);
      }
      const matched = await router.dispatch(ctx);
      if (matched === false) sendJson(response, 404, { error: 'No encontrado.', code: 'NOT_FOUND' });
      else if (matched === 'method') sendJson(response, 405, { error: 'Método no permitido.', code: 'METHOD_NOT_ALLOWED' });
    } catch (error) {
      handleError(error, response);
    }
  });

  return { server, store, config: { ...runtimeConfig, databaseUrl: databaseConnection, legacyDataFile } };
}

async function main() {
  const { server, store } = await createApp();
  server.listen(config.port, () => {
    console.log(`GlobalizaT backend: http://127.0.0.1:${config.port}`);
    console.log(`  Admin demo: ${config.seedAdminEmail} / (definida en .env, ver .env.example)`);
    console.log('  Cliente demo: POST /api/auth/login-demo');
  });
  const shutdown = async () => { try { await store.close(); } finally { server.close(() => process.exit(0)); } };
  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());
}

// Solo arranca el servidor cuando el archivo se ejecuta directamente
// (`node src/server.js`), no cuando las pruebas lo importan para usar createApp().
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('No se pudo iniciar el backend:', error);
    process.exit(1);
  });
}
