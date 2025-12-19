import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createLimiter } from '../middleware/rateLimiter';
import { getTenantId, notFound } from '../utils/helpers';
import { cachedQuery, cache } from '../utils/cache';
import { createAuditLogger } from '../utils/auditTrail';
import {
    buildInternalAuditCreateData,
    buildInternalAuditUpdateData,
    buildExternalAuditCreateData,
    buildExternalAuditUpdateData,
    mapInternalAuditFromDb,
    mapExternalAuditFromDb,
} from '../mappers';

const router = Router();

// --- AUDITORIAS INTERNAS ---

router.get('/internal', async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

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
            2 * 60 * 1000,
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/internal', createLimiter, authenticateToken, async (req: AuthRequest, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user?.id;
        const data = buildInternalAuditCreateData(req.body, tenantId);
        const created = await prisma.internalAudit.create({ data });

        const auditLogger = createAuditLogger(tenantId, userId);
        auditLogger.create('InternalAudit', `Auditoria interna criada: ${created.id}`, created.id, {
            ano: created.ano,
            entidadeAuditora: created.entidadeAuditora,
            iso: created.iso,
        });

        // Invalidar cache
        cache.deletePrefix(`audits:internal:${tenantId}`);
        cache.delete(`summary:${tenantId}`);

        res.status(201).json(mapInternalAuditFromDb(created));
    } catch (error) {
        next(error);
    }
});

router.put('/internal/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user?.id;
        const { id } = req.params;
        const existing = await prisma.internalAudit.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return notFound(res);
        }
        const data = buildInternalAuditUpdateData(req.body);
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
        }
        const updated = await prisma.internalAudit.update({ where: { id }, data });

        const auditLogger = createAuditLogger(tenantId, userId);
        auditLogger.update('InternalAudit', `Auditoria interna atualizada: ${updated.id}`, id, {
            ano: updated.ano,
            entidadeAuditora: updated.entidadeAuditora,
            iso: updated.iso,
            camposAlterados: Object.keys(data),
        });

        cache.deletePrefix(`audits:internal:${tenantId}`);
        res.json(mapInternalAuditFromDb(updated));
    } catch (error) {
        next(error);
    }
});

router.delete('/internal/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user?.id;
        const { id } = req.params;
        const existing = await prisma.internalAudit.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return notFound(res);
        }
        await prisma.internalAudit.delete({ where: { id } });

        const auditLogger = createAuditLogger(tenantId, userId);
        auditLogger.delete('InternalAudit', `Auditoria interna eliminada: ${existing.id}`, id, {
            ano: existing.ano,
            entidadeAuditora: existing.entidadeAuditora,
            iso: existing.iso,
        });

        cache.deletePrefix(`audits:internal:${tenantId}`);
        cache.delete(`summary:${tenantId}`);
        res.json(mapInternalAuditFromDb(existing));
    } catch (error) {
        next(error);
    }
});

// --- AUDITORIAS EXTERNAS ---

router.get('/external', async (req, res, next) => {
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

router.post('/external', createLimiter, authenticateToken, async (req: AuthRequest, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user?.id;
        const data = buildExternalAuditCreateData(req.body, tenantId);
        const created = await prisma.externalAudit.create({ data });

        const auditLogger = createAuditLogger(tenantId, userId);
        auditLogger.create('ExternalAudit', `Auditoria externa criada: ${created.id}`, created.id, {
            ano: created.ano,
            entidadeAuditora: created.entidadeAuditora,
            iso: created.iso,
        });

        cache.deletePrefix(`audits:external:${tenantId}`);
        cache.delete(`summary:${tenantId}`);

        res.status(201).json(mapExternalAuditFromDb(created));
    } catch (error) {
        next(error);
    }
});

router.put('/external/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma.externalAudit.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return notFound(res);
        }
        const data = buildExternalAuditUpdateData(req.body);
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
        }
        const updated = await prisma.externalAudit.update({ where: { id }, data });

        cache.deletePrefix(`audits:external:${tenantId}`);
        res.json(mapExternalAuditFromDb(updated));
    } catch (error) {
        next(error);
    }
});

router.delete('/external/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma.externalAudit.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return notFound(res);
        }
        await prisma.externalAudit.delete({ where: { id } });

        cache.deletePrefix(`audits:external:${tenantId}`);
        cache.delete(`summary:${tenantId}`);
        res.json(mapExternalAuditFromDb(existing));
    } catch (error) {
        next(error);
    }
});

export default router;
