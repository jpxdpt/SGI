import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import { upload, UPLOAD_DIR } from '../config/upload';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { Request } from 'express';
import { DocumentStatus, DocumentAccessLevel, Role } from '@prisma/client';

const router = express.Router();

const getTenantId = (req: AuthRequest | Request): string => {
  if ('user' in req && req.user) {
    return req.user.tenantId;
  }
  return (req.header('x-tenant-id') as string | undefined) ?? 'tenant-default';
};

const createDocumentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  accessLevel: z.nativeEnum(DocumentAccessLevel).optional().default(DocumentAccessLevel.INTERNAL),
  allowedRoles: z.array(z.nativeEnum(Role)).optional().default([]),
  allowedUsers: z.array(z.string().uuid()).optional().default([]),
  metadata: z.any().optional(),
  tags: z.array(z.string()).optional().default([]),
  workflowDefinitionId: z.string().uuid().optional(),
  changeNotes: z.string().optional(),
});

const updateDocumentSchema = createDocumentSchema.partial();

/**
 * Helper para calcular checksum do ficheiro
 */
const calculateChecksum = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

/**
 * Helper para verificar se o utilizador tem acesso ao documento
 */
const canAccessDocument = async (
  document: any,
  userId: string,
  userRole: Role,
): Promise<boolean> => {
  // Se é o criador, sempre tem acesso
  if (document.createdBy === userId) {
    return true;
  }

  // Verificar accessLevel
  if (document.accessLevel === DocumentAccessLevel.PRIVATE) {
    // Apenas roles/utilizadores específicos
    const allowedRoles = Array.isArray(document.allowedRoles)
      ? document.allowedRoles
      : (document.allowedRoles ? JSON.parse(document.allowedRoles as string) : []);
    const allowedUsers = Array.isArray(document.allowedUsers)
      ? document.allowedUsers
      : (document.allowedUsers ? JSON.parse(document.allowedUsers as string) : []);

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      return false;
    }
    if (allowedUsers.length > 0 && !allowedUsers.includes(userId)) {
      return false;
    }
    return true;
  }

  // INTERNAL e PUBLIC: todos os utilizadores do tenant podem aceder
  return true;
};

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Listar documentos
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const userRole = req.user!.role as Role;
    const { category, status, search, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { tenantId };

    if (category) where.category = category;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
          tags: true,
          versions: {
            where: { isCurrent: true },
            take: 1,
          },
          workflowInstance: {
            include: {
              workflowDefinition: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.document.count({ where }),
    ]);

    // Filtrar documentos que o utilizador pode aceder
    const accessibleDocuments = [];
    for (const doc of documents) {
      if (await canAccessDocument(doc, userId, userRole)) {
        accessibleDocuments.push(doc);
      }
    }

    res.json({
      data: accessibleDocuments.map((doc) => {
        const allowedRoles = Array.isArray(doc.allowedRoles)
          ? doc.allowedRoles
          : (doc.allowedRoles ? JSON.parse(doc.allowedRoles as string) : []);
        const allowedUsers = Array.isArray(doc.allowedUsers)
          ? doc.allowedUsers
          : (doc.allowedUsers ? JSON.parse(doc.allowedUsers as string) : []);

        return {
          id: doc.id,
          title: doc.title,
          description: doc.description,
          category: doc.category,
          status: doc.status,
          accessLevel: doc.accessLevel,
          currentVersion: doc.currentVersion,
          allowedRoles,
          allowedUsers,
          tags: doc.tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
          createdBy: {
            id: doc.creator.id,
            name: doc.creator.name,
            email: doc.creator.email,
          },
          currentFile: doc.versions[0]
            ? {
                id: doc.versions[0].id,
                fileName: doc.versions[0].fileName,
                originalName: doc.versions[0].originalName,
                mimeType: doc.versions[0].mimeType,
                size: doc.versions[0].size,
                version: doc.versions[0].version,
                createdAt: doc.versions[0].createdAt.toISOString(),
              }
            : null,
          workflow: doc.workflowInstance
            ? {
                id: doc.workflowInstance.id,
                status: doc.workflowInstance.status,
                workflowDefinition: doc.workflowInstance.workflowDefinition,
              }
            : null,
          metadata: doc.metadata,
          archivedAt: doc.archivedAt?.toISOString() || null,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        };
      }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Criar documento com upload
 *     tags: [Documents]
 */
router.post('/', authenticateToken, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;

    if (!req.file) {
      res.status(400).json({ message: 'Ficheiro é obrigatório.' });
      return;
    }

    const body = createDocumentSchema.parse({
      ...req.body,
      allowedRoles: req.body.allowedRoles ? JSON.parse(req.body.allowedRoles) : [],
      allowedUsers: req.body.allowedUsers ? JSON.parse(req.body.allowedUsers) : [],
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
    });

    // Calcular checksum
    const checksum = await calculateChecksum(req.file.path);

    // Criar documento
    const document = await prisma.document.create({
      data: {
        tenantId,
        title: body.title,
        description: body.description,
        category: body.category,
        status: DocumentStatus.DRAFT,
        accessLevel: body.accessLevel || DocumentAccessLevel.INTERNAL,
        currentVersion: 1,
        createdBy: userId,
        allowedRoles: body.allowedRoles || [],
        allowedUsers: body.allowedUsers || [],
        metadata: body.metadata,
      },
    });

    // Criar versão inicial
    const version = await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        tenantId,
        version: 1,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        checksum,
        changeNotes: body.changeNotes,
        uploadedBy: userId,
        isCurrent: true,
      },
    });

    // Criar tags
    if (body.tags && body.tags.length > 0) {
      await prisma.documentTag.createMany({
        data: body.tags.map((tagName: string) => ({
          tenantId,
          documentId: document.id,
          name: tagName,
        })),
      });
    }

    // Iniciar workflow se fornecido
    let workflowInstance = null;
    if (body.workflowDefinitionId) {
      const { WorkflowEngine } = await import('../services/workflowEngine');
      try {
        const result = await WorkflowEngine.startWorkflow(body.workflowDefinitionId, {
          tenantId,
          entityType: 'Document',
          entityId: document.id,
          userId,
          userRole: req.user!.role as Role,
        });

        // Atualizar documento com workflow instance
        await prisma.document.update({
          where: { id: document.id },
          data: { workflowInstanceId: result.instanceId, status: DocumentStatus.PENDING_APPROVAL },
        });

        workflowInstance = { id: result.instanceId, status: result.status };
      } catch (error: any) {
        console.error('[Documents] Erro ao iniciar workflow:', error);
        // Continuar sem workflow se falhar
      }
    }

    const createdDoc = await prisma.document.findUnique({
      where: { id: document.id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        tags: true,
        versions: {
          where: { isCurrent: true },
          take: 1,
        },
      },
    });

    res.status(201).json({
      id: createdDoc!.id,
      title: createdDoc!.title,
      description: createdDoc!.description,
      category: createdDoc!.category,
      status: createdDoc!.status,
      accessLevel: createdDoc!.accessLevel,
      currentVersion: createdDoc!.currentVersion,
      allowedRoles: Array.isArray(createdDoc!.allowedRoles) ? createdDoc!.allowedRoles : JSON.parse(createdDoc!.allowedRoles as string),
      allowedUsers: Array.isArray(createdDoc!.allowedUsers) ? createdDoc!.allowedUsers : JSON.parse(createdDoc!.allowedUsers as string),
      tags: createdDoc!.tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
      createdBy: {
        id: createdDoc!.creator.id,
        name: createdDoc!.creator.name,
        email: createdDoc!.creator.email,
      },
      currentFile: createdDoc!.versions[0]
        ? {
            id: createdDoc!.versions[0].id,
            fileName: createdDoc!.versions[0].fileName,
            originalName: createdDoc!.versions[0].originalName,
            mimeType: createdDoc!.versions[0].mimeType,
            size: createdDoc!.versions[0].size,
            version: createdDoc!.versions[0].version,
            createdAt: createdDoc!.versions[0].createdAt.toISOString(),
          }
        : null,
      workflow: workflowInstance,
      metadata: createdDoc!.metadata,
      createdAt: createdDoc!.createdAt.toISOString(),
      updatedAt: createdDoc!.updatedAt.toISOString(),
    });
  } catch (error) {
    // Se houver erro, eliminar ficheiro se foi criado
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/documents/{id}:
 *   get:
 *     summary: Obter documento
 *     tags: [Documents]
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const userRole = req.user!.role as Role;
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        tags: true,
        versions: {
          orderBy: { version: 'desc' },
        },
        workflowInstance: {
          include: {
            workflowDefinition: {
              select: { id: true, name: true },
            },
            stepExecutions: {
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!document || document.tenantId !== tenantId) {
      res.status(404).json({ message: 'Documento não encontrado.' });
      return;
    }

    // Verificar acesso
    if (!(await canAccessDocument(document, userId, userRole))) {
      res.status(403).json({ message: 'Não tens permissão para aceder a este documento.' });
      return;
    }

    const allowedRoles = Array.isArray(document.allowedRoles)
      ? document.allowedRoles
      : (document.allowedRoles ? JSON.parse(document.allowedRoles as string) : []);
    const allowedUsers = Array.isArray(document.allowedUsers)
      ? document.allowedUsers
      : (document.allowedUsers ? JSON.parse(document.allowedUsers as string) : []);

    res.json({
      id: document.id,
      title: document.title,
      description: document.description,
      category: document.category,
      status: document.status,
      accessLevel: document.accessLevel,
      currentVersion: document.currentVersion,
      allowedRoles,
      allowedUsers,
      tags: document.tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
      createdBy: {
        id: document.creator.id,
        name: document.creator.name,
        email: document.creator.email,
      },
      versions: document.versions.map((v) => ({
        id: v.id,
        version: v.version,
        originalName: v.originalName,
        mimeType: v.mimeType,
        size: v.size,
        changeNotes: v.changeNotes,
        uploadedBy: v.uploadedBy,
        isCurrent: v.isCurrent,
        createdAt: v.createdAt.toISOString(),
      })),
      workflow: document.workflowInstance
        ? {
            id: document.workflowInstance.id,
            status: document.workflowInstance.status,
            workflowDefinition: document.workflowInstance.workflowDefinition,
            stepExecutions: document.workflowInstance.stepExecutions,
          }
        : null,
      metadata: document.metadata,
      archivedAt: document.archivedAt?.toISOString() || null,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/documents/{id}:
 *   put:
 *     summary: Atualizar documento
 *     tags: [Documents]
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const userRole = req.user!.role as Role;
    const { id } = req.params;
    const body = updateDocumentSchema.parse(req.body);

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document || document.tenantId !== tenantId) {
      res.status(404).json({ message: 'Documento não encontrado.' });
      return;
    }

    // Verificar acesso (apenas criador ou ADMIN pode atualizar)
    if (document.createdBy !== userId && userRole !== Role.ADMIN) {
      res.status(403).json({ message: 'Não tens permissão para atualizar este documento.' });
      return;
    }

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.accessLevel !== undefined) updateData.accessLevel = body.accessLevel;
    if (body.allowedRoles !== undefined) updateData.allowedRoles = body.allowedRoles;
    if (body.allowedUsers !== undefined) updateData.allowedUsers = body.allowedUsers;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // Atualizar tags se fornecidas
    if (body.tags !== undefined) {
      await prisma.documentTag.deleteMany({
        where: { documentId: id },
      });
      if (body.tags.length > 0) {
        await prisma.documentTag.createMany({
          data: body.tags.map((tagName: string) => ({
            tenantId,
            documentId: id,
            name: tagName,
          })),
        });
      }
    }

    const updated = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        tags: true,
        versions: {
          where: { isCurrent: true },
          take: 1,
        },
      },
    });

    const allowedRoles = Array.isArray(updated.allowedRoles)
      ? updated.allowedRoles
      : (updated.allowedRoles ? JSON.parse(updated.allowedRoles as string) : []);
    const allowedUsers = Array.isArray(updated.allowedUsers)
      ? updated.allowedUsers
      : (updated.allowedUsers ? JSON.parse(updated.allowedUsers as string) : []);

    res.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      status: updated.status,
      accessLevel: updated.accessLevel,
      currentVersion: updated.currentVersion,
      allowedRoles,
      allowedUsers,
      tags: updated.tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
      createdBy: {
        id: updated.creator.id,
        name: updated.creator.name,
        email: updated.creator.email,
      },
      currentFile: updated.versions[0]
        ? {
            id: updated.versions[0].id,
            fileName: updated.versions[0].fileName,
            originalName: updated.versions[0].originalName,
            mimeType: updated.versions[0].mimeType,
            size: updated.versions[0].size,
            version: updated.versions[0].version,
            createdAt: updated.versions[0].createdAt.toISOString(),
          }
        : null,
      metadata: updated.metadata,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/documents/{id}:
 *   delete:
 *     summary: Eliminar documento
 *     tags: [Documents]
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const userRole = req.user!.role as Role;
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: true,
      },
    });

    if (!document || document.tenantId !== tenantId) {
      res.status(404).json({ message: 'Documento não encontrado.' });
      return;
    }

    // Verificar acesso (apenas criador ou ADMIN pode eliminar)
    if (document.createdBy !== userId && userRole !== Role.ADMIN) {
      res.status(403).json({ message: 'Não tens permissão para eliminar este documento.' });
      return;
    }

    // Eliminar ficheiros físicos
    for (const version of document.versions) {
      if (fs.existsSync(version.path)) {
        fs.unlinkSync(version.path);
      }
    }

    // Eliminar documento (cascata elimina versões e tags)
    await prisma.document.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/documents/{id}/versions:
 *   post:
 *     summary: Upload de nova versão do documento
 *     tags: [Documents]
 */
router.post('/:id/versions', authenticateToken, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const userRole = req.user!.role as Role;
    const { id } = req.params;

    if (!req.file) {
      res.status(400).json({ message: 'Ficheiro é obrigatório.' });
      return;
    }

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document || document.tenantId !== tenantId) {
      res.status(404).json({ message: 'Documento não encontrado.' });
      return;
    }

    // Verificar acesso
    if (document.createdBy !== userId && userRole !== Role.ADMIN) {
      res.status(403).json({ message: 'Não tens permissão para atualizar este documento.' });
      return;
    }

    // Marcar versão atual como não atual
    await prisma.documentVersion.updateMany({
      where: { documentId: id, isCurrent: true },
      data: { isCurrent: false },
    });

    // Calcular checksum
    const checksum = await calculateChecksum(req.file.path);

    // Criar nova versão
    const newVersion = document.currentVersion + 1;
    const version = await prisma.documentVersion.create({
      data: {
        documentId: id,
        tenantId,
        version: newVersion,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        checksum,
        changeNotes: req.body.changeNotes,
        uploadedBy: userId,
        isCurrent: true,
      },
    });

    // Atualizar documento
    const updated = await prisma.document.update({
      where: { id },
      data: {
        currentVersion: newVersion,
        status: DocumentStatus.DRAFT, // Voltar para DRAFT quando nova versão é criada
      },
      include: {
        versions: {
          where: { isCurrent: true },
          take: 1,
        },
      },
    });

    res.status(201).json({
      id: version.id,
      documentId: version.documentId,
      version: version.version,
      fileName: version.fileName,
      originalName: version.originalName,
      mimeType: version.mimeType,
      size: version.size,
      changeNotes: version.changeNotes,
      checksum: version.checksum,
      uploadedBy: version.uploadedBy,
      isCurrent: version.isCurrent,
      createdAt: version.createdAt.toISOString(),
    });
  } catch (error) {
    // Se houver erro, eliminar ficheiro se foi criado
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/documents/{id}/versions/{versionId}/download:
 *   get:
 *     summary: Download de versão do documento
 *     tags: [Documents]
 */
router.get('/:id/versions/:versionId/download', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const userRole = req.user!.role as Role;
    const { id, versionId } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document || document.tenantId !== tenantId) {
      res.status(404).json({ message: 'Documento não encontrado.' });
      return;
    }

    // Verificar acesso
    if (!(await canAccessDocument(document, userId, userRole))) {
      res.status(403).json({ message: 'Não tens permissão para aceder a este documento.' });
      return;
    }

    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.documentId !== id || version.tenantId !== tenantId) {
      res.status(404).json({ message: 'Versão não encontrada.' });
      return;
    }

    if (!fs.existsSync(version.path)) {
      res.status(404).json({ message: 'Ficheiro não encontrado no servidor.' });
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(version.originalName)}"`);
    res.setHeader('Content-Type', version.mimeType);
    res.setHeader('Content-Length', version.size.toString());

    res.sendFile(path.resolve(version.path));
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/documents/{id}/archive:
 *   post:
 *     summary: Arquivar documento
 *     tags: [Documents]
 */
router.post('/:id/archive', authenticateToken, requireRole('ADMIN', 'GESTOR'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document || document.tenantId !== tenantId) {
      res.status(404).json({ message: 'Documento não encontrado.' });
      return;
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        status: DocumentStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });

    res.json({
      id: updated.id,
      status: updated.status,
      archivedAt: updated.archivedAt?.toISOString() || null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;





