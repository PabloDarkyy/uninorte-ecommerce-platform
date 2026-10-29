# Funcionalidades

## Implementado

- Registro, login, login demo y logout con roles cliente/admin.
- Catálogo bilingüe, productos destacados, variantes, disponibilidad y stock.
- Modelos GLB en catálogo y detalle, con caché y control de presupuesto de render.
- Carrito con cantidades, variantes, validación de stock y tres monedas.
- Checkout de cinco pasos y creación idempotente de pedidos.
- Cuenta: resumen, perfil/avatar, direcciones, preferencias, historial y seguimiento.
- Administración: dashboard, ventas, CRUD/desactivación/destacados de producto, cargas, pedidos, inventario y clientes.
- API HTTP, validación, CORS y formato uniforme de error.
- PostgreSQL con esquema normalizado, restricciones, índices y semilla.
- Tema claro/oscuro e interfaz ES/EN.

## Real frente a simulado

| Área | Estado | Alcance |
|---|---|---|
| Autenticación | Real local | API + PostgreSQL; PBKDF2-SHA256 con 120 000 iteraciones; tokens Bearer y sesiones en memoria. |
| Catálogo | Real local | Productos, traducciones, variantes, disponibilidad, precios y stock vienen de PostgreSQL. |
| Perfil, avatar, direcciones y preferencias | Real local | CRUD por API; avatares en disco local y metadatos en PostgreSQL. |
| Pedidos | Real local | Revalida precio/stock, descuenta inventario y usa `requestId` idempotente. |
| Administración | Real local | Productos, stock, destacados, pedidos, analytics y clientes consultan/modifican el backend. |
| Imágenes y GLB cargados | Real local | Se escriben en `backend/uploads/`, se sirven por `/uploads` y el frontend los resuelve con `assetUrl`. |
| Pago | Simulado | Los campos se validan solo en el navegador. Ningún dato de tarjeta se envía o almacena; no hay pasarela. |
| Conversión PYG/USD/EUR | Simulada | Tasas fijas ficticias: 8 000 PYG/USD y 9 000 PYG/EUR. |
| Seguimiento | Simulado | Escenario local de 15 etapas; no hay integración con transportistas. |
| Analytics | Calculado sobre datos reales locales | Se deriva de productos/pedidos del store, pero la UI identifica la sesión/generación como demostrativa. |
| Demo pública de Pages | Simulada y congelada | Frontend del tag `stable-pages-pre-fullstack`; usa mocks y no tiene backend. |

## Seguridad y datos

- Las credenciales no se guardan en texto plano; PostgreSQL conserva salt y digest.
- Los endpoints administrativos exigen el rol `admin`.
- Los datos semilla son ficticios y saneados.
- Producción exige configuración explícita de base, CORS y contraseña admin no demo de al menos 12 caracteres.
- El proyecto sigue siendo una demostración: no cuenta con cookies seguras, recuperación de contraseña, MFA, rate limiting ni pasarela de pago.
