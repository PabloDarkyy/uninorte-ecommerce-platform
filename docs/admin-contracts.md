# Administración: contratos y puntos de integración

Esta fase es frontend y funciona localmente. Las rutas `#/admin`, `#/admin/products`, `#/admin/sales`, `#/admin/orders` y `#/admin/inventory` son rutas de interfaz, no endpoints. El acceso está en el pie de la tienda. No hay autenticación administrativa ni autorización real: el equipo de Backend deberá implementarlas antes de una publicación con datos reales.

## Una colección compartida

`src/data/products.js` sigue siendo la única semilla de productos. `createMockProductRepository` mantiene una copia en memoria por sesión de página. `productService` es la misma instancia que consumen Home, Catálogo, Cuenta y Administración. Los cambios sobreviven a la navegación entre módulos y se reinician al recargar la página. No existe un catálogo administrativo paralelo.

El repositorio devuelve copias y confirma las escrituras completas. El servicio serializa las mutaciones, valida precios, stock y variantes y propaga errores recuperables. Un futuro repositorio/adaptador de API sustituirá el mock; no se definieron URLs de Backend. Para un servidor, las operaciones y concurrencia deberán resolverse de manera atómica en ese adaptador, sin descargar y reescribir una colección completa.

## Product existente y campos extendidos

Se conserva el objeto existente, incluidos `id`, `slug`, `name`, `category`, `shortDescription`, `description`, `brand`, `basePrice`, `baseCurrency`, `stock`, `image`, `model`, `accentColor`, `heroFeatured`, `featured` y `variants`.

Los campos textuales localizados usan `{ es, en? }`. El editor modifica español y conserva otras traducciones existentes. No activa traducción global ni conversión de monedas.

Campos adicionales:

| Campo | Tipo y significado |
| --- | --- |
| `active` | Booleano. `false` oculta el producto en el catálogo; continúa disponible para Administración y referencias de pedidos. |
| `images` | Array de URLs de imágenes secundarias. |
| `modelName` | Nombre del archivo del modelo, opcional, para presentación. |
| `nutrition`, `ingredients`, `benefits`, `origin` | Texto localizado opcional. |
| `availability` | `available`, `preorder` o `unavailable`. Se representa también en Catálogo. |

`model` continúa siendo la URL del GLB. No se creó un segundo `model3dUrl` ni otro tipo Product. `featured` pertenece al mismo producto; no existe una colección independiente de destacados. La selección cinematográfica existente de Hero conserva su prioridad `heroFeatured`/modelo.

Cada variante conserva `id` y `name`, y admite `description`, `price` opcional, `stock` entero y `image` opcional. Un `price: null` significa que no se ha establecido un precio específico. Los identificadores deben ser únicos dentro del producto. El servicio asigna identificadores a productos nuevos; el editor permite administrar identificadores de variantes.

## Operaciones asíncronas de productos

| Operación | Resultado |
| --- | --- |
| `list({ includeInactive = false } = {})` | `Product[]`; por defecto solo activos. |
| `getById(id)` | `Product` o `null`, incluidos los inactivos. |
| `createProduct(data)` | Producto validado con identificador nuevo. |
| `updateProduct(id, data)` | Producto actualizado, preservando identidad. |
| `deactivateProduct(id)` | Actualiza `active: false`. La reactivación usa `updateProduct`. |
| `setProductFeatured(id, featured)` | Actualiza la misma propiedad consumible por Home. |
| `getInventory()` | Filas por producto y variante: `productId`, `variantId`, nombres, estado activo, `stock`, `status`. |
| `updateStock(productId, variantId, quantity)` | Actualiza el stock general si `variantId` es `null`, o el de esa variante. |

En esta demo el stock general y el de las variantes son independientes. No se suman ni sincronizan automáticamente. Las variantes originales sin stock explícito se normalizan a cero. `Sin stock` corresponde a cero, `Stock bajo` a 1–5 y `Disponible` a más de 5. Las alertas incluyen cero; el indicador cuenta productos distintos con al menos una fila de stock bajo o agotado. Backend podrá establecer después la política comercial definitiva.

## Archivos temporales

`productAssets` expone:

- `uploadProductImage(file) → { url, name }`: PNG/JPEG/WebP, máximo 10 MB.
- `uploadProductModel(file) → { url, name }`: GLB, máximo 100 MB.
- `references(product) → URL[]` y `release(url)` para gestionar recursos del adaptador local.

Estas operaciones crean object URLs, no suben archivos ni incorporan Base64 al Product. El editor conserva el borrador separado del producto original. Cancelar libera los archivos nuevos; guardar transfiere los utilizados a la colección y libera los sustituidos/eliminados. Durante una escritura asíncrona, cerrar el formulario conserva los recursos hasta conocer su resultado. La recarga termina la sesión de URLs del navegador.

`media-fields.js` administra las imágenes, `model-field.js` administra el archivo GLB y `variant-fields.js` las variantes. El formulario no construye escenas 3D. Después de guardar se puede usar **Ver** para abrir el visor compartido, incluso con un GLB local.

Un adaptador real deberá sustituir las selecciones locales por subida y eliminación remotas, devolver URLs o referencias estables y coordinar su confirmación con el producto. La ausencia de una URL en `images`, `image`, `model` o la variante representa su eliminación en el borrador. No se supuso un contrato remoto definitivo para identificadores de archivos.

## Pedidos y Cuenta

Administración utiliza exactamente `accountServices.orderService.list()` y `getById(id)`. El cliente se obtiene del servicio de usuario de la demo, que actualmente contiene un único cliente. Un adaptador con múltiples clientes deberá resolver la relación `order.userId` y proporcionar la información del cliente por pedido.

No se duplicaron los pedidos ni los eventos de tracking. Los precios unitarios, moneda y dirección guardados en cada pedido siguen siendo históricos. Cambiar el catálogo no altera su total. La vista administrativa es de consulta; no modifica estados ni logística.

## Analítica ficticia

`createMockAnalyticsService(productService, orderService, random?, now?)` ofrece `createSnapshot()`. Se invoca una vez al entrar en Dashboard o Ventas. No hay intervalos, observadores de datos ni generación aleatoria en componentes. Las vistas reciben un snapshot completo y estable:

- `id`, `generatedAt`, `period`;
- `activeProducts`, `units`, `revenue: [{ currency, amount }]`;
- `ordersCount` (pedidos pendientes del servicio compartido);
- `lowStockProducts`, `stockAlerts`, `recentActivity`;
- `salesByProduct: [{ productId, name, units, unitPrice, currency, revenue }]`;
- `salesByPeriod: [{ label, units }]`;
- `topProducts`.

El mock distribuye unidades por producto entre seis periodos demostrativos del mes. La suma de periodos coincide con la de productos. Cada ingreso es `unitPrice * units`; los totales se agrupan por moneda, sin conversiones implícitas. El ranking se deriva de las mismas filas. Las ventas son ficticias e independientes del historial de pedidos; no representan una conciliación contable. Nombres y precios siempre proceden de ProductService.

Los gráficos de barras usan CSS y la evolución usa SVG, con datos accesibles en texto. Funcionan sin CDN, bibliotecas nuevas o conexiones externas. Se animan una sola vez por entrada. Un adaptador real podrá mantener la misma respuesta o componer sus operaciones de resumen, productos, periodos y ranking antes de entregarla a la vista.

## Movimiento y limpieza

`styles/motion.css` define duraciones de 160/300/460 ms y un easing común. `modules/ui-motion.js` comparte animaciones WAAPI y el ciclo de vida de los diálogos. Catálogo espera la respuesta visual de 160 ms de la tarjeta antes de abrir el detalle; navegar cancela esa animación. No utiliza un temporizador artificial.

El detalle y los diálogos administrativos combinan opacidad y escala suave. El visor ampliado conserva el mismo canvas, escena y controlador; solo cambia su ubicación y configuración existente. La animación de UI no crea otro bucle de render ni recarga el GLB. Las aperturas y cierres animan también el fondo. Los listeners de módulo se liberan al salir, y las animaciones se cancelan al desmontar. Los formularios cerrados dejan de conservar callbacks en el administrador de diálogos.

`prefers-reduced-motion` elimina movimientos de tarjetas, secciones, gráficos y diálogos, manteniendo controles, foco y navegación. La transición especial del Hero, sus materiales e iluminación permanecen en sus módulos existentes.

## Verificación

- `npm test`: contratos de productos, escrituras atómicas, stock, pedidos históricos, analítica por moneda, recursos y servicios previos.
- `tests/admin-browser.cjs`: creación/edición/desactivación, imágenes/GLB/variantes, catálogo compartido, inventario, pedidos, snapshots estables, 320–1440 px, movimiento reducido y recursos locales.
- `tests/admin-edge.cjs`: revocación al cancelar/reemplazar, GLB local realmente renderizado/ampliado, guardado lento y errores recuperables.
- Regresión: `tests/account-browser.cjs`, `tests/browser-smoke.cjs`, `tests/navigation-expanded.cjs` y `tests/hero-scroll.cjs`.

Las pruebas de navegador utilizan Playwright disponible en el entorno de desarrollo; no es una dependencia de ejecución de la web.
