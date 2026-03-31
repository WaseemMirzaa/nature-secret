'use client';

import { jsPDF } from 'jspdf';
import { CURRENCIES } from './currency';

const BRAND = {
  name: 'Nature Secret',
  tagline: 'Premium Herbal Oils & Skincare',
  website: 'naturesecret.pk',
  email: 'support@naturesecret.pk',
  phone: '+92 300 1234567',
  address: 'Lahore, Pakistan',
};

const C = {
  gold: [203, 168, 71],
  dark: [28, 25, 23],
  mid: [87, 83, 78],
  light: [168, 162, 158],
  bg: [250, 250, 249],
  white: [255, 255, 255],
};

function fmt(amount, sym) {
  return `${sym}${(Number(amount) / 100).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function svgToBase64Png(svgUrl, width = 200, height = 120) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = svgUrl;
  });
}

export async function generateInvoicePDF(order, productsMap = {}, currency = 'PKR') {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const sym = CURRENCIES[currency]?.symbol || CURRENCIES.PKR.symbol;
  const m = 20;
  const rw = pw - m * 2;

  doc.setFillColor(...C.gold);
  doc.rect(0, 0, pw, 4, 'F');

  let y = 22;

  const logoData = await svgToBase64Png('/assets/nature-secret-logo.svg', 400, 214);
  if (logoData) {
    doc.addImage(logoData, 'PNG', m, y - 8, 40, 21);
  }

  const textX = logoData ? m + 44 : m;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...C.dark);
  doc.text(BRAND.name.toUpperCase(), textX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.mid);
  doc.text(BRAND.tagline, textX, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...C.gold);
  doc.text('INVOICE', pw - m, y, { align: 'right' });

  y += 18;
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.5);
  doc.line(m, y, pw - m, y);
  y += 12;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.light);
  doc.text('INVOICE DETAILS', m, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  const invId = `INV-${(order.id || '').slice(0, 8).toUpperCase()}`;
  const details = [
    ['Invoice No:', invId],
    ['Order ID:', order.id || '—'],
    ['Date:', order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
    ['Status:', (order.status || '').toUpperCase()],
  ];
  if (order.dispatchedAt) details.push(['Dispatched:', new Date(order.dispatchedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })]);
  details.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, m, y);
    doc.setFont('helvetica', 'normal');
    doc.text(val, m + 28, y);
    y += 5.5;
  });

  const billY = y - details.length * 5.5;
  const bx = pw / 2 + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.light);
  doc.text('BILL TO', bx, billY);

  let by = billY + 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  doc.text(order.customerName || '—', bx, by);
  by += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.mid);
  if (order.email) { doc.text(order.email, bx, by); by += 5; }
  if (order.phone) { doc.text(order.phone, bx, by); by += 5; }
  if (order.address) {
    const addrLines = doc.splitTextToSize(order.address, pw / 2 - m - 10);
    addrLines.forEach((l) => { doc.text(l, bx, by); by += 4.5; });
  }
  if (order.city) { doc.text(order.city, bx, by); by += 5; }

  y = Math.max(y, by) + 10;

  const colX = [m, m + 80, m + 100, pw - m];
  const headers = ['ITEM', 'QTY', 'PRICE', 'AMOUNT'];

  doc.setFillColor(...C.dark);
  doc.roundedRect(m, y, rw, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  doc.text(headers[0], colX[0] + 4, y + 5.5);
  doc.text(headers[1], colX[1] + 4, y + 5.5);
  doc.text(headers[2], colX[2] + 4, y + 5.5);
  doc.text(headers[3], colX[3] - 4, y + 5.5, { align: 'right' });
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);

  const items = order.items || [];
  items.forEach((item, idx) => {
    if (y > ph - 50) {
      doc.addPage();
      y = 20;
    }
    const product = productsMap[item.productId];
    let name = product?.name || `Product`;
    if (item.variantId && product?.variants) {
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (variant) name += ` (${variant.name})`;
    }
    const qty = item.qty || 1;
    const price = fmt(item.price, sym);
    const total = fmt(item.price * qty, sym);

    if (idx % 2 === 0) {
      doc.setFillColor(...C.bg);
      doc.rect(m, y - 4, rw, 8, 'F');
    }

    const nameLines = doc.splitTextToSize(name, 72);
    nameLines.forEach((l, li) => {
      doc.setTextColor(...C.dark);
      doc.text(l, colX[0] + 4, y + (li * 4));
    });
    doc.text(String(qty), colX[1] + 4, y);
    doc.setTextColor(...C.mid);
    doc.text(price, colX[2] + 4, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text(total, colX[3] - 4, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += Math.max(8, nameLines.length * 4 + 4);
  });

  y += 4;
  doc.setDrawColor(...C.light);
  doc.setLineWidth(0.3);
  doc.line(pw / 2, y, pw - m, y);
  y += 8;


  const subtotal = items.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);
  const summaryX = pw / 2 + 10;
  const summaryValX = pw - m;

  const summaryRows = [
    ['Subtotal:', fmt(subtotal, sym)],
    ['Shipping:', 'Free'],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  summaryRows.forEach(([label, val]) => {
    doc.setTextColor(...C.mid);
    doc.text(label, summaryX, y);
    doc.setTextColor(...C.dark);
    doc.text(val, summaryValX, y, { align: 'right' });
    y += 6;
  });

  y += 2;
  doc.setFillColor(...C.gold);
  doc.roundedRect(summaryX - 4, y - 5, pw - m - summaryX + 8, 12, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text('TOTAL:', summaryX, y + 2);
  doc.text(fmt(order.total, sym), summaryValX, y + 2, { align: 'right' });
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.mid);
  const payLabel = order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : (order.paymentMethod || '—');
  doc.text(`Payment Method: ${payLabel}`, m, y);
  y += 14;

  if (y > ph - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(...C.light);
  doc.setLineWidth(0.2);
  doc.line(m, ph - 30, pw - m, ph - 30);

  doc.setFontSize(7.5);
  doc.setTextColor(...C.light);
  doc.text(BRAND.name + '  •  ' + BRAND.website + '  •  ' + BRAND.email, pw / 2, ph - 22, { align: 'center' });
  doc.text('Thank you for your purchase!', pw / 2, ph - 16, { align: 'center' });

  doc.setFillColor(...C.gold);
  doc.rect(0, ph - 4, pw, 4, 'F');

  doc.save(`invoice-${order.id}.pdf`);
}