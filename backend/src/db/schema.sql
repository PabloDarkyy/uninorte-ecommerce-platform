CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  salt TEXT NOT NULL,
  password_digest TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  birth_date TEXT,
  avatar_url TEXT,
  CHECK (birth_date IS NULL OR birth_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);

CREATE TABLE IF NOT EXISTS account_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  currency TEXT NOT NULL DEFAULT 'PYG' CHECK (currency IN ('PYG', 'USD', 'EUR')),
  remember_currency BOOLEAN NOT NULL DEFAULT TRUE,
  show_featured BOOLEAN NOT NULL DEFAULT TRUE,
  receive_news BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  postal_code TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_addresses_one_primary ON addresses(user_id) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  base_price NUMERIC(18,2) NOT NULL CHECK (base_price >= 0),
  base_currency TEXT NOT NULL CHECK (base_currency IN ('PYG', 'USD', 'EUR')),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  model_url TEXT,
  model_name TEXT,
  accent_color TEXT,
  hero_featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'preorder', 'unavailable')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_active_featured ON products(active, featured);
CREATE INDEX IF NOT EXISTS idx_products_availability ON products(availability);

CREATE TABLE IF NOT EXISTS product_translations (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('es', 'en')),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  nutrition TEXT NOT NULL DEFAULT '',
  ingredients TEXT NOT NULL DEFAULT '',
  benefits TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (product_id, locale)
);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  original_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, sort_order);

CREATE TABLE IF NOT EXISTS product_variants (
  product_id TEXT NOT NULL,
  id TEXT NOT NULL,
  price NUMERIC(18,2),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  model_url TEXT,
  model_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (product_id, id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CHECK (price IS NULL OR price >= 0)
);
CREATE INDEX IF NOT EXISTS idx_variants_product_stock ON product_variants(product_id, stock);

CREATE TABLE IF NOT EXISTS product_variant_translations (
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('es', 'en')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (product_id, variant_id, locale),
  FOREIGN KEY (product_id, variant_id) REFERENCES product_variants(product_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  request_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('preparing', 'in_transit', 'delivered', 'cancelled', 'refunded')),
  currency TEXT NOT NULL CHECK (currency IN ('PYG', 'USD', 'EUR')),
  total NUMERIC(18,2) NOT NULL CHECK (total >= 0),
  created_at TEXT NOT NULL,
  estimated_delivery TEXT NOT NULL,
  tracking_step INTEGER NOT NULL DEFAULT 0 CHECK (tracking_step >= 0 AND tracking_step <= 14),
  tracking_cycle_index INTEGER NOT NULL DEFAULT -1 CHECK (tracking_cycle_index >= -1 AND tracking_cycle_index <= 4)
);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_request_id ON orders(user_id, request_id) WHERE request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  unit_price NUMERIC(18,2) NOT NULL CHECK (unit_price >= 0),
  PRIMARY KEY (order_id, line_number),
  FOREIGN KEY (product_id, variant_id) REFERENCES product_variants(product_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

CREATE TABLE IF NOT EXISTS order_shipping_addresses (
  order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  postal_code TEXT
);

CREATE TABLE IF NOT EXISTS tracking_stages (
  step INTEGER PRIMARY KEY,
  message TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tracking_events (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  step INTEGER NOT NULL REFERENCES tracking_stages(step) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('completed', 'current', 'pending')),
  message TEXT NOT NULL,
  timestamp TEXT,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (order_id, step)
);
CREATE INDEX IF NOT EXISTS idx_tracking_events_order ON tracking_events(order_id, step);

CREATE TABLE IF NOT EXISTS media_files (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('product_image', 'product_model', 'avatar')),
  url TEXT NOT NULL UNIQUE,
  original_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  created_at TEXT NOT NULL,
  released_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_media_owner ON media_files(owner_type, owner_id, status);

INSERT INTO tracking_stages(step, message) VALUES
  (0, 'Pedido confirmado'),
  (1, 'Tu paquete está siendo preparado'),
  (2, 'Tu paquete está listo para ser despachado'),
  (3, 'Tu paquete fue recogido para la entrega'),
  (4, 'Tu paquete llegó al centro de distribución'),
  (5, 'Tu paquete está a la espera de un vuelo'),
  (6, 'Tu paquete está siendo preparado para abordar'),
  (7, 'Tu paquete está abordando el vuelo'),
  (8, 'Tu paquete se encuentra en tránsito internacional'),
  (9, 'Tu paquete llegó al país de destino'),
  (10, 'Tu paquete se encuentra en aduanas'),
  (11, 'Tu paquete fue liberado por aduanas'),
  (12, 'Tu paquete llegó al centro de distribución local'),
  (13, 'Tu paquete está en camino para la entrega'),
  (14, 'Tu paquete fue entregado')
ON CONFLICT (step) DO NOTHING;
