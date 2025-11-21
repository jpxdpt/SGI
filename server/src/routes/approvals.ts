import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import type { Request } from 'express';

const router = express.Router();

const getTenantId = (req: AuthRequest | Request): string => {
  if ('user' in req && req.user) {
    return req.user.tenantId;
  }
  return (req.header('x-tenant-id') as string | undefined) ?? 'tenant-default';
};

const entityTypes = ['InternalAudit', 'ExternalAudit', 'ActionItem', 'Occurrence'] as const;

const createApprovalSchema = z.object({
  entityType: z.enum(entityTypes),
  entityId: z.string().uuid(),
  comments: z.string().optional(),
});

const updateApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comments: z.string().optional(),
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
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const body = createApprovalSchema.parse(req.body);

    // Verificar se a entidade existe e pertence ao tenant
    const entityMap: Record<string, any> = {
      InternalAudit: prisma.internalAudit,
      ExternalAudit: prisma.externalAudit,
      ActionItem: prisma.actionItem,
      Occurrence: prisma.occurrence,
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
    const existing = await prisma.approval.findFirst({
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
    const approval = await prisma.approval.create({
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
  } catch (error) {
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
router.get('/:entityType/:entityId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { entityType, entityId } = req.params;

    if (!entityTypes.includes(entityType as any)) {
      res.status(400).json({ message: 'Tipo de entidade inválido.' });
      return;
    }

    const approval = await prisma.approval.findFirst({
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
  } catch (error) {
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
router.put('/:id/approve', authenticateToken, requireRole('ADMIN', 'GESTOR'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const { id } = req.params;
    const body = updateApprovalSchema.parse(req.body);

    const approval = await prisma.approval.findUnique({ where: { id } });

    if (!approval || approval.tenantId !== tenantId) {
      res.status(404).json({ message: 'Aprovação não encontrada.' });
      return;
    }

    if (approval.status !== 'PENDING') {
      res.status(400).json({ message: 'Aprovação já foi processada.' });
      return;
    }

    const updated = await prisma.approval.update({
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
  } catch (error) {
    next(error);
  }
});

export default router;





