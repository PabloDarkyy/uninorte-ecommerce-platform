# Backend de GlobalizaT

API académica en Node.js 22.5+ construida sobre `node:http`, un router propio y PostgreSQL mediante `pg`. Implementa autenticación Bearer, catálogo, cuenta, pedidos, tracking, administración, analytics y cargas locales.

## Inicio rápido

Desde la raíz del repositorio:

```sh
npm run setup
npm run start:backend
```

Antes de iniciar, crea PostgreSQL y copia `backend/.env.example` a `backend/.env`; configura allí `DATABASE_URL`. No confirmes `.env` ni credenciales reales.

API local: <http://127.0.0.1:4000/api/health>.

## Referencias

- [Instalación completa](../docs/instalacion.md)
- [Referencia de endpoints](../docs/backend-api.md)
- [Variables de entorno](../docs/variables-entorno.md)
- [Modelo de datos](../docs/base-de-datos.md)

Scripts propios:

```sh
npm start
npm run dev
npm test
npm run db:check
npm run db:reset
```

`npm test` necesita `TEST_DATABASE_URL` apuntando a una base descartable cuyo nombre termine en `_test`.
