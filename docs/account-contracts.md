# Cuenta del cliente · Contrato de integración

Esta fase funciona localmente con un usuario ficticio. No hay autenticación, servidor, upload, logística ni envío de comunicaciones. Las operaciones siguientes describen necesidades del frontend; las URLs, autorización y esquema definitivo los acordarán Backend y Base de Datos.

## Arquitectura y sustitución del proveedor

```text
src/features/account/
  account.js                 Estado de edición, eventos, carga y composición
  account.css                Layout responsive y estilos exclusivos de Cuenta
  domain.js                  Clasificación de pedidos activos
  components/                Funciones visuales: resumen, perfil, pedidos, direcciones, preferencias
  services/index.js          Punto único de selección/inyección del proveedor
  services/mock-services.js  Operaciones async, validación, composición de productos y tracking
  services/repository.js     Persistencia del mock, sin acceso desde las vistas
  mocks/account-data.js      Usuario, direcciones, OrderItem y etapas ficticias
```

El flujo es **vista → servicio → repository / futuro adaptador API**. `accountPage(path, services)` acepta un conjunto de servicios por inyección. Actualmente `services/index.js` construye `createMockAccountServices(repository, productService)`. Para integrar Backend, exportar desde ese punto servicios API que cumplan las mismas operaciones y respuestas, sin reconstruir los componentes.

Los servicios devuelven promesas y copias independientes de los datos; los errores rechazan con un `Error` cuyo `message` se puede presentar al usuario. El router incluye carga, error y reintento, descarta respuestas de navegaciones anteriores y desmonta los listeners al salir. Las mutaciones fallidas conservan el formulario para poder corregirlo o reintentar.

## Estructuras

Las fechas de eventos y pedidos son strings ISO 8601 con zona horaria; `birthDate` es `YYYY-MM-DD` o vacío. Los IDs son strings opacos. Las cantidades son enteros positivos. Los importes del mock son números en la moneda del pedido; en producción debe acordarse la representación decimal/unidades menores. La UI no convierte precios históricos al cambiar la moneda preferida.

### User

| Campo | Tipo / significado |
| --- | --- |
| id | string, identificador del usuario actual |
| firstName, lastName | string |
| email, phone | string |
| birthDate | string de fecha o vacío |
| avatar | string URL o null; el mock usa data URL de imagen |
| addresses | Address[], compuesto por el servicio, no almacenado dos veces |

La dirección principal se obtiene de `addresses.find(address => address.isPrimary)`. La edición de perfil acepta además `primaryAddressId`. Sin direcciones, el perfil permanece utilizable y enlaza a administrarlas.

### Address

`{ id, userId, recipientName, phone, addressLine, city, country, isPrimary }`

Todos los campos salvo `isPrimary` son strings; `isPrimary` es boolean. Si hay direcciones, exactamente una es principal. La primera dirección se marca automáticamente; eliminar la principal promueve la primera restante. Eliminar la última permite una lista vacía.

### Order y OrderItem

```js
Order = {
  id, userId, createdAt,
  status, // preparing | in_transit | delivered | cancelled | refunded
  currency, // código ISO, por ejemplo PYG
  total,
  quantity, // suma de cantidades de items, composición del servicio
  items: OrderItem[],
  shippingAddress: Address, // snapshot de la dirección utilizada
  estimatedDelivery // rango ficticio "YYYY-MM-DD / YYYY-MM-DD"
}
OrderItem = {
  productId, variantId, quantity, unitPrice,
  subtotal, // quantity * unitPrice
  product,  // Product existente, o null si ya no está disponible
  variant   // variante del Product, o null
}
```

Los mocks almacenan solo `productId`, `variantId`, `quantity`, `unitPrice`. `OrderService` resuelve `product` y `variant` usando el `productService` del catálogo; no existe un catálogo paralelo. Se conserva el contrato actual: `Product.id`, `name` y `description` localizados, `basePrice`, `baseCurrency`, `image`, `variants`, `stock`, etc. Si un producto/variante ya no existe, la UI presenta un respaldo y conserva cantidades/precios históricos.

`unitPrice` pertenece al momento de compra, no al precio actual del catálogo. `shippingAddress` es una copia del momento de compra: editar o eliminar una dirección actual no altera pedidos pasados. El total del mock es la suma de subtotales; no se inventan impuestos, envíos ni pagos. Producción deberá entregar un total autoritativo y acordar su desglose.

### Tracking y TrackingEvent

```js
Tracking = {
  orderId,
  status, // mensaje principal de la etapa actual
  progress, // número 0–100
  estimatedDelivery, // rango ficticio de fechas
  updatedAt, // timestamp de la etapa actual
  events: TrackingEvent[]
}
TrackingEvent = {
  id,
  status, // completed | current | pending
  message,
  timestamp, // ISO o null para una etapa pendiente
  completed // true solamente para etapas anteriores a la actual
}
```

Cada snapshot tiene una única etapa actual, todas las anteriores completadas y todas las posteriores pendientes. El detalle usa exactamente el snapshot que vio el usuario en la lista. No hay timers, cambios espontáneos, mapas ni peticiones logísticas.

Para la exposición, `trackingService.enter()` avanza entre cinco escenarios al entrar de nuevo a Seguimiento: recogida, espera de vuelo, tránsito internacional, aduanas y reparto. El ciclo vive solo en el servicio mock y vuelve al comienzo tras el quinto escenario; ninguna visualización cambia mientras está abierta. Los pedidos activos de la demo no se convierten en históricos por el ciclo. El estado se reinicia al recargar la aplicación. En un adaptador real, `enter()` consultaría la información vigente sin generar ni avanzar etapas.

### AccountPreferences

`{ language, currency, rememberCurrency, showFeatured, receiveNews }`

`language`: `es | en`; `currency`: `PYG | USD | EUR`; los otros tres campos son booleanos. Las opciones reutilizan `config/languages.js`, `config/currency.js` y los selectores existentes, parametrizados para poder editarse en Cuenta. No se duplica conversión ni se activa el idioma global. En esta fase se guardan preferencias, pero no cambian el catálogo ni generan comunicaciones.

## Operaciones async requeridas

| Servicio | Operación | Respuesta / semántica |
| --- | --- | --- |
| UserService | getCurrentUser() | User con direcciones actuales; futura consulta GET |
| UserService | updateCurrentUser(data) | User actualizado; futura actualización PUT/PATCH |
| UserService | updateAvatar(file) | `{ url }`; prepara una imagen local, futura subida POST |
| OrderService | list() | Order[] del usuario, recientes primero; futura consulta GET |
| OrderService | getById(id) | Order completo; rechaza si no existe |
| TrackingService | enter() | objeto `{ [orderId]: Tracking }` para pedidos activos |
| TrackingService | getByOrderId(id) | snapshot Tracking; rechaza pedidos históricos/inexistentes |
| AddressService | list() | Address[]; futura consulta GET |
| AddressService | save(data) | Address[] actualizado; creación sin id o edición con id, futuro POST/PUT |
| AddressService | remove(id) | Address[] actualizado; futura eliminación DELETE |
| AddressService | setPrimary(id) | Address[] actualizado con una única principal |
| PreferenceService | get() | AccountPreferences |
| PreferenceService | update(data) | AccountPreferences validado y actualizado |

## Avatar, persistencia y cancelación

El mock acepta JPG, PNG y WebP de hasta 2 MB. `updateAvatar(file)` prepara una data URL y la vista previa; no modifica el usuario. Solo `updateCurrentUser({ ..., avatar: url })` confirma la foto al guardar. Cancelar o salir descarta la vista previa y las respuestas de lecturas pendientes. Un futuro upload puede devolver una URL temporal y confirmar su asociación al usuario durante el guardado; Backend deberá definir limpieza y validaciones del archivo.

El repository usa la clave versionada `uninorte.account.demo.v1` en almacenamiento local. Perfil, foto, direcciones y preferencias sobreviven a una recarga. Sin acceso a almacenamiento se usa memoria durante la sesión. Si una escritura falla, se conserva el estado anterior y se muestra un error, sin anunciar un guardado exitoso. Las vistas nunca acceden a localStorage. El mock no sustituye controles de acceso ni validación del servidor.

## Rutas y validación

`#/account` abre Resumen. Secciones: `#/account/summary`, `/profile`, `/tracking`, `/history`, `/addresses`, `/preferences`. Los detalles utilizan `#/account/tracking/:orderId` y `#/account/history/:orderId`. Se soportan enlaces directos y Atrás/Adelante; volver a la tienda monta de nuevo el Hero y su visor.

Pruebas: `node --test tests/*.test.js` y, con Playwright externo/servidor local, `node tests/account-browser.cjs`. Cubren contratos, clones, validación, persistencia, snapshot de direcciones históricas, coherencia de tracking, edición/cancelación/foto, CRUD, navegación y las seis vistas a 320, 375, 768, 1024 y 1440 px.
