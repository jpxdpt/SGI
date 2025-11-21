"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
const getTenantId = (req) => {
    if ('user' in req && req.user) {
        return req.user.tenantId;
    }
    return req.header('x-tenant-id') ?? 'tenant-default';
};
const logsQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
    limit: zod_1.z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
    action: zod_1.z.enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'IMPORT']).optional(),
    entity: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Lista logs de auditoria com paginação e filtros
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Número de registos por página
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [CREATE, UPDATE, DELETE, LOGIN, LOGOUT, IMPORT]
 *         description: Filtrar por tipo de ação
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         description: Filtrar por entidade (ex: InternalAudit, ActionItem)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filtrar por ID do utilizador
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final (ISO 8601)
 *     responses:
 *       200:
 *         description: Lista de logs paginada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 */
router.get('/', async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const query = logsQuerySchema.parse(req.query);
        const where = { tenantId };
        if (query.action) {
            where.action = query.action;
        }
        if (query.entity) {
            where.entity = query.entity;
        }
        if (query.userId) {
            where.userId = query.userId;
        }
        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate) {
                where.createdAt.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                where.createdAt.lte = new Date(query.endDate);
            }
        }
        const skip = (query.page - 1) * query.limit;
        const [logs, total] = await Promise.all([
            prisma_1.prisma.auditTrail.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: query.limit,
            }),
            prisma_1.prisma.auditTrail.count({ where }),
        ]);
        res.json({
            data: logs.map((log) => ({
                id: log.id,
                tenantId: log.tenantId,
                userId: log.userId,
                userName: log.user?.name || null,
                userEmail: log.user?.email || null,
                action: log.action,
                entity: log.entity,
                entityId: log.entityId,
                description: log.description,
                metadata: log.metadata,
                createdAt: log.createdAt.toISOString(),
            })),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
