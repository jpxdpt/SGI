"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const getTenantId = (req) => {
    if ('user' in req && req.user) {
        return req.user.tenantId;
    }
    return req.header('x-tenant-id') ?? 'tenant-default';
};
const entityTypes = ['InternalAudit', 'ExternalAudit', 'ActionItem', 'Occurrence'];
const createApprovalSchema = zod_1.z.object({
    entityType: zod_1.z.enum(entityTypes),
    entityId: zod_1.z.string().uuid(),
    comments: zod_1.z.string().optional(),
});
const updateApprovalSchema = zod_1.z.object({
    status: zod_1.z.enum(['APPROVED', 'REJECTED']),
    comments: zod_1.z.string().optional(),
});
/**
 * @swagger
 * /api/approvals:
 *   post:
 *     summary: Solicitar aprovação
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityType
 *               - entityId
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [InternalAudit, ExternalAudit, ActionItem, Occurrence]
 *               entityId:
 *                 type: string
 *                 format: uuid
 *               comments:
 *                 type: string
 *     responses:
 *       201:
 *         description: Aprovação solicitada com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Entidade não encontrada
 */
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user.id;
        const body = createApprovalSchema.parse(req.body);
        // Verificar se a entidade existe e pertence ao tenant
        const entityMap = {
            InternalAudit: prisma_1.prisma.internalAudit,
            ExternalAudit: prisma_1.prisma.externalAudit,
            ActionItem: prisma_1.prisma.actionItem,
            Occurrence: prisma_1.prisma.occurrence,
        };
        const entityModel = entityMap[body.entityType];
        if (!entityModel) {
            res.status(400).json({ message: 'Tipo de entidade inválido.' });
            return;
        }
        const entity = await entityModel.findUnique({ where: { id: body.entityId } });
        if (!entity || entity.tenantId !== tenantId) {
            res.status(404).json({ message: 'Entidade não encontrada.' });
            return;
        }
        // Verificar se já existe uma aprovação pendente
        const existing = await prisma_1.prisma.approval.findFirst({
            where: {
                tenantId,
                entityType: body.entityType,
                entityId: body.entityId,
                status: 'PENDING',
            },
        });
        if (existing) {
            res.status(400).json({ message: 'Já existe uma aprovação pendente para esta entidade.' });
            return;
        }
        // Criar solicitação de aprovação
        const approval = await prisma_1.prisma.approval.create({
            data: {
                tenantId,
                entityType: body.entityType,
                entityId: body.entityId,
                status: 'PENDING',
                requestedBy: userId,
                comments: body.comments,
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        res.status(201).json({
            id: approval.id,
            entityType: approval.entityType,
            entityId: approval.entityId,
            status: approval.status,
            requestedBy: {
                id: approval.requester.id,
                name: approval.requester.name,
                email: approval.requester.email,
            },
            comments: approval.comments,
            createdAt: approval.createdAt.toISOString(),
            updatedAt: approval.updatedAt.toISOString(),
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @swagger
 * /api/approvals/{entityType}/{entityId}:
 *   get:
 *     summary: Obter aprovação de uma entidade
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [InternalAudit, ExternalAudit, ActionItem, Occurrence]
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Aprovação encontrada
 *       404:
 *         description: Aprovação não encontrada
 */
router.get('/:entityType/:entityId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { entityType, entityId } = req.params;
        if (!entityTypes.includes(entityType)) {
            res.status(400).json({ message: 'Tipo de entidade inválido.' });
            return;
        }
        const approval = await prisma_1.prisma.approval.findFirst({
            where: {
                tenantId,
                entityType,
                entityId,
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                approver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!approval) {
            res.status(404).json({ message: 'Aprovação não encontrada.' });
            return;
        }
        res.json({
            id: approval.id,
            entityType: approval.entityType,
            entityId: approval.entityId,
            status: approval.status,
            requestedBy: {
                id: approval.requester.id,
                name: approval.requester.name,
                email: approval.requester.email,
            },
            approvedBy: approval.approver
                ? {
                    id: approval.approver.id,
                    name: approval.approver.name,
                    email: approval.approver.email,
                }
                : null,
            comments: approval.comments,
            createdAt: approval.createdAt.toISOString(),
            updatedAt: approval.updatedAt.toISOString(),
            approvedAt: approval.approvedAt?.toISOString() || null,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @swagger
 * /api/approvals/{id}/approve:
 *   put:
 *     summary: Aprovar ou rejeitar aprovação (apenas ADMIN e GESTOR)
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Aprovação atualizada com sucesso
 *       403:
 *         description: Sem permissão para aprovar
 *       404:
 *         description: Aprovação não encontrada
 */
router.put('/:id/approve', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN', 'GESTOR'), async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user.id;
        const { id } = req.params;
        const body = updateApprovalSchema.parse(req.body);
        const approval = await prisma_1.prisma.approval.findUnique({ where: { id } });
        if (!approval || approval.tenantId !== tenantId) {
            res.status(404).json({ message: 'Aprovação não encontrada.' });
            return;
        }
        if (approval.status !== 'PENDING') {
            res.status(400).json({ message: 'Aprovação já foi processada.' });
            return;
        }
        const updated = await prisma_1.prisma.approval.update({
            where: { id },
            data: {
                status: body.status,
                approvedBy: userId,
                approvedAt: new Date(),
                comments: body.comments || approval.comments,
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                approver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        res.json({
            id: updated.id,
            entityType: updated.entityType,
            entityId: updated.entityId,
            status: updated.status,
            requestedBy: {
                id: updated.requester.id,
                name: updated.requester.name,
                email: updated.requester.email,
            },
            approvedBy: updated.approver
                ? {
                    id: updated.approver.id,
                    name: updated.approver.name,
                    email: updated.approver.email,
                }
                : null,
            comments: updated.comments,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
            approvedAt: updated.approvedAt?.toISOString() || null,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
