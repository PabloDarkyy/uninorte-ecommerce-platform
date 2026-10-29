# Brief de GlobalizaT para asistentes de IA

Este documento permite pedir ayuda sobre GlobalizaT sin adjuntar el repositorio entero. Contiene contexto técnico resumido, límites conocidos y una instrucción reutilizable. Está escrito para compartirse como contexto; no incluye secretos ni credenciales.

## Proyecto

**GlobalizaT** es un prototipo académico de e-commerce para exhibir productos paraguayos y demostrar una compra simulada con proyección internacional. Se prepara para una presentación individual de Expo Informática. El objetivo es mostrar una plataforma navegable y funcional, no afirmar que ya opera como una tienda comercial real.

## Stack y estructura

- Frontend: HTML, CSS y JavaScript con ES Modules, sin framework de interfaz.
- Modelos 3D: Three.js r180 y archivos GLB incluidos localmente.
- Backend: Node.js, `node:http`, API REST propia y PostgreSQL mediante `pg`.
- Node.js requerido: 22.5 o posterior.
- Pruebas: `node:test`; hay tests unitarios/contrato y scripts opcionales de navegador con Playwright.
- `src/`: app, páginas, componentes, funcionalidades y servicios frontend.
- `backend/src/routes/`: endpoints; `backend/src/lib/`: servidor, router, HTTP y persistencia; `backend/src/db/schema.sql`: esquema PostgreSQL.
- `database/schema.sql`: copia del esquema PostgreSQL. En la revisión anterior ambos esquemas eran idénticos.
- `docs/`: contratos y antecedentes de las funcionalidades.

## Funcionalidad actual: distinguir hechos de simulaciones

### Implementado en el prototipo

- Catálogo con variantes, búsqueda/filtros, vistas de producto y visualización 3D para productos con modelo.
- Carrito con cantidades, stock y resumen.
- Registro/login, perfil, direcciones y preferencias.
- API conectada a PostgreSQL para catálogo, cuentas, inventario y pedidos.
- Checkout que registra pedidos, revalida precio/stock en el backend y conserva precio y dirección históricos.
- Panel de administración, carga de imágenes/modelos, analytics y tracking.
- Interfaz en español/inglés y precios mostrados en PYG/USD/EUR.

### Simulado o pendiente

- Pago: demostración ficticia; no hay proveedor de pagos ni se debe procesar dinero real.
- Conversión de moneda: tasas fijas de demostración, no cotizaciones actuales.
- Tracking: recorrido simulado, no conectado a una empresa de logística.
- Envíos internacionales: el checkout permite escribir un país, pero no tiene cobertura por país, cotización logística, impuestos ni plazos calculados a partir del destino.
- Parte de las imágenes, descripciones y datos de productos puede ser provisional; validar el catálogo antes de presentarlo como información comercial definitiva.
- GitHub Pages sirve solo archivos estáticos; no ejecuta el backend ni PostgreSQL.

## Arquitectura y limitaciones conocidas

- `backend/src/lib/store.js` carga una proyección de datos en memoria y reescribe las tablas de aplicación en transacciones al hacer cambios. Es una implementación simple para la demo local y un solo proceso, no una estrategia preparada para varias instancias o tráfico elevado.
- `backend/src/config.js` tiene valores de desarrollo por defecto, incluyendo credenciales demo y CORS abierto si falta configuración. No desplegar así en producción.
- `backend/tests/contracts.test.js` selecciona `TEST_DATABASE_URL || DATABASE_URL` y trunca tablas al preparar los tests. **Ejecutar solo contra una base descartable de pruebas**; no apuntar a una base importante o compartida.
- `src/services/auth.service.js`: ante un error al consultar la sesión, la implementación actual puede borrar el token incluso si el fallo es una interrupción de red, no un `401`.
- `backend/src/lib/store.js`: el lector de la migración JSON trata distintos errores de lectura/parseo como si no hubiera datos para migrar.
- Las cargas de archivos validan principalmente el MIME declarado o la extensión; no equivale a verificar el contenido real del archivo.

## Verificación conocida (repetir antes de basarse en ella)

- `npm test` en la raíz: 22 tests aprobados en la revisión previa.
- `npm test` en `backend/`: requiere `TEST_DATABASE_URL` y PostgreSQL; sin esa configuración, los tests fallan antes de probar la API.
- `node --test tests/*.cjs`: requiere Playwright y un navegador configurado; no estaba instalado en el entorno de revisión.
- La suite de frontend no demuestra por sí sola el funcionamiento de PostgreSQL ni del backend real.

Comandos habituales:

```sh
npm run start:all
npm test
cd backend
npm test
npm run db:check
```

El arranque completo necesita PostgreSQL activo, una base configurada en `backend/.env` y dependencias instaladas. No compartir `.env`, contraseñas, tokens ni URLs de conexión con secretos.

## Esquema de datos resumido

El esquema canónico vive en `database/schema.sql` y contiene, entre otras, estas entidades:

- Identidad y cuenta: `users`, `user_credentials`, `user_profiles`, `account_preferences`, `addresses`.
- Catálogo: `products`, `product_translations`, `product_images`, `product_variants`, `product_variant_translations`.
- Comercio: `orders`, `order_items`, `order_shipping_addresses`.
- Seguimiento y medios: `tracking_stages`, `tracking_events`, `media_files`.

Hay claves foráneas, restricciones de moneda/estado/stock, una dirección principal por usuario e índice único parcial para la idempotencia de pedidos.

### Precaución sobre `ServerEcommerce.sql`

El archivo `ServerEcommerce.sql` compartido es un **dump completo de PostgreSQL**, no solo el esquema de la aplicación. Incluye una definición del rol `postgres` con un hash SCRAM de contraseña y datos de cuentas de demostración. No adjuntarlo sin sanitizar a un asistente externo ni publicarlo. Para analizar o modificar la estructura de la aplicación, usar `database/schema.sql`; si el dump se compartió o almacenó fuera de un entorno privado, revisar y rotar la credencial PostgreSQL expuesta.

## Prioridades recomendadas para pulir el código

1. Evitar que los tests puedan truncar una base no destinada a pruebas: exigir `TEST_DATABASE_URL` y validar el entorno de test.
2. Validar configuración al arrancar y no permitir credenciales/CORS de desarrollo en producción.
3. Separar errores de red de `401` al recuperar sesión; no cerrar sesión ante una caída temporal.
4. Reportar claramente errores al importar datos JSON legados.
5. Documentar y, cuando el alcance lo permita, reemplazar la reescritura completa de tablas por escrituras incrementales.
6. Añadir CI con PostgreSQL desechable para los tests de backend.

Evitar una reescritura grande antes de la exposición. Priorizar arreglos pequeños, demostrables y con pruebas.

## Prompt para iniciar trabajo con otra IA

```text
Ayúdame con el proyecto GlobalizaT descrito en el brief que adjunto. Es un prototipo académico de e-commerce para Expo Informática: necesito que distingas claramente lo implementado de lo simulado o pendiente. No lo trates como una tienda comercial lista para producción.

Antes de proponer o editar código, inspecciona los archivos relevantes y sigue las convenciones existentes. Haz cambios pequeños, completos y enfocados; no reescribas la arquitectura ni agregues dependencias sin justificarlo. No muestres ni copies secretos. Nunca ejecutes pruebas de backend contra una base real o compartida: requieren una base PostgreSQL descartable y aislada.

Para esta tarea concreta quiero: [DESCRIBIR AQUÍ UNA SOLA TAREA].

Al terminar, resume archivos cambiados, explica el comportamiento, indica límites/supuestos y ejecuta las pruebas seguras pertinentes. No afirmes que algo funciona si no lo verificaste. Si falta información crítica, pregúntame antes de hacer cambios destructivos o de gran alcance.
```
