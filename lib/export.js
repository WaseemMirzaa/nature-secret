'use client';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function buildRows(orders, productsMap, formatPriceFn) {
  const rows = [];
  for (const o of orders) {
    const items = (o.items || [])
      .map((it) => {
        const name = productsMap[it.productId]?.name || `Product ${it.productId}`;
        return `${name} x${it.qty || 1}`;
      })
      .join('; ');
    rows.push({
      'Order ID': o.id || '',
      'Date': o.createdAt ? new Date(o.createdAt).toLocaleString() : '',
      'Status': (o.status || '').toUpperCase(),
      'Customer Name': o.customerName || '',
      'Email': o.email || '',
      'Phone': o.phone || '',
      'Address': o.address || '',
      'City': o.city || '',
      'Items': items,
      'Total': formatPriceFn ? formatPriceFn(o.total) : (o.total / 100).toFixed(2),
      'Payment Method': o.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : (o.paymentMethod || ''),
      'Dispatched': o.dispatchedAt ? new Date(o.dispatchedAt).toLocaleString() : '',
    });
  }
  return rows;
}

export function exportOrdersCSV(orders, productsMap, formatPriceFn) {
  const rows = buildRows(orders, productsMap, formatPriceFn);
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `orders-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportOrdersXLSX(orders, productsMap, formatPriceFn) {
  const rows = buildRows(orders, productsMap, formatPriceFn);
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const colWidths = Object.keys(rows[0]).map((k) => ({
    wch: Math.max(k.length, ...rows.map((r) => String(r[k] || '').length).slice(0, 50)) + 2,
  }));
  ws['!cols'] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

