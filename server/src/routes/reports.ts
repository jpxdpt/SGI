import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import { ReportEngine, type ReportData, type ReportContext } from '../services/reportEngine';
import type { Request } from 'express';
import { ReportType, ReportStatus, ReportFrequency, ReportComponentType } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import {
  fetchInternalAudits,
  fetchExternalAudits,
  fetchActionItems,
  fetchOccurrences,
  fetchSectors,
  fetchDashboardSummary,
} from '../services/dataFetcher';

const router = express.Router();

const getTenantId = (req: AuthRequest | Request): string => {
  if ('user' in req && req.user) {
    return req.user.tenantId;
  }
  return (req.header('x-tenant-id') as string | undefined) ?? 'tenant-default';
};

const createReportTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  reportType: z.nativeEnum(ReportType),
  status: z.nativeEnum(ReportStatus).optional().default(ReportStatus.DRAFT),
  isPublic: z.boolean().optional().default(false),
  components: z.array(
    z.object({
      componentType: z.nativeEnum(ReportComponentType),
      order: z.number().int().positive(),
      title: z.string().optional(),
      configuration: z.any(),
      dataSource: z.any().optional(),
      style: z.any().optional(),
    }),
  ),
  metadata: z.any().optional(),
});

const updateReportTemplateSchema = createReportTemplateSchema.partial();

const createScheduledReportSchema = z.object({
  reportTemplateId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  frequency: z.nativeEnum(ReportFrequency),
  schedule: z.string(),
  recipients: z.array(z.string().email()).optional().default([]),
  format: z.array(z.enum(['PDF', 'CSV'])).optional().default(['PDF']),
  filters: z.any().optional(),
  enabled: z.boolean().optional().default(true),
});

/**
 * @swagger
 * /api/reports/templates:
 *   get:
 *     summary: Listar templates de relatórios
 *     tags: [Reports]
 */
router.get('/templates', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { reportType, status, isPublic } = req.query;

    const where: any = {
      OR: [{ tenantId }, { isPublic: true }], // Templates públicos ou do tenant
    };

    if (reportType) where.reportType = reportType;
    if (status) where.status = status;
    if (isPublic !== undefined) where.isPublic = isPublic === 'true';

    const templates = await prisma.reportTemplate.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        components: {
          orderBy: { order: 'asc' },
        },
        instances: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        reportType: t.reportType,
        status: t.status,
        isPublic: t.isPublic,
        components: t.components.map((c) => ({
          id: c.id,
          componentType: c.componentType,
          order: c.order,
          title: c.title,
          configuration: c.configuration,
          dataSource: c.dataSource,
          style: c.style,
        })),
        createdBy: {
          id: t.creator.id,
          name: t.creator.name,
          email: t.creator.email,
        },
        instancesCount: t.instances.length,
        metadata: t.metadata,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/templates:
 *   post:
 *     summary: Criar template de relatório
 *     tags: [Reports]
 */
router.post('/templates', authenticateToken, requireRole('ADMIN', 'GESTOR'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const body = createReportTemplateSchema.parse(req.body);

    const template = await prisma.reportTemplate.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description,
        reportType: body.reportType,
        status: body.status || ReportStatus.DRAFT,
        isPublic: body.isPublic ?? false,
        createdBy: userId,
        metadata: body.metadata,
        components: {
          create: body.components.map((comp) => ({
            componentType: comp.componentType,
            order: comp.order,
            title: comp.title,
            configuration: comp.configuration,
            dataSource: comp.dataSource,
            style: comp.style,
          })),
        },
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        components: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.status(201).json({
      id: template.id,
      name: template.name,
      description: template.description,
      reportType: template.reportType,
      status: template.status,
      isPublic: template.isPublic,
      components: template.components,
      createdBy: {
        id: template.creator.id,
        name: template.creator.name,
        email: template.creator.email,
      },
      metadata: template.metadata,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/templates/{id}:
 *   get:
 *     summary: Obter template
 *     tags: [Reports]
 */
router.get('/templates/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const template = await prisma.reportTemplate.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        components: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template || (template.tenantId !== tenantId && !template.isPublic)) {
      res.status(404).json({ message: 'Template não encontrado.' });
      return;
    }

    res.json({
      id: template.id,
      name: template.name,
      description: template.description,
      reportType: template.reportType,
      status: template.status,
      isPublic: template.isPublic,
      components: template.components.map((c) => ({
        id: c.id,
        componentType: c.componentType,
        order: c.order,
        title: c.title,
        configuration: c.configuration,
        dataSource: c.dataSource,
        style: c.style,
      })),
      createdBy: {
        id: template.creator.id,
        name: template.creator.name,
        email: template.creator.email,
      },
      metadata: template.metadata,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/templates/{id}:
 *   put:
 *     summary: Atualizar template
 *     tags: [Reports]
 */
router.put('/templates/:id', authenticateToken, requireRole('ADMIN', 'GESTOR'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const body = updateReportTemplateSchema.parse(req.body);

    const existing = await prisma.reportTemplate.findUnique({
      where: { id },
    });

    if (!existing || existing.tenantId !== tenantId) {
      res.status(404).json({ message: 'Template não encontrado.' });
      return;
    }

    const updateData: any = {
      name: body.name,
      description: body.description,
      reportType: body.reportType,
      status: body.status,
      isPublic: body.isPublic,
      metadata: body.metadata,
    };

    if (body.components !== undefined) {
      // Deletar componentes existentes e criar novos
      await prisma.reportComponent.deleteMany({
        where: { reportTemplateId: id },
      });

      updateData.components = {
        create: body.components.map((comp) => ({
          componentType: comp.componentType,
          order: comp.order,
          title: comp.title,
          configuration: comp.configuration,
          dataSource: comp.dataSource,
          style: comp.style,
        })),
      };
    }

    const template = await prisma.reportTemplate.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        components: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json({
      id: template.id,
      name: template.name,
      description: template.description,
      reportType: template.reportType,
      status: template.status,
      isPublic: template.isPublic,
      components: template.components,
      createdBy: {
        id: template.creator.id,
        name: template.creator.name,
        email: template.creator.email,
      },
      metadata: template.metadata,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/templates/{id}:
 *   delete:
 *     summary: Eliminar template
 *     tags: [Reports]
 */
router.delete('/templates/:id', authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const template = await prisma.reportTemplate.findUnique({
      where: { id },
    });

    if (!template || template.tenantId !== tenantId) {
      res.status(404).json({ message: 'Template não encontrado.' });
      return;
    }

    await prisma.reportTemplate.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/generate/{templateId}:
 *   post:
 *     summary: Gerar relatório a partir de template
 *     tags: [Reports]
 */
router.post('/generate/:templateId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const { templateId } = req.params;
    const { format = 'PDF', filters } = req.body;

    console.log(`[Reports] Gerando relatório: templateId=${templateId}, format=${format}, tenantId=${tenantId}`);

    // Verificar se o template existe
    const templateExists = await prisma.reportTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, tenantId: true, isPublic: true },
    });

    if (!templateExists) {
      return res.status(404).json({ message: 'Template não encontrado.' });
    }

    if (templateExists.tenantId !== tenantId && !templateExists.isPublic) {
      return res.status(403).json({ message: 'Não tem permissão para aceder a este template.' });
    }

    // Buscar dados necessários
    console.log('[Reports] Buscando dados...');
    let internalAudits, externalAudits, actions, occurrences, sectors, summary;
    
    try {
      [internalAudits, externalAudits, actions, occurrences, sectors, summary] = await Promise.all([
        fetchInternalAudits(tenantId),
        fetchExternalAudits(tenantId),
        fetchActionItems(tenantId),
        fetchOccurrences(tenantId),
        fetchSectors(tenantId),
        fetchDashboardSummary(tenantId),
      ]);
      console.log('[Reports] Dados carregados:', {
        internalAudits: internalAudits?.length || 0,
        externalAudits: externalAudits?.length || 0,
        actions: actions?.length || 0,
        occurrences: occurrences?.length || 0,
        sectors: sectors?.length || 0,
      });
    } catch (dataError: any) {
      console.error('[Reports] Erro ao buscar dados:', dataError);
      throw new Error(`Erro ao buscar dados: ${dataError.message}`);
    }

    const reportData: ReportData = {
      internalAudits,
      externalAudits,
      actions,
      occurrences,
      sectors,
      summary,
    };

    const context: ReportContext = {
      tenantId,
      userId,
      filters,
    };

    console.log('[Reports] Gerando relatório...');
    let result: { filePath: string; fileName: string };

    try {
      switch (format.toUpperCase()) {
        case 'PDF':
          result = await ReportEngine.generatePdfReport(templateId, context, reportData);
          break;
        case 'CSV':
          result = await ReportEngine.generateCsvReport(templateId, context, reportData);
          break;
        default:
          return res.status(400).json({ message: 'Formato não suportado. Use PDF ou CSV.' });
      }
      console.log('[Reports] Relatório gerado:', result.filePath);
    } catch (generateError: any) {
      console.error('[Reports] Erro ao gerar relatório:', generateError);
      console.error('[Reports] Stack:', generateError.stack);
      throw generateError;
    }

    // Enviar ficheiro
    if (fs.existsSync(result.filePath)) {
      const mimeType = format === 'PDF' ? 'application/pdf' : 'text/csv';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.sendFile(path.resolve(result.filePath));
    } else {
      console.error('[Reports] Ficheiro não encontrado:', result.filePath);
      res.status(500).json({ message: 'Erro ao gerar relatório: ficheiro não foi criado.' });
    }
  } catch (error: any) {
    console.error('[Reports] Erro ao gerar relatório:', error);
    console.error('[Reports] Stack:', error.stack);
    console.error('[Reports] Error name:', error.name);
    console.error('[Reports] Error message:', error.message);
    if (error.cause) {
      console.error('[Reports] Error cause:', error.cause);
    }
    res.status(500).json({
      message: 'Erro ao gerar relatório.',
      error: process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
  }
});

/**
 * @swagger
 * /api/reports/scheduled:
 *   get:
 *     summary: Listar relatórios agendados
 *     tags: [Reports]
 */
router.get('/scheduled', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { enabled } = req.query;

    const where: any = { tenantId };
    if (enabled !== undefined) where.enabled = enabled === 'true';

    const scheduled = await prisma.scheduledReport.findMany({
      where,
      include: {
        reportTemplate: {
          select: { id: true, name: true, reportType: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      scheduled.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        frequency: s.frequency,
        schedule: s.schedule,
        recipients: Array.isArray(s.recipients) ? s.recipients : JSON.parse(s.recipients as string),
        format: Array.isArray(s.format) ? s.format : JSON.parse(s.format as string),
        filters: s.filters,
        status: s.status,
        enabled: s.enabled,
        lastRunAt: s.lastRunAt?.toISOString() || null,
        nextRunAt: s.nextRunAt?.toISOString() || null,
        reportTemplate: s.reportTemplate,
        createdBy: {
          id: s.creator.id,
          name: s.creator.name,
          email: s.creator.email,
        },
        recentExecutions: s.executions.map((e) => ({
          id: e.id,
          status: e.status,
          errorMessage: e.errorMessage,
          startedAt: e.startedAt.toISOString(),
          completedAt: e.completedAt?.toISOString() || null,
        })),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/scheduled:
 *   post:
 *     summary: Agendar relatório
 *     tags: [Reports]
 */
router.post('/scheduled', authenticateToken, requireRole('ADMIN', 'GESTOR'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const body = createScheduledReportSchema.parse(req.body);

    // Verificar se template existe e é acessível
    const template = await prisma.reportTemplate.findUnique({
      where: { id: body.reportTemplateId },
    });

    if (!template || (template.tenantId !== tenantId && !template.isPublic)) {
      res.status(404).json({ message: 'Template não encontrado.' });
      return;
    }

    // Calcular próximo run
    const nextRunAt = calculateNextRun(body.frequency, body.schedule);

    const scheduled = await prisma.scheduledReport.create({
      data: {
        tenantId,
        reportTemplateId: body.reportTemplateId,
        name: body.name,
        description: body.description,
        frequency: body.frequency,
        schedule: body.schedule,
        recipients: body.recipients || [],
        format: body.format || ['PDF'],
        filters: body.filters,
        status: ReportStatus.ACTIVE,
        enabled: body.enabled ?? true,
        nextRunAt,
        createdBy: userId,
      },
      include: {
        reportTemplate: {
          select: { id: true, name: true, reportType: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({
      id: scheduled.id,
      name: scheduled.name,
      description: scheduled.description,
      frequency: scheduled.frequency,
      schedule: scheduled.schedule,
      recipients: Array.isArray(scheduled.recipients) ? scheduled.recipients : JSON.parse(scheduled.recipients as string),
      format: Array.isArray(scheduled.format) ? scheduled.format : JSON.parse(scheduled.format as string),
      status: scheduled.status,
      enabled: scheduled.enabled,
      nextRunAt: scheduled.nextRunAt?.toISOString() || null,
      reportTemplate: scheduled.reportTemplate,
      createdBy: {
        id: scheduled.creator.id,
        name: scheduled.creator.name,
        email: scheduled.creator.email,
      },
      createdAt: scheduled.createdAt.toISOString(),
      updatedAt: scheduled.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper para calcular próximo run
 */
function calculateNextRun(frequency: ReportFrequency, schedule: string): Date {
  const now = new Date();
  const next = new Date(now);

  switch (frequency) {
    case ReportFrequency.DAILY:
      const [hours, minutes] = schedule.split(':').map(Number);
      next.setHours(hours || 9, minutes || 0, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case ReportFrequency.WEEKLY:
      next.setDate(next.getDate() + (7 - next.getDay()));
      next.setHours(9, 0, 0, 0);
      break;

    case ReportFrequency.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(9, 0, 0, 0);
      break;

    case ReportFrequency.QUARTERLY:
      next.setMonth(next.getMonth() + 3);
      next.setDate(1);
      next.setHours(9, 0, 0, 0);
      break;

    case ReportFrequency.YEARLY:
      next.setFullYear(next.getFullYear() + 1);
      next.setMonth(0);
      next.setDate(1);
      next.setHours(9, 0, 0, 0);
      break;

    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * @swagger
 * /api/reports/scheduled/{id}:
 *   put:
 *     summary: Atualizar relatório agendado
 *     tags: [Reports]
 */
router.put('/scheduled/:id', authenticateToken, requireRole('ADMIN', 'GESTOR'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const body = createScheduledReportSchema.partial().parse(req.body);

    const existing = await prisma.scheduledReport.findUnique({
      where: { id },
    });

    if (!existing || existing.tenantId !== tenantId) {
      res.status(404).json({ message: 'Relatório agendado não encontrado.' });
      return;
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.frequency !== undefined) {
      updateData.frequency = body.frequency;
      updateData.schedule = body.schedule || existing.schedule;
      updateData.nextRunAt = calculateNextRun(body.frequency, body.schedule || existing.schedule);
    }
    if (body.schedule !== undefined && body.frequency) {
      updateData.schedule = body.schedule;
      updateData.nextRunAt = calculateNextRun(body.frequency, body.schedule);
    }
    if (body.recipients !== undefined) updateData.recipients = body.recipients;
    if (body.format !== undefined) updateData.format = body.format;
    if (body.filters !== undefined) updateData.filters = body.filters;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;
    if (body.enabled === false) updateData.status = ReportStatus.PAUSED;
    if (body.enabled === true && existing.status === ReportStatus.PAUSED) updateData.status = ReportStatus.ACTIVE;

    const updated = await prisma.scheduledReport.update({
      where: { id },
      data: updateData,
      include: {
        reportTemplate: {
          select: { id: true, name: true, reportType: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      frequency: updated.frequency,
      schedule: updated.schedule,
      recipients: Array.isArray(updated.recipients) ? updated.recipients : JSON.parse(updated.recipients as string),
      format: Array.isArray(updated.format) ? updated.format : JSON.parse(updated.format as string),
      status: updated.status,
      enabled: updated.enabled,
      nextRunAt: updated.nextRunAt?.toISOString() || null,
      reportTemplate: updated.reportTemplate,
      createdBy: {
        id: updated.creator.id,
        name: updated.creator.name,
        email: updated.creator.email,
      },
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/scheduled/{id}:
 *   delete:
 *     summary: Eliminar relatório agendado
 *     tags: [Reports]
 */
router.delete('/scheduled/:id', authenticateToken, requireRole('ADMIN', 'GESTOR'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const scheduled = await prisma.scheduledReport.findUnique({
      where: { id },
    });

    if (!scheduled || scheduled.tenantId !== tenantId) {
      res.status(404).json({ message: 'Relatório agendado não encontrado.' });
      return;
    }

    await prisma.scheduledReport.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

