// Datos exclusivamente de demostración. Los artículos referencian el catálogo existente.
export function createAccountSeed() {
  const userId = 'customer-demo';
  const home = { id: 'address-home', userId, recipientName: 'Lucía Benítez', phone: '+595 981 555 012', addressLine: 'Av. Mariscal López 1450, departamento 3', city: 'Asunción', country: 'Paraguay', isPrimary: true };
  const work = { id: 'address-work', userId, recipientName: 'Lucía Benítez', phone: '+595 981 555 012', addressLine: 'Av. España 820, oficina 2', city: 'Asunción', country: 'Paraguay', isPrimary: false };
  const order = (id, createdAt, status, items) => ({ id, userId, createdAt, status, currency: 'PYG',
    items: items.map(([productId, quantity]) => ({ productId, variantId: 'demo', quantity, unitPrice: 10000 })),
    shippingAddress: { ...home }, estimatedDelivery: '2026-10-18 / 2026-10-22' });
  return {
    version: 1,
    user: { id: userId, firstName: 'Lucía', lastName: 'Benítez', email: 'lucia.benitez@example.com', phone: home.phone, birthDate: '1997-04-16', avatar: null },
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

export const trackingStages = [
  'Pedido confirmado', 'Tu paquete está siendo preparado', 'Tu paquete está listo para ser despachado',
  'Tu paquete fue recogido para la entrega', 'Tu paquete llegó al centro de distribución',
  'Tu paquete está a la espera de un vuelo', 'Tu paquete está siendo preparado para abordar',
  'Tu paquete está abordando el vuelo', 'Tu paquete se encuentra en tránsito internacional',
  'Tu paquete llegó al país de destino', 'Tu paquete se encuentra en aduanas',
  'Tu paquete fue liberado por aduanas', 'Tu paquete llegó al centro de distribución local',
  'Tu paquete está en camino para la entrega', 'Tu paquete fue entregado',
];
