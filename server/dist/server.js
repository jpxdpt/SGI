"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const prisma_1 = require("./prisma");
const rateLimiter_1 = require("./middleware/rateLimiter");
const security_1 = require("./middleware/security");
const cache_1 = require("./utils/cache");
const logger_1 = require("./middleware/logger");
const mappers_1 = require("./mappers");
const auth_1 = __importDefault(require("./routes/auth"));
const health_1 = __importDefault(require("./routes/health"));
const logs_1 = __importDefault(require("./routes/logs"));
const attachments_1 = __importDefault(require("./routes/attachments"));
const comments_1 = __importDefault(require("./routes/comments"));
const approvals_1 = __importDefault(require("./routes/approvals"));
const auth_2 = require("./middleware/auth");
const swagger_1 = require("./config/swagger");
const auditTrail_1 = require("./utils/auditTrail");
const app = (0, express_1.default)();
const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:5173', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:3000'];
// ===== SEGURANÇA =====
// Helmet para headers de segurança HTTP
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
        },
    },
    crossOriginEmbedderPolicy: false, // Permitir recursos externos se necessário
}));
// CORS
app.use((0, cors_1.default)({
    credentials: true,
    origin: (origin, callback) => {
        // Permitir requisições sem origin (ex: Postman, curl) ou das origens permitidas
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`[CORS] Origin bloqueada: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
}));
// Compressão de respostas
app.use((0, compression_1.default)());
// Rate limiting geral
app.use(rateLimiter_1.generalLimiter);
// Parsing
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Sanitização de inputs
app.use(security_1.sanitizeBody);
app.use(security_1.validateTenantId);
// Logging estruturado (antes das rotas)
app.use(logger_1.requestLogger);
// Documentação OpenAPI
(0, swagger_1.setupSwagger)(app);
// Health checks (sem rate limiting e antes de autenticação)
app.use('/', health_1.default);
// Rotas públicas
app.use('/api/auth', auth_1.default);
// Rotas protegidas (requerem autenticação)
app.use('/api/logs', auth_2.authenticateToken, logs_1.default);
app.use('/api/attachments', auth_2.authenticateToken, attachments_1.default);
app.use('/api/comments', auth_2.authenticateToken, comments_1.default);
app.use('/api/approvals', auth_2.authenticateToken, approvals_1.default);
const PORT = Number(process.env.PORT ?? 5801);
const BASE_PATH = process.env.BASE_PATH ?? '/api';
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? 'tenant-default';
const buildPath = (segment) => `${BASE_PATH}${segment}`;
const getTenantId = (req) => {
    if ('user' in req && req.user) {
        return req.user.tenantId;
    }
    return req.header('x-tenant-id') ?? DEFAULT_TENANT_ID;
};
const notFound = (res) => res.status(404).json({ message: 'Registo não encontrado' });
const fetchFullDataset = async (tenantId) => {
    const [internalAudits, externalAudits, actionItems, occurrences, sectors] = await Promise.all([
        prisma_1.prisma.internalAudit.findMany({ where: { tenantId } }),
        prisma_1.prisma.externalAudit.findMany({ where: { tenantId } }),
        prisma_1.prisma.actionItem.findMany({ where: { tenantId } }),
        prisma_1.prisma.occurrence.findMany({ where: { tenantId } }),
        prisma_1.prisma.sector.findMany({ where: { tenantId } }),
    ]);
    return {
        internalAudits: internalAudits.map(mappers_1.mapInternalAuditFromDb),
        externalAudits: externalAudits.map(mappers_1.mapExternalAuditFromDb),
        actionItems: actionItems.map(mappers_1.mapActionItemFromDb),
        occurrences: occurrences.map(mappers_1.mapOccurrenceFromDb),
        sectors: sectors.map(mappers_1.mapSectorFromDb),
    };
};
app.get(buildPath('/audits/internal'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        // Usar cache para queries frequentes (apenas se não houver filtros especiais)
        const cacheKey = `audits:internal:${tenantId}:${page}:${limit}`;
        const result = await (0, cache_1.cachedQuery)(cacheKey, async () => {
            const [audits, total] = await Promise.all([
                prisma_1.prisma.internalAudit.findMany({
                    where: { tenantId },
                    orderBy: { dataPrevista: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma_1.prisma.internalAudit.count({ where: { tenantId } }),
            ]);
            return {
                data: audits.map(mappers_1.mapInternalAuditFromDb),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }, 2 * 60 * 1000);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
app.post(buildPath('/audits/internal'), rateLimiter_1.createLimiter, auth_2.authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user?.id;
        const data = (0, mappers_1.buildInternalAuditCreateData)(req.body, tenantId);
        const created = await prisma_1.prisma.internalAudit.create({ data });
        // Registrar no audit trail
        const auditLogger = (0, auditTrail_1.createAuditLogger)(tenantId, userId);
        auditLogger.create('InternalAudit', `Auditoria interna criada: ${created.descricao || created.id}`, created.id, {
            descricao: created.descricao,
            setor: created.setor,
            dataPrevista: created.dataPrevista,
            status: created.status,
        });
        // Invalidar cache relacionado
        for (let page = 1; page <= 10; page++) {
            for (let limit of [10, 20, 50, 100]) {
                cache_1.cache.delete(`audits:internal:${tenantId}:${page}:${limit}`);
            }
        }
        cache_1.cache.delete(`summary:${tenantId}`);
        res.status(201).json((0, mappers_1.mapInternalAuditFromDb)(created));
    }
    catch (error) {
        next(error);
    }
});
app.put(buildPath('/audits/internal/:id'), auth_2.authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user?.id;
        const { id } = req.params;
        const existing = await prisma_1.prisma.internalAudit.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            notFound(res);
            return;
        }
        const data = (0, mappers_1.buildInternalAuditUpdateData)(req.body);
        if (Object.keys(data).length === 0) {
            res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
            return;
        }
        const updated = await prisma_1.prisma.internalAudit.update({ where: { id }, data });
        // Registrar no audit trail
        const auditLogger = (0, auditTrail_1.createAuditLogger)(tenantId, userId);
        auditLogger.update('InternalAudit', `Auditoria interna atualizada: ${updated.descricao || id}`, id, {
            descricao: updated.descricao,
            setor: updated.setor,
            status: updated.status,
            camposAlterados: Object.keys(data),
        });
        res.json((0, mappers_1.mapInternalAuditFromDb)(updated));
    }
    catch (error) {
        next(error);
    }
});
app.delete(buildPath('/audits/internal/:id'), auth_2.authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user?.id;
        const { id } = req.params;
        const existing = await prisma_1.prisma.internalAudit.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            notFound(res);
            return;
        }
        await prisma_1.prisma.internalAudit.delete({ where: { id } });
        // Registrar no audit trail
        const auditLogger = (0, auditTrail_1.createAuditLogger)(tenantId, userId);
        auditLogger.delete('InternalAudit', `Auditoria interna eliminada: ${existing.descricao || id}`, id, {
            descricao: existing.descricao,
            setor: existing.setor,
            status: existing.status,
        });
        res.json((0, mappers_1.mapInternalAuditFromDb)(existing));
    }
    catch (error) {
        next(error);
    }
});
app.get(buildPath('/audits/external'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const [audits, total] = await Promise.all([
            prisma_1.prisma.externalAudit.findMany({
                where: { tenantId },
                orderBy: { dataPrevista: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.externalAudit.count({ where: { tenantId } }),
        ]);
        res.json({
            data: audits.map(mappers_1.mapExternalAuditFromDb),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        next(error);
    }
});
app.post(buildPath('/audits/external'), rateLimiter_1.createLimiter, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const data = (0, mappers_1.buildExternalAuditCreateData)(req.body, tenantId);
        const created = await prisma_1.prisma.externalAudit.create({ data });
        res.status(201).json((0, mappers_1.mapExternalAuditFromDb)(created));
    }
    catch (error) {
        next(error);
    }
});
app.put(buildPath('/audits/external/:id'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma_1.prisma.externalAudit.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            notFound(res);
            return;
        }
        const data = (0, mappers_1.buildExternalAuditUpdateData)(req.body);
        if (Object.keys(data).length === 0) {
            res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
            return;
        }
        const updated = await prisma_1.prisma.externalAudit.update({ where: { id }, data });
        res.json((0, mappers_1.mapExternalAuditFromDb)(updated));
    }
    catch (error) {
        next(error);
    }
});
app.delete(buildPath('/audits/external/:id'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma_1.prisma.externalAudit.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            notFound(res);
            return;
        }
        await prisma_1.prisma.externalAudit.delete({ where: { id } });
        res.json((0, mappers_1.mapExternalAuditFromDb)(existing));
    }
    catch (error) {
        next(error);
    }
});
app.get(buildPath('/actions'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const [actions, total] = await Promise.all([
            prisma_1.prisma.actionItem.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.actionItem.count({ where: { tenantId } }),
        ]);
        res.json({
            data: actions.map(mappers_1.mapActionItemFromDb),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        next(error);
    }
});
app.post(buildPath('/actions'), rateLimiter_1.createLimiter, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const data = (0, mappers_1.buildActionItemCreateData)(req.body, tenantId);
        const created = await prisma_1.prisma.actionItem.create({ data });
        res.status(201).json((0, mappers_1.mapActionItemFromDb)(created));
    }
    catch (error) {
        next(error);
    }
});
app.put(buildPath('/actions/:id'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma_1.prisma.actionItem.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            notFound(res);
            return;
        }
        const data = (0, mappers_1.buildActionItemUpdateData)(req.body);
        if (Object.keys(data).length === 0) {
            res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
            return;
        }
        const updated = await prisma_1.prisma.actionItem.update({ where: { id }, data });
        res.json((0, mappers_1.mapActionItemFromDb)(updated));
    }
    catch (error) {
        next(error);
    }
});
app.delete(buildPath('/actions/:id'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma_1.prisma.actionItem.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            notFound(res);
            return;
        }
        await prisma_1.prisma.actionItem.delete({ where: { id } });
        res.json((0, mappers_1.mapActionItemFromDb)(existing));
    }
    catch (error) {
        next(error);
    }
});
app.get(buildPath('/occurrences'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            prisma_1.prisma.occurrence.findMany({
                where: { tenantId },
                orderBy: { data: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.occurrence.count({ where: { tenantId } }),
        ]);
        res.json({
            data: items.map(mappers_1.mapOccurrenceFromDb),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        next(error);
    }
});
app.post(buildPath('/occurrences'), rateLimiter_1.createLimiter, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const data = (0, mappers_1.buildOccurrenceCreateData)(req.body, tenantId);
        const created = await prisma_1.prisma.occurrence.create({ data });
        res.status(201).json((0, mappers_1.mapOccurrenceFromDb)(created));
    }
    catch (error) {
        next(error);
    }
});
app.put(buildPath('/occurrences/:id'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma_1.prisma.occurrence.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            notFound(res);
            return;
        }
        const data = (0, mappers_1.buildOccurrenceUpdateData)(req.body);
        if (Object.keys(data).length === 0) {
            res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
            return;
        }
        const updated = await prisma_1.prisma.occurrence.update({ where: { id }, data });
        res.json((0, mappers_1.mapOccurrenceFromDb)(updated));
    }
    catch (error) {
        next(error);
    }
});
app.delete(buildPath('/occurrences/:id'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma_1.prisma.occurrence.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            notFound(res);
            return;
        }
        await prisma_1.prisma.occurrence.delete({ where: { id } });
        res.json((0, mappers_1.mapOccurrenceFromDb)(existing));
    }
    catch (error) {
        next(error);
    }
});
app.get(buildPath('/sectors'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            prisma_1.prisma.sector.findMany({
                where: { tenantId },
                orderBy: { nome: 'asc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.sector.count({ where: { tenantId } }),
        ]);
        res.json({
            data: items.map(mappers_1.mapSectorFromDb),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        next(error);
    }
});
app.post(buildPath('/sectors'), rateLimiter_1.createLimiter, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const data = (0, mappers_1.buildSectorCreateData)(req.body, tenantId);
        const created = await prisma_1.prisma.sector.create({ data });
        res.status(201).json((0, mappers_1.mapSectorFromDb)(created));
    }
    catch (error) {
        next(error);
    }
});
app.put(buildPath('/sectors/:id'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma_1.prisma.sector.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            notFound(res);
            return;
        }
        const data = (0, mappers_1.buildSectorUpdateData)(req.body);
        if (Object.keys(data).length === 0) {
            res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
            return;
        }
        const updated = await prisma_1.prisma.sector.update({ where: { id }, data });
        res.json((0, mappers_1.mapSectorFromDb)(updated));
    }
    catch (error) {
        next(error);
    }
});
app.delete(buildPath('/sectors/:id'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma_1.prisma.sector.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            notFound(res);
            return;
        }
        await prisma_1.prisma.sector.delete({ where: { id } });
        res.json((0, mappers_1.mapSectorFromDb)(existing));
    }
    catch (error) {
        next(error);
    }
});
const sanitizeImportPayload = (payload, tenantId) => ({
    internalAudits: payload.internalAudits?.map((item) => (0, mappers_1.buildInternalAuditCreateData)(item, tenantId)) ?? [],
    externalAudits: payload.externalAudits?.map((item) => (0, mappers_1.buildExternalAuditCreateData)(item, tenantId)) ?? [],
    actionItems: payload.actionItems?.map((item) => (0, mappers_1.buildActionItemCreateData)(item, tenantId)) ?? [],
    occurrences: payload.occurrences?.map((item) => (0, mappers_1.buildOccurrenceCreateData)(item, tenantId)) ?? [],
    sectors: payload.sectors?.map((item) => (0, mappers_1.buildSectorCreateData)(item, tenantId)) ?? [],
});
const applyImport = async (tenantId, payload, mode) => {
    const collections = sanitizeImportPayload(payload, tenantId);
    let inserted = 0;
    await prisma_1.prisma.$transaction(async (tx) => {
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
app.post(buildPath('/import'), rateLimiter_1.importLimiter, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const payload = req.body;
        if (!payload || Object.keys(payload).length === 0) {
            res.status(400).json({ message: 'Payload vazio. Envia pelo menos um array de dados.' });
            return;
        }
        const nextDataset = await applyImport(tenantId, payload, 'merge');
        res.json(nextDataset);
    }
    catch (error) {
        next(error);
    }
});
app.post(buildPath('/import/replace'), rateLimiter_1.importLimiter, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const payload = req.body;
        const nextDataset = await applyImport(tenantId, payload, 'replace');
        res.json(nextDataset);
    }
    catch (error) {
        next(error);
    }
});
app.delete(buildPath('/import/reset'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.internalAudit.deleteMany({ where: { tenantId } }),
            prisma_1.prisma.externalAudit.deleteMany({ where: { tenantId } }),
            prisma_1.prisma.actionItem.deleteMany({ where: { tenantId } }),
            prisma_1.prisma.occurrence.deleteMany({ where: { tenantId } }),
            prisma_1.prisma.sector.deleteMany({ where: { tenantId } }),
        ]);
        res.json(await fetchFullDataset(tenantId));
    }
    catch (error) {
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
    await prisma_1.prisma.$queryRaw `SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use((error, _req, res, _next) => {
    console.error('[API_ERROR]', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
});
app.listen(PORT, () => {
    console.log(`SGI backend a correr em http://localhost:${PORT}${BASE_PATH}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Ready check: http://localhost:${PORT}/ready`);
});
