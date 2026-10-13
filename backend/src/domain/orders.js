export function hydrateOrder(order, products) {
  const items = order.items.map(item => {
    const product = products.find(p => p.id === item.productId) ?? null;
    const variant = product?.variants.find(v => v.id === item.variantId) ?? null;
    return { ...item, product, variant, subtotal: Math.round(item.quantity * item.unitPrice * 100) / 100 };
  });
  const total = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const { trackingStep, requestId, ...rest } = order;
  return { ...rest, items, total, quantity };
}
