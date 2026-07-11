import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            { address: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!client) {
      res.status(404).json({ error: 'Client non trouvé' });
      return;
    }
    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, address } = req.body;
    if (!name || !phone) {
      res.status(400).json({ error: 'Nom et téléphone requis' });
      return;
    }
    const client = await prisma.client.create({
      data: { name, phone, address: address || null },
    });
    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, address } = req.body;
    const client = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { name, phone, address: address || null },
    });
    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.client.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'Client supprimé' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
