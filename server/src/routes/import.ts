import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';
import { importLimiter } from '../middleware/rateLimiter';
import { getTenantId } from '../utils/helpers';
import { DatabaseSchema } from '../types';
import {
    buildInternalAuditCreateData,
    buildExternalAuditCreateData,
    buildActionItemCreateData,
    buildOccurrenceCreateData,
    buildSectorCreateData,
    mapInternalAuditFromDb,
    mapExternalAuditFromDb,
    mapActionItemFromDb,
    mapOccurrenceFromDb,
    mapSectorFromDb,
} from '../mappers';

const router = Router();

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

router.post('/', authenticateToken, importLimiter, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const payload = req.body as Partial<DatabaseSchema>;
        if (!payload || Object.keys(payload).length === 0) {
            return res.status(400).json({ message: 'Payload vazio. Envia pelo menos um array de dados.' });
        }
        const nextDataset = await applyImport(tenantId, payload, 'merge');
        res.json(nextDataset);
    } catch (error) {
        next(error);
    }
});

router.post('/replace', authenticateToken, importLimiter, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const payload = req.body as Partial<DatabaseSchema>;
        const nextDataset = await applyImport(tenantId, payload, 'replace');
        res.json(nextDataset);
    } catch (error) {
        next(error);
    }
});

router.delete('/reset', authenticateToken, async (req, res, next) => {
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

export default router;
