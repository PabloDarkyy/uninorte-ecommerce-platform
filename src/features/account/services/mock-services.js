import { trackingStages } from '../mocks/account-data.js';
import { currencyConfig } from '../../../config/currency.js';
import { languageOptions } from '../../../config/languages.js';
import { isActiveOrder } from '../domain.js';

const required = (value, name, max = 160) => {
  const text = String(value ?? '').trim();
  if (!text || text.length > max) throw new Error(`Revisa el campo ${name}.`);
  return text;
};
function validateAddress(data, userId, id) {
  return { id, userId, recipientName: required(data.recipientName, 'destinatario'), phone: required(data.phone, 'teléfono', 40),
    addressLine: required(data.addressLine, 'dirección', 250), city: required(data.city, 'ciudad'), country: required(data.country, 'país'), isPrimary: Boolean(data.isPrimary) };
}

// Una sola frontera de datos async. Cambiar el proveedor no cambia las vistas.
export function createMockAccountServices(repository, productService) {
  let visit = 0;
  const snapshots = new Map();
  const userService = {
    async getCurrentUser() { const state = repository.read(); return { ...state.user, addresses: state.addresses }; },
    async updateCurrentUser(data) {
      const firstName = required(data.firstName, 'nombre', 80), lastName = required(data.lastName, 'apellido', 80);
      const email = required(data.email, 'correo');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Introduce un correo válido.');
      const phone = required(data.phone, 'teléfono', 40);
      const birthDate = String(data.birthDate || '');
      if (birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !Number.isFinite(Date.parse(birthDate)) || new Date(birthDate).toISOString().slice(0, 10) !== birthDate || birthDate > new Date().toISOString().slice(0, 10))) throw new Error('Revisa la fecha de nacimiento.');
      if (data.avatar != null && !/^data:image\/(png|jpeg|webp);base64,/.test(data.avatar)) throw new Error('La foto no tiene un formato compatible.');
      repository.commit(state => {
        if (data.primaryAddressId && !state.addresses.some(address => address.id === data.primaryAddressId)) throw new Error('La dirección seleccionada ya no existe.');
        Object.assign(state.user, { firstName, lastName, email, phone, birthDate });
        if (data.avatar !== undefined) state.user.avatar = data.avatar;
        if (data.primaryAddressId) state.addresses.forEach(address => { address.isPrimary = address.id === data.primaryAddressId; });
      });
      return userService.getCurrentUser();
    },
    async updateAvatar(file) {
      if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Elige una imagen JPG, PNG o WebP de hasta 2 MB.');
      // Equivalente a preparar un upload: solo updateCurrentUser confirma la URL en el perfil.
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result });
        reader.onerror = () => reject(new Error('No se pudo leer la foto.'));
        reader.readAsDataURL(file);
      });
    },
  };
  const addressService = {
    async list() { return repository.read().addresses; },
    async save(data) {
      const state = repository.read();
      if (data.id && !state.addresses.some(address => address.id === data.id)) throw new Error('La dirección ya no existe.');
      const address = validateAddress(data, state.user.id, data.id || crypto.randomUUID());
      repository.commit(next => {
        const index = next.addresses.findIndex(item => item.id === address.id);
        if (!next.addresses.length || (index >= 0 && next.addresses[index].isPrimary)) address.isPrimary = true;
        if (address.isPrimary) next.addresses.forEach(item => { item.isPrimary = false; });
        if (index >= 0) next.addresses[index] = address; else next.addresses.push(address);
      });
      return addressService.list();
    },
    async remove(id) {
      repository.commit(state => {
        if (!state.addresses.some(address => address.id === id)) throw new Error('La dirección ya no existe.');
        state.addresses = state.addresses.filter(address => address.id !== id);
        if (state.addresses.length && !state.addresses.some(address => address.isPrimary)) state.addresses[0].isPrimary = true;
      });
      return addressService.list();
    },
    async setPrimary(id) {
      repository.commit(state => {
        if (!state.addresses.some(address => address.id === id)) throw new Error('La dirección ya no existe.');
        state.addresses.forEach(address => { address.isPrimary = address.id === id; });
      });
      return addressService.list();
    },
  };
  async function hydrate(order) {
    const items = await Promise.all(order.items.map(async item => {
      const product = await productService.getById(item.productId);
      return { ...item, product, variant: product?.variants.find(variant => variant.id === item.variantId) ?? null, subtotal: item.quantity * item.unitPrice };
    }));
    return { ...order, status: snapshots.has(order.id) ? 'in_transit' : order.status, items, total: items.reduce((sum, item) => sum + item.subtotal, 0), quantity: items.reduce((sum, item) => sum + item.quantity, 0) };
  }
  const orderService = {
    async list() { return Promise.all(repository.read().orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(hydrate)); },
    async getById(id) {
      const order = repository.read().orders.find(order => order.id === id);
      if (!order) throw new Error('No encontramos ese pedido.');
      return hydrate(order);
    },
  };
  function buildTracking(order, index) {
    const step = [3, 5, 8, 10, 13][index % 5];
    const start = Date.parse(order.createdAt);
    const events = trackingStages.map((message, i) => ({ id: `${order.id}-event-${i}`, status: i < step ? 'completed' : i === step ? 'current' : 'pending', message,
      timestamp: i <= step ? new Date(start + i * 12 * 3600000).toISOString() : null, completed: i < step }));
    return { orderId: order.id, status: trackingStages[step], progress: Math.round((step + 1) / trackingStages.length * 100),
      estimatedDelivery: order.estimatedDelivery, updatedAt: events[step].timestamp, events };
  }
  const trackingService = {
    async enter() {
      const active = repository.read().orders.filter(isActiveOrder);
      active.forEach((order, index) => snapshots.set(order.id, buildTracking(order, visit + index)));
      visit++;
      return structuredClone(Object.fromEntries(snapshots));
    },
    async getByOrderId(id) {
      const order = await orderService.getById(id);
      if (!isActiveOrder(order)) throw new Error('Este pedido ya no tiene un seguimiento activo.');
      if (!snapshots.has(id)) snapshots.set(id, buildTracking(order, visit));
      return structuredClone(snapshots.get(id));
    },
  };
  const preferenceService = {
    async get() { return repository.read().preferences; },
    async update(data) {
      if (!languageOptions.some(option => option.value === data.language) || !Object.hasOwn(currencyConfig.rates, data.currency)) throw new Error('Selecciona un idioma y una moneda válidos.');
      const preferences = { language: data.language, currency: data.currency, rememberCurrency: Boolean(data.rememberCurrency), showFeatured: Boolean(data.showFeatured), receiveNews: Boolean(data.receiveNews) };
      repository.commit(state => { state.preferences = preferences; });
      return preferences;
    },
  };
  return { userService, addressService, orderService, trackingService, preferenceService };
}
