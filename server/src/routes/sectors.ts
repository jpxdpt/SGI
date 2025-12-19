import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';
import { createLimiter } from '../middleware/rateLimiter';
import { getTenantId, notFound } from '../utils/helpers';
import { cache } from '../utils/cache';
import {
    buildSectorCreateData,
    buildSectorUpdateData,
    mapSectorFromDb
} from '../mappers';

const router = Router();

router.get('/', async (req, res, next) => {
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

router.post('/', createLimiter, authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const data = buildSectorCreateData(req.body, tenantId);
        const created = await prisma.sector.create({ data });

        cache.delete(`summary:${tenantId}`);
        res.status(201).json(mapSectorFromDb(created));
    } catch (error) {
        next(error);
    }
});

router.put('/:id', authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma.sector.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return notFound(res);
        }
        const data = buildSectorUpdateData(req.body);
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
        }
        const updated = await prisma.sector.update({ where: { id }, data });
        res.json(mapSectorFromDb(updated));
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const existing = await prisma.sector.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return notFound(res);
        }
        await prisma.sector.delete({ where: { id } });

        cache.delete(`summary:${tenantId}`);
        res.json(mapSectorFromDb(existing));
    } catch (error) {
        next(error);
    }
});

export default router;
