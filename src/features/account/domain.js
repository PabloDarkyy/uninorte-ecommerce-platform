export const isActiveOrder = order => ['preparing', 'in_transit'].includes(order.status);
