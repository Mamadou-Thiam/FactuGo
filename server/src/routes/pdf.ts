import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { generateInvoicePDF } from '../utils/generatePDF';

const router = Router();
const prisma = new PrismaClient();

function calculateItemTotal(unitPrice: number, quantity: number, discount: number): number {
  const lineTotal = unitPrice * quantity;
  const discountAmount = lineTotal * (discount / 100);
  return lineTotal - discountAmount;
}

router.get('/:id/pdf', async (req: AuthRequest, res: Response) => {
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

    const invoiceData = {
      number: inv.number,
      clientName: inv.client.name,
      clientPhone: inv.client.phone,
      clientAddress: inv.client.address,
      date: inv.date.toISOString(),
      dueDate: inv.dueDate?.toISOString() || null,
      paymentMethod: inv.paymentMethod,
      status: inv.status,
      amountPaid: Number(inv.amountPaid),
      total,
      items: inv.items.map((item) => ({
        designation: item.designation,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        lineTotal: calculateItemTotal(Number(item.unitPrice), item.quantity, Number(item.discount)),
      })),
    };

    generateInvoicePDF(invoiceData, res);
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
