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

const analysisTypeSchema = z.enum(['ISHIKAWA', 'FTA', 'FIVE_WHYS']);

const createRootCauseAnalysisSchema = z.object({
  actionItemId: z.string().uuid(),
  analysisType: analysisTypeSchema,
  data: z.any(), // JSON flexível para diferentes tipos de análise
});

const updateRootCauseAnalysisSchema = z.object({
  analysisType: analysisTypeSchema.optional(),
  data: z.any().optional(),
});

/**
 * @swagger
 * /api/root-cause-analysis/{actionItemId}:
 *   get:
 *     summary: Obter análise de causa raiz de uma ação
 *     tags: [RootCauseAnalysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actionItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da ação
 *     responses:
 *       200:
 *         description: Análise de causa raiz encontrada
 *       404:
 *         description: Análise não encontrada
 */
router.get('/:actionItemId', authenticateToken, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { actionItemId } = req.params;

    // Verificar se a action existe e pertence ao tenant
    const action = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
    });

    if (!action || action.tenantId !== tenantId) {
      return res.status(404).json({ message: 'Ação não encontrada.' });
    }

    // Buscar análise de causa raiz
    const analysis = await prisma.rootCauseAnalysis.findUnique({
      where: { actionItemId },
      include: {
        actionItem: {
          select: {
            id: true,
            descricao: true,
          },
        },
      },
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Análise de causa raiz não encontrada.' });
    }

    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/root-cause-analysis:
 *   post:
 *     summary: Criar ou atualizar análise de causa raiz
 *     tags: [RootCauseAnalysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - actionItemId
 *               - analysisType
 *               - data
 *             properties:
 *               actionItemId:
 *                 type: string
 *                 format: uuid
 *               analysisType:
 *                 type: string
 *                 enum: [ISHIKAWA, FTA, FIVE_WHYS]
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Análise atualizada
 *       201:
 *         description: Análise criada
 *       404:
 *         description: Ação não encontrada
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const validatedData = createRootCauseAnalysisSchema.parse(req.body);
    const { actionItemId, analysisType, data } = validatedData;

    // Verificar se a action existe e pertence ao tenant
    const action = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
    });

    if (!action || action.tenantId !== tenantId) {
      return res.status(404).json({ message: 'Ação não encontrada.' });
    }

    // Verificar se já existe uma análise para esta ação
    const existing = await prisma.rootCauseAnalysis.findUnique({
      where: { actionItemId },
    });

    if (existing) {
      // Atualizar análise existente
      const updated = await prisma.rootCauseAnalysis.update({
        where: { actionItemId },
        data: {
          analysisType,
          data,
        },
      });
      return res.json(updated);
    } else {
      // Criar nova análise
      const created = await prisma.rootCauseAnalysis.create({
        data: {
          actionItemId,
          tenantId,
          analysisType,
          data,
        },
      });
      return res.status(201).json(created);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos.', errors: error.errors });
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/root-cause-analysis/{actionItemId}:
 *   put:
 *     summary: Atualizar análise de causa raiz
 *     tags: [RootCauseAnalysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actionItemId
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
 *             properties:
 *               analysisType:
 *                 type: string
 *                 enum: [ISHIKAWA, FTA, FIVE_WHYS]
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Análise atualizada
 *       404:
 *         description: Análise não encontrada
 */
router.put('/:actionItemId', authenticateToken, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { actionItemId } = req.params;
    const validatedData = updateRootCauseAnalysisSchema.parse(req.body);

    // Verificar se a action existe e pertence ao tenant
    const action = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
    });

    if (!action || action.tenantId !== tenantId) {
      return res.status(404).json({ message: 'Ação não encontrada.' });
    }

    // Verificar se a análise existe
    const existing = await prisma.rootCauseAnalysis.findUnique({
      where: { actionItemId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Análise de causa raiz não encontrada.' });
    }

    // Atualizar análise
    const updated = await prisma.rootCauseAnalysis.update({
      where: { actionItemId },
      data: {
        ...(validatedData.analysisType && { analysisType: validatedData.analysisType }),
        ...(validatedData.data && { data: validatedData.data }),
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos.', errors: error.errors });
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/root-cause-analysis/{actionItemId}:
 *   delete:
 *     summary: Deletar análise de causa raiz
 *     tags: [RootCauseAnalysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actionItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Análise deletada
 *       404:
 *         description: Análise não encontrada
 */
router.delete('/:actionItemId', authenticateToken, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { actionItemId } = req.params;

    // Verificar se a action existe e pertence ao tenant
    const action = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
    });

    if (!action || action.tenantId !== tenantId) {
      return res.status(404).json({ message: 'Ação não encontrada.' });
    }

    // Verificar se a análise existe
    const existing = await prisma.rootCauseAnalysis.findUnique({
      where: { actionItemId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Análise de causa raiz não encontrada.' });
    }

    // Deletar análise
    await prisma.rootCauseAnalysis.delete({
      where: { actionItemId },
    });

    res.json({ message: 'Análise de causa raiz deletada com sucesso.' });
  } catch (error) {
    next(error);
  }
});

export default router;







