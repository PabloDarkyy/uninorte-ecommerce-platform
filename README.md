# GT · GlobalizaT

**GlobalizaT: Tecnología y Comercio para Conectar con el Mundo.**

Proyecto universitario de plataforma web e-commerce de UniNorte, orientado a presentar productos paraguayos y preparar el trabajo colaborativo entre Frontend, Backend y Base de Datos.

Este repositorio integra el **Frontend**, el **Backend Node.js** y la persistencia en **PostgreSQL**. Los módulos visuales y modelos 3D existentes se conservan; el acceso, la cuenta, el catálogo, el inventario, los pedidos, el seguimiento y la analítica pasan por la API. El checkout sigue siendo académico y no procesa pagos reales.

## Estado actual

Frontend funcional con:

- **Acceso:** registro e inicio de sesión locales; cada nueva carga exige ingresar nuevamente.
- **Home:** presentación de la colección, transición cinematográfica por scroll y modelos que cambian tras 8 segundos sin interacción ni scroll.
- **Catálogo y detalle de productos:** previews de los GLB reales renderizados bajo demanda y transición compartida hasta el visor; imagen o representación conceptual de respaldo. Información y modales accesibles.
- **Visualización 3D:** modelos GLB locales, controles de giro/zoom y visor ampliado.
- **Perfil:** edición de datos, avatar, direcciones y preferencias locales.
- **Pedidos e historial:** los pedidos se consultan desde la API y se guardan en PostgreSQL; el seguimiento persiste el estado del pedido.
- **Panel administrativo:** Dashboard, creación/edición/desactivación de productos, variantes, imágenes y selección local de modelos 3D.
- **Inventario:** el stock general y por variante se actualiza en PostgreSQL al gestionar productos y confirmar pedidos.
- **Reportes y analítica:** estadísticas calculadas por el Backend a partir de productos, pedidos e inventario.
- **Responsive y animaciones:** adaptación a escritorio/móvil y soporte para movimiento reducido.

### Commerce de demostración

- Carrito lateral con variantes, cantidades, stock, eliminación y resumen.
- Añadir al carrito y Comprar ahora con captura del modelo visible y transición coordinada.
- Checkout de cinco pasos, pago completamente ficticio con indicador de carga y check verde, y confirmación integrada con Perfil/Tracking.
- Selectores ES/EN y PYG/USD/EUR activos para Commerce; los pedidos conservan moneda y precios históricos.
- GLB por variante y selección desde Admin, reutilizando caché, renderer y entorno.

El carrito sigue viviendo en memoria durante la sesión del navegador. El login real usa el Backend, las sesiones se autorizan mediante token Bearer y la información de cuenta, catálogo y pedidos se persiste en PostgreSQL. El paso de pago es únicamente simulado: no se procesan cobros ni se deben introducir datos de tarjetas reales.

## Tecnologías

- HTML5, CSS3 y JavaScript con ES Modules, sin framework de interfaz.
- Three.js r180 (0.180.0), GLTFLoader y OrbitControls incluidos localmente, con su licencia en `src/vendor/three/`.
- Modelos GLB y assets locales; gráficos mediante SVG/CSS.
- Node.js 22.5 o posterior para el Backend y las pruebas de contratos.
- Pruebas opcionales de navegador con Playwright y Microsoft Edge, instalados por separado en el entorno de desarrollo.

El Frontend sigue utilizando módulos locales y assets versionados. El Backend Node.js atiende la API en `/api` y se conecta a PostgreSQL mediante `DATABASE_URL`.

## Ejecutar localmente

Requisitos: Node.js 22.5 o posterior y una base PostgreSQL. Para una instancia local, instala PostgreSQL/pgAdmin 4; para la demo pública los usuarios no necesitan instalar nada.

1. Crea la base de datos siguiendo [`database/README.md`](database/README.md) si aún no existe.
2. Copia `backend/.env.example` a `backend/.env` y configura `DATABASE_URL` con la contraseña de tu instalación. **Nunca publiques `backend/.env`.**
3. Desde `backend/`, ejecuta `npm install` para instalar `pg`.
4. Desde la raíz del repositorio, ejecuta:

```sh
npm run start:all
```

Esto inicia el Frontend en `http://127.0.0.1:4173` y el Backend en `http://127.0.0.1:4000`. Para detener ambos procesos, pulsa `Ctrl+C`. También puedes iniciarlos por separado con `npm start` en `backend/` y `npm run start:frontend` en la raíz.

Al iniciar sobre una base de datos vacía, el Backend crea el esquema y carga los datos de demostración. No ejecutes `schema.sql` o `seed.sql` otra vez sobre una base ya poblada. Para comprobar la conexión, usa `npm run db:check` dentro de `backend/`.

En local, el Frontend usa `http://127.0.0.1:4000` como URL predeterminada de la API. Las rutas `#/home`, `#/catalog`, `#/account` y `#/admin` siguen siendo rutas de navegación del Frontend.

## Demo pública y despliegue

La interfaz se publica en [GitHub Pages](https://pablodarkyy.github.io/uninorte-ecommerce-platform/). GitHub Pages solo sirve archivos estáticos; el Backend y PostgreSQL se alojan por separado. La configuración preparada usa `render.yaml` para desplegar el Backend en Render y permite conectar una base PostgreSQL administrada como Neon.

Para activar el acceso público completo, crea una base PostgreSQL administrada, despliega el servicio Backend desde Render y configura `DATABASE_URL`, `SEED_ADMIN_PASSWORD` y `CORS_ORIGIN` en las variables del servicio. Luego crea la variable de repositorio `GLOBALIZAT_API_URL` en **Settings → Secrets and variables → Actions → Variables** con la URL pública del Backend, sin añadir `/api`. El workflow inyecta esa URL al Frontend antes de desplegarlo. Los usuarios entrarán a la tienda por el enlace de GitHub Pages y no necesitarán instalar Node.js ni PostgreSQL.

Los servicios gratuitos pueden suspenderse si están inactivos y la primera solicitud podría demorar. El checkout es de demostración y no cobra dinero. En planes gratuitos, los archivos de usuario/subidos pueden no contar con almacenamiento persistente; por eso los modelos GLB que ya vienen en el repositorio sí están versionados.

## Estructura general y organización modular

```text
index.html                 Entrada y mapa de módulos locales
src/
  app.js, router.js        Inicialización, navegación y limpieza de vistas
  pages/                  Composición de páginas y módulos previos conservados
  sections/               Secciones de la tienda
  components/             Navbar, Hero, tarjetas, modales y visor compartido
  features/
    auth/                 Pantalla de acceso y registro local
    checkout/             Flujo de compra simulado
    account/              Perfil, direcciones, preferencias, pedidos y tracking
    admin/                Dashboard, productos, inventario, pedidos y ventas
    cart/, currency/, i18n/ Carrito y preferencias compartidas
  services/               Contratos y servicios consumidos por las vistas
    products/             Repositorio mock y archivos temporales
    analytics/            Generación aislada de estadísticas ficticias
  data/                   Datos de demostración y semilla del catálogo
  config/, locales/       Configuración y recursos de idioma
  modules/                Movimiento, navegación y ciclo de vida de Three.js
  styles/                 Estilos y tokens compartidos
  assets/                 Imágenes, iconos y modelos 3D locales
  vendor/three/           Dependencia local necesaria para ejecutar offline
scripts/serve.js          Servidor estático de desarrollo
tests/                    Contratos y recorridos de navegador
docs/                     Documentación de integración y referencias técnicas
```

Las vistas se encargan de presentación e interacción. Los servicios exponen operaciones asíncronas y los repositorios/mocks proporcionan los datos temporales. Admin y Catálogo comparten la instancia de ProductService y la misma colección; no hay un catálogo administrativo separado.

Los cambios de productos e inventario duran durante la sesión y se reinician al recargar. Los archivos seleccionados en Admin utilizan object URLs temporales, sin subida a un servidor. Cuenta conserva datos de demostración en almacenamiento local cuando está disponible. Los importes y direcciones históricos de pedidos son independientes de posteriores ediciones del catálogo.

## Integración Backend y Base de Datos

El Frontend llama a la API a través de `src/services/api.client.js`; `src/config/api.js` define la URL base. El Backend valida las operaciones, comprueba roles y persiste los datos mediante PostgreSQL.

```text
Navegador / GitHub Pages
        │ HTTPS + API
        ▼
Backend Node.js (/api)
        │ DATABASE_URL
        ▼
PostgreSQL
```

Componentes clave:

- API y arranque: `backend/src/server.js`.
- Configuración de la conexión: `backend/src/config.js` y `backend/.env.example`.
- Esquema: `backend/src/db/schema.sql` y copia de documentación en `database/schema.sql`.
- Datos iniciales: `backend/src/data/seed.js`; alternativa SQL en `database/seed.sql`.
- Acceso, cuenta, catálogo, pedidos, tracking y administración: `backend/src/routes/`.
- Adaptadores HTTP usados por la interfaz: `src/services/api.client.js` y `src/features/account/services/api-services.js`.

Nunca guardar una contraseña de PostgreSQL en código ni en GitHub. En producción, el Backend lee `DATABASE_URL` desde sus variables privadas; el Frontend recibe solamente la URL pública del API.

## Documentación

Documentación de integración:

- [Acceso local, sesiones y separación de cuentas](docs/auth-contracts.md).
- [Carrito, checkout, pedidos y variantes 3D](docs/commerce-contracts.md).
- [Previews 3D, caché y transición compartida de productos](docs/catalog-3d-transition.md).
- [Account / Profile y contratos de Cuenta](docs/account-contracts.md).
- [Admin, Product, inventario, archivos y analítica](docs/admin-contracts.md).
- [Notas históricas de implementación, Hero y visor 3D](docs/frontend-history.md): conserva el README anterior y señala su carácter histórico.
- [Backend y configuración](backend/README.md).
- [PostgreSQL, esquema y pruebas de conexión](database/README.md).


## Verificación

Pruebas de contratos del Frontend:

```sh
npm test
```

Verificación de conexión PostgreSQL (desde `backend/`):

```sh
npm run db:check
```

El test de humo del Backend usa una base exclusiva indicada por `TEST_DATABASE_URL`; no apuntes ese test a la base de producción.

Con el servidor iniciado, Playwright externo y Edge disponibles, se pueden ejecutar recorridos como:

```sh
node tests/browser-smoke.cjs
node tests/experience-browser.cjs
node tests/commerce-browser.cjs
node tests/account-browser.cjs
node tests/admin-browser.cjs
node tests/admin-edge.cjs
node tests/navigation-expanded.cjs
node tests/hero-scroll.cjs
node tests/studio-glass.cjs
node tests/three-viewer.cjs
```

`PLAYWRIGHT_PATH` permite indicar la instalación externa de Playwright. Algunas pruebas admiten `BROWSER_CHANNEL`; consultar cada archivo. Las capturas y artefactos de verificación son locales y no se versionan.

## Archivos versionados y colaboración

Se incluyen código, pruebas, documentación, todos los modelos/assets actuales y Three.js local con su licencia. **`src/vendor/three/build/` es necesario y sí se versiona.**

`.gitignore` excluye dependencias instaladas, entornos privados, builds, cachés, registros, archivos de datos locales y cargas subidas. Sí se versionan `backend/.env.example` y los scripts SQL, porque no contienen credenciales reales. No publiques `backend/.env`, contraseñas ni URLs privadas de PostgreSQL.

La rama principal es `main`. Para colaborar, crear ramas de trabajo y presentar los cambios mediante pull requests, coordinando los contratos de integración con los demás grupos.
