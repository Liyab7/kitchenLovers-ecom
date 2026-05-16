// Streams a styled PDF receipt for an order. Falls back to a plain-text receipt
// if `pdfkit` isn't installed — keeps the rest of the system working without
// the optional dependency.
import { ApiError } from '../utils/ApiError.js';

const CURRENCY_SYMBOLS = { GHS: 'GHS ', NGN: 'NGN ', USD: '$', EUR: '€', GBP: '£' };
const sym = (c = 'GHS') => CURRENCY_SYMBOLS[c] || `${c} `;
const money = (n, c) =>
  `${sym(c)}${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DELIVERY_LABELS = {
  standard: 'Standard delivery',
  express: 'Express delivery',
  pickup: 'Store pickup',
};

const STATUS_LABELS = {
  pending: 'Pending payment',
  paid: 'Paid',
  processing: 'Processing',
  packed: 'Packed',
  dispatched: 'Dispatched',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
};

async function getPDFDocument() {
  try {
    const mod = await import('pdfkit');
    return mod.default;
  } catch {
    return null;
  }
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export async function streamOrderReceipt({ order, customer, payment, res }) {
  const PDFDocument = await getPDFDocument();

  if (!PDFDocument) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${order.orderNumber}.txt"`);
    res.write(renderTextReceipt({ order, customer, payment }));
    res.end();
    return;
  }

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: { Title: `Receipt ${order.orderNumber}`, Author: 'KitchenLovers' },
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${order.orderNumber}.pdf"`);
  doc.pipe(res);

  const PAGE_LEFT = 50;
  const PAGE_RIGHT = 545;
  const PAGE_WIDTH = PAGE_RIGHT - PAGE_LEFT;
  const ORANGE = '#FF6B35';
  const INK = '#222222';
  const MUTED = '#6B6B6B';
  const LINE = '#E5E5E5';

  // ── HEADER ──────────────────────────────────────────────────────────────
  doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(22).text('KitchenLovers', PAGE_LEFT, 50);
  doc.fillColor(MUTED).font('Helvetica').fontSize(10).text('Love Cooking, Love Life', PAGE_LEFT, 76);

  // RECEIPT title — right
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text('RECEIPT', PAGE_LEFT, 50, {
    width: PAGE_WIDTH,
    align: 'right',
  });

  // Status pill (right under "RECEIPT")
  const paid = !!order.paidAt || payment?.status === 'success';
  const statusText = paid ? 'PAID' : (STATUS_LABELS[order.status] || order.status).toUpperCase();
  doc.fontSize(9).fillColor(paid ? '#1A7F3C' : ORANGE).font('Helvetica-Bold')
    .text(statusText, PAGE_LEFT, 76, { width: PAGE_WIDTH, align: 'right' });

  // Divider
  doc.moveTo(PAGE_LEFT, 100).lineTo(PAGE_RIGHT, 100).strokeColor(LINE).lineWidth(1).stroke();

  // ── META BAR (two columns: order info + payment info) ──────────────────
  const metaTop = 115;
  const colW = (PAGE_WIDTH - 20) / 2;

  // Left col — order info
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('ORDER NUMBER', PAGE_LEFT, metaTop, { characterSpacing: 0.4 });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(order.orderNumber, PAGE_LEFT, metaTop + 12);

  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('ORDER DATE', PAGE_LEFT, metaTop + 32, { characterSpacing: 0.4 });
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(formatDate(order.createdAt), PAGE_LEFT, metaTop + 44);

  if (order.paidAt) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('PAID ON', PAGE_LEFT, metaTop + 64, { characterSpacing: 0.4 });
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(formatDate(order.paidAt), PAGE_LEFT, metaTop + 76);
  }

  // Right col — payment info
  const rightX = PAGE_LEFT + colW + 20;
  if (payment) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('PAYMENT METHOD', rightX, metaTop, { characterSpacing: 0.4 });
    const channelLabel = payment.channel
      ? payment.channel.charAt(0).toUpperCase() + payment.channel.slice(1)
      : (payment.provider === 'paystack' ? 'Paystack (card / mobile money)' : payment.provider || 'Online payment');
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(channelLabel, rightX, metaTop + 12, { width: colW });

    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('PAYMENT REFERENCE', rightX, metaTop + 32, { characterSpacing: 0.4 });
    doc.font('Courier').fontSize(9).fillColor(INK).text(payment.reference || '—', rightX, metaTop + 44, { width: colW });
  }

  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('STATUS', rightX, metaTop + 64, { characterSpacing: 0.4 });
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(STATUS_LABELS[order.status] || order.status, rightX, metaTop + 76);

  // ── BILL TO / SHIP TO ────────────────────────────────────────────────
  const partyTop = metaTop + 105;
  doc.moveTo(PAGE_LEFT, partyTop - 10).lineTo(PAGE_RIGHT, partyTop - 10).strokeColor(LINE).stroke();

  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('BILL TO', PAGE_LEFT, partyTop, { characterSpacing: 0.4 });
  let y1 = partyTop + 14;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(customer?.fullName || order.shippingAddress?.fullName || 'Customer', PAGE_LEFT, y1);
  y1 += 14;
  doc.font('Helvetica').fontSize(10).fillColor(MUTED);
  if (customer?.email) { doc.text(customer.email, PAGE_LEFT, y1); y1 += 12; }
  if (customer?.phone || order.shippingAddress?.phone) {
    doc.text(customer?.phone || order.shippingAddress.phone, PAGE_LEFT, y1);
    y1 += 12;
  }

  if (order.deliveryMethod !== 'pickup' && order.shippingAddress) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('SHIP TO', rightX, partyTop, { characterSpacing: 0.4 });
    let y2 = partyTop + 14;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(order.shippingAddress.fullName || '—', rightX, y2, { width: colW });
    y2 += 14;
    doc.font('Helvetica').fontSize(10).fillColor(MUTED);
    const a = order.shippingAddress;
    const lines = [
      a.line1,
      a.line2,
      [a.city, a.state].filter(Boolean).join(', '),
      [a.country, a.postalCode].filter(Boolean).join(' '),
    ].filter(Boolean);
    for (const ln of lines) {
      doc.text(ln, rightX, y2, { width: colW });
      y2 += 12;
    }
  } else if (order.deliveryMethod === 'pickup') {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('DELIVERY', rightX, partyTop, { characterSpacing: 0.4 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text('Store pickup', rightX, partyTop + 14, { width: colW });
    doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('Accra · ready when packed', rightX, partyTop + 28, { width: colW });
  }

  // ── ITEMS TABLE ─────────────────────────────────────────────────────────
  const tableTop = partyTop + 110;

  // Column geometry
  const COL_ITEM = PAGE_LEFT;
  const COL_QTY = 360;
  const COL_PRICE = 405;
  const COL_SUB = PAGE_RIGHT;

  // Header band
  doc.rect(PAGE_LEFT, tableTop, PAGE_WIDTH, 22).fill('#FFF1EB');
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(9);
  doc.text('ITEM', COL_ITEM + 8, tableTop + 7, { characterSpacing: 0.4 });
  doc.text('QTY', COL_QTY, tableTop + 7, { width: 30, align: 'right', characterSpacing: 0.4 });
  doc.text('PRICE', COL_PRICE, tableTop + 7, { width: 70, align: 'right', characterSpacing: 0.4 });
  doc.text('SUBTOTAL', COL_SUB - 70, tableTop + 7, { width: 70, align: 'right', characterSpacing: 0.4 });

  // Rows
  let y = tableTop + 32;
  doc.font('Helvetica').fontSize(10).fillColor(INK);
  for (const item of order.items) {
    // Page break if necessary
    if (y > 700) {
      doc.addPage();
      y = 60;
    }
    const itemBlock = doc.heightOfString(item.name, { width: 270 });
    doc.fillColor(INK).text(item.name, COL_ITEM + 8, y, { width: 270 });
    if (item.sku) {
      doc.fillColor(MUTED).fontSize(8).text(`SKU: ${item.sku}`, COL_ITEM + 8, y + itemBlock + 2, { width: 270 });
      doc.fontSize(10);
    }
    doc.fillColor(INK).text(String(item.quantity), COL_QTY, y, { width: 30, align: 'right' });
    doc.text(money(item.price, order.currency), COL_PRICE, y, { width: 70, align: 'right' });
    doc.font('Helvetica-Bold').text(money(item.subtotal, order.currency), COL_SUB - 70, y, { width: 70, align: 'right' });
    doc.font('Helvetica');
    const rowHeight = Math.max(22, itemBlock + (item.sku ? 18 : 8));
    y += rowHeight;
    doc.moveTo(PAGE_LEFT, y - 4).lineTo(PAGE_RIGHT, y - 4).strokeColor(LINE).lineWidth(0.5).stroke();
  }

  // ── TOTALS ─────────────────────────────────────────────────────────────
  y += 8;
  const totalsLeft = PAGE_RIGHT - 230;
  const labelX = totalsLeft;
  const valueX = totalsLeft + 130;
  const valueW = 100;

  function totalsRow(label, value, opts = {}) {
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 11 : 10);
    doc.fillColor(opts.color || (opts.bold ? INK : MUTED)).text(label, labelX, y, { width: 130 });
    doc.fillColor(opts.color || INK).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(value, valueX, y, { width: valueW, align: 'right' });
    y += opts.bold ? 20 : 16;
  }

  totalsRow('Subtotal', money(order.subtotal, order.currency));
  totalsRow(
    `${DELIVERY_LABELS[order.deliveryMethod] || 'Delivery'}`,
    order.shippingFee === 0 ? 'Free' : money(order.shippingFee, order.currency),
  );
  if (order.discount > 0) {
    totalsRow(
      `Discount${order.promoCode ? ` (${order.promoCode})` : ''}`,
      `− ${money(order.discount, order.currency)}`,
      { color: '#1A7F3C' },
    );
  }
  if (order.tax > 0) totalsRow('Tax', money(order.tax, order.currency));

  // Total band
  doc.moveTo(totalsLeft, y - 2).lineTo(PAGE_RIGHT, y - 2).strokeColor(INK).lineWidth(1).stroke();
  y += 8;
  totalsRow('TOTAL', money(order.total, order.currency), { bold: true });

  // ── FOOTER ─────────────────────────────────────────────────────────────
  const footerY = 780;
  doc.moveTo(PAGE_LEFT, footerY).lineTo(PAGE_RIGHT, footerY).strokeColor(LINE).stroke();
  doc.fillColor(MUTED).font('Helvetica').fontSize(9);
  doc.text('Thank you for shopping with KitchenLovers.', PAGE_LEFT, footerY + 8, {
    width: PAGE_WIDTH, align: 'center',
  });
  doc.text('Questions? support@kitchenlovers.store · +233 24 000 0000', PAGE_LEFT, footerY + 22, {
    width: PAGE_WIDTH, align: 'center',
  });

  doc.end();
}

function renderTextReceipt({ order, customer, payment }) {
  const lines = [];
  const sep = '─'.repeat(60);
  lines.push('KitchenLovers — Love Cooking, Love Life');
  lines.push(sep);
  lines.push(`RECEIPT  ·  ${order.orderNumber}`);
  lines.push(`Order date : ${formatDate(order.createdAt)}`);
  if (order.paidAt) lines.push(`Paid on    : ${formatDate(order.paidAt)}`);
  lines.push(`Status     : ${STATUS_LABELS[order.status] || order.status}`);
  if (payment?.reference) lines.push(`Payment ref: ${payment.reference}`);
  lines.push('');
  lines.push('Bill to:');
  lines.push(`  ${customer?.fullName || order.shippingAddress?.fullName || 'Customer'}`);
  if (customer?.email) lines.push(`  ${customer.email}`);
  if (customer?.phone || order.shippingAddress?.phone) lines.push(`  ${customer?.phone || order.shippingAddress.phone}`);
  if (order.shippingAddress && order.deliveryMethod !== 'pickup') {
    lines.push('');
    lines.push('Ship to:');
    lines.push(`  ${order.shippingAddress.line1}${order.shippingAddress.line2 ? ', ' + order.shippingAddress.line2 : ''}`);
    lines.push(`  ${order.shippingAddress.city}, ${order.shippingAddress.country}`);
  }
  lines.push('');
  lines.push('Items');
  lines.push(sep);
  for (const item of order.items) {
    lines.push(`  ${item.name}`);
    lines.push(`    ${item.quantity} × ${money(item.price, order.currency)} = ${money(item.subtotal, order.currency)}`);
  }
  lines.push(sep);
  lines.push(`Subtotal:  ${money(order.subtotal, order.currency)}`);
  lines.push(`${DELIVERY_LABELS[order.deliveryMethod] || 'Delivery'}: ${order.shippingFee === 0 ? 'Free' : money(order.shippingFee, order.currency)}`);
  if (order.discount > 0) lines.push(`Discount${order.promoCode ? ` (${order.promoCode})` : ''}: -${money(order.discount, order.currency)}`);
  if (order.tax > 0) lines.push(`Tax: ${money(order.tax, order.currency)}`);
  lines.push(`TOTAL:     ${money(order.total, order.currency)}`);
  lines.push('');
  lines.push('Thank you for shopping with KitchenLovers.');
  lines.push('support@kitchenlovers.store · +233 24 000 0000');
  return lines.join('\n');
}

// Silence unused import warning when running tests
export const _ = ApiError;
