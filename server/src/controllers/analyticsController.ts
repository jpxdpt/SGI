import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { analyticsService } from '../services/analyticsService';

export const getDashboardKPIs = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const tenantId = req.user!.tenantId;

    const data = await analyticsService.getDashboardKPIs({
      tenantId,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json(data);
  } catch (error) {
    console.error('Error getting dashboard KPIs:', error);
    res.status(500).json({ message: 'Erro ao obter KPIs do dashboard' });
  }
};

export const getTrends = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const data = await analyticsService.getTrends({ tenantId });
    res.json(data);
  } catch (error) {
    console.error('Error getting trends:', error);
    res.status(500).json({ message: 'Erro ao obter tendências' });
  }
};

export const getSectorPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const data = await analyticsService.getSectorPerformance({ tenantId });
    res.json(data);
  } catch (error) {
    console.error('Error getting sector performance:', error);
    res.status(500).json({ message: 'Erro ao obter performance por setor' });
  }
};
