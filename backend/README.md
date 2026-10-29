# Backend · GlobalizaT / UniNorte

Backend real del proyecto académico, integrado con el Frontend y respaldado por **PostgreSQL**.

## Arranque

Desde la raíz:

```sh
npm run start:all
```

O solo el Backend:

```sh
cd backend
npm install
npm start
```

Por defecto:

```text
http://127.0.0.1:4000
```

## PostgreSQL + pgAdmin 4

La aplicación ya no usa SQLite. Debes crear la BD `globalizat` en PostgreSQL y configurar:

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@127.0.0.1:5432/globalizat
```

La estructura está en `../database/schema.sql` y `src/db/schema.sql`.

Al iniciar por primera vez con una BD vacía, el Backend ejecuta el esquema y carga automáticamente la semilla de `src/data/seed.js`.

### Comprobar

```sh
npm run db:check
```

### Reiniciar desarrollo

```sh
npm run db:reset
```

## Tests de integración

Los tests de `backend/tests/contracts.test.js` ejecutan `TRUNCATE` sobre las tablas de aplicación. Antes de conectarse, exigen `TEST_DATABASE_URL` y que el nombre de la base termine en `_test` (por ejemplo, `globalizat_test`). No usan `DATABASE_URL` como alternativa.

Ejecuta estos tests únicamente contra una base PostgreSQL descartable, aislada de desarrollo y producción. El sufijo es una protección contra errores, no una garantía: verifica el destino de la URL antes de ejecutar `npm test`.

```env
TEST_DATABASE_URL=postgres://usuario:clave@localhost:5432/globalizat_test
```

El archivo `.env` no debe compartirse ni incluirse en el repositorio. Los tests unitarios del guardia se pueden ejecutar sin PostgreSQL:

```sh
node --test tests/database-guard.test.js
```

## Arquitectura de datos

La persistencia está separada en las siguientes áreas:

- autenticación y roles;
- perfil, direcciones y preferencias;
- catálogo, traducciones, imágenes y variantes;
- pedidos, líneas, precios históricos y dirección snapshot;
- tracking y eventos;
- archivos multimedia.

El Backend mantiene una proyección de estado en memoria para conservar los contratos de la aplicación actual, mientras las escrituras se confirman en PostgreSQL dentro de transacciones. Esto permite mantener la API existente mientras se reemplaza la persistencia JSON/SQLite por PostgreSQL.

## Dependencia

```json
"pg": "^8.16.3"
```

La dependencia se instala con:

```sh
npm install
```

## Migración JSON

Si existe un `backend/data/store.json` de una versión anterior y PostgreSQL no contiene usuarios todavía, el arranque puede importar el estado compatible una sola vez.

## Seguridad y sesiones

- Registro e inicio de sesión con PBKDF2/SHA-256 (120.000 iteraciones).
- Contraseñas nunca se guardan en texto plano.
- Sesiones mediante tokens Bearer en memoria.
- Roles `customer` y `admin`.
- Administración protegida por `requireAdmin`.

## Comercio e inventario

`POST /api/orders` valida autenticación, disponibilidad, variantes, cantidad, stock, moneda, precios e idempotencia. El commit del estado se realiza de forma serializada y la persistencia final ocurre en una transacción PostgreSQL.

## Archivos

Los archivos se guardan en:

```text
backend/uploads/products/images/
backend/uploads/products/models/
backend/uploads/avatars/
```

La base registra cada activo en `media_files`.

## API

Las rutas de la API se mantienen compatibles con la versión anterior: auth, cuenta, direcciones, preferencias, productos, pedidos, tracking, analítica, administración y uploads.
