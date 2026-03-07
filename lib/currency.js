'use client';

export const CURRENCIES = { INR: { symbol: '₹', code: 'INR' }, PKR: { symbol: 'Rs', code: 'PKR' } };

export function formatPrice(amountInPaise, currency = 'PKR') {
  const num = Number(amountInPaise);
  const value = (Number.isFinite(num) ? num : 0) / 100;
  const c = CURRENCIES[currency] || CURRENCIES.PKR;
  return `${c.symbol}${value.toLocaleString('en-PK')}`;
}

export function detectDefaultCurrency() {
  return 'PKR';
}
