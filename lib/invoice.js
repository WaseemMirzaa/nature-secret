'use client';

import { jsPDF } from 'jspdf';
import { CURRENCIES } from './currency';

/**
 * Generate professional invoice PDF with full customer and order info.
 * @param {Object} order - order with customerName, email, phone, address, items, total, createdAt, dispatchedAt, status
 * @param {Object} productsMap - optional map of productId -> { name } for line item names
 * @param {string} currency - PKR (default) | INR for symbol
 */
export function generateInvoicePDF(order, productsMap = {}, currency = 'PKR') {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const sym = (CURRENCIES[currency] && CURRENCIES[currency].symbol) || CURRENCIES.PKR.symbol;
  let y = 20;

  doc.setFontSize(24);
  doc.text('Nature Secret', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('INVOICE', 20, y);
  y += 12;
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(11);
  doc.text(`Order ID: ${order.id}`, 20, y);
  doc.text(`Created: ${order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}`, 20, y + 6);
  if (order.dispatchedAt) {
    doc.text(`Dispatched: ${new Date(order.dispatchedAt).toLocaleString()}`, 20, y + 12);
    y += 18;
  } else {
    y += 12;
  }
  doc.text(`Status: ${(order.status || '').toUpperCase()}`, 20, y);
  y += 10;

  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageW - 20, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('Bill to', 20, y);
  y += 7;
  doc.setFontSize(10);
  doc.text(order.customerName || '—', 20, y);
  doc.text(order.email || '—', 20, y + 5);
  if (order.phone) doc.text(`Phone: ${order.phone}`, 20, y + 10);
  let addrY = y + (order.phone ? 16 : 11);
  doc.text('Address:', 20, addrY - 5);
  const addrLines = doc.splitTextToSize(order.address || '—', pageW - 40);
  addrLines.forEach((line) => {
    doc.text(line, 20, addrY);
    addrY += 5;
  });
  y = addrY + 5;

  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageW - 20, y);
  y += 10;

  doc.setFontSize(11);
  doc.text('Items', 20, y);
  doc.text('Qty', 100, y);
  doc.text('Price', 140, y);
  doc.text('Total', pageW - 50, y);
  y += 7;
  doc.setFontSize(10);
  (order.items || []).forEach((item) => {
    const name = (productsMap[item.productId] && productsMap[item.productId].name) || `Product ${item.productId}`;
    const lineName = doc.splitTextToSize(name, 75);
    lineName.forEach((l) => {
      doc.text(l, 20, y);
      y += 5;
    });
    y -= 5;
    doc.text(String(item.qty || 1), 100, y);
    doc.text(`${sym}${(item.price / 100).toFixed(2)}`, 140, y);
    doc.text(`${sym}${((item.price * (item.qty || 1)) / 100).toFixed(2)}`, pageW - 50, y);
    y += 8;
  });
  y += 4;
  doc.setFontSize(11);
  doc.text('Total', 20, y);
  doc.text(`${sym}${(order.total / 100).toFixed(2)}`, pageW - 50, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Payment: ${order.paymentMethod === 'cash_on_delivery' ? 'Cash on delivery' : order.paymentMethod || '—'}`, 20, y);

  doc.save(`invoice-${order.id}.pdf`);
}
