# Commerce: carrito, checkout y variantes 3D

## Alcance

Frontend de demostración, offline al servir los archivos locales por HTTP. No hay API, pagos, autenticación real ni base de datos. El carrito vive en memoria durante la sesión; los pedidos usan el repository de Cuenta y su almacenamiento local existente. Recargar reinicia el carrito y los productos editados en Admin, pero conserva los pedidos cuando localStorage está disponible. No existe un segundo catálogo ni otro sistema de tracking.

## Product y Variant

La semilla es `src/data/products.js`. `Product.model` conserva el GLB predeterminado; ProductService admite `model3dUrl` como alias de entrada y lo normaliza a `model`. Cada variante puede añadir `model3dUrl` e `image`, además de `id`, nombre localizado, `price` opcional y `stock`.

`utils/product-media.js` resuelve:

1. `variant.model3dUrl` (o el alias `variant.model`).
2. Modelo predeterminado del producto.
3. Imagen de variante o producto.
4. Representación conceptual cuando tampoco hay imagen.

`variant.price == null` utiliza el precio base. El stock general limita la suma de todas las variantes; cada variante tiene también su propio límite. Los precios y existencias de la semilla son ficticios.

Las asociaciones nuevas son explícitas: Harina → Tipo 000, Tipo 0000, Integral; Mix de yuyo → Burrito, Cedrón, Menta. Se conserva `demo` como identificador de la primera variante para no romper referencias históricas. Agregar un archivo al directorio no crea automáticamente un producto. Editar la semilla o seleccionar un GLB en **Admin → Producto → Variantes** permite asociar futuros modelos sin modificar el visor. Las cargas desde Admin son object URLs temporales; el servicio de assets conserva/revoca sus referencias al guardar o descartar.

## CartService

`services/cart.service.js` exporta la instancia compartida y la factoría `createCartService(productService)` para pruebas/adaptadores.

- `getCart()` / `list()`: referencias `{ id, productId, variantId, quantity, unitPrice, baseCurrency }`.
- `addItem(productId, variantId, quantity)`: valida e incrementa la fila identificada por producto + variante.
- `updateQuantity(itemId, quantity)`, `removeItem(itemId)`, `clearCart()`.
- `getItemCount()` y `getSummary(currency?)`: resuelven productos/variantes con ProductService; no duplican el catálogo. El resumen incluye filas, precios convertidos, total, cantidad y revisión.
- `subscribe(listener)`: retorna la función de desuscripción.
- `confirm(expectedRevision, currency, createOrder)`: serializa confirmación y mutaciones; valida nuevamente el resumen y vacía el carrito solo cuando `createOrder` termina correctamente. Un fallo conserva las filas.

`add` y `remove` se mantienen como alias compatibles. El precio almacenado al añadir no es una reserva comercial: el resumen usa precios vigentes hasta confirmar. Revisión de carrito o precios desactualizada produce `CART_CHANGED`; cantidades inválidas o stock insuficiente se rechazan. No hay errores aleatorios. Ningún componente accede directamente a almacenamiento para manejar el carrito.

## Interacciones y recursos

`product-commerce.js` integra selección de variante, cantidad y acciones en el modal existente. El cambio de GLB utiliza `Product3DViewer.setModel`: mantiene renderer, cámara, controles, entorno e iluminación y adquiere otra instancia del mismo caché con un fade corto. La cámara se reencuadra proporcionalmente si cambia el tamaño del modelo. El material original y los GLB no se editan.

`modules/product-entrance.js` también proporciona `captureProduct` y `flyProduct`. Se captura el modelo visible, recortando el margen transparente; la copia viaja mediante transform/opacity de Web Animations con el easing existente. No se mueve el canvas principal ni se crea otro contexto WebGL. La copia permanece con su orientación capturada durante el viaje.

- **Añadir:** CartService primero, vuelo de 780 ms al icono medido, respuesta del icono. No abre el carrito.
- **Comprar ahora:** reserva la fila, monta el drawer y mide su preview final; apertura y vuelo comienzan juntos. La misma captura aparece al llegar en la fila existente.
- Los destinos usan `getBoundingClientRect()`. No hay coordenadas fijas de escritorio.
- El drawer utiliza imágenes/capturas 2D y no tiene visores WebGL por fila. Las capturas se liberan cuando la fila deja de existir.
- Los clics repetidos quedan bloqueados durante la acción. Cerrar/navegar cancela capas, animaciones y listeners. Redimensionar termina el vuelo; reduced-motion evita la trayectoria.
- El renderer compartido de catálogo/detalle y el caché mantienen la arquitectura documentada en `catalog-3d-transition.md`.

La vista del producto en el carrito ocupa 160 × 200 px en escritorio, con tamaños menores en pantallas estrechas. La barra del modal de producto se oculta visualmente; scroll táctil, rueda y teclado siguen funcionando.

## Checkout y creación de Order

El flujo modal tiene cinco pasos: datos personales, dirección, pago ficticio, revisión y confirmación. UserService prellena el cliente; AddressService proporciona direcciones existentes. Introducir otra dirección crea solo el snapshot del pedido, sin sobrescribir automáticamente la libreta de direcciones.

Los campos de tarjeta **solo existen en el DOM del paso de pago**. Al continuar se valida formato básico, se resetea el formulario y se elimina ese DOM. No se envían a servicios, parámetros, URLs, logs, analytics ni repositorios; tampoco se conserva titular, número o CVV en Order. El aviso de simulación permanece visible. Volver al paso de pago solicita nuevamente datos ficticios.

`services/checkout.service.js` comprueba la revisión y los precios mostrados, luego llama al OrderService compartido. `services/order.service.js` reexporta el mismo servicio de `accountServices`; no mantiene pedidos independientes.

`orderService.create({items, currency, shippingAddress, userId, requestId})`:

- Valida usuario de demo, productos, variantes, cantidades y precios.
- Genera un ID ficticio `ORD-…`, fecha y estimación de entrega.
- Guarda únicamente campos permitidos: referencias de artículos, precios históricos, moneda, cantidades, total y snapshot de dirección; estado inicial `preparing`.
- Usa `requestId` para evitar duplicar la misma confirmación en el repository.
- Publica en el repository de Cuenta, visible inmediatamente en Perfil y Admin. TrackingService utiliza el nuevo pedido, empezando en preparación y avanzando ficticiamente al volver a entrar.

Cancelar, retroceder o cerrar antes de confirmar conserva el carrito. Si falla guardar el pedido, tampoco se vacía. La demo no descuenta inventario: la reserva y transacción atómica de stock corresponden al futuro Backend.

## Moneda e idioma

Se reutilizan `features/currency` y `features/i18n`. Navbar activa ES/EN y PYG/USD/EUR; guardar preferencias desde Perfil también aplica esos valores. Catálogo, detalle, carrito y checkout actualizan nombres, controles y precios mediante `preferenceschange`. Los nuevos textos están en `locales/commerce.js`, incorporados a los diccionarios existentes. Las secciones históricas de Account/Admin conservan sus textos anteriores; no se reescribió toda la aplicación.

Los pedidos guardan importes en la moneda elegida, redondeados por unidad a cero decimales para PYG y dos para USD/EUR. Cambiar moneda o editar el catálogo después no convierte ni recalcula precios históricos.

## Integración futura (Grupos 3 y 4)

Sustituir las implementaciones mock manteniendo las fronteras de servicios. Acordar autenticación, autorización, persistencia, IDs, aritmética monetaria, cotizaciones, stock transaccional, idempotencia y almacenamiento de archivos. Los totales y disponibilidad deberán verificarse en Backend. Los datos de tarjeta no deben añadirse a estos contratos. No se definen endpoints ni una integración de pagos en esta fase.

## Verificación

- `npm test`: contratos de carrito, stock/concurrencia, rechazo atómico, pedidos históricos, precios, variantes y servicios previos.
- `tests/commerce-browser.cjs`: selección/caché de GLB, presupuesto de contextos, add/buy, drawer, cantidades, checkout completo, descarte de tarjeta, Perfil/Tracking, moneda/idioma, móvil, cancelación y movimiento reducido.
- Pruebas existentes de catálogo, fullscreen, Account y Admin para regresiones; recursos locales sin CDN.

- `tests/commerce-edge.cjs`: cancelación durante el vuelo, doble apertura, stock modificado, pago cancelado y miniaturas/scroll a 320 px.
## Confirmación visual del pago ficticio

`features/checkout/payment-feedback.js` presenta un indicador de carga mientras `CheckoutService.confirm` confirma el pedido simulado. Solo muestra el check verde después de una confirmación correcta; después aparece el resumen existente. Respeta movimiento reducido y elimina sus temporizadores al finalizar. No contacta pasarelas de pago ni almacena datos de tarjeta.

Los pedidos se guardan en el repositorio local de la cuenta activa; consultar [acceso local](auth-contracts.md). La cuenta demo mantiene los pedidos semilla; las cuentas nuevas comienzan con historial vacío.
