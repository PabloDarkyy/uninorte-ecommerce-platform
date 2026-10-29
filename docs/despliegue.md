# Despliegue y entrega

## Demo pública en GitHub Pages

La URL pública es <https://pablodarkyy.github.io/uninorte-ecommerce-platform/>. El workflow publica `index.html` y `src/` del checkout actual después de ejecutar `npm test`, por lo que Pages muestra el frontend vigente, incluido el modo oscuro.

Durante la preparación de `dist/`, el workflow crea `runtime-config.js` y lo inyecta inmediatamente antes de `app.js`:

- si la variable de repositorio `GLOBALIZAT_API_URL` está definida, escribe `window.__GLOBALIZAT_API_URL__` con esa URL y la aplicación usa los servicios HTTP;
- si no está definida, escribe `window.__GLOBALIZAT_DEMO__ = true` y activa explícitamente los mocks locales.

El modo demostración nunca se deduce de un fallo de red. Sus datos son ficticios y se guardan solo en el navegador; no representa conexiones, cuentas ni pagos reales. `index.html` no contiene configuración de despliegue y permanece válido para el entorno full-stack local.

El tag `stable-pages-pre-fullstack` se conserva como punto de rollback. Si fuese necesario volver a la demo anterior, se puede desplegar deliberadamente ese tag según la política de releases del repositorio; el workflow normal no lo usa como fuente.

## Entrega full-stack local

La entrega soportada de esta rama es local:

1. PostgreSQL local con base `globalizat`.
2. `backend/.env` con `DATABASE_URL` y CORS.
3. Dependencias instaladas con `npm run setup`.
4. Frontend y backend iniciados con `npm run start:all`.
5. Navegador en `http://127.0.0.1:4173` y API en `http://127.0.0.1:4000`.

Consulta [Instalación](instalacion.md), [Variables de entorno](variables-entorno.md) y [Flujo de compra](flujo-de-compra.md).

## Hosting externo

No hay hosting externo configurado para Node.js, PostgreSQL ni `backend/uploads/`. GitHub Pages no puede ejecutar la API. Un despliegue real requeriría, como mínimo:

- hosting persistente para Node.js 22.5+;
- PostgreSQL administrado y estrategia de migraciones/backups;
- almacenamiento de objetos para medios;
- HTTPS, CORS explícito y gestión de secretos;
- sesiones compartidas/persistentes para múltiples instancias;
- configuración de `window.__GLOBALIZAT_API_URL__` en el frontend;
- observabilidad, rate limiting y endurecimiento de autenticación.

Nada de lo anterior está aprovisionado en este repositorio.
