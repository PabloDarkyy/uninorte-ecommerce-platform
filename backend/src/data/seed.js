import { hashPassword } from '../lib/crypto.js';
import { config } from '../config.js';

// Mismo catalogo semilla que src/data/products.js en el frontend (misma
// forma de Product), para que la migracion de mock a backend real no cambie
// lo que ve la demo el primer dia.
const entries = [
  ['mani', 'Maní', 'Peanuts', 'Alimentos', 'Food', '#A36B43', './src/assets/models/mani.glb'],
  ['miel', 'Miel de abeja', 'Bee honey', 'Alimentos', 'Food', '#C89535', './src/assets/models/miel.glb'],
  ['harina', 'Harina de trigo', 'Wheat flour', 'Alimentos', 'Food', '#C0A77A'],
  ['petitgrain', 'Esencia de petitgrain', 'Petitgrain essence', 'Esencias', 'Essences', '#719B65', './src/assets/models/petitgrain.glb', true],
  ['licor', 'Licor de mandioca', 'Cassava liqueur', 'Bebidas', 'Drinks', '#AF7545', './src/assets/models/licor-mandioca.glb', true],
  ['yuyo', 'Mix de yuyo', 'Herbal mix', 'Hierbas', 'Herbs', '#70864B', './src/assets/models/burrito.glb', true],
];

function buildProducts() {
  const products = entries.map(([id, es, en, categoryEs, categoryEn, accentColor, model = null, heroFeatured = false], index) => ({
    id, slug: id, name: { es, en }, category: { es: categoryEs, en: categoryEn },
    shortDescription: { es: 'Una propuesta de los grupos de UniNorte. La descripción y presentación final serán proporcionadas por el equipo responsable.', en: 'A proposal from the UniNorte student groups. Final details will be provided by the responsible team.' },
    description: { es: 'Descripción pendiente del grupo responsable.', en: 'Description pending from the responsible group.' },
    basePrice: 10000, baseCurrency: 'PYG', stock: 10,
    image: null, images: [], model, modelName: null, accentColor, heroFeatured, active: true, availability: 'available',
    nutrition: { es: '', en: '' }, ingredients: { es: '', en: '' }, benefits: { es: '', en: '' }, origin: { es: '', en: '' },
    variants: [{ id: 'demo', name: { es: 'Presentación de ejemplo', en: 'Sample option' }, stock: 10, price: null }],
    brand: { es: 'Empresa por confirmar', en: 'Company to be confirmed' }, featured: index < 3,
  }));
  const variantModels = {
    harina: [['demo', 'Tipo 000', 'Type 000', 'harinaazul_tipo000.glb'], ['tipo-0000', 'Tipo 0000', 'Type 0000', 'harinaroja_tipo0000.glb'], ['integral', 'Integral', 'Whole wheat', 'harinamarron_tipointegral.glb']],
    yuyo: [['demo', 'Burrito', 'Burrito', 'burrito.glb'], ['cedron', 'Cedrón', 'Lemon verbena', 'cedron.glb'], ['menta', 'Menta', 'Mint', 'menta.glb']],
  };
  for (const [id, variants] of Object.entries(variantModels)) {
    const product = products.find(p => p.id === id);
    product.variants = variants.map(([vid, es, en, file]) => ({ id: vid, name: { es, en }, stock: 10, price: null, model3dUrl: `./src/assets/models/${file}` }));
    product.model ||= product.variants[0].model3dUrl;
  }
  return products;
}

function demoAccountSeed() {
  const userId = 'customer-demo';
  const home = { id: 'address-home', userId, recipientName: 'Lucía Benítez', phone: '+595 981 555 012', addressLine: 'Av. Mariscal López 1450, departamento 3', city: 'Asunción', country: 'Paraguay', isPrimary: true };
  const work = { id: 'address-work', userId, recipientName: 'Lucía Benítez', phone: '+595 981 555 012', addressLine: 'Av. España 820, oficina 2', city: 'Asunción', country: 'Paraguay', isPrimary: false };
  const stepFor = status => ({ preparing: 1, in_transit: 6, delivered: 14, cancelled: 14, refunded: 14 })[status] ?? 0;
  const order = (id, createdAt, status, items) => ({
    id, userId, createdAt, status, currency: 'PYG', requestId: `seed-${id}`,
    items: items.map(([productId, qty]) => ({ productId, variantId: 'demo', quantity: qty, unitPrice: 10000 })),
    shippingAddress: { ...home }, estimatedDelivery: '2026-10-18 / 2026-10-22', trackingStep: stepFor(status),
  });
  return {
    profile: { id: userId, firstName: 'Lucía', lastName: 'Benítez', email: 'lucia.benitez@example.com', phone: home.phone, birthDate: '1997-04-16', avatar: null },
    addresses: [home, work],
    preferences: { language: 'es', currency: 'PYG', rememberCurrency: true, showFeatured: true, receiveNews: false },
    orders: [
      order('ORD-0006', '2026-09-10T15:30:00-03:00', 'in_transit', [['licor', 2], ['miel', 1]]),
      order('ORD-0005', '2026-09-08T09:15:00-03:00', 'preparing', [['mani', 3], ['yuyo', 1]]),
      order('ORD-0004', '2026-08-26T11:20:00-03:00', 'delivered', [['miel', 2], ['harina', 1]]),
      order('ORD-0003', '2026-08-03T14:10:00-03:00', 'delivered', [['petitgrain', 1], ['yuyo', 2]]),
      order('ORD-0002', '2026-07-15T10:45:00-03:00', 'refunded', [['licor', 1]]),
      order('ORD-0001', '2026-06-21T16:00:00-03:00', 'cancelled', [['mani', 2], ['harina', 1]]),
    ],
  };
}

export async function createSeedState() {
  const demoPassword = await hashPassword('Demo12345!');
  const adminPassword = await hashPassword(config.seedAdminPassword);
  const demo = demoAccountSeed();
  return {
    version: 1,
    users: [
      { id: 'customer-demo', firstName: 'Lucía', lastName: 'Benítez', email: 'lucia.benitez@example.com', role: 'customer', salt: demoPassword.salt, digest: demoPassword.digest, createdAt: new Date().toISOString() },
      { id: 'admin-demo', firstName: 'Equipo', lastName: 'GlobalizaT', email: config.seedAdminEmail, role: 'admin', salt: adminPassword.salt, digest: adminPassword.digest, createdAt: new Date().toISOString() },
    ],
    accounts: {
      'customer-demo': { profile: demo.profile, addresses: demo.addresses, preferences: demo.preferences },
      'admin-demo': { profile: { id: 'admin-demo', firstName: 'Equipo', lastName: 'GlobalizaT', email: config.seedAdminEmail, phone: '', birthDate: '', avatar: null }, addresses: [], preferences: { language: 'es', currency: 'PYG', rememberCurrency: true, showFeatured: true, receiveNews: false } },
    },
    products: buildProducts(),
    orders: demo.orders,
  };
}
