import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import invoiceRoutes from './routes/invoices';
import dashboardRoutes from './routes/dashboard';
import pdfRoutes from './routes/pdf';
import { authMiddleware } from './middleware/auth';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/clients', authMiddleware, clientRoutes);
app.use('/api/invoices', authMiddleware, invoiceRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/pdf', authMiddleware, pdfRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

import bcrypt from 'bcryptjs';

async function main() {
  // Create default admin if not exists
  const existingUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: { username: 'admin', password: hashedPassword },
    });
    console.log('Default admin user created (admin / admin123)');
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
