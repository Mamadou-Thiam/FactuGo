import PDFDocument from 'pdfkit';
import { Response } from 'express';
import path from 'path';
import fs from 'fs';

const SHOP = {
  name: 'Seck Ndanane Apple',
  phone: '78 107 72 69',
  address: 'Colobane / Fadia',
};

const LOGO_PATH = path.join(__dirname, '..', 'logo.png');

const WARRANTY_TEXT = [
  { title: true, text: 'CONDITIONS DE GARANTIE' },
  { text: '' },
  { text: '1. Garantie de 1 mois couvrant uniquement les défauts de fabrication.' },
  { text: '2. L\'écran n\'est plus garanti après les tests et la remise du téléphone au client.' },
  { text: '3. La batterie est remplaçable en cas de défaut de fonctionnement constaté pendant la période de garantie.' },
  { text: '4. En cas de défaut couvert par la garantie, le téléphone sera réparé ou remplacé selon le diagnostic. Aucun remboursement ne sera effectué.' },
  { text: '5. La garantie ne couvre pas les dommages causés par les chutes, les chocs, l\'infiltration de liquide, une mauvaise utilisation ou toute modification effectuée après la vente.' },
  { text: '' },
  { title: true, text: 'NB : En cas de restant non payé après le délai convenu, l\'entreprise se réserve le droit de récupérer le téléphone, d\'évaluer sa valeur actuelle selon son état, de le revendre et de restituer au client le montant restant après déduction des sommes dues.' },
];

interface InvoiceItem {
  designation: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

interface InvoiceData {
  number: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string | null;
  date: string;
  dueDate: string | null;
  paymentMethod: string;
  status: string;
  amountPaid: number;
  total: number;
  items: InvoiceItem[];
}

const PAYMENT_LABELS: Record<string, string> = {
  ESPECES: 'Espèces',
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  CARTE_BANCAIRE: 'Carte Bancaire',
};

const STATUS_LABELS: Record<string, string> = {
  PAYE: 'Payé',
  PARTIEL: 'Paiement partiel',
  NON_PAYE: 'Non payé',
};

const BLUE = '#1e40af';
const LIGHT_BLUE = '#dbeafe';
const DARK = '#1f2937';
const GRAY = '#6b7280';
const GREEN = '#16a34a';
const RED = '#dc2626';
const ORANGE = '#ea580c';

function formatNumber(n: number): string {
  return n.toLocaleString('fr-FR');
}

function drawRoundedRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, r: number, fill: string) {
  doc.save();
  doc.roundedRect(x, y, w, h, r).fill(fill);
  doc.restore();
}

export function generateInvoicePDF(invoice: InvoiceData, res: Response): void {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="facture-${invoice.number}.pdf"`);
    res.send(pdfBuffer);
  });

  const MARGIN = 40;
  const PAGE_W = doc.page.width;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = 0;

  // ── BLUE HEADER BAR ──
  doc.rect(0, 0, PAGE_W, 90).fill(BLUE);

  // Logo
  if (fs.existsSync(LOGO_PATH)) {
    try {
      doc.image(LOGO_PATH, MARGIN, 12, { width: 60, height: 60 });
    } catch { /* skip logo if corrupt */ }
  }

  // Shop info on header
  const textStartX = MARGIN + 70;
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#ffffff').text(SHOP.name, textStartX, 16);
  doc.fontSize(9).font('Helvetica').fillColor('#bfdbfe');
  doc.text(`Tél: ${SHOP.phone}`, textStartX, 38);
  doc.text(`Adresse: ${SHOP.address}`, textStartX, 50);

  // FACTURE badge on right
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff').text('FACTURE', MARGIN, 16, { width: CONTENT_W, align: 'right' });
  doc.fontSize(9).font('Helvetica').fillColor('#bfdbfe');
  doc.text(`N° ${invoice.number}`, MARGIN, 42, { width: CONTENT_W, align: 'right' });
  doc.text(`${new Date(invoice.date).toLocaleDateString('fr-FR')}`, MARGIN, 54, { width: CONTENT_W, align: 'right' });
  if (invoice.dueDate) {
    doc.text(`Échéance: ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`, MARGIN, 66, { width: CONTENT_W, align: 'right' });
  }

  y = 105;

  // ── CLIENT BOX ──
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 52, 6, '#f0f9ff');
  doc.roundedRect(MARGIN, y, CONTENT_W, 52, 6).lineWidth(0.5).strokeColor('#bfdbfe').stroke();

  doc.fontSize(8).font('Helvetica-Bold').fillColor(BLUE).text('CLIENT', MARGIN + 12, y + 8);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK).text(invoice.clientName, MARGIN + 12, y + 22);
  doc.fontSize(9).font('Helvetica').fillColor(GRAY);
  let clientInfo = `Tél: ${invoice.clientPhone}`;
  if (invoice.clientAddress) clientInfo += `  |  ${invoice.clientAddress}`;
  doc.text(clientInfo, MARGIN + 12, y + 37);

  y += 65;

  // ── TABLE ──
  const colX = {
    desig: MARGIN,
    qty: MARGIN + CONTENT_W * 0.50,
    price: MARGIN + CONTENT_W * 0.63,
    discount: MARGIN + CONTENT_W * 0.78,
    total: MARGIN + CONTENT_W * 0.88,
  };

  // Table header
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 22, 4, BLUE);
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('Désignation', colX.desig + 8, y + 7, { width: colX.qty - colX.desig - 16 });
  doc.text('Qté', colX.qty, y + 7, { width: colX.price - colX.qty, align: 'center' });
  doc.text('Prix Unit.', colX.price, y + 7, { width: colX.discount - colX.price, align: 'right' });
  doc.text('Remise', colX.discount, y + 7, { width: colX.total - colX.discount, align: 'right' });
  doc.text('Total', colX.total, y + 7, { width: MARGIN + CONTENT_W - colX.total - 8, align: 'right' });
  y += 22;

  // Table rows
  for (let i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i];
    if (y > 720) {
      doc.addPage();
      y = 40;
    }

    // Alternating row background
    if (i % 2 === 0) {
      doc.rect(MARGIN, y, CONTENT_W, 20).fill('#f8fafc');
    }

    doc.fontSize(9).font('Helvetica').fillColor(DARK);
    doc.text(item.designation, colX.desig + 8, y + 5, { width: colX.qty - colX.desig - 16 });
    doc.text(item.quantity.toString(), colX.qty, y + 5, { width: colX.price - colX.qty, align: 'center' });
    doc.text(`${formatNumber(item.unitPrice)} F`, colX.price, y + 5, { width: colX.discount - colX.price, align: 'right' });
    doc.text(item.discount > 0 ? `-${item.discount}%` : '-', colX.discount, y + 5, { width: colX.total - colX.discount, align: 'right' });
    doc.font('Helvetica-Bold').text(`${formatNumber(item.lineTotal)} F`, colX.total, y + 5, { width: MARGIN + CONTENT_W - colX.total - 8, align: 'right' });
    y += 20;
  }

  // Table bottom line
  doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).lineWidth(0.5).strokeColor('#d1d5db').stroke();
  y += 12;

  // ── TOTALS ──
  const totalsX = MARGIN + CONTENT_W * 0.55;
  const totalsW = CONTENT_W * 0.45;

  const subtotal = invoice.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const totalDiscount = subtotal - invoice.total;

  // Totals box
  drawRoundedRect(doc, totalsX, y, totalsW, (totalDiscount > 0 ? 88 : 72), 6, '#f8fafc');

  doc.fontSize(9).font('Helvetica').fillColor(GRAY);
  doc.text('Sous-total', totalsX + 8, y + 8, { width: totalsW * 0.55 });
  doc.font('Helvetica-Bold').fillColor(DARK).text(`${formatNumber(subtotal)} FCFA`, totalsX + 8, y + 8, { width: totalsW - 16, align: 'right' });
  y += 18;

  if (totalDiscount > 0) {
    doc.fontSize(9).font('Helvetica').fillColor(GRAY);
    doc.text('Remise', totalsX + 8, y, { width: totalsW * 0.55 });
    doc.fillColor(RED).text(`-${formatNumber(totalDiscount)} FCFA`, totalsX + 8, y, { width: totalsW - 16, align: 'right' });
    y += 18;
  }

  // Separator
  doc.moveTo(totalsX + 8, y).lineTo(totalsX + totalsW - 8, y).lineWidth(1).strokeColor(BLUE).stroke();
  y += 6;

  doc.fontSize(12).font('Helvetica-Bold').fillColor(BLUE);
  doc.text('TOTAL', totalsX + 8, y, { width: totalsW * 0.55 });
  doc.text(`${formatNumber(invoice.total)} FCFA`, totalsX + 8, y, { width: totalsW - 16, align: 'right' });
  y += 22;

  // ── PAYMENT INFO ──
  const payY = y;
  const payBoxH = 52;
  drawRoundedRect(doc, MARGIN, payY, CONTENT_W * 0.50, payBoxH, 6, '#f0f9ff');
  doc.roundedRect(MARGIN, payY, CONTENT_W * 0.50, payBoxH, 6).lineWidth(0.5).strokeColor('#bfdbfe').stroke();

  doc.fontSize(8).font('Helvetica-Bold').fillColor(BLUE).text('PAIEMENT', MARGIN + 10, payY + 8);
  doc.fontSize(9).font('Helvetica').fillColor(DARK);
  doc.text(`Mode: ${PAYMENT_LABELS[invoice.paymentMethod] || invoice.paymentMethod}`, MARGIN + 10, payY + 22);
  doc.text(`Montant payé: ${formatNumber(invoice.amountPaid)} FCFA`, MARGIN + 10, payY + 35);

  const reste = invoice.total - invoice.amountPaid;
  const statutBoxX = MARGIN + CONTENT_W * 0.50 + 12;
  const statutBoxW = CONTENT_W * 0.50 - 12;

  if (reste > 0) {
    drawRoundedRect(doc, statutBoxX, payY, statutBoxW, payBoxH, 6, '#fef2f2');
    doc.roundedRect(statutBoxX, payY, statutBoxW, payBoxH, 6).lineWidth(0.5).strokeColor('#fecaca').stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor(RED).text('RESTE À PAYER', statutBoxX + 10, payY + 8);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(RED).text(`${formatNumber(reste)} FCFA`, statutBoxX + 10, payY + 24);
    doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(`Statut: ${STATUS_LABELS[invoice.status] || invoice.status}`, statutBoxX + 10, payY + 42);
  } else {
    drawRoundedRect(doc, statutBoxX, payY, statutBoxW, payBoxH, 6, '#f0fdf4');
    doc.roundedRect(statutBoxX, payY, statutBoxW, payBoxH, 6).lineWidth(0.5).strokeColor('#bbf7d0').stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor(GREEN).text('STATUT', statutBoxX + 10, payY + 8);
    doc.fontSize(16).font('Helvetica-Bold').fillColor(GREEN).text('SOLDÉ ✓', statutBoxX + 10, payY + 24);
  }

  y = payY + payBoxH + 15;

  // ── WARRANTY ──
  doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).lineWidth(0.5).strokeColor('#d1d5db').stroke();
  y += 12;

  for (const line of WARRANTY_TEXT) {
    if (y > 740) {
      doc.addPage();
      y = 40;
    }
    if (line.title) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK).text(line.text, MARGIN, y, { width: CONTENT_W, lineGap: 2 });
      y += 16;
    } else if (line.text === '') {
      y += 6;
    } else {
      // Draw bullet point
      doc.circle(MARGIN + 4, y + 5, 1.5).fill(GRAY);
      doc.fontSize(8.5).font('Helvetica').fillColor(DARK).text(line.text, MARGIN + 12, y, { width: CONTENT_W - 12, lineGap: 2 });
      y += 18;
    }
  }

  // ── FOOTER ──
  const footerY = doc.page.height - 30;
  doc.moveTo(MARGIN, footerY - 10).lineTo(MARGIN + CONTENT_W, footerY - 10).lineWidth(0.3).strokeColor('#d1d5db').stroke();
  doc.fontSize(7).font('Helvetica').fillColor(GRAY);
  doc.text(`${SHOP.name}  |  ${SHOP.phone}  |  ${SHOP.address}`, MARGIN, footerY, { width: CONTENT_W, align: 'center' });

  doc.end();
}
