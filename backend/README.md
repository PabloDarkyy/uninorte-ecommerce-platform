# Backend · GlobalizaT / UniNorte

Backend Node.js conectado a PostgreSQL. Las variables sensibles se definen en `backend/.env`; el archivo `.env.example` es solo una plantilla.

## Ejecutar localmente

Desde la raíz del repositorio: `npm run start:all` (requiere PostgreSQL y `backend/.env`). También se puede iniciar el Frontend y Backend por separado.

## PostgreSQL

Configura `DATABASE_URL` con la URL de tu base PostgreSQL. El esquema está en `src/db/schema.sql` y también en `../database/schema.sql`. Al iniciar sobre una base vacía, el Backend crea las tablas y carga los datos de demostración automáticamente.

Comprueba la conexión con `npm run db:check`. `npm run db:reset` elimina los datos de aplicación y debe usarse solo en desarrollo.

## Despliegue

Para Render, usa el directorio raíz `backend`, el comando de compilación `npm install` y el comando de inicio `npm start`. Configura `DATABASE_URL`, `CORS_ORIGIN`, `SEED_ADMIN_PASSWORD` y `SESSION_TTL_HOURS` en el panel del proveedor. No subas `.env` al repositorio.

El pago de Checkout es simulado: no se procesan pagos reales ni se almacenan datos de tarjeta.
