# PostgreSQL · GlobalizaT

La plataforma usa PostgreSQL como persistencia relacional. El backend aplica automáticamente `backend/src/db/schema.sql` al iniciar; ese archivo es idéntico a [`schema.sql`](schema.sql).

## Preparación

1. Ejecuta [`00_create_database.sql`](00_create_database.sql) conectado a la base `postgres`, o usa `createdb -U postgres globalizat`.
2. Copia `backend/.env.example` a `backend/.env` y define `DATABASE_URL`.
3. Inicia el backend. Si `users` está vacía, aplicará la semilla automática.

Como alternativa manual, ejecuta sobre `globalizat`:

```sh
psql -U postgres -d globalizat -f database/schema.sql
psql -U postgres -d globalizat -f database/seed.sql
```

[`seed.sql`](seed.sql) es idempotente y contiene únicamente datos ficticios/saneados. No existe un sistema de migraciones.

## Operación

Desde `backend/`:

```sh
npm run db:check
npm run db:reset
```

`db:check` inspecciona conexión, tablas, conteos y claves foráneas. `db:reset` elimina los datos de aplicación de la base configurada y conserva las etapas de tracking; el siguiente arranque vuelve a sembrar si `users` está vacía.

Consulta el [modelo, diagrama, restricciones y procedimiento reproducible](../docs/base-de-datos.md) y la [guía de instalación](../docs/instalacion.md).
