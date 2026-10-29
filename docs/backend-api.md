# API del backend

Base local predeterminada: `http://127.0.0.1:4000`. Salvo las cargas multipart, las solicitudes y respuestas usan JSON.

## Autorización

- **Pública:** no necesita token.
- **Opcional:** acepta Bearer token, pero no falla si falta; el rol puede modificar el resultado.
- **Sesión:** requiere `Authorization: Bearer <token>`. El middleware no restringe el rol; la interfaz usa estas rutas como cliente.
- **Admin:** requiere sesión y rol `admin`.

## Endpoints

| Método | Ruta | Auth | Cuerpo o consulta | Respuesta principal | Errores principales |
|---|---|---|---|---|---|
| GET | `/api/health` | Pública | — | `{ok, service}` | — |
| POST | `/api/auth/register` | Pública | `{firstName,lastName,email,password}` | `201 {token,user}` | `VALIDATION`, `ALREADY_EXISTS` |
| POST | `/api/auth/login` | Pública | `{email,password}` | `{token,user}` | `INVALID_CREDENTIALS` |
| POST | `/api/auth/login-demo` | Pública | — | `{token,user}` del cliente demo | `SEED_MISSING` |
| POST | `/api/auth/logout` | Sesión | — | `{}` | `UNAUTHENTICATED` |
| GET | `/api/auth/me` | Sesión | — | Identidad `{id,firstName,lastName,email,role}` | `UNAUTHENTICATED` |
| GET | `/api/account/me` | Sesión | — | Perfil con direcciones | `UNAUTHENTICATED`, `NOT_FOUND` |
| PUT | `/api/account/me` | Sesión | Perfil: `{firstName,lastName,email,phone,birthDate?,avatar?,primaryAddressId?}` | Perfil actualizado | `VALIDATION`, `NOT_FOUND` |
| POST | `/api/account/avatar` | Sesión | Multipart, campo `file` | `201 {url}` | `VALIDATION`, `UNAUTHENTICATED` |
| GET | `/api/account/addresses` | Sesión | — | Array de direcciones | `UNAUTHENTICATED` |
| POST | `/api/account/addresses` | Sesión | Dirección; `id` opcional permite editar | `201` al crear o `200` al editar; array | `VALIDATION`, `NOT_FOUND` |
| PUT | `/api/account/addresses/:id` | Sesión | Dirección | Array actualizado | `VALIDATION`, `NOT_FOUND` |
| DELETE | `/api/account/addresses/:id` | Sesión | — | Array actualizado | `NOT_FOUND` |
| POST | `/api/account/addresses/:id/primary` | Sesión | — | Array actualizado | `NOT_FOUND` |
| GET | `/api/account/preferences` | Sesión | — | `{language,currency,rememberCurrency,showFeatured,receiveNews}` | `UNAUTHENTICATED` |
| PUT | `/api/account/preferences` | Sesión | Preferencias completas | Preferencias actualizadas | `VALIDATION` |
| GET | `/api/products` | Opcional | `?includeInactive=true`; solo surte efecto para admin | Array de productos | — |
| GET | `/api/products/inventory` | Admin | — | Filas de stock general y por variante | `UNAUTHENTICATED`, `FORBIDDEN` |
| GET | `/api/products/:id` | Pública | — | Producto o `null`, incluso inactivo | — |
| POST | `/api/products` | Admin | Producto completo | `201` producto creado | `VALIDATION`, `UNAUTHENTICATED`, `FORBIDDEN` |
| PUT | `/api/products/:id` | Admin | Campos de producto | Producto actualizado | `VALIDATION`, `NOT_FOUND` |
| POST | `/api/products/:id/deactivate` | Admin | — | Producto con `active:false` | `NOT_FOUND` |
| PUT | `/api/products/:id/featured` | Admin | `{featured}` | Producto actualizado | `NOT_FOUND` |
| PUT | `/api/products/:id/stock` | Admin | `{variantId:null|string,stock}` | Producto actualizado | `VALIDATION`, `NOT_FOUND` |
| POST | `/api/uploads/image` | Admin | Multipart, campo `file` | `201 {url,name}` | `VALIDATION` |
| POST | `/api/uploads/model` | Admin | Multipart, campo `file` | `201 {url,name}` | `VALIDATION` |
| POST | `/api/uploads/release` | Admin | `{url}` | `{}`; idempotente | `UNAUTHENTICATED`, `FORBIDDEN` |
| POST | `/api/orders` | Sesión | `{items,currency,shippingAddress,requestId?}` | `201` pedido; `200` si ya existía por idempotencia | `INVALID_ORDER`, `INSUFFICIENT_STOCK`, `CART_CHANGED`, `VALIDATION` |
| GET | `/api/orders` | Sesión | `?all=true`; solo admin obtiene todos | Array propio o global | `UNAUTHENTICATED` |
| GET | `/api/orders/:id` | Sesión | — | Pedido hidratado | `NOT_FOUND`, `FORBIDDEN` |
| POST | `/api/tracking/enter` | Sesión | — | Mapa `{[orderId]: tracking}` después de avanzar el escenario | `UNAUTHENTICATED` |
| GET | `/api/tracking/:orderId` | Sesión | — | Snapshot de seguimiento | `NOT_FOUND`, `FORBIDDEN`, `ORDER_NOT_ACTIVE` |
| GET | `/api/analytics/snapshot` | Admin | — | Métricas, ventas, alertas y actividad | `UNAUTHENTICATED`, `FORBIDDEN` |
| GET | `/api/admin/customers` | Admin | — | Array de identidades sin credenciales | `UNAUTHENTICATED`, `FORBIDDEN` |
| GET | `/api/admin/customers/:id` | Admin | — | Identidad pública | `NOT_FOUND`, `UNAUTHENTICATED`, `FORBIDDEN` |
| GET | `/uploads/*` | Pública | Ruta de archivo | Binario con caché de una hora | Texto `Not found` con 404 |

Las validaciones de producto y dirección pueden emitir `VALIDATION`. Una ruta inexistente usa `NOT_FOUND`; un método no registrado para una ruta existente usa `METHOD_NOT_ALLOWED`.

## Formato de error

Los errores JSON siguen esta forma:

```json
{
  "error": "Mensaje legible para la interfaz.",
  "code": "VALIDATION"
}
```

`code` puede ser `null` en errores del lector HTTP que no asignan código, como JSON inválido o exceso del límite bruto. Los errores no controlados responden 500 con `INTERNAL`. La API no devuelve trazas al cliente.

## CORS

El servidor establece:

- `Access-Control-Allow-Origin` según `CORS_ORIGIN`;
- métodos `GET, POST, PUT, PATCH, DELETE, OPTIONS`;
- cabeceras `Content-Type, Authorization`;
- preflight `OPTIONS` con estado 204 y caché de 600 segundos.

No se implementa una lista dinámica ni credenciales CORS por cookie. En producción `CORS_ORIGIN` debe ser explícito y no puede ser `*`.

## Límites de cuerpos y archivos

El lector común admite hasta **110 MB** por cuerpo bruto, margen necesario para multipart. Los límites funcionales, verificados tanto en frontend como en backend, son:

| Uso | Tipos admitidos | Máximo |
|---|---|---:|
| Imagen de producto | JPG, PNG, WebP | 10 MB |
| Modelo de producto/variante | archivo con extensión `.glb` | 100 MB |
| Avatar | JPG, PNG, WebP | 2 MB |

Las cargas se guardan bajo `backend/uploads/`, se registran en `media_files` y se sirven desde `/uploads`. No existe almacenamiento remoto.

## Comportamiento comercial relevante

- El pago no forma parte de la API: los campos de tarjeta solo se validan en el cliente.
- `POST /api/orders` revalida producto, variante, precio y stock antes y dentro del commit serializado.
- Al confirmar, descuenta stock general y de variante.
- `requestId` es idempotente por usuario.
- El seguimiento es un escenario simulado y avanza al llamar a `/api/tracking/enter`.
