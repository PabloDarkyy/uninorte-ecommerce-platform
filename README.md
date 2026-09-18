# UniNorte E-Commerce Platform

Proyecto universitario de plataforma web e-commerce de UniNorte, orientado a presentar productos paraguayos y preparar el trabajo colaborativo entre Frontend, Backend y Base de Datos.

Este repositorio contiene el estado actual del **Frontend**. Funciona con datos de demostración y servicios mock reemplazables. Backend, autenticación real, pagos y persistencia en Base de Datos **no están implementados**.

## Estado actual

Frontend funcional con:

- **Home:** presentación de la colección y transición cinematográfica por scroll.
- **Catálogo y detalle de productos:** previews de los GLB reales renderizados bajo demanda y transición compartida hasta el visor; imagen o representación conceptual de respaldo. Información y modales accesibles.
- **Visualización 3D:** modelos GLB locales, controles de giro/zoom y visor ampliado.
- **Perfil:** edición de datos, avatar, direcciones y preferencias locales.
- **Seguimiento ficticio e historial de pedidos:** datos mock compartidos con Administración.
- **Panel administrativo:** Dashboard, creación/edición/desactivación de productos, variantes, imágenes y selección local de modelos 3D.
- **Inventario:** modificación simulada del stock general y por variante.
- **Reportes ficticios:** gráficos locales con estadísticas coherentes que cambian al entrar al módulo.
- **Responsive y animaciones:** adaptación a escritorio/móvil y soporte para movimiento reducido.

### Commerce de demostración

- Carrito lateral con variantes, cantidades, stock, eliminación y resumen.
- Añadir al carrito y Comprar ahora con captura del modelo visible y transición coordinada.
- Checkout de cinco pasos, pago completamente ficticio y confirmación integrada con Perfil/Tracking.
- Selectores ES/EN y PYG/USD/EUR activos para Commerce; los pedidos conservan moneda y precios históricos.
- GLB por variante y selección desde Admin, reutilizando caché, renderer y entorno.

El carrito vive en memoria durante la sesión. Los datos de tarjeta nunca se guardan. No hay pagos reales, Backend, autenticación ni base de datos. Account/Admin conservan los textos previos fuera del flujo Commerce.

## Tecnologías

- HTML5, CSS3 y JavaScript con ES Modules, sin framework de interfaz.
- Three.js r180 (0.180.0), GLTFLoader y OrbitControls incluidos localmente, con su licencia en `src/vendor/three/`.
- Modelos GLB y assets locales; gráficos mediante SVG/CSS.
- Node.js 20 o posterior para el servidor local y las pruebas de contratos.
- Pruebas opcionales de navegador con Playwright y Microsoft Edge, instalados por separado en el entorno de desarrollo.

La aplicación no necesita CDN, servicios externos ni instalar paquetes para ejecutarse. El servidor Node sirve archivos estáticos de desarrollo: no es un Backend de negocio.

## Ejecutar localmente

1. Tener Node.js 20 o posterior.
2. Clonar el repositorio y entrar en su carpeta.
3. Ejecutar:

```sh
npm start
```

También se puede usar `node scripts/serve.js`.

4. Abrir **http://127.0.0.1:4173/**. Detener el servidor con `Ctrl+C`.

No hace falta ejecutar `npm install`. No abrir `index.html` con doble clic: los módulos y modelos necesitan HTTP. Si el puerto 4173 está ocupado, detener la instancia anterior antes de iniciar otra.

Accesos de la demo:

- Tienda: `http://127.0.0.1:4173/#/home`
- Catálogo: `http://127.0.0.1:4173/#/catalog`
- Perfil: `http://127.0.0.1:4173/#/account`
- Administración: `http://127.0.0.1:4173/#/admin`, también accesible desde el pie de página.

Estas son rutas del Frontend, no endpoints de una API.

No se necesitan variables de entorno ni credenciales para ejecutar esta fase; por eso no se incluye `.env.example`.

## Demo pública y despliegue

La demo se publica en [GitHub Pages](https://pablodarkyy.github.io/uninorte-ecommerce-platform/). El workflow `.github/workflows/pages.yml` ejecuta las pruebas y despliega únicamente `index.html` y `src/` después de cada push a `main`; también admite ejecución manual. Las rutas usan hash y los assets conservan rutas relativas para funcionar bajo el nombre del repositorio.

La demo pública mantiene los mismos servicios mock y almacenamiento local del Frontend: no incorpora Backend, autenticación real ni persistencia compartida entre usuarios.

## Estructura general y organización modular

```text
index.html                 Entrada y mapa de módulos locales
src/
  app.js, router.js        Inicialización, navegación y limpieza de vistas
  pages/                  Composición de páginas y módulos previos conservados
  sections/               Secciones de la tienda
  components/             Navbar, Hero, tarjetas, modales y visor compartido
  features/
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

**Grupos 3 y 4: consultar primero `docs/` antes de comenzar la integración.** El Frontend utiliza actualmente servicios mock y contratos desacoplados:

```text
Frontend
  → vistas y componentes
Services
  → contratos utilizados por las vistas
Mocks/Repositories
  → implementación temporal actual
Backend futuro
  → reemplazará las implementaciones mock
Base de Datos futura
  → proporcionará persistencia real
```

Puntos principales:

- Productos: `src/services/product.service.js` y `src/services/products/`.
- Cuenta y pedidos: `src/features/account/services/index.js`.
- Administración: `src/features/admin/services.js`, que reutiliza productos y pedidos.
- Analítica: `src/services/analytics/mock-analytics.service.js`.

Los equipos deberán acordar persistencia, autenticación/autorización, archivos y contratos remotos. No hay endpoints definitivos establecidos en esta fase. El panel administrativo es una demostración sin control de acceso real; la visibilidad del repositorio no implementa seguridad dentro de la aplicación.

## Documentación

Documentación de integración:

- [Carrito, checkout, pedidos y variantes 3D](docs/commerce-contracts.md).
- [Previews 3D, caché y transición compartida de productos](docs/catalog-3d-transition.md).
- [Account / Profile y contratos de Cuenta](docs/account-contracts.md).
- [Admin, Product, inventario, archivos y analítica](docs/admin-contracts.md).
- [Notas históricas de implementación, Hero y visor 3D](docs/frontend-history.md): conserva el README anterior y señala su carácter histórico.


## Verificación

Pruebas de contratos sin dependencias adicionales:

```sh
npm test
```

Con el servidor iniciado, Playwright externo y Edge disponibles, se pueden ejecutar recorridos como:

```sh
node tests/browser-smoke.cjs
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

`.gitignore` excluye dependencias instaladas, entornos privados, builds de la raíz, cachés, registros, configuración de editores y artefactos de pruebas. No publicar credenciales ni archivos `.env`. Si una fase futura necesita configuración, documentar las variables mediante un ejemplo sin secretos.

La rama principal es `main`. Para colaborar, crear ramas de trabajo y presentar los cambios mediante pull requests, coordinando los contratos de integración con los demás grupos.
