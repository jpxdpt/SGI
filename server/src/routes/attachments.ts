import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { upload, UPLOAD_DIR } from '../config/upload';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';

const router = express.Router();

const getTenantId = (req: AuthRequest | Request): string => {
  if ('user' in req && req.user) {
    return req.user.tenantId;
  }
  return (req.header('x-tenant-id') as string | undefined) ?? 'tenant-default';
};

const entityTypes = ['InternalAudit', 'ExternalAudit', 'ActionItem', 'Occurrence'] as const;

const createAttachmentSchema = z.object({
  entityType: z.enum(entityTypes),
  entityId: z.string().uuid(),
});

/**
 * @swagger
 * /api/attachments:
 *   post:
 *     summary: Upload de anexo
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - entityType
 *               - entityId
 *               - file
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [InternalAudit, ExternalAudit, ActionItem, Occurrence]
 *               entityId:
 *                 type: string
 *                 format: uuid
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Anexo criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Entidade não encontrada
 */
router.post('/', authenticateToken, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Ficheiro não fornecido.' });
      return;
    }

    const tenantId = getTenantId(req);
    const userId = req.user?.id;
    const body = createAttachmentSchema.parse(req.body);

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

    // Criar registo do anexo
    const attachment = await prisma.attachment.create({
      data: {
        tenantId,
        entityType: body.entityType,
        entityId: body.entityId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedBy: userId,
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
      id: attachment.id,
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      fileName: attachment.fileName,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      uploadedBy: attachment.user
        ? {
            id: attachment.user.id,
            name: attachment.user.name,
            email: attachment.user.email,
          }
        : null,
      createdAt: attachment.createdAt.toISOString(),
    });
  } catch (error) {
    // Se houver erro, eliminar o ficheiro que foi criado
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/attachments/{entityType}/{entityId}:
 *   get:
 *     summary: Listar anexos de uma entidade
 *     tags: [Attachments]
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
 *         description: Lista de anexos
 */
router.get('/:entityType/:entityId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { entityType, entityId } = req.params;

    if (!entityTypes.includes(entityType as any)) {
      res.status(400).json({ message: 'Tipo de entidade inválido.' });
      return;
    }

    const attachments = await prisma.attachment.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      attachments.map((att) => ({
        id: att.id,
        entityType: att.entityType,
        entityId: att.entityId,
        fileName: att.fileName,
        originalName: att.originalName,
        mimeType: att.mimeType,
        size: att.size,
        uploadedBy: att.user
          ? {
              id: att.user.id,
              name: att.user.name,
              email: att.user.email,
            }
          : null,
        createdAt: att.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/attachments/{id}/download:
 *   get:
 *     summary: Download de anexo
 *     tags: [Attachments]
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
 *         description: Ficheiro
 *       404:
 *         description: Anexo não encontrado
 */
router.get('/:id/download', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({ where: { id } });

    if (!attachment || attachment.tenantId !== tenantId) {
      res.status(404).json({ message: 'Anexo não encontrado.' });
      return;
    }

    const filePath = attachment.path;
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'Ficheiro não encontrado no servidor.' });
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
    res.setHeader('Content-Type', attachment.mimeType);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/attachments/{id}:
 *   delete:
 *     summary: Eliminar anexo
 *     tags: [Attachments]
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
 *         description: Anexo eliminado com sucesso
 *       404:
 *         description: Anexo não encontrado
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({ where: { id } });

    if (!attachment || attachment.tenantId !== tenantId) {
      res.status(404).json({ message: 'Anexo não encontrado.' });
      return;
    }

    // Eliminar ficheiro do sistema de ficheiros
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
    }

    // Eliminar registo da base de dados
    await prisma.attachment.delete({ where: { id } });

    res.json({ message: 'Anexo eliminado com sucesso.' });
  } catch (error) {
    next(error);
  }
});

export default router;





