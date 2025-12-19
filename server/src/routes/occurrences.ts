import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';
import { createLimiter } from '../middleware/rateLimiter';
import { getTenantId, notFound } from '../utils/helpers';
import { cache } from '../utils/cache';
import {
    buildOccurrenceCreateData,
    buildOccurrenceUpdateData,
    mapOccurrenceFromDb
} from '../mappers';

const router = Router();

router.get('/', async (req, res, next) => {
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

router.post('/', createLimiter, authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const data = buildOccurrenceCreateData(req.body, tenantId);
        const created = await prisma.occurrence.create({ data });

        cache.delete(`summary:${tenantId}`);
        res.status(201).json(mapOccurrenceFromDb(created));
    } catch (error) {
        next(error);
    }
});

router.put('/:id', authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma.occurrence.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return notFound(res);
        }
        const data = buildOccurrenceUpdateData(req.body);
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
        }
        const updated = await prisma.occurrence.update({ where: { id }, data });
        res.json(mapOccurrenceFromDb(updated));
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma.occurrence.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return notFound(res);
        }
        await prisma.occurrence.delete({ where: { id } });

        cache.delete(`summary:${tenantId}`);
        res.json(mapOccurrenceFromDb(existing));
    } catch (error) {
        next(error);
    }
});

export default router;
