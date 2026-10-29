-- ============================================================
-- SEED DE DESARROLLO · GlobalizaT / UniNorte · PostgreSQL
-- Ejecutar después de schema.sql, conectado a la BD globalizat.
-- Demo customer: lucia.benitez@example.com / Demo12345!
-- Demo admin:    admin@globalizat.demo / Admin12345!
-- Las credenciales están almacenadas como PBKDF2 + SHA-256 + salt.
-- ============================================================

BEGIN;

INSERT INTO users (id, email, role, created_at, updated_at) VALUES
  ('customer-demo', 'lucia.benitez@example.com', 'customer', '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('admin-demo', 'admin@globalizat.demo', 'admin', '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_credentials (user_id, salt, password_digest) VALUES
  ('customer-demo', '00112233445566778899aabbccddeeff', '4d8cedf5cffee8898179adb7c4d003d43d2a6b1f0b1bef58a11646188f7d2d6b'),
  ('admin-demo', 'ffeeddccbbaa99887766554433221100', '84b87824f38e8baf877e7cc4f4154873a796c9910be2230f748bd45900e5b034')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_profiles (user_id, first_name, last_name, email, phone, birth_date, avatar_url) VALUES
  ('customer-demo', 'Lucía', 'Benítez', 'lucia.benitez@example.com', '+595 981 555 012', '1997-04-16', NULL),
  ('admin-demo', 'Equipo', 'GlobalizaT', 'admin@globalizat.demo', '', NULL, NULL)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO account_preferences (user_id, language, currency, remember_currency, show_featured, receive_news) VALUES
  ('customer-demo', 'es', 'PYG', TRUE, TRUE, FALSE),
  ('admin-demo', 'es', 'PYG', TRUE, TRUE, FALSE)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO addresses (id, user_id, recipient_name, phone, address_line, city, country, postal_code, is_primary, created_at, updated_at) VALUES
  ('address-home', 'customer-demo', 'Lucía Benítez', '+595 981 555 012', 'Av. Mariscal López 1450, departamento 3', 'Asunción', 'Paraguay', NULL, TRUE, '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('address-work', 'customer-demo', 'Lucía Benítez', '+595 981 555 012', 'Av. España 820, oficina 2', 'Asunción', 'Paraguay', NULL, FALSE, '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, slug, base_price, base_currency, stock, image_url, model_url, model_name, accent_color, hero_featured, featured, active, availability, created_at, updated_at) VALUES
  ('mani', 'mani', 10000, 'PYG', 10, NULL, './src/assets/models/mani.glb', NULL, '#A36B43', FALSE, TRUE, TRUE, 'available', '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('miel', 'miel', 10000, 'PYG', 10, NULL, './src/assets/models/miel.glb', NULL, '#C89535', FALSE, TRUE, TRUE, 'available', '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('harina', 'harina', 10000, 'PYG', 10, NULL, NULL, NULL, '#C0A77A', FALSE, TRUE, TRUE, 'available', '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('petitgrain', 'petitgrain', 10000, 'PYG', 10, NULL, './src/assets/models/petitgrain.glb', NULL, '#719B65', TRUE, FALSE, TRUE, 'available', '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('licor', 'licor', 10000, 'PYG', 10, NULL, './src/assets/models/licor-mandioca.glb', NULL, '#AF7545', TRUE, FALSE, TRUE, 'available', '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('yuyo', 'yuyo', 10000, 'PYG', 10, NULL, './src/assets/models/burrito.glb', NULL, '#70864B', TRUE, FALSE, TRUE, 'available', '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_translations (product_id, locale, name, category, short_description, description, brand, nutrition, ingredients, benefits, origin) VALUES
  ('mani', 'es', 'Maní', 'Alimentos', 'Una propuesta de los grupos de UniNorte. La descripción y presentación final serán proporcionadas por el equipo responsable.', 'Descripción pendiente del grupo responsable.', 'Empresa por confirmar', '', '', '', ''),
  ('mani', 'en', 'Peanuts', 'Food', 'A proposal from the UniNorte student groups. Final details will be provided by the responsible team.', 'Description pending from the responsible group.', 'Company to be confirmed', '', '', '', ''),
  ('miel', 'es', 'Miel de abeja', 'Alimentos', 'Una propuesta de los grupos de UniNorte. La descripción y presentación final serán proporcionadas por el equipo responsable.', 'Descripción pendiente del grupo responsable.', 'Empresa por confirmar', '', '', '', ''),
  ('miel', 'en', 'Bee honey', 'Food', 'A proposal from the UniNorte student groups. Final details will be provided by the responsible team.', 'Description pending from the responsible group.', 'Company to be confirmed', '', '', '', ''),
  ('harina', 'es', 'Harina de trigo', 'Alimentos', 'Una propuesta de los grupos de UniNorte. La descripción y presentación final serán proporcionadas por el equipo responsable.', 'Descripción pendiente del grupo responsable.', 'Empresa por confirmar', '', '', '', ''),
  ('harina', 'en', 'Wheat flour', 'Food', 'A proposal from the UniNorte student groups. Final details will be provided by the responsible team.', 'Description pending from the responsible group.', 'Company to be confirmed', '', '', '', ''),
  ('petitgrain', 'es', 'Esencia de petitgrain', 'Esencias', 'Una propuesta de los grupos de UniNorte. La descripción y presentación final serán proporcionadas por el equipo responsable.', 'Descripción pendiente del grupo responsable.', 'Empresa por confirmar', '', '', '', ''),
  ('petitgrain', 'en', 'Petitgrain essence', 'Essences', 'A proposal from the UniNorte student groups. Final details will be provided by the responsible team.', 'Description pending from the responsible group.', 'Company to be confirmed', '', '', '', ''),
  ('licor', 'es', 'Licor de mandioca', 'Bebidas', 'Una propuesta de los grupos de UniNorte. La descripción y presentación final serán proporcionadas por el equipo responsable.', 'Descripción pendiente del grupo responsable.', 'Empresa por confirmar', '', '', '', ''),
  ('licor', 'en', 'Cassava liqueur', 'Drinks', 'A proposal from the UniNorte student groups. Final details will be provided by the responsible team.', 'Description pending from the responsible group.', 'Company to be confirmed', '', '', '', ''),
  ('yuyo', 'es', 'Mix de yuyo', 'Hierbas', 'Una propuesta de los grupos de UniNorte. La descripción y presentación final serán proporcionadas por el equipo responsable.', 'Descripción pendiente del grupo responsable.', 'Empresa por confirmar', '', '', '', ''),
  ('yuyo', 'en', 'Herbal mix', 'Herbs', 'A proposal from the UniNorte student groups. Final details will be provided by the responsible team.', 'Description pending from the responsible group.', 'Company to be confirmed', '', '', '', '')
ON CONFLICT (product_id, locale) DO NOTHING;

INSERT INTO product_variants (product_id, id, price, stock, image_url, model_url, model_name, created_at, updated_at) VALUES
  ('mani', 'demo', NULL, 10, NULL, NULL, NULL, '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('miel', 'demo', NULL, 10, NULL, NULL, NULL, '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('harina', 'demo', NULL, 10, NULL, './src/assets/models/harinaazul_tipo000.glb', NULL, '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('harina', 'tipo-0000', NULL, 10, NULL, './src/assets/models/harinaroja_tipo0000.glb', NULL, '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('harina', 'integral', NULL, 10, NULL, './src/assets/models/harinamarron_tipointegral.glb', NULL, '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('petitgrain', 'demo', NULL, 10, NULL, NULL, NULL, '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('licor', 'demo', NULL, 10, NULL, NULL, NULL, '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('yuyo', 'demo', NULL, 10, NULL, './src/assets/models/burrito.glb', NULL, '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('yuyo', 'cedron', NULL, 10, NULL, './src/assets/models/cedron.glb', NULL, '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00'),
  ('yuyo', 'menta', NULL, 10, NULL, './src/assets/models/menta.glb', NULL, '2026-09-25T17:00:00-03:00', '2026-09-25T17:00:00-03:00')
ON CONFLICT (product_id, id) DO NOTHING;

INSERT INTO product_variant_translations (product_id, variant_id, locale, name, description) VALUES
  ('mani', 'demo', 'es', 'Presentación de ejemplo', '') , ('mani', 'demo', 'en', 'Sample option', ''),
  ('miel', 'demo', 'es', 'Presentación de ejemplo', ''), ('miel', 'demo', 'en', 'Sample option', ''),
  ('harina', 'demo', 'es', 'Tipo 000', ''), ('harina', 'demo', 'en', 'Type 000', ''),
  ('harina', 'tipo-0000', 'es', 'Tipo 0000', ''), ('harina', 'tipo-0000', 'en', 'Type 0000', ''),
  ('harina', 'integral', 'es', 'Integral', ''), ('harina', 'integral', 'en', 'Whole wheat', ''),
  ('petitgrain', 'demo', 'es', 'Presentación de ejemplo', ''), ('petitgrain', 'demo', 'en', 'Sample option', ''),
  ('licor', 'demo', 'es', 'Presentación de ejemplo', ''), ('licor', 'demo', 'en', 'Sample option', ''),
  ('yuyo', 'demo', 'es', 'Burrito', ''), ('yuyo', 'demo', 'en', 'Burrito', ''),
  ('yuyo', 'cedron', 'es', 'Cedrón', ''), ('yuyo', 'cedron', 'en', 'Lemon verbena', ''),
  ('yuyo', 'menta', 'es', 'Menta', ''), ('yuyo', 'menta', 'en', 'Mint', '')
ON CONFLICT (product_id, variant_id, locale) DO NOTHING;

INSERT INTO orders (id, user_id, request_id, status, currency, total, created_at, estimated_delivery, tracking_step, tracking_cycle_index) VALUES
  ('ORD-0006', 'customer-demo', 'seed-ORD-0006', 'in_transit', 'PYG', 30000, '2026-09-10T15:30:00-03:00', '2026-10-18 / 2026-10-22', 6, -1),
  ('ORD-0005', 'customer-demo', 'seed-ORD-0005', 'preparing', 'PYG', 40000, '2026-09-08T09:15:00-03:00', '2026-10-18 / 2026-10-22', 1, -1),
  ('ORD-0004', 'customer-demo', 'seed-ORD-0004', 'delivered', 'PYG', 30000, '2026-08-26T11:20:00-03:00', '2026-10-18 / 2026-10-22', 14, -1),
  ('ORD-0003', 'customer-demo', 'seed-ORD-0003', 'delivered', 'PYG', 30000, '2026-08-03T14:10:00-03:00', '2026-10-18 / 2026-10-22', 14, -1),
  ('ORD-0002', 'customer-demo', 'seed-ORD-0002', 'refunded', 'PYG', 10000, '2026-07-15T10:45:00-03:00', '2026-10-18 / 2026-10-22', 14, -1),
  ('ORD-0001', 'customer-demo', 'seed-ORD-0001', 'cancelled', 'PYG', 30000, '2026-06-21T16:00:00-03:00', '2026-10-18 / 2026-10-22', 14, -1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (order_id, line_number, product_id, variant_id, quantity, unit_price) VALUES
  ('ORD-0006', 1, 'licor', 'demo', 2, 10000), ('ORD-0006', 2, 'miel', 'demo', 1, 10000),
  ('ORD-0005', 1, 'mani', 'demo', 3, 10000), ('ORD-0005', 2, 'yuyo', 'demo', 1, 10000),
  ('ORD-0004', 1, 'miel', 'demo', 2, 10000), ('ORD-0004', 2, 'harina', 'demo', 1, 10000),
  ('ORD-0003', 1, 'petitgrain', 'demo', 1, 10000), ('ORD-0003', 2, 'yuyo', 'demo', 2, 10000),
  ('ORD-0002', 1, 'licor', 'demo', 1, 10000),
  ('ORD-0001', 1, 'mani', 'demo', 2, 10000), ('ORD-0001', 2, 'harina', 'demo', 1, 10000)
ON CONFLICT (order_id, line_number) DO NOTHING;

INSERT INTO order_shipping_addresses (order_id, recipient_name, phone, address_line, city, country, postal_code) VALUES
  ('ORD-0006', 'Lucía Benítez', '+595 981 555 012', 'Av. Mariscal López 1450, departamento 3', 'Asunción', 'Paraguay', NULL),
  ('ORD-0005', 'Lucía Benítez', '+595 981 555 012', 'Av. Mariscal López 1450, departamento 3', 'Asunción', 'Paraguay', NULL),
  ('ORD-0004', 'Lucía Benítez', '+595 981 555 012', 'Av. Mariscal López 1450, departamento 3', 'Asunción', 'Paraguay', NULL),
  ('ORD-0003', 'Lucía Benítez', '+595 981 555 012', 'Av. Mariscal López 1450, departamento 3', 'Asunción', 'Paraguay', NULL),
  ('ORD-0002', 'Lucía Benítez', '+595 981 555 012', 'Av. Mariscal López 1450, departamento 3', 'Asunción', 'Paraguay', NULL),
  ('ORD-0001', 'Lucía Benítez', '+595 981 555 012', 'Av. Mariscal López 1450, departamento 3', 'Asunción', 'Paraguay', NULL)
ON CONFLICT (order_id) DO NOTHING;

COMMIT;
