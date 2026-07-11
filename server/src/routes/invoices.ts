import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `FAC-${year}${month}`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
  });

  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.number.split('-')[2] || '0');
    const newSeq = (lastSeq + 1).toString().padStart(4, '0');
    return `${prefix}-${newSeq}`;
  }

  return `${prefix}-0001`;
}

function calculateItemTotal(unitPrice: number, quantity: number, discount: number): number {
  const lineTotal = unitPrice * quantity;
  const discountAmount = lineTotal * (discount / 100);
  return lineTotal - discountAmount;
}

router.get('/next-number', async (req: AuthRequest, res: Response) => {
  try {
    const number = await generateInvoiceNumber();
    res.json({ number });
  } catch (error) {
    console.error('Generate number error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: { client: true, items: true },
    });

    const result = invoices.map((inv) => {
      const total = inv.items.reduce((acc, item) => {
        return acc + calculateItemTotal(Number(item.unitPrice), item.quantity, Number(item.discount));
      }, 0);
      return {
        id: inv.id,
        number: inv.number,
        clientId: inv.clientId,
        clientName: inv.client.name,
        clientPhone: inv.client.phone,
        clientAddress: inv.client.address,
        date: inv.date,
        dueDate: inv.dueDate,
        paymentMethod: inv.paymentMethod,
        status: inv.status,
        amountPaid: Number(inv.amountPaid),
        total,
        items: inv.items.map((item) => ({
          id: item.id,
          designation: item.designation,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          lineTotal: calculateItemTotal(Number(item.unitPrice), item.quantity, Number(item.discount)),
        })),
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, items: true },
    });

    if (!inv) {
      res.status(404).json({ error: 'Facture non trouvée' });
      return;
    }

    const total = inv.items.reduce((acc, item) => {
      return acc + calculateItemTotal(Number(item.unitPrice), item.quantity, Number(item.discount));
    }, 0);

    res.json({
      id: inv.id,
      number: inv.number,
      clientId: inv.clientId,
      clientName: inv.client.name,
      clientPhone: inv.client.phone,
      clientAddress: inv.client.address,
      date: inv.date,
      dueDate: inv.dueDate,
      paymentMethod: inv.paymentMethod,
      status: inv.status,
      amountPaid: Number(inv.amountPaid),
      total,
      items: inv.items.map((item) => ({
        id: item.id,
        designation: item.designation,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        lineTotal: calculateItemTotal(Number(item.unitPrice), item.quantity, Number(item.discount)),
      })),
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, date, dueDate, paymentMethod, status, amountPaid, items } = req.body;

    if (!clientId || !items || items.length === 0) {
      res.status(400).json({ error: 'Client et articles requis' });
      return;
    }

    const number = await generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId: parseInt(clientId),
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        paymentMethod: paymentMethod || 'ESPECES',
        status: status || 'NON_PAYE',
        amountPaid: parseFloat(amountPaid) || 0,
        items: {
          create: items.map((item: any) => ({
            designation: item.designation,
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            discount: parseFloat(item.discount) || 0,
          })),
        },
      },
      include: { client: true, items: true },
    });

    const total = invoice.items.reduce((acc, item) => {
      return acc + calculateItemTotal(Number(item.unitPrice), item.quantity, Number(item.discount));
    }, 0);

    res.status(201).json({
      id: invoice.id,
      number: invoice.number,
      clientId: invoice.clientId,
      clientName: invoice.client.name,
      clientPhone: invoice.client.phone,
      clientAddress: invoice.client.address,
      date: invoice.date,
      dueDate: invoice.dueDate,
      paymentMethod: invoice.paymentMethod,
      status: invoice.status,
      amountPaid: Number(invoice.amountPaid),
      total,
      items: invoice.items.map((item) => ({
        id: item.id,
        designation: item.designation,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        lineTotal: calculateItemTotal(Number(item.unitPrice), item.quantity, Number(item.discount)),
      })),
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
