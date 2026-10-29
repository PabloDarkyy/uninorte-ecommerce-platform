# Base de datos PostgreSQL · GlobalizaT / UniNorte

La versión actual utiliza **PostgreSQL** como motor relacional. El Backend se conecta mediante `pg` y la base puede administrarse completamente desde **pgAdmin 4**.

## 1. Crear la base en pgAdmin 4

En pgAdmin:

1. Conecta tu servidor PostgreSQL.
2. Abre `Query Tool` sobre la base `postgres`.
3. Ejecuta `database/00_create_database.sql`.
4. Actualiza el árbol de Databases y abre `globalizat`.
5. Abre `Query Tool` sobre `globalizat`.
6. Ejecuta `database/schema.sql`.
7. Inicia el Backend. Si la BD está vacía, cargará automáticamente la cuenta demo, el administrador, el catálogo y los pedidos de ejemplo.

También puedes ejecutar manualmente `database/schema.sql` sobre `globalizat`; es idempotente y puede ejecutarse más de una vez.

## 2. Configurar Node.js

Dentro de `backend/` instala la dependencia PostgreSQL:

```sh
npm install
```

Copia `.env.example` a `.env` y completa tu contraseña de PostgreSQL:

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@127.0.0.1:5432/globalizat
```

Para una instalación local típica de PostgreSQL, el host es `127.0.0.1` y el puerto es `5432`.

## 3. Ejecutar el proyecto

Desde la raíz:

```sh
npm run start:all
```

O solamente el Backend:

```sh
cd backend
npm start
```

Backend:

```text
http://127.0.0.1:4000
```

Frontend:

```text
http://127.0.0.1:4173
```

## 4. Comprobar la conexión a PostgreSQL

Desde `backend/`:

```sh
npm run db:check
```

El comando verifica la conexión, enumera las tablas, cuenta registros y comprueba que no haya claves foráneas no validadas.

## 5. Reiniciar los datos de desarrollo

```sh
npm run db:reset
```

Esto elimina los datos de aplicación conservando `tracking_stages`. En el siguiente arranque, el Backend vuelve a cargar la semilla automáticamente.

## 6. Modelo relacional

```mermaid
erDiagram
    USERS ||--|| USER_CREDENTIALS : authenticates
    USERS ||--|| USER_PROFILES : owns
    USERS ||--|| ACCOUNT_PREFERENCES : configures
    USERS ||--o{ ADDRESSES : saves
    USERS ||--o{ ORDERS : places

    PRODUCTS ||--o{ PRODUCT_TRANSLATIONS : localizes
    PRODUCTS ||--o{ PRODUCT_IMAGES : has
    PRODUCTS ||--o{ PRODUCT_VARIANTS : offers
    PRODUCT_VARIANTS ||--o{ PRODUCT_VARIANT_TRANSLATIONS : localizes

    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--|| ORDER_SHIPPING_ADDRESSES : snapshots
    PRODUCTS ||--o{ ORDER_ITEMS : referenced_by
    PRODUCT_VARIANTS ||--o{ ORDER_ITEMS : referenced_by

    ORDERS ||--o{ TRACKING_EVENTS : tracks
    TRACKING_STAGES ||--o{ TRACKING_EVENTS : defines
    MEDIA_FILES }o..o PRODUCTS : references
    MEDIA_FILES }o..o USERS : references
```

## Tablas principales

| Tabla | Función |
|---|---|
| `users` | Identidad, correo y rol. |
| `user_credentials` | Salt y digest PBKDF2. No almacena contraseñas en texto plano. |
| `user_profiles` | Nombre, teléfono, fecha de nacimiento y avatar. |
| `account_preferences` | Idioma, moneda y preferencias. |
| `addresses` | Direcciones del usuario; una sola puede ser principal. |
| `products` | Datos comerciales y stock. |
| `product_translations` | Datos ES/EN del producto. |
| `product_images` | Imágenes secundarias ordenadas. |
| `product_variants` | Presentaciones y stock por variante. |
| `product_variant_translations` | Nombre y descripción ES/EN de variantes. |
| `orders` | Cabecera, estado, moneda, total e idempotencia. |
| `order_items` | Líneas y precio histórico. |
| `order_shipping_addresses` | Snapshot de dirección del pedido. |
| `tracking_stages` | Catálogo de las 15 etapas. |
| `tracking_events` | Estado de tracking por pedido. |
| `media_files` | Registro de archivos cargados. |

## Reglas de integridad importantes

- `users.email` es único.
- `role`, `currency`, `availability` y estados de pedido están protegidos con `CHECK`.
- `addresses` usa un índice único parcial para garantizar una sola dirección principal por usuario.
- `orders(user_id, request_id)` es único cuando `request_id` existe, para idempotencia.
- `order_items` usa una FK compuesta `(product_id, variant_id)` para no mezclar variantes entre productos.
- Los pedidos conservan precios históricos y el snapshot de la dirección de envío.
- Los productos se desactivan mediante `active` para no romper el historial.
- Las contraseñas siguen almacenándose como digest PBKDF2 + salt; el Backend nunca persiste el texto original.

## Migración desde la versión anterior

Si existe `backend/data/store.json` y la BD PostgreSQL está completamente vacía, el Backend puede migrar el estado compatible automáticamente. Para un despliegue nuevo se recomienda utilizar la semilla de `backend/src/data/seed.js`.
