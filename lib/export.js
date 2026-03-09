'use client';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function buildDashboardRows(stats, formatPriceFn) {
  const rows = [
    { Metric: 'Total sales', Value: formatPriceFn ? formatPriceFn(stats.totalSales || 0) : (stats.totalSales || 0), Count: '', Amount: '' },
    { Metric: 'Orders (all)', Value: String(stats.ordersCount ?? 0), Count: '', Amount: '' },
    { Metric: 'Orders today', Value: String(stats.ordersToday ?? 0), Count: '', Amount: '' },
    { Metric: 'Revenue today', Value: formatPriceFn ? formatPriceFn(stats.revenueToday || 0) : (stats.revenueToday || 0), Count: '', Amount: '' },
  ];
  (stats.byStatus || []).forEach((b) => {
    rows.push({ Metric: `Status: ${(b.status || '').toLowerCase()}`, Value: '', Count: b.count, Amount: formatPriceFn ? formatPriceFn(b.total || 0) : (b.total || 0) });
  });
  return rows;
}

export function exportDashboardCSV(stats, formatPriceFn) {
  const rows = buildDashboardRows(stats, formatPriceFn);
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `dashboard-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportDashboardXLSX(stats, formatPriceFn) {
  const rows = buildDashboardRows(stats, formatPriceFn);
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function buildRows(orders, productsMap, formatPriceFn) {
  const rows = [];
  for (const o of orders) {
    const items = (o.items || [])
      .map((it) => {
        const product = productsMap[it.productId];
        let name = product?.name || `Product ${it.productId}`;
        if (it.variantId && product?.variants) {
          const variant = product.variants.find((v) => v.id === it.variantId);
          if (variant) name += ` (${variant.name})`;
        }
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

function buildGroupRows(groups, formatPriceFn) {
  return (groups || []).map((g) => ({
    'Customer': g.customerName || '',
    'Email': g.email || '',
    'Date': g.dateKey || '',
    'Order count': g.orderCount ?? 0,
    'Total amount': formatPriceFn ? formatPriceFn(g.totalAmount || 0) : (g.totalAmount || 0),
    'Status summary': (g.statusSummary || []).map((s) => `${s.status}: ${s.count}`).join('; '),
  }));
}

export function exportGroupsCSV(groups, formatPriceFn) {
  const rows = buildGroupRows(groups, formatPriceFn);
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `orders-groups-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportGroupsXLSX(groups, formatPriceFn) {
  const rows = buildGroupRows(groups, formatPriceFn);
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders by customer+date');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `orders-groups-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

