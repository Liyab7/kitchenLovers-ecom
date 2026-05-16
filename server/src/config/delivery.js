// Single source of truth for delivery options. Surface this to the customer at
// checkout and to the admin when reading an order. Currency unit matches the
// product/order currency (GHS by default).

export const DELIVERY_METHODS = [
  {
    id: 'standard',
    label: 'Standard delivery',
    fee: 25,
    etaDays: [3, 5],
    description: 'Delivered to your door in 3–5 business days.',
  },
  {
    id: 'express',
    label: 'Express delivery',
    fee: 50,
    etaDays: [1, 2],
    description: 'Priority shipping, arrives within 1–2 business days.',
  },
  {
    id: 'pickup',
    label: 'Pickup at store',
    fee: 0,
    etaDays: [0, 1],
    description: 'Collect from our Accra location during business hours.',
  },
];

export const DEFAULT_DELIVERY_METHOD = 'standard';

export function getDeliveryMethod(id) {
  return DELIVERY_METHODS.find((m) => m.id === id) || DELIVERY_METHODS.find((m) => m.id === DEFAULT_DELIVERY_METHOD);
}
