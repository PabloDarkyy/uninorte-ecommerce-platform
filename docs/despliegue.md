# Despliegue y entrega

## Demo pública en GitHub Pages

La URL pública es <https://pablodarkyy.github.io/uninorte-ecommerce-platform/>. Es una demo congelada solo frontend:

- fuente: tag `stable-pages-pre-fullstack`;
- commit fijado: `db6e79c`;
- datos: mocks locales;
- backend/PostgreSQL: no disponibles.

`.github/workflows/pages.yml` se dispara con un push a `main` o manualmente. Primero prueba el commit de `main` con `npm test`, pero después hace un segundo checkout del tag en `pages-demo/`, copia únicamente `index.html` y `src/` a `dist/`, añade `.nojekyll` y despliega ese artefacto. Por ello, un push normal no cambia el contenido público mientras el tag no cambie.

### Actualizar deliberadamente la demo futura

Antes de mover/recrear el tag se debe:

1. preparar una revisión frontend autocontenida que funcione sin API;
2. ejecutar las pruebas y el recorrido manual en servidor HTTP;
3. revisar que no incluya secretos ni dependa de cargas locales;
4. decidir y documentar el nuevo commit congelado;
5. actualizar deliberadamente la referencia `stable-pages-pre-fullstack` según la política del repositorio;
6. disparar el workflow y validar la URL publicada.

Cambiar el tag altera el contenido público y debe tratarse como una decisión de release, no como parte automática de la integración full-stack.

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
