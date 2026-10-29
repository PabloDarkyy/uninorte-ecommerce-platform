# Frontend

El frontend es una aplicación de una sola página construida con HTML, CSS y JavaScript nativo. Usa ES modules directamente en el navegador; no tiene bundler ni paso de compilación.

## Estructura de `src/`

| Ruta | Responsabilidad |
|---|---|
| `app.js` | Arranque, eventos de navegación y actualización de preferencias. |
| `router.js` | Guardia de autenticación, resolución de rutas hash y montaje/desmontaje de vistas. |
| `assets/` | Iconos, imágenes y 11 modelos GLB. |
| `components/` | Navbar, hero, tarjetas, modal y escenario de producto, selectores y footer. |
| `config/` | Base de la API, rutas principales, idiomas y monedas. |
| `data/` | Proyección del catálogo y datos mock conservados. |
| `features/` | Auth, carrito, checkout, cuenta, administración, tema, i18n y moneda. |
| `locales/` | Diccionarios ES/EN y textos de experiencia/comercio. |
| `modules/` | Navegación animada, UI motion y módulos Three.js. |
| `pages/` | Vistas históricas y módulos de página; el flujo actual monta `homePage`, Cuenta y Admin desde el router. |
| `sections/` | Sección de catálogo de la página principal. |
| `services/` | Cliente HTTP y servicios de auth, catálogo, carrito, checkout, pedidos y analytics. |
| `styles/` | Tokens, estilos globales, utilidades, movimiento y agregador `main.css`. |
| `utils/` | Escape HTML, iconos, preferencias y normalización de medios/productos. |
| `vendor/three/` | Three.js r180, addons y licencia MIT de la dependencia. |

## Router y rutas hash

`src/config/routes.js` declara las secciones principales:

| Hash | Destino |
|---|---|
| `#/home` | Inicio/hero. |
| `#/catalog` | Catálogo. |
| `#/about` | Acerca de. |
| `#/contact` | Contacto. |

`src/router.js` reconoce además cualquier ruta bajo `#/account` y `#/admin`. Las rutas efectivas de sus módulos son:

- Cuenta: `#/account` o `#/account/summary`, `profile`, `tracking`, `history`, `addresses` y `preferences`.
- Detalle de pedido: `#/account/tracking/:orderId` y `#/account/history/:orderId`.
- Administración: `#/admin` o `#/admin/dashboard`, `products`, `sales`, `orders` e `inventory`.
- Detalle administrativo: `#/admin/orders/:orderId`.

Una ruta principal desconocida vuelve a `/home`; una subsección desconocida de Cuenta o Admin vuelve al resumen/dashboard. Si no hay identidad activa, el router monta la pantalla de login antes de cualquier vista. Las rutas `src/pages/auth`, `cart`, `orders`, `product` y `profile` no definen rutas hash adicionales en el router actual.

## Servicios, API y mocks

`src/services/api.client.js` centraliza `fetch`, JSON, el Bearer token en memoria y la traducción de errores. La URL predeterminada es `http://127.0.0.1:4000`; antes de cargar `app.js` se puede definir `window.__GLOBALIZAT_API_URL__` para otro backend.

En navegador se usan implementaciones reales:

- `auth.service.js`: registro, login, demo, logout y usuario actual.
- `product.service.js`: catálogo, CRUD, destacados e inventario.
- `features/account/services/api-services.js`: perfil, direcciones, preferencias, pedidos, tracking y clientes.
- `order.service.js`, `checkout.service.js` y `cart.service.js`: compra y estado temporal del carrito.
- `features/admin/services.js`: composición de servicios para administración.
- `services/products/product-assets.js`: carga/liberación de imágenes y GLB.

`src/config/api.js` expone `DEMO_MODE`, que solo es verdadero cuando la configuración cargada antes de `app.js` define exactamente `globalThis.__GLOBALIZAT_DEMO__ = true`. En ese modo, o durante pruebas Node sin `window`, los singletons de autenticación, productos, cuenta, assets y administración seleccionan las factorías mock (`createMockProductRepository`, `createMockAccountServices` y analytics mock). En cualquier navegador sin esa bandera se mantienen los servicios HTTP, de modo que el flujo full-stack local no cambia. Los errores de red nunca activan automáticamente el modo demostración.

## Módulos 3D

- `product-model-cache.js`: deduplica cargas, comparte caché y clona escenas para consumidores.
- `render-budget.js`: asigna el presupuesto de render y evita animación continua innecesaria.
- `catalog-renderer.js`: escena compartida del catálogo.
- `product-viewer.js`: visor interactivo del detalle, controles, encuadre y limpieza.
- `studio-environment.js`: iluminación y entorno.
- `three-utils.js`: utilidades de carga, normalización y descarte.

El import map de `index.html` resuelve `three` y `three/addons/` contra la copia vendorizada. Si un GLB falla, la interfaz conserva un fallback visual en lugar de bloquear el catálogo.

## Idiomas y moneda

La interfaz dispone de español e inglés. `features/i18n/i18n.js` selecciona los textos de `src/locales/`, y las preferencias de Cuenta sincronizan idioma y moneda con la API.

Las monedas disponibles son PYG, USD y EUR. Las tasas son fijas y ficticias (`1 USD = 8 000 PYG`, `1 EUR = 9 000 PYG`); sirven para la demostración y no deben interpretarse como cotizaciones. Los pedidos guardan la moneda y el precio confirmado.

## Tema oscuro

Los colores se expresan mediante tokens CSS en `src/styles/tokens.css`. El tema:

- sigue `prefers-color-scheme` mientras no haya elección del usuario;
- puede alternarse desde navbar y login;
- guarda `light` o `dark` en `localStorage` con la clave `uninorte.theme`;
- se aplica de forma temprana desde `index.html` para reducir parpadeos.

`src/styles/main.css` importa los estilos activos. `base.css`, `components.css` y `layout.css` son archivos heredados y no se importan.

## Agregar una imagen o modelo

### Desde Administración

1. Inicia sesión con una cuenta admin.
2. Entra en `#/admin/products` y crea o edita un producto.
3. Selecciona una imagen JPG, PNG o WebP de hasta 10 MB.
4. Selecciona un modelo `.glb` de hasta 100 MB para el producto o una variante.
5. Guarda el producto. La API escribe bajo `backend/uploads/` y devuelve `/uploads/...`; `assetUrl` lo resuelve contra el backend.

### Como asset incluido en el repositorio

1. Coloca la imagen bajo `src/assets/images/` o el GLB bajo `src/assets/models/`.
2. Usa una ruta relativa servida por el frontend, por ejemplo `./src/assets/models/producto.glb`, en los datos de producto correspondientes.
3. Comprueba el archivo por HTTP, el fallback, el encuadre 3D y el comportamiento móvil.

Los GLB actuales se almacenan directamente en Git, no en Git LFS. Evita añadir archivos innecesariamente grandes y conserva la licencia/procedencia del asset.
