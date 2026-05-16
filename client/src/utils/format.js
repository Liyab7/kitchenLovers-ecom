const SYMBOLS = { GHS: '₵', NGN: '₦', USD: '$', EUR: '€', GBP: '£' };

export function fmt(amount, currency = 'GHS') {
  const num = Number(amount || 0);
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export const BRAND = 'KitchenLovers';
