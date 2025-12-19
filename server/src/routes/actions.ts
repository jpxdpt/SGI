import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';
import { createLimiter } from '../middleware/rateLimiter';
import { getTenantId, notFound } from '../utils/helpers';
import { cache } from '../utils/cache';
import {
    buildActionItemCreateData,
    buildActionItemUpdateData,
    mapActionItemFromDb
} from '../mappers';

const router = Router();

router.get('/', async (req, res, next) => {
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

router.post('/', createLimiter, authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const data = buildActionItemCreateData(req.body, tenantId);
        const created = await prisma.actionItem.create({ data });

        cache.delete(`summary:${tenantId}`);
        res.status(201).json(mapActionItemFromDb(created));
    } catch (error) {
        next(error);
    }
});

router.put('/:id', authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma.actionItem.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return notFound(res);
        }
        const data = buildActionItemUpdateData(req.body);
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
        }
        const updated = await prisma.actionItem.update({ where: { id }, data });
        res.json(mapActionItemFromDb(updated));
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma.actionItem.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return notFound(res);
        }
        await prisma.actionItem.delete({ where: { id } });

        cache.delete(`summary:${tenantId}`);
        res.json(mapActionItemFromDb(existing));
    } catch (error) {
        next(error);
    }
});

export default router;
