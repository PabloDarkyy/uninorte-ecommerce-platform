# GT · GlobalizaT

**GlobalizaT: Tecnología y Comercio para Conectar con el Mundo.**

Proyecto universitario de plataforma web e-commerce de UniNorte, orientado a presentar productos paraguayos y preparar el trabajo colaborativo entre Frontend, Backend y Base de Datos.

## Estado actual

El proyecto está integrado de extremo a extremo para desarrollo local:

- **Frontend:** HTML5, CSS3 y JavaScript con ES Modules, catálogo, detalle 3D, carrito, checkout, cuenta y panel administrativo.
- **Backend:** Node.js con API HTTP, autenticación, autorización por roles, pedidos, inventario, tracking, analytics y cargas de archivos.
- **Base de Datos:** PostgreSQL relacional, administrable desde pgAdmin 4, con tablas normalizadas, claves foráneas, índices, restricciones e idempotencia de pedidos.
- **Integración Frontend → Backend:** al ejecutar la aplicación en navegador, los servicios de autenticación, catálogo, cuenta, pedidos, tracking, administración, analytics y assets usan la API real. Las factorías mock se mantienen para pruebas unitarias.
- **Stock:** la confirmación de un pedido revalida stock/precios en el Backend y descuenta las existencias dentro de la misma operación serializada.
- **Seguridad académica:** contraseñas derivadas con PBKDF2/SHA-256; los datos de tarjeta del checkout siguen siendo ficticios y nunca se almacenan.

### Commerce de demostración

- Carrito lateral con variantes, cantidades, stock y resumen.
- Checkout de cinco pasos y confirmación de pedido.
- Selectores ES/EN y PYG/USD/EUR activos para Commerce; los pedidos conservan moneda y precios históricos.
- GLB por variante y selección desde Admin, reutilizando caché, renderer y entorno.
- Los pedidos confirmados quedan persistidos y aparecen en Cuenta y Administración.

## Tecnologías

- HTML5, CSS3 y JavaScript con ES Modules, sin framework de interfaz.
- Three.js r180 (0.180.0), GLTFLoader y OrbitControls incluidos localmente, con su licencia en `src/vendor/three/`.
- Node.js **22.5 o posterior** y PostgreSQL instalado/local para el Backend.
- PostgreSQL como base de datos del Backend, administrada desde pgAdmin 4.
- Pruebas con `node:test`; recorridos de navegador opcionales con Playwright/Edge si están instalados.

## Ejecutar todo localmente

1. Instalar Node.js 22.5+.
2. Entrar a la carpeta del proyecto.
3. Ejecutar:

```sh
npm run start:all
```

Esto levanta:

- Frontend: `http://127.0.0.1:4173`
- Backend: `http://127.0.0.1:4000`
- Base de datos: PostgreSQL `globalizat` (creada desde pgAdmin 4 o SQL).

También se pueden levantar por separado:

```sh
npm run start:frontend
npm run start:backend
```

En el Backend es posible usar:

```sh
cd backend
npm start
```

No abras `index.html` con doble clic: los módulos y modelos necesitan HTTP.

## Configuración del Backend

Copia `backend/.env.example` a `backend/.env` para personalizar el entorno.

Variables principales:

```env
PORT=4000
CORS_ORIGIN=http://127.0.0.1:4173
DATABASE_URL=postgresql://postgres:TU_PASSWORD@127.0.0.1:5432/globalizat
LEGACY_DATA_FILE=./data/store.json
UPLOADS_DIR=./uploads
SESSION_TTL_HOURS=12
SEED_ADMIN_EMAIL=admin@globalizat.demo
SEED_ADMIN_PASSWORD=Admin12345!
```

No publiques `.env` ni credenciales reales.

## Base de datos

La estructura completa está en [`database/schema.sql`](database/schema.sql) y la explicación del modelo en [`database/README.md`](database/README.md).

Entidades principales:

```text
USERS
 ├─ USER_CREDENTIALS
 ├─ USER_PROFILES
 ├─ ACCOUNT_PREFERENCES
 ├─ ADDRESSES
 └─ ORDERS
      ├─ ORDER_ITEMS ── PRODUCTS ── PRODUCT_VARIANTS
      └─ ORDER_SHIPPING_ADDRESSES

PRODUCTS
 ├─ PRODUCT_TRANSLATIONS
 ├─ PRODUCT_IMAGES
 └─ PRODUCT_VARIANTS
      └─ PRODUCT_VARIANT_TRANSLATIONS

ORDERS ── TRACKING_EVENTS ── TRACKING_STAGES
MEDIA_FILES → imágenes / modelos / avatares
```

La primera ejecución crea el esquema PostgreSQL y carga el catálogo y las cuentas demo desde `backend/src/data/seed.js`. Si existe un `backend/data/store.json` de una versión anterior y PostgreSQL está vacío, se migra automáticamente.

Comandos útiles:

```sh
cd backend
npm run db:check
npm run db:reset
```

`db:reset` limpia los datos de aplicación; el siguiente arranque vuelve a cargar la semilla.

## Accesos demo

Cliente demo:

```text
POST /api/auth/login-demo
```

Administrador:

```text
Correo: admin@globalizat.demo
Contraseña: Admin12345!
```

Cambia esas credenciales antes de cualquier despliegue real.

## API

### Autenticación

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/login-demo
POST /api/auth/logout
GET  /api/auth/me
```

### Cuenta

```text
GET  /api/account/me
PUT  /api/account/me
POST /api/account/avatar
GET  /api/account/addresses
POST /api/account/addresses
PUT  /api/account/addresses/:id
DELETE /api/account/addresses/:id
POST /api/account/addresses/:id/primary
GET  /api/account/preferences
PUT  /api/account/preferences
```

### Catálogo y comercio

```text
GET  /api/products
GET  /api/products/:id
POST /api/orders
GET  /api/orders
GET  /api/orders/:id
POST /api/tracking/enter
GET  /api/tracking/:orderId
```

### Administración

```text
GET  /api/products?includeInactive=true
POST /api/products
PUT  /api/products/:id
POST /api/products/:id/deactivate
PUT  /api/products/:id/featured
GET  /api/products/inventory
PUT  /api/products/:id/stock
GET  /api/orders?all=true
GET  /api/admin/customers
GET  /api/admin/customers/:id
GET  /api/analytics/snapshot
POST /api/uploads/image
POST /api/uploads/model
POST /api/uploads/release
```

Todas las operaciones administrativas están protegidas por `requireAdmin`.

## Estructura del proyecto

```text
index.html
src/
  app.js, router.js
  pages/
  sections/
  components/
  features/
    auth/
    checkout/
    account/
    admin/
    cart/
    currency/
    i18n/
  services/
    api.client.js
    auth.service.js
    product.service.js
    order.service.js
    analytics/
    products/
  config/
  locales/
  modules/
  assets/
  vendor/three/
backend/
  src/
    db/
      database.js
      schema.sql
    lib/
    middleware/
    domain/
    data/
    routes/
    scripts/
  data/
  uploads/
  tests/
database/
  schema.sql
  README.md
scripts/
  serve.js
  start-all.js
docs/
tests/
```

## Verificación

Frontend:

```sh
npm test
```

Backend:

```sh
cd backend
npm test
```

Las pruebas de Backend comprueban registro/login, autorización, catálogo, pedidos, idempotencia y tracking. La integración manual se puede validar desde el navegador o consumiendo la API directamente.

## GitHub Pages

GitHub Pages puede seguir sirviendo el Frontend estático, pero **no ejecuta el Backend Node.js ni PostgreSQL**. Para una versión pública conectada, el Frontend debe apuntar a un Backend desplegado en un entorno que ejecute Node.js y tenga almacenamiento persistente. Configura la URL mediante:

```js
window.__GLOBALIZAT_API_URL__ = 'https://tu-backend.example.com';
```

antes de cargar los módulos de la aplicación.

## Notas de producción

La solución está preparada para el proyecto académico, pero antes de manejar usuarios o pagos reales conviene sustituir el usuario admin sembrado, usar HTTPS, restringir CORS al origen real, incorporar rate limiting, gestión de secretos y un proveedor de almacenamiento de archivos apropiado. Los datos de tarjeta deben seguir excluidos del modelo de pedidos.
