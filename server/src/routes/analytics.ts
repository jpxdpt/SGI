import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import * as AnalyticsController from '../controllers/analyticsController';

const router = Router();

router.use(authenticateToken);

// Todas as rotas de analytics requerem autenticação
// Apenas ADMIN e GESTOR devem ter acesso a dados de BI
router.get('/kpis', requireRole('ADMIN', 'GESTOR'), AnalyticsController.getDashboardKPIs);
router.get('/trends', requireRole('ADMIN', 'GESTOR'), AnalyticsController.getTrends);
router.get('/sectors', requireRole('ADMIN', 'GESTOR'), AnalyticsController.getSectorPerformance);

export default router;
