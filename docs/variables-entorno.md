# Variables de entorno

El backend carga primero `process.env` y, si una clave no está definida allí, lee `backend/.env`. Copia `backend/.env.example` a `backend/.env` para desarrollo y no confirmes ese archivo en Git.

| Variable | Valor predeterminado en código | ¿Obligatoria en producción? | Descripción |
|---|---|---|---|
| `NODE_ENV` | `development` | Debe establecerse en `production` para activar las comprobaciones de producción. | Entorno de ejecución. |
| `PORT` | `4000` | No | Puerto HTTP del backend. |
| `CORS_ORIGIN` | `*` | Sí; valor explícito distinto de `*`. | Origen exacto autorizado, por ejemplo `http://127.0.0.1:4173`. |
| `DATABASE_URL` | URL local de desarrollo integrada en el código | Sí; debe ser explícita y distinta del valor por defecto. | Cadena de conexión PostgreSQL usada por API y scripts. No se reproduce la credencial del fallback porque no es válida para producción. |
| `LEGACY_DATA_FILE` | `./data/store.json`, relativo a `backend/` | No | JSON legado opcional que puede importarse una vez si PostgreSQL está vacío. |
| `UPLOADS_DIR` | `./uploads`, relativo a `backend/` | No | Directorio local para imágenes, GLB y avatares. |
| `SESSION_TTL_HOURS` | `12` | No | Duración en horas de los tokens guardados en memoria. |
| `SEED_ADMIN_EMAIL` | `admin@globalizat.demo` | No | Correo de la cuenta administrativa creada por la semilla automática. |
| `SEED_ADMIN_PASSWORD` | `Admin12345!` | Sí; debe diferir del valor demo y tener al menos 12 caracteres. | Contraseña con la que se genera el digest del admin sembrado. Nunca documentes aquí una credencial real. |
| `TEST_DATABASE_URL` | Sin valor | No para ejecución; sí para `npm run test:backend`. | Base descartable para pruebas. La protección exige que el nombre termine en `_test`. |

Con `NODE_ENV=production`, el proceso se niega a iniciar si falta una `DATABASE_URL` segura/explícita, si `SEED_ADMIN_PASSWORD` conserva la credencial demo o tiene menos de 12 caracteres, o si `CORS_ORIGIN` es `*` o vacío.

## Configuración del frontend

No es una variable de entorno de Node, pero la base de la API puede definirse antes de cargar `src/app.js`:

```html
<script>window.__GLOBALIZAT_API_URL__ = 'https://api.example.invalid';</script>
```

Si no se define, usa `http://127.0.0.1:4000`. El dominio anterior es únicamente ilustrativo.
