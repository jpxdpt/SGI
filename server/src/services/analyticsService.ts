import { prisma } from '../prisma';
import { startOfYear, endOfYear, subMonths, format } from 'date-fns';

interface DateFilter {
  startDate?: Date;
  endDate?: Date;
  tenantId: string;
}

export class AnalyticsService {
  async getDashboardKPIs({ startDate, endDate, tenantId }: DateFilter) {
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    } : {};

    const [
      totalInternalAudits,
      totalExternalAudits,
      totalActions,
      overdueActions,
      openOccurrences
    ] = await Promise.all([
      prisma.internalAudit.count({ where: { tenantId, ...dateFilter } }),
      prisma.externalAudit.count({ where: { tenantId, ...dateFilter } }),
      prisma.actionItem.count({ where: { tenantId, ...dateFilter } }),
      prisma.actionItem.count({
        where: {
          tenantId,
          status: { in: ['ATRASADA', 'EXECUTADA_ATRASO'] },
          ...dateFilter
        }
      }),
      prisma.occurrence.count({
        where: {
          tenantId,
          status: { not: 'RESOLVIDA' },
          ...dateFilter
        }
      })
    ]);

    // Calculate compliance rate (based on executed actions vs total)
    const executedActions = await prisma.actionItem.count({
      where: {
        tenantId,
        status: { in: ['EXECUTADA', 'EXECUTADA_ATRASO'] },
        ...dateFilter
      }
    });

    const complianceRate = totalActions > 0 
      ? Math.round((executedActions / totalActions) * 100) 
      : 100;

    return {
      audits: {
        internal: totalInternalAudits,
        external: totalExternalAudits,
        total: totalInternalAudits + totalExternalAudits
      },
      actions: {
        total: totalActions,
        overdue: overdueActions,
        complianceRate
      },
      occurrences: {
        open: openOccurrences
      }
    };
  }

  async getTrends({ tenantId }: { tenantId: string }) {
    // Get last 12 months trend
    const endDate = new Date();
    const startDate = subMonths(endDate, 11);

    const actions = await prisma.actionItem.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        status: true,
        createdAt: true
      }
    });

    // Process data to aggregate by month
    const monthlyData = new Map<string, { month: string; created: number; completed: number; overdue: number }>();

    actions.forEach(action => {
      const monthKey = format(action.createdAt, 'yyyy-MM');
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          created: 0,
          completed: 0,
          overdue: 0
        });
      }
      
      const data = monthlyData.get(monthKey)!;
      data.created += 1;
      
      if (['EXECUTADA', 'EXECUTADA_ATRASO'].includes(action.status)) {
        data.completed += 1;
      }
      if (['ATRASADA', 'EXECUTADA_ATRASO'].includes(action.status)) {
        data.overdue += 1;
      }
    });

    return Array.from(monthlyData.values())
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getSectorPerformance({ tenantId }: { tenantId: string }) {
    const actionsBySector = await prisma.actionItem.groupBy({
      by: ['setor', 'status'],
      where: {
        tenantId
      },
      _count: {
        _all: true
      }
    });

    const sectorStats = new Map();

    actionsBySector.forEach(item => {
      if (!sectorStats.has(item.setor)) {
        sectorStats.set(item.setor, {
          name: item.setor,
          total: 0,
          overdue: 0,
          completed: 0
        });
      }

      const stats = sectorStats.get(item.setor);
      stats.total += item._count._all;

      if (['ATRASADA', 'EXECUTADA_ATRASO'].includes(item.status)) {
        stats.overdue += item._count._all;
      }
      if (['EXECUTADA', 'EXECUTADA_ATRASO'].includes(item.status)) {
        stats.completed += item._count._all;
      }
    });

    return Array.from(sectorStats.values())
      .map(stat => ({
        ...stat,
        riskLevel: stat.total > 0 ? (stat.overdue / stat.total) * 100 : 0
      }))
      .sort((a, b) => b.riskLevel - a.riskLevel);
  }
}

export const analyticsService = new AnalyticsService();
