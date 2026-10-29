import { openDatabase, closeDatabase } from '../src/db/database.js';
import { config } from '../src/config.js';

const db = await openDatabase(config.databaseUrl);
try {
  await db.exec(`
    TRUNCATE TABLE
      tracking_events,
      order_items,
      order_shipping_addresses,
      orders,
      product_variant_translations,
      product_variants,
      product_images,
      product_translations,
      products,
      addresses,
      account_preferences,
      user_profiles,
      user_credentials,
      users
    CASCADE;
  `);
  console.log('Datos de aplicación eliminados de PostgreSQL.');
  console.log('tracking_stages se conserva para que el backend siga operativo.');
  console.log('Inicia el Backend nuevamente para cargar la semilla automáticamente.');
} finally {
  await closeDatabase(db);
}
