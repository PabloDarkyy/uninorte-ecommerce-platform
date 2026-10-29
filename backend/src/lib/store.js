import { readFile } from 'node:fs/promises';
import { openDatabase, closeDatabase } from '../db/database.js';
import { randomId } from './crypto.js';

const bool = value => Boolean(value);
const intBool = value => Boolean(value);
const now = () => new Date().toISOString();

function putLocalized(object, locale, fields) {
  if (!object || typeof object !== 'object') return null;
  const row = { locale };
  for (const field of fields) row[field] = String(object[field] ?? '');
  return row;
}

function getLocalized(rows, fields) {
  const result = {};
  for (const row of rows) {
    const value = {};
    for (const field of fields) value[field] = row[field] ?? '';
    result[row.locale] = value;
  }
  return result;
}

function localizeField(rows, key, field) {
  const result = {};
  for (const row of rows) result[row.locale] = row[field] ?? '';
  return result;
}

async function upsertProductTranslations(db, productId, p) {
  const values = new Set();
  const fields = ['name', 'category', 'shortDescription', 'description', 'brand', 'nutrition', 'ingredients', 'benefits', 'origin'];
  for (const locale of ['es', 'en']) {
    const hasAny = fields.some(field => p[field] && typeof p[field] === 'object' && p[field][locale] != null);
    if (!hasAny) continue;
    values.add(locale);
    await db.prepare(`INSERT INTO product_translations
      (product_id, locale, name, category, short_description, description, brand, nutrition, ingredients, benefits, origin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        productId,
        locale,
        String(p.name?.[locale] ?? ''),
        String(p.category?.[locale] ?? ''),
        String(p.shortDescription?.[locale] ?? ''),
        String(p.description?.[locale] ?? ''),
        String(p.brand?.[locale] ?? ''),
        String(p.nutrition?.[locale] ?? ''),
        String(p.ingredients?.[locale] ?? ''),
        String(p.benefits?.[locale] ?? ''),
        String(p.origin?.[locale] ?? ''),
      );
  }
  if (!values.size) {
    await db.prepare(`INSERT INTO product_translations
      (product_id, locale, name, category, short_description, description, brand, nutrition, ingredients, benefits, origin)
      VALUES (?, 'es', '', '', '', '', '', '', '', '', '')`).run(productId);
  }
}

async function upsertVariantTranslations(db, productId, variant) {
  const locales = new Set();
  for (const locale of ['es', 'en']) {
    const hasName = variant.name && typeof variant.name === 'object' && variant.name[locale] != null;
    const hasDescription = variant.description && typeof variant.description === 'object' && variant.description[locale] != null;
    if (!hasName && !hasDescription) continue;
    locales.add(locale);
    await db.prepare(`INSERT INTO product_variant_translations
      (product_id, variant_id, locale, name, description)
      VALUES (?, ?, ?, ?, ?)`)
      .run(productId, variant.id, locale, String(variant.name?.[locale] ?? ''), String(variant.description?.[locale] ?? ''));
  }
  if (!locales.size) {
    await db.prepare(`INSERT INTO product_variant_translations
      (product_id, variant_id, locale, name, description)
      VALUES (?, ?, 'es', '', '')`).run(productId, variant.id);
  }
}

async function writeState(db, state) {
  return db.transaction(async tx => {
    await tx.exec(`
      DELETE FROM tracking_events;
      DELETE FROM order_items;
      DELETE FROM order_shipping_addresses;
      DELETE FROM orders;
      DELETE FROM product_variant_translations;
      DELETE FROM product_variants;
      DELETE FROM product_images;
      DELETE FROM product_translations;
      DELETE FROM products;
      DELETE FROM addresses;
      DELETE FROM account_preferences;
      DELETE FROM user_profiles;
      DELETE FROM user_credentials;
      DELETE FROM users;
    `);

    const userInsert = tx.prepare(`INSERT INTO users(id, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`);
    const credentialInsert = tx.prepare(`INSERT INTO user_credentials(user_id, salt, password_digest) VALUES (?, ?, ?)`);
    const profileInsert = tx.prepare(`INSERT INTO user_profiles(user_id, first_name, last_name, email, phone, birth_date, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const prefInsert = tx.prepare(`INSERT INTO account_preferences(user_id, language, currency, remember_currency, show_featured, receive_news) VALUES (?, ?, ?, ?, ?, ?)`);
    const addressInsert = tx.prepare(`INSERT INTO addresses(id, user_id, recipient_name, phone, address_line, city, country, postal_code, is_primary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const productInsert = tx.prepare(`INSERT INTO products(id, slug, base_price, base_currency, stock, image_url, model_url, model_name, accent_color, hero_featured, featured, active, availability, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const imageInsert = tx.prepare(`INSERT INTO product_images(id, product_id, url, original_name, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
    const variantInsert = tx.prepare(`INSERT INTO product_variants(product_id, id, price, stock, image_url, model_url, model_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const orderInsert = tx.prepare(`INSERT INTO orders(id, user_id, request_id, status, currency, total, created_at, estimated_delivery, tracking_step, tracking_cycle_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const orderItemInsert = tx.prepare(`INSERT INTO order_items(order_id, line_number, product_id, variant_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)`);
    const shipInsert = tx.prepare(`INSERT INTO order_shipping_addresses(order_id, recipient_name, phone, address_line, city, country, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?)`);

    for (const user of state.users || []) {
      const updatedAt = user.updatedAt || user.createdAt || now();
      await userInsert.run(user.id, user.email, user.role || 'customer', user.createdAt || updatedAt, updatedAt);
      await credentialInsert.run(user.id, user.salt || '', user.digest || '');
      const account = state.accounts?.[user.id] || {};
      const profile = account.profile || {};
      await profileInsert.run(
        user.id,
        String(profile.firstName ?? user.firstName ?? ''),
        String(profile.lastName ?? user.lastName ?? ''),
        String(profile.email ?? user.email ?? ''),
        String(profile.phone ?? ''),
        profile.birthDate ? String(profile.birthDate) : null,
        profile.avatar ?? null,
      );
      const preferences = account.preferences || {};
      await prefInsert.run(
        user.id,
        preferences.language || 'es',
        preferences.currency || 'PYG',
        intBool(preferences.rememberCurrency ?? true),
        intBool(preferences.showFeatured ?? true),
        intBool(preferences.receiveNews ?? false),
      );
      for (const address of account.addresses || []) {
        await addressInsert.run(
          address.id,
          user.id,
          String(address.recipientName ?? ''),
          String(address.phone ?? ''),
          String(address.addressLine ?? ''),
          String(address.city ?? ''),
          String(address.country ?? ''),
          address.postalCode ? String(address.postalCode) : null,
          intBool(address.isPrimary),
          address.createdAt || updatedAt,
          address.updatedAt || updatedAt,
        );
      }
      if (profile.avatar) {
        await tx.prepare(`UPDATE media_files SET owner_type='account', owner_id=?, status='active', released_at=NULL WHERE url=?`).run(user.id, profile.avatar);
      }
    }

    for (const p of state.products || []) {
      const stamp = p.updatedAt || p.createdAt || now();
      await productInsert.run(
        p.id,
        p.slug || p.id,
        Number(p.basePrice ?? 0),
        p.baseCurrency || 'PYG',
        Number(p.stock ?? 0),
        p.image ?? null,
        p.model ?? p.model3dUrl ?? null,
        p.modelName ?? null,
        p.accentColor ?? null,
        intBool(p.heroFeatured),
        intBool(p.featured),
        intBool(p.active !== false),
        p.availability || 'available',
        p.createdAt || stamp,
        stamp,
      );
      await upsertProductTranslations(tx, p.id, p);
      const productUrls = [p.image, ...(p.images || []), p.model, p.model3dUrl, ...(p.variants || []).flatMap(v => [v.image, v.model3dUrl, v.model])].filter(Boolean);
      for (const url of productUrls) {
        await tx.prepare(`UPDATE media_files SET owner_type='product', owner_id=?, status='active', released_at=NULL WHERE url=?`).run(p.id, String(url));
      }
      for (const [index, url] of (p.images || []).entries()) {
        if (!url) continue;
        await imageInsert.run(randomId('asset'), p.id, String(url), null, index, stamp);
      }
      for (const variant of p.variants || []) {
        const variantStamp = variant.updatedAt || variant.createdAt || stamp;
        await variantInsert.run(
          p.id,
          String(variant.id),
          variant.price == null || variant.price === '' ? null : Number(variant.price),
          Number(variant.stock ?? 0),
          variant.image ?? null,
          variant.model3dUrl ?? variant.model ?? null,
          variant.modelName ?? null,
          variant.createdAt || variantStamp,
          variantStamp,
        );
        await upsertVariantTranslations(tx, p.id, variant);
      }
    }

    for (const order of state.orders || []) {
      await orderInsert.run(
        order.id,
        order.userId,
        order.requestId || null,
        order.status || 'preparing',
        order.currency || 'PYG',
        Number(order.total ?? 0),
        order.createdAt || now(),
        order.estimatedDelivery || '',
        Number(order.trackingStep ?? 0),
        Number(order.trackingCycleIndex ?? -1),
      );
      const shipping = order.shippingAddress || {};
      await shipInsert.run(
        order.id,
        String(shipping.recipientName ?? ''),
        String(shipping.phone ?? ''),
        String(shipping.addressLine ?? ''),
        String(shipping.city ?? ''),
        String(shipping.country ?? ''),
        shipping.postalCode ? String(shipping.postalCode) : null,
      );
      for (const [index, item] of (order.items || []).entries()) {
        await orderItemInsert.run(order.id, index + 1, item.productId, item.variantId || null, Number(item.quantity), Number(item.unitPrice));
      }
    }

  });
}

async function readState(db) {
  const profiles = await db.prepare(`SELECT * FROM user_profiles`).all();
  const users = (await db.prepare(`SELECT u.*, c.salt, c.password_digest AS digest FROM users u JOIN user_credentials c ON c.user_id = u.id ORDER BY u.created_at`).all()).map(r => {
    const profile = profiles.find(p => p.user_id === r.id);
    return {
      id: r.id,
      firstName: profile?.first_name ?? '',
      lastName: profile?.last_name ?? '',
      email: r.email,
      role: r.role,
      salt: r.salt,
      digest: r.digest,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
  const addresses = await db.prepare(`SELECT * FROM addresses ORDER BY created_at, id`).all();
  const preferences = await db.prepare(`SELECT * FROM account_preferences`).all();
  const accounts = {};
  for (const user of users) {
    const p = profiles.find(row => row.user_id === user.id);
    const pref = preferences.find(row => row.user_id === user.id);
    accounts[user.id] = {
      profile: {
        id: user.id,
        firstName: p?.first_name ?? user.firstName,
        lastName: p?.last_name ?? user.lastName,
        email: p?.email ?? user.email,
        phone: p?.phone ?? '',
        birthDate: p?.birth_date ?? '',
        avatar: p?.avatar_url ?? null,
      },
      addresses: addresses.filter(row => row.user_id === user.id).map(row => ({
        id: row.id, userId: row.user_id, recipientName: row.recipient_name, phone: row.phone,
        addressLine: row.address_line, city: row.city, country: row.country, postalCode: row.postal_code ?? '', isPrimary: bool(row.is_primary),
      })),
      preferences: {
        language: pref?.language ?? 'es', currency: pref?.currency ?? 'PYG',
        rememberCurrency: bool(pref?.remember_currency ?? 1), showFeatured: bool(pref?.show_featured ?? 1), receiveNews: bool(pref?.receive_news ?? 0),
      },
    };
  }

  const productRows = await db.prepare(`SELECT * FROM products ORDER BY created_at, id`).all();
  const translations = await db.prepare(`SELECT * FROM product_translations ORDER BY product_id, locale`).all();
  const images = await db.prepare(`SELECT * FROM product_images ORDER BY product_id, sort_order, id`).all();
  const variantRows = await db.prepare(`SELECT * FROM product_variants ORDER BY product_id, created_at, id`).all();
  const variantTranslations = await db.prepare(`SELECT * FROM product_variant_translations ORDER BY product_id, variant_id, locale`).all();

  const products = productRows.map(row => {
    const trs = translations.filter(t => t.product_id === row.id);
    const vRows = variantRows.filter(v => v.product_id === row.id);
    return {
      id: row.id,
      slug: row.slug,
      name: localizeField(trs, 'name', 'name'),
      category: localizeField(trs, 'category', 'category'),
      shortDescription: localizeField(trs, 'shortDescription', 'short_description'),
      description: localizeField(trs, 'description', 'description'),
      brand: localizeField(trs, 'brand', 'brand'),
      nutrition: localizeField(trs, 'nutrition', 'nutrition'),
      ingredients: localizeField(trs, 'ingredients', 'ingredients'),
      benefits: localizeField(trs, 'benefits', 'benefits'),
      origin: localizeField(trs, 'origin', 'origin'),
      basePrice: Number(row.base_price),
      baseCurrency: row.base_currency,
      stock: Number(row.stock),
      image: row.image_url,
      images: images.filter(i => i.product_id === row.id).map(i => i.url),
      model: row.model_url,
      modelName: row.model_name,
      accentColor: row.accent_color,
      heroFeatured: bool(row.hero_featured),
      featured: bool(row.featured),
      active: bool(row.active),
      availability: row.availability,
      variants: vRows.map(v => {
        const vtr = variantTranslations.filter(t => t.product_id === v.product_id && t.variant_id === v.id);
        return {
          id: v.id,
          name: localizeField(vtr, 'name', 'name'),
          description: localizeField(vtr, 'description', 'description'),
          price: v.price == null ? null : Number(v.price),
          stock: Number(v.stock),
          image: v.image_url,
          model3dUrl: v.model_url,
          modelName: v.model_name,
        };
      }),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  const orders = await db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`).all();
  const orderItems = await db.prepare(`SELECT * FROM order_items ORDER BY order_id, line_number`).all();
  const shipping = await db.prepare(`SELECT * FROM order_shipping_addresses`).all();
  return {
    version: 2,
    users,
    accounts,
    products,
    orders: orders.map(row => ({
      id: row.id, userId: row.user_id, createdAt: row.created_at, status: row.status,
      currency: row.currency, total: Number(row.total), requestId: row.request_id,
      estimatedDelivery: row.estimated_delivery, trackingStep: row.tracking_step, trackingCycleIndex: row.tracking_cycle_index,
      items: orderItems.filter(item => item.order_id === row.id).map(item => ({
        productId: item.product_id, variantId: item.variant_id, quantity: Number(item.quantity), unitPrice: Number(item.unit_price),
      })),
      shippingAddress: (() => {
        const s = shipping.find(address => address.order_id === row.id);
        return s ? {
          recipientName: s.recipient_name, phone: s.phone, addressLine: s.address_line,
          city: s.city, country: s.country, postalCode: s.postal_code ?? '',
        } : null;
      })(),
    })),
  };
}

async function loadJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

export async function createStore(databaseConnection, seedFactory, legacyFile = null) {
  const db = await openDatabase(databaseConnection);
  const countRow = await db.prepare('SELECT COUNT(*) AS count FROM users').get();
  let currentState = await readState(db);
  if (Number(countRow?.count || 0) === 0) {
    const legacy = legacyFile ? await loadJson(legacyFile) : null;
    const seed = legacy?.users && legacy?.accounts && legacy?.products && legacy?.orders ? legacy : await seedFactory();
    await writeState(db, seed);
    currentState = await readState(db);
  }
  let queue = Promise.resolve();
  return {
    read() { return structuredClone(currentState); },
    commit(update) {
      const task = queue.then(async () => {
        const next = structuredClone(currentState);
        const result = await update(next);
        await writeState(db, next);
        currentState = next;
        return result !== undefined ? structuredClone(result) : structuredClone(next);
      });
      queue = task.catch(() => {});
      return task;
    },
    async registerMedia(data) {
      await db.prepare(`INSERT INTO media_files(id, owner_type, owner_id, asset_type, url, original_name, mime_type, size_bytes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`).run(randomId('media'), data.ownerType, data.ownerId ?? null, data.assetType, data.url, data.originalName ?? null, data.mimeType ?? null, data.sizeBytes ?? null, now());
    },
    async releaseMedia(url) {
      await db.prepare(`UPDATE media_files SET status='released', released_at=? WHERE url=?`).run(now(), url);
    },
    async close() { await closeDatabase(db); },
    database: db,
  };
}
