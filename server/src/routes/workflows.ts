import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import { WorkflowEngine } from '../services/workflowEngine';
import { WorkflowStatus, WorkflowStepType, Role } from '@prisma/client';
import type { Request } from 'express';

const router = express.Router();

const getTenantId = (req: AuthRequest | Request): string => {
  if ('user' in req && req.user) {
    return req.user.tenantId;
  }
  return (req.header('x-tenant-id') as string | undefined) ?? 'tenant-default';
};

const entityTypes = ['InternalAudit', 'ExternalAudit', 'ActionItem', 'Occurrence', 'Document'] as const;

const createWorkflowDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  entityType: z.enum(entityTypes),
  isActive: z.boolean().optional().default(true),
  steps: z
    .array(
      z.object({
        stepOrder: z.number().int().positive(),
        stepType: z.nativeEnum(WorkflowStepType),
        name: z.string().min(1),
        description: z.string().optional(),
        requiredRoles: z.array(z.nativeEnum(Role)).optional().default([]),
        requiredUsers: z.array(z.string().uuid()).optional().default([]),
        conditionExpression: z.any().optional(),
        notificationTemplate: z.string().optional(),
        autoAdvance: z.boolean().optional().default(false),
        timeoutDays: z.number().int().positive().optional(),
      }),
    )
    .optional()
    .default([]),
});

const updateWorkflowDefinitionSchema = createWorkflowDefinitionSchema.partial();

const startWorkflowSchema = z.object({
  workflowDefinitionId: z.string().uuid(),
  entityType: z.enum(entityTypes),
  entityId: z.string(),
});

const approveStepSchema = z.object({
  comments: z.string().optional(),
});

/**
 * @swagger
 * /api/workflows/definitions:
 *   get:
 *     summary: Listar definições de workflow
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de definições
 */
router.get('/definitions', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { entityType, isActive } = req.query;

    const where: any = { tenantId };
    if (entityType) where.entityType = entityType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    console.log('[Workflows] Buscando definições com where:', where);

    const definitions = await prisma.workflowDefinition.findMany({
      where,
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        instances: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('[Workflows] Encontradas', definitions.length, 'definições');

    res.json(
      definitions.map((def) => ({
        id: def.id,
        name: def.name,
        description: def.description,
        entityType: def.entityType,
        isActive: def.isActive,
        steps: (def.steps || []).map((step: any) => {
          // Prisma já retorna JSON fields como objetos JavaScript
          const requiredRoles = Array.isArray(step.requiredRoles) 
            ? step.requiredRoles 
            : (step.requiredRoles ? (typeof step.requiredRoles === 'string' ? JSON.parse(step.requiredRoles) : step.requiredRoles) : []);
          
          const requiredUsers = Array.isArray(step.requiredUsers)
            ? step.requiredUsers
            : (step.requiredUsers ? (typeof step.requiredUsers === 'string' ? JSON.parse(step.requiredUsers) : step.requiredUsers) : []);
          
          return {
            id: step.id,
            stepOrder: step.stepOrder,
            stepType: step.stepType,
            name: step.name,
            description: step.description,
            requiredRoles: Array.isArray(requiredRoles) ? requiredRoles : [],
            requiredUsers: Array.isArray(requiredUsers) ? requiredUsers : [],
            autoAdvance: step.autoAdvance,
            timeoutDays: step.timeoutDays,
          };
        }),
        instancesCount: (def.instances || []).length,
        createdAt: def.createdAt.toISOString(),
        updatedAt: def.updatedAt.toISOString(),
      })),
    );
  } catch (error: any) {
    console.error('[Workflows] Erro ao listar definições:', error);
    console.error('[Workflows] Stack:', error.stack);
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/definitions:
 *   post:
 *     summary: Criar definição de workflow
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 */
router.post('/definitions', authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const body = createWorkflowDefinitionSchema.parse(req.body);

    const definition = await prisma.workflowDefinition.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description,
        entityType: body.entityType,
        isActive: body.isActive ?? true,
        steps: {
          create: body.steps.map((step) => ({
            stepOrder: step.stepOrder,
            stepType: step.stepType,
            name: step.name,
            description: step.description,
            requiredRoles: Array.isArray(step.requiredRoles) ? step.requiredRoles : (step.requiredRoles || []),
            requiredUsers: Array.isArray(step.requiredUsers) ? step.requiredUsers : (step.requiredUsers || []),
            conditionExpression: step.conditionExpression ?? null,
            notificationTemplate: step.notificationTemplate ?? null,
            autoAdvance: step.autoAdvance ?? false,
            timeoutDays: step.timeoutDays ?? null,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    res.status(201).json({
      id: definition.id,
      name: definition.name,
      description: definition.description,
      entityType: definition.entityType,
      isActive: definition.isActive,
      steps: definition.steps.map((step) => {
        // Parse JSON fields se necessário
        let requiredRoles = step.requiredRoles;
        let requiredUsers = step.requiredUsers;
        
        if (typeof step.requiredRoles === 'string') {
          try {
            requiredRoles = JSON.parse(step.requiredRoles);
          } catch {
            requiredRoles = [];
          }
        }
        
        if (typeof step.requiredUsers === 'string') {
          try {
            requiredUsers = JSON.parse(step.requiredUsers);
          } catch {
            requiredUsers = [];
          }
        }
        
        return {
          id: step.id,
          stepOrder: step.stepOrder,
          stepType: step.stepType,
          name: step.name,
          description: step.description,
          requiredRoles: Array.isArray(requiredRoles) ? requiredRoles : [],
          requiredUsers: Array.isArray(requiredUsers) ? requiredUsers : [],
          autoAdvance: step.autoAdvance,
          timeoutDays: step.timeoutDays,
        };
      }),
      createdAt: definition.createdAt.toISOString(),
      updatedAt: definition.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/definitions/{id}:
 *   get:
 *     summary: Obter definição de workflow
 *     tags: [Workflows]
 */
router.get('/definitions/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const definition = await prisma.workflowDefinition.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!definition || definition.tenantId !== tenantId) {
      res.status(404).json({ message: 'Workflow definition não encontrada.' });
      return;
    }

    res.json({
      id: definition.id,
      name: definition.name,
      description: definition.description,
      entityType: definition.entityType,
      isActive: definition.isActive,
      steps: definition.steps.map((step) => {
        // Parse JSON fields se necessário
        let requiredRoles = step.requiredRoles;
        let requiredUsers = step.requiredUsers;
        
        if (typeof step.requiredRoles === 'string') {
          try {
            requiredRoles = JSON.parse(step.requiredRoles);
          } catch {
            requiredRoles = [];
          }
        }
        
        if (typeof step.requiredUsers === 'string') {
          try {
            requiredUsers = JSON.parse(step.requiredUsers);
          } catch {
            requiredUsers = [];
          }
        }
        
        return {
          id: step.id,
          stepOrder: step.stepOrder,
          stepType: step.stepType,
          name: step.name,
          description: step.description,
          requiredRoles: Array.isArray(requiredRoles) ? requiredRoles : [],
          requiredUsers: Array.isArray(requiredUsers) ? requiredUsers : [],
          autoAdvance: step.autoAdvance,
          timeoutDays: step.timeoutDays,
        };
      }),
      createdAt: definition.createdAt.toISOString(),
      updatedAt: definition.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/definitions/{id}:
 *   put:
 *     summary: Atualizar definição de workflow
 *     tags: [Workflows]
 */
router.put('/definitions/:id', authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const body = updateWorkflowDefinitionSchema.parse(req.body);

    const existing = await prisma.workflowDefinition.findUnique({
      where: { id },
    });

    if (!existing || existing.tenantId !== tenantId) {
      res.status(404).json({ message: 'Workflow definition não encontrada.' });
      return;
    }

    // Atualizar definição e passos
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.entityType !== undefined) updateData.entityType = body.entityType;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    if (body.steps !== undefined) {
      // Deletar passos existentes e criar novos
      await prisma.workflowStep.deleteMany({
        where: { workflowDefinitionId: id },
      });

      updateData.steps = {
        create: body.steps.map((step) => ({
          stepOrder: step.stepOrder,
          stepType: step.stepType,
          name: step.name,
          description: step.description,
          requiredRoles: step.requiredRoles ?? [],
          requiredUsers: step.requiredUsers ?? [],
          conditionExpression: step.conditionExpression ?? null,
          notificationTemplate: step.notificationTemplate ?? null,
          autoAdvance: step.autoAdvance ?? false,
          timeoutDays: step.timeoutDays ?? null,
        })),
      };
    }

    const definition = await prisma.workflowDefinition.update({
      where: { id },
      data: updateData,
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    res.json({
      id: definition.id,
      name: definition.name,
      description: definition.description,
      entityType: definition.entityType,
      isActive: definition.isActive,
      steps: definition.steps.map((step) => {
        // Parse JSON fields se necessário
        let requiredRoles = step.requiredRoles;
        let requiredUsers = step.requiredUsers;
        
        if (typeof step.requiredRoles === 'string') {
          try {
            requiredRoles = JSON.parse(step.requiredRoles);
          } catch {
            requiredRoles = [];
          }
        }
        
        if (typeof step.requiredUsers === 'string') {
          try {
            requiredUsers = JSON.parse(step.requiredUsers);
          } catch {
            requiredUsers = [];
          }
        }
        
        return {
          id: step.id,
          stepOrder: step.stepOrder,
          stepType: step.stepType,
          name: step.name,
          description: step.description,
          requiredRoles: Array.isArray(requiredRoles) ? requiredRoles : [],
          requiredUsers: Array.isArray(requiredUsers) ? requiredUsers : [],
          autoAdvance: step.autoAdvance,
          timeoutDays: step.timeoutDays,
        };
      }),
      createdAt: definition.createdAt.toISOString(),
      updatedAt: definition.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/definitions/{id}:
 *   delete:
 *     summary: Eliminar definição de workflow
 *     tags: [Workflows]
 */
router.delete('/definitions/:id', authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const definition = await prisma.workflowDefinition.findUnique({
      where: { id },
    });

    if (!definition || definition.tenantId !== tenantId) {
      res.status(404).json({ message: 'Workflow definition não encontrada.' });
      return;
    }

    await prisma.workflowDefinition.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/start:
 *   post:
 *     summary: Iniciar workflow para uma entidade
 *     tags: [Workflows]
 */
router.post('/start', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user!.id;
    const body = startWorkflowSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.tenantId !== tenantId) {
      res.status(403).json({ message: 'Acesso negado.' });
      return;
    }

    const result = await WorkflowEngine.startWorkflow(body.workflowDefinitionId, {
      tenantId,
      entityType: body.entityType,
      entityId: body.entityId,
      userId,
      userRole: user.role,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/instances/{entityType}/{entityId}:
 *   get:
 *     summary: Obter workflow ativo para uma entidade
 *     tags: [Workflows]
 */
router.get('/instances/:entityType/:entityId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { entityType, entityId } = req.params;

    if (!entityTypes.includes(entityType as any)) {
      res.status(400).json({ message: 'Tipo de entidade inválido.' });
      return;
    }

    const instance = await WorkflowEngine.getActiveWorkflow(tenantId, entityType, entityId);

    if (!instance) {
      res.status(404).json({ message: 'Workflow ativo não encontrado.' });
      return;
    }

    res.json({
      id: instance.id,
      workflowDefinition: {
        id: instance.workflowDefinition.id,
        name: instance.workflowDefinition.name,
        entityType: instance.workflowDefinition.entityType,
      },
      entityType: instance.entityType,
      entityId: instance.entityId,
      status: instance.status,
      currentStepOrder: instance.currentStepOrder,
      startedBy: {
        id: instance.startedByUser.id,
        name: instance.startedByUser.name,
        email: instance.startedByUser.email,
      },
      steps: instance.workflowDefinition.steps.map((step) => ({
        id: step.id,
        stepOrder: step.stepOrder,
        stepType: step.stepType,
        name: step.name,
        description: step.description,
        requiredRoles: step.requiredRoles,
        requiredUsers: step.requiredUsers,
        autoAdvance: step.autoAdvance,
        timeoutDays: step.timeoutDays,
        execution: instance.stepExecutions.find((e) => e.stepOrder === step.stepOrder),
      })),
      createdAt: instance.createdAt.toISOString(),
      updatedAt: instance.updatedAt.toISOString(),
      completedAt: instance.completedAt?.toISOString() || null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/instances/{id}/approve:
 *   post:
 *     summary: Aprovar passo atual do workflow
 *     tags: [Workflows]
 */
router.post('/instances/:id/approve', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const body = approveStepSchema.parse(req.body);

    const instance = await prisma.workflowInstance.findUnique({
      where: { id },
    });

    if (!instance) {
      res.status(404).json({ message: 'Workflow instance não encontrada.' });
      return;
    }

    if (!instance.currentStepOrder) {
      res.status(400).json({ message: 'Workflow não tem passo atual.' });
      return;
    }

    const result = await WorkflowEngine.approveStep(instance.id, instance.currentStepOrder, userId, body.comments);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/instances/{id}/reject:
 *   post:
 *     summary: Rejeitar passo atual do workflow
 *     tags: [Workflows]
 */
router.post('/instances/:id/reject', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const body = approveStepSchema.parse(req.body);

    const instance = await prisma.workflowInstance.findUnique({
      where: { id },
    });

    if (!instance) {
      res.status(404).json({ message: 'Workflow instance não encontrada.' });
      return;
    }

    if (!instance.currentStepOrder) {
      res.status(400).json({ message: 'Workflow não tem passo atual.' });
      return;
    }

    await WorkflowEngine.rejectStep(instance.id, instance.currentStepOrder, userId, body.comments);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/instances/{id}/cancel:
 *   post:
 *     summary: Cancelar workflow
 *     tags: [Workflows]
 */
router.post('/instances/:id/cancel', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await WorkflowEngine.cancelWorkflow(id, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

