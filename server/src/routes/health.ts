import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check básico
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Servidor está operacional
 */
router.get('/health', async (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Readiness check (verifica conectividade com BD)
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Servidor está pronto para receber tráfego
 *       503:
 *         description: Servidor não está pronto (BD indisponível)
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Verificar conectividade com a base de dados
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    console.error('[Health Check] Erro na base de dados:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed',
    });
  }
});

export default router;











