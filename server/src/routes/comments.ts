import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import type { Request } from 'express';

const router = express.Router();

const getTenantId = (req: AuthRequest | Request): string => {
  if ('user' in req && req.user) {
    return req.user.tenantId;
  }
  return (req.header('x-tenant-id') as string | undefined) ?? 'tenant-default';
};

const entityTypes = ['InternalAudit', 'ExternalAudit', 'ActionItem', 'Occurrence'] as const;

const createCommentSchema = z.object({
  entityType: z.enum(entityTypes),
  entityId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Criar comentário
 *     tags: [Comments]
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
 *               - content
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [InternalAudit, ExternalAudit, ActionItem, Occurrence]
 *               entityId:
 *                 type: string
 *                 format: uuid
 *               content:
 *                 type: string
 *                 maxLength: 5000
 *     responses:
 *       201:
 *         description: Comentário criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Entidade não encontrada
 */
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const body = createCommentSchema.parse(req.body);

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

    // Criar comentário
    const comment = await prisma.comment.create({
      data: {
        tenantId,
        entityType: body.entityType,
        entityId: body.entityId,
        content: body.content,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      id: comment.id,
      entityType: comment.entityType,
      entityId: comment.entityId,
      content: comment.content,
      user: {
        id: comment.user.id,
        name: comment.user.name,
        email: comment.user.email,
      },
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/comments/{entityType}/{entityId}:
 *   get:
 *     summary: Listar comentários de uma entidade
 *     tags: [Comments]
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
 *         description: Lista de comentários
 */
router.get('/:entityType/:entityId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { entityType, entityId } = req.params;

    if (!entityTypes.includes(entityType as any)) {
      res.status(400).json({ message: 'Tipo de entidade inválido.' });
      return;
    }

    const comments = await prisma.comment.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(
      comments.map((comment) => ({
        id: comment.id,
        entityType: comment.entityType,
        entityId: comment.entityId,
        content: comment.content,
        user: {
          id: comment.user.id,
          name: comment.user.name,
          email: comment.user.email,
        },
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      })),
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     summary: Atualizar comentário
 *     tags: [Comments]
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 5000
 *     responses:
 *       200:
 *         description: Comentário atualizado com sucesso
 *       403:
 *         description: Sem permissão para atualizar este comentário
 *       404:
 *         description: Comentário não encontrado
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const { id } = req.params;
    const body = updateCommentSchema.parse(req.body);

    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment || comment.tenantId !== tenantId) {
      res.status(404).json({ message: 'Comentário não encontrado.' });
      return;
    }

    // Apenas o autor pode atualizar o comentário
    if (comment.userId !== userId) {
      res.status(403).json({ message: 'Sem permissão para atualizar este comentário.' });
      return;
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { content: body.content },
      include: {
        user: {
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
      content: updated.content,
      user: {
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
      },
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Eliminar comentário
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Comentário eliminado com sucesso
 *       403:
 *         description: Sem permissão para eliminar este comentário
 *       404:
 *         description: Comentário não encontrado
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment || comment.tenantId !== tenantId) {
      res.status(404).json({ message: 'Comentário não encontrado.' });
      return;
    }

    // Apenas o autor pode eliminar o comentário (ou ADMIN)
    if (comment.userId !== userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ message: 'Sem permissão para eliminar este comentário.' });
      return;
    }

    await prisma.comment.delete({ where: { id } });

    res.json({ message: 'Comentário eliminado com sucesso.' });
  } catch (error) {
    next(error);
  }
});

export default router;











