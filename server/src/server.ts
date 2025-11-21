import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import type { Request } from 'express';
import type { DatabaseSchema } from './types';
import { prisma } from './prisma';
import { generalLimiter, authLimiter, createLimiter, importLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { sanitizeBody, validateTenantId } from './middleware/security';
import { cache, cachedQuery } from './utils/cache';
import { requestLogger, errorLogger } from './middleware/logger';
import {
  buildActionItemCreateData,
  buildActionItemUpdateData,
  buildExternalAuditCreateData,
  buildExternalAuditUpdateData,
  buildInternalAuditCreateData,
  buildInternalAuditUpdateData,
  buildOccurrenceCreateData,
  buildOccurrenceUpdateData,
  buildSectorCreateData,
  buildSectorUpdateData,
  mapActionItemFromDb,
  mapExternalAuditFromDb,
  mapInternalAuditFromDb,
  mapOccurrenceFromDb,
  mapSectorFromDb,
} from './mappers';
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';
import logsRoutes from './routes/logs';
import attachmentsRoutes from './routes/attachments';
import commentsRoutes from './routes/comments';
import approvalsRoutes from './routes/approvals';
import workflowsRoutes from './routes/workflows';
import documentsRoutes from './routes/documents';
import reportsRoutes from './routes/reports';
import analyticsRoutes from './routes/analytics'; // Import analytics routes
import { authenticateToken, AuthRequest, requireRole } from './middleware/auth';
import { setupSwagger } from './config/swagger';
import { createAuditLogger } from './utils/auditTrail';
import { reportScheduler } from './services/reportScheduler';
import { corsMiddleware } from './middleware/cors';

const app = express();

// Configurar trust proxy para funcionar corretamente no Vercel
// Isto permite que o Express confie nos headers X-Forwarded-* do proxy reverso
app.set('trust proxy', true);

// CORS - PRIMEIRO middleware, antes de tudo (incluindo Helmet)
// Usar middleware customizado mais robusto
app.use(corsMiddleware);

// Também usar o middleware cors padrão como backup
const corsOptions = {
  credentials: true,
  origin: true, // Permitir qualquer origem
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ===== SEGURANÇA =====
// Helmet para headers de segurança HTTP (depois do CORS)
// IMPORTANTE: Desabilitar alguns headers do Helmet que podem interferir com CORS
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar CSP temporariamente para evitar conflitos
  crossOriginEmbedderPolicy: false, // Permitir recursos externos se necessário
  crossOriginResourcePolicy: false, // Desabilitar para permitir CORS completo
  crossOriginOpenerPolicy: false, // Desabilitar para permitir CORS completo
}));

// Compressão de respostas
app.use(compression());

// Rate limiting geral (já ignora OPTIONS no skip)
app.use(generalLimiter);

// Parsing
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitização de inputs
app.use(sanitizeBody);
app.use(validateTenantId);

// Logging estruturado (antes das rotas)
app.use(requestLogger);

// Documentação OpenAPI
setupSwagger(app);

// Health checks (sem rate limiting e antes de autenticação)
app.use('/', healthRoutes);

// Rota na raiz para verificar se o servidor está a funcionar
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'SGI Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ready: '/ready',
      api: '/api',
      docs: '/api/docs'
    }
  });
});

// Rota para favicon (evitar 404 no navegador)
app.get('/favicon.ico', (_req, res) => {
  res.status(204).end(); // No Content - não há favicon, mas não é erro
});

// Rotas públicas
app.use('/api/auth', authRoutes);

// Rotas protegidas (requerem autenticação)
app.use('/api/logs', authenticateToken, logsRoutes);
app.use('/api/attachments', authenticateToken, attachmentsRoutes);
app.use('/api/comments', authenticateToken, commentsRoutes);
app.use('/api/approvals', authenticateToken, approvalsRoutes);
app.use('/api/workflows', authenticateToken, workflowsRoutes);
app.use('/api/documents', authenticateToken, documentsRoutes);
app.use('/api/reports', authenticateToken, reportsRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes); // Add analytics routes

const PORT = Number(process.env.PORT ?? 5801);
const BASE_PATH = process.env.BASE_PATH ?? '/api';
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? 'tenant-default';

// Iniciar scheduler de relatórios
if (process.env.ENABLE_REPORT_SCHEDULER !== 'false') {
  reportScheduler.start();
  console.log('[Server] Report scheduler iniciado.');
}

const buildPath = (segment: string) => `${BASE_PATH}${segment}`;

const getTenantId = (req: AuthRequest | Request): string => {
  if ('user' in req && req.user) {
    return req.user.tenantId;
  }
  return (req.header('x-tenant-id') as string | undefined) ?? DEFAULT_TENANT_ID;
};

const notFound = (res: express.Response) => res.status(404).json({ message: 'Registo não encontrado' });

const fetchFullDataset = async (tenantId: string) => {
  const [internalAudits, externalAudits, actionItems, occurrences, sectors] = await Promise.all([
    prisma.internalAudit.findMany({ where: { tenantId } }),
    prisma.externalAudit.findMany({ where: { tenantId } }),
    prisma.actionItem.findMany({ where: { tenantId } }),
    prisma.occurrence.findMany({ where: { tenantId } }),
    prisma.sector.findMany({ where: { tenantId } }),
  ]);
  return {
    internalAudits: internalAudits.map(mapInternalAuditFromDb),
    externalAudits: externalAudits.map(mapExternalAuditFromDb),
    actionItems: actionItems.map(mapActionItemFromDb),
    occurrences: occurrences.map(mapOccurrenceFromDb),
    sectors: sectors.map(mapSectorFromDb),
  };
};

app.get(buildPath('/audits/internal'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Usar cache para queries frequentes (apenas se não houver filtros especiais)
    const cacheKey = `audits:internal:${tenantId}:${page}:${limit}`;
    
    const result = await cachedQuery(
      cacheKey,
      async () => {
        const [audits, total] = await Promise.all([
          prisma.internalAudit.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          prisma.internalAudit.count({ where: { tenantId } }),
        ]);

        return {
          data: audits.map(mapInternalAuditFromDb),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      2 * 60 * 1000, // Cache por 2 minutos
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post(buildPath('/audits/internal'), createLimiter, authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;
    const data = buildInternalAuditCreateData(req.body, tenantId);
    const created = await prisma.internalAudit.create({ data });
    
    // Registrar no audit trail
    const auditLogger = createAuditLogger(tenantId, userId);
    auditLogger.create('InternalAudit', `Auditoria interna criada: ${created.id}`, created.id, {
      ano: created.ano,
      entidadeAuditora: created.entidadeAuditora,
      iso: created.iso,
    });
    
    // Invalidar cache relacionado
    for (let page = 1; page <= 10; page++) {
      for (let limit of [10, 20, 50, 100]) {
        cache.delete(`audits:internal:${tenantId}:${page}:${limit}`);
      }
    }
    cache.delete(`summary:${tenantId}`);
    
    res.status(201).json(mapInternalAuditFromDb(created));
  } catch (error) {
    next(error);
  }
});

app.put(buildPath('/audits/internal/:id'), authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;
    const { id } = req.params;
    const existing = await prisma.internalAudit.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      notFound(res);
      return;
    }
    const data = buildInternalAuditUpdateData(req.body);
    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
      return;
    }
    const updated = await prisma.internalAudit.update({ where: { id }, data });
    
    // Registrar no audit trail
    const auditLogger = createAuditLogger(tenantId, userId);
    auditLogger.update('InternalAudit', `Auditoria interna atualizada: ${updated.id}`, id, {
      ano: updated.ano,
      entidadeAuditora: updated.entidadeAuditora,
      iso: updated.iso,
      camposAlterados: Object.keys(data),
    });
    
    res.json(mapInternalAuditFromDb(updated));
  } catch (error) {
    next(error);
  }
});

app.delete(buildPath('/audits/internal/:id'), authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;
    const { id } = req.params;
    const existing = await prisma.internalAudit.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      notFound(res);
      return;
    }
    await prisma.internalAudit.delete({ where: { id } });
    
    // Registrar no audit trail
    const auditLogger = createAuditLogger(tenantId, userId);
    auditLogger.delete('InternalAudit', `Auditoria interna eliminada: ${existing.id}`, id, {
      ano: existing.ano,
      entidadeAuditora: existing.entidadeAuditora,
      iso: existing.iso,
    });
    
    res.json(mapInternalAuditFromDb(existing));
  } catch (error) {
    next(error);
  }
});

app.get(buildPath('/audits/external'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [audits, total] = await Promise.all([
      prisma.externalAudit.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.externalAudit.count({ where: { tenantId } }),
    ]);

    res.json({
      data: audits.map(mapExternalAuditFromDb),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post(buildPath('/audits/external'), createLimiter, authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;
    const data = buildExternalAuditCreateData(req.body, tenantId);
    
    console.log('[POST /audits/external] Creating audit with data:', JSON.stringify(data, null, 2));
    
    const created = await prisma.externalAudit.create({ data });
    
    // Registrar no audit trail
    try {
      const auditLogger = createAuditLogger(tenantId, userId);
      auditLogger.create('ExternalAudit', `Auditoria externa criada: ${created.id}`, created.id, {
        ano: created.ano,
        entidadeAuditora: created.entidadeAuditora,
        iso: created.iso,
      });
    } catch (auditError) {
      console.error('[POST /audits/external] Error logging audit trail:', auditError);
      // Não bloquear a criação se o audit trail falhar
    }
    
    // Invalidar cache relacionado
    for (let page = 1; page <= 10; page++) {
      for (let limit of [10, 20, 50, 100]) {
        cache.delete(`audits:external:${tenantId}:${page}:${limit}`);
      }
    }
    cache.delete(`summary:${tenantId}`);
    
    res.status(201).json(mapExternalAuditFromDb(created));
  } catch (error) {
    console.error('[POST /audits/external] Error:', error);
    next(error);
  }
});

app.put(buildPath('/audits/external/:id'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const existing = await prisma.externalAudit.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      notFound(res);
      return;
    }
    const data = buildExternalAuditUpdateData(req.body);
    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
      return;
    }
    const updated = await prisma.externalAudit.update({ where: { id }, data });
    res.json(mapExternalAuditFromDb(updated));
  } catch (error) {
    next(error);
  }
});

app.delete(buildPath('/audits/external/:id'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const existing = await prisma.externalAudit.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      notFound(res);
      return;
    }
    await prisma.externalAudit.delete({ where: { id } });
    res.json(mapExternalAuditFromDb(existing));
  } catch (error) {
    next(error);
  }
});

app.get(buildPath('/actions'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [actions, total] = await Promise.all([
      prisma.actionItem.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.actionItem.count({ where: { tenantId } }),
    ]);

    res.json({
      data: actions.map(mapActionItemFromDb),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post(buildPath('/actions'), createLimiter, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const data = buildActionItemCreateData(req.body, tenantId);
    const created = await prisma.actionItem.create({ data });
    res.status(201).json(mapActionItemFromDb(created));
  } catch (error) {
    next(error);
  }
});

app.put(buildPath('/actions/:id'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const existing = await prisma.actionItem.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      notFound(res);
      return;
    }
    const data = buildActionItemUpdateData(req.body);
    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
      return;
    }
    const updated = await prisma.actionItem.update({ where: { id }, data });
    res.json(mapActionItemFromDb(updated));
  } catch (error) {
    next(error);
  }
});

app.delete(buildPath('/actions/:id'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const existing = await prisma.actionItem.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      notFound(res);
      return;
    }
    await prisma.actionItem.delete({ where: { id } });
    res.json(mapActionItemFromDb(existing));
  } catch (error) {
    next(error);
  }
});

app.get(buildPath('/occurrences'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.occurrence.findMany({
        where: { tenantId },
        orderBy: { data: 'desc' },
        skip,
        take: limit,
      }),
      prisma.occurrence.count({ where: { tenantId } }),
    ]);

    res.json({
      data: items.map(mapOccurrenceFromDb),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post(buildPath('/occurrences'), createLimiter, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const data = buildOccurrenceCreateData(req.body, tenantId);
    const created = await prisma.occurrence.create({ data });
    res.status(201).json(mapOccurrenceFromDb(created));
  } catch (error) {
    next(error);
  }
});

app.put(buildPath('/occurrences/:id'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const existing = await prisma.occurrence.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      notFound(res);
      return;
    }
    const data = buildOccurrenceUpdateData(req.body);
    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
      return;
    }
    const updated = await prisma.occurrence.update({ where: { id }, data });
    res.json(mapOccurrenceFromDb(updated));
  } catch (error) {
    next(error);
  }
});

app.delete(buildPath('/occurrences/:id'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const existing = await prisma.occurrence.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      notFound(res);
      return;
    }
    await prisma.occurrence.delete({ where: { id } });
    res.json(mapOccurrenceFromDb(existing));
  } catch (error) {
    next(error);
  }
});

app.get(buildPath('/sectors'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.sector.findMany({
        where: { tenantId },
        orderBy: { nome: 'asc' },
        skip,
        take: limit,
      }),
      prisma.sector.count({ where: { tenantId } }),
    ]);

    res.json({
      data: items.map(mapSectorFromDb),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post(buildPath('/sectors'), createLimiter, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const data = buildSectorCreateData(req.body, tenantId);
    const created = await prisma.sector.create({ data });
    res.status(201).json(mapSectorFromDb(created));
  } catch (error) {
    next(error);
  }
});

app.put(buildPath('/sectors/:id'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const existing = await prisma.sector.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      notFound(res);
      return;
    }
    const data = buildSectorUpdateData(req.body);
    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
      return;
    }
    const updated = await prisma.sector.update({ where: { id }, data });
    res.json(mapSectorFromDb(updated));
  } catch (error) {
    next(error);
  }
});

app.delete(buildPath('/sectors/:id'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const existing = await prisma.sector.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      notFound(res);
      return;
    }
    await prisma.sector.delete({ where: { id } });
    res.json(mapSectorFromDb(existing));
  } catch (error) {
    next(error);
  }
});

const sanitizeImportPayload = (payload: Partial<DatabaseSchema>, tenantId: string) => ({
  internalAudits: payload.internalAudits?.map((item) => buildInternalAuditCreateData(item, tenantId)) ?? [],
  externalAudits: payload.externalAudits?.map((item) => buildExternalAuditCreateData(item, tenantId)) ?? [],
  actionItems: payload.actionItems?.map((item) => buildActionItemCreateData(item, tenantId)) ?? [],
  occurrences: payload.occurrences?.map((item) => buildOccurrenceCreateData(item, tenantId)) ?? [],
  sectors: payload.sectors?.map((item) => buildSectorCreateData(item, tenantId)) ?? [],
});

const applyImport = async (
  tenantId: string,
  payload: Partial<DatabaseSchema>,
  mode: 'merge' | 'replace',
) => {
  const collections = sanitizeImportPayload(payload, tenantId);
  let inserted = 0;
  await prisma.$transaction(async (tx) => {
    if (mode === 'replace') {
      await Promise.all([
        tx.internalAudit.deleteMany({ where: { tenantId } }),
        tx.externalAudit.deleteMany({ where: { tenantId } }),
        tx.actionItem.deleteMany({ where: { tenantId } }),
        tx.occurrence.deleteMany({ where: { tenantId } }),
        tx.sector.deleteMany({ where: { tenantId } }),
      ]);
    }
    if (collections.internalAudits.length) {
      await tx.internalAudit.createMany({ data: collections.internalAudits });
      inserted += collections.internalAudits.length;
    }
    if (collections.externalAudits.length) {
      await tx.externalAudit.createMany({ data: collections.externalAudits });
      inserted += collections.externalAudits.length;
    }
    if (collections.actionItems.length) {
      await tx.actionItem.createMany({ data: collections.actionItems });
      inserted += collections.actionItems.length;
    }
    if (collections.occurrences.length) {
      await tx.occurrence.createMany({ data: collections.occurrences });
      inserted += collections.occurrences.length;
    }
    if (collections.sectors.length) {
      await tx.sector.createMany({ data: collections.sectors });
      inserted += collections.sectors.length;
    }
    await tx.importLog.create({
      data: {
        tenantId,
        fileName: 'api-import',
        mode,
        entity: 'bulk',
        status: 'COMPLETED',
        totalRecords: inserted,
      },
    });
  });

  return fetchFullDataset(tenantId);
};

app.post(buildPath('/import'), importLimiter, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const payload = req.body as Partial<DatabaseSchema>;
    if (!payload || Object.keys(payload).length === 0) {
      res.status(400).json({ message: 'Payload vazio. Envia pelo menos um array de dados.' });
      return;
    }
    const nextDataset = await applyImport(tenantId, payload, 'merge');
    res.json(nextDataset);
  } catch (error) {
    next(error);
  }
});

app.post(buildPath('/import/replace'), importLimiter, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const payload = req.body as Partial<DatabaseSchema>;
    const nextDataset = await applyImport(tenantId, payload, 'replace');
    res.json(nextDataset);
  } catch (error) {
    next(error);
  }
});

app.delete(buildPath('/import/reset'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    await prisma.$transaction([
      prisma.internalAudit.deleteMany({ where: { tenantId } }),
      prisma.externalAudit.deleteMany({ where: { tenantId } }),
      prisma.actionItem.deleteMany({ where: { tenantId } }),
      prisma.occurrence.deleteMany({ where: { tenantId } }),
      prisma.sector.deleteMany({ where: { tenantId } }),
    ]);
    res.json(await fetchFullDataset(tenantId));
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check do servidor
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor está operacional
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

// Exportar a app para uso no Vercel (serverless)
// Se não estiver no Vercel, iniciar o servidor normalmente
if (process.env.VERCEL) {
  // No Vercel, apenas exportar a app (não fazer listen)
  // O handler em api/index.ts vai usar esta app
} else {
  // Em desenvolvimento/produção tradicional, iniciar servidor
  app.listen(PORT, () => {
    console.log(`SGI backend a correr em http://localhost:${PORT}${BASE_PATH}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Ready check: http://localhost:${PORT}/ready`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM recebido. Encerrando servidor...');
    reportScheduler.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[Server] SIGINT recebido. Encerrando servidor...');
    reportScheduler.stop();
    process.exit(0);
  });
}

// Exportar a app para uso no Vercel
export default app;
