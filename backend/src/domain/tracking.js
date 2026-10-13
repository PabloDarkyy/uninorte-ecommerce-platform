export const trackingStages = [
  'Pedido confirmado', 'Tu paquete está siendo preparado', 'Tu paquete está listo para ser despachado',
  'Tu paquete fue recogido para la entrega', 'Tu paquete llegó al centro de distribución',
  'Tu paquete está a la espera de un vuelo', 'Tu paquete está siendo preparado para abordar',
  'Tu paquete está abordando el vuelo', 'Tu paquete se encuentra en tránsito internacional',
  'Tu paquete llegó al país de destino', 'Tu paquete se encuentra en aduanas',
  'Tu paquete fue liberado por aduanas', 'Tu paquete llegó al centro de distribución local',
  'Tu paquete está en camino para la entrega', 'Tu paquete fue entregado',
];

export const isActiveOrder = order => ['preparing', 'in_transit'].includes(order.status);

// El mock del frontend avanza el pedido a traves de escenarios ficticios cada
// vez que se entra a Seguimiento (docs/account-contracts.md). Aqui el avance
// se persiste por pedido (order.trackingStep) para que sobreviva reinicios
// del servidor, tal como pide la nota "en un adaptador real, enter() ...".
export function buildTracking(order) {
  const step = Math.min(trackingStages.length - 1, order.trackingStep ?? 0);
  const start = Date.parse(order.createdAt);
  const events = trackingStages.map((message, i) => ({
    id: `${order.id}-event-${i}`,
    status: i < step ? 'completed' : i === step ? 'current' : 'pending',
    message,
    timestamp: i <= step ? new Date(start + i * 12 * 3600000).toISOString() : null,
    completed: i < step,
  }));
  return {
    orderId: order.id,
    status: trackingStages[step],
    progress: Math.round(((step + 1) / trackingStages.length) * 100),
    estimatedDelivery: order.estimatedDelivery,
    updatedAt: events[step].timestamp,
    events,
  };
}

export function statusForStep(step) {
  return step < 3 ? 'preparing' : 'in_transit';
}

// Mismos cinco escenarios ficticios que el mock del frontend (recogida,
// espera de vuelo, tránsito internacional, aduanas, reparto), pero el ciclo
// avanza por pedido y queda persistido en vez de vivir en un Map de sesión.
const CYCLE = [3, 5, 8, 10, 13];

export function advanceTrackingCycle(order) {
  const index = ((order.trackingCycleIndex ?? -1) + 1) % CYCLE.length;
  order.trackingCycleIndex = index;
  order.trackingStep = CYCLE[index];
  order.status = statusForStep(order.trackingStep);
  return order;
}
