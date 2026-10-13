# Base de datos PostgreSQL · GlobalizaT / UniNorte

La base utiliza PostgreSQL y puede administrarse con pgAdmin 4. El Backend se conecta mediante `DATABASE_URL`.

## Configuración local

1. En pgAdmin, conecta el servidor PostgreSQL y abre Query Tool sobre `postgres`.
2. Ejecuta `database/00_create_database.sql` para crear `globalizat` (omite este paso si ya existe).
3. Abre Query Tool sobre `globalizat` y ejecuta `database/schema.sql`.
4. Para cargar manualmente datos de demostración, ejecuta `database/seed.sql`. El Backend también carga su semilla automáticamente si la base está vacía; no ejecutes ambos métodos sobre una base ya poblada.
5. Copia `backend/.env.example` a `backend/.env` y establece `DATABASE_URL`. No publiques `.env`.

## Verificar conexión

Desde `backend/`:

```sh
npm install
npm run db:check
```

El comando informa la base conectada, versión de PostgreSQL, tablas, cantidades de registros y estado de las claves foráneas.

## Tablas principales

- `users`, `user_credentials`, `user_profiles`, `account_preferences`: cuentas y preferencias.
- `addresses`: direcciones de usuario.
- `products`, `product_translations`, `product_images`, `product_variants`, `product_variant_translations`: catálogo, idiomas y variantes.
- `orders`, `order_items`, `order_shipping_addresses`: pedidos, líneas y snapshot de envío.
- `tracking_stages`, `tracking_events`: etapas y seguimiento.
- `media_files`: registro de archivos cargados.

Para compartir la aplicación por Internet no es necesario instalar PostgreSQL en cada computadora: se usa una base administrada y su URL se guarda como variable secreta del Backend.
