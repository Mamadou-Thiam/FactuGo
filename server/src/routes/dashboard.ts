import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalInvoices, todayInvoices, revenueResult, unpaidResult, recentInvoices] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({
        where: { date: { gte: today, lt: tomorrow } },
      }),
      prisma.invoice.aggregate({
        _sum: { amountPaid: true },
      }),
      prisma.invoice.findMany({
        where: { status: { in: ['NON_PAYE', 'PARTIEL'] } },
        select: { amountPaid: true },
      }),
      prisma.invoice.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { client: true },
      }),
    ]);

    const totalRevenue = Number(revenueResult._sum.amountPaid || 0);
    const totalUnpaid = unpaidResult.reduce((acc, inv) => {
      return acc + Number(inv.amountPaid);
    }, 0);

    const invoicesWithTotals = await Promise.all(
      recentInvoices.map(async (inv) => {
        const items = await prisma.invoiceItem.findMany({
          where: { invoiceId: inv.id },
        });
        const total = items.reduce((acc, item) => {
          const lineTotal = Number(item.unitPrice) * item.quantity;
          const discountAmount = lineTotal * (Number(item.discount) / 100);
          return acc + lineTotal - discountAmount;
        }, 0);
        return {
          id: inv.id,
          number: inv.number,
          clientName: inv.client.name,
          date: inv.date,
          total,
          amountPaid: Number(inv.amountPaid),
          status: inv.status,
          paymentMethod: inv.paymentMethod,
        };
      })
    );

    res.json({
      totalInvoices,
      todayInvoices,
      totalRevenue,
      unpaidAmount: totalUnpaid,
      recentInvoices: invoicesWithTotals,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
