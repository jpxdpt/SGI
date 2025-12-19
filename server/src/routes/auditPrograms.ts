import express from 'express';
import { z } from 'zod';
import type { Request } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

const getTenantId = (req: AuthRequest | Request): string => {
  if ('user' in req && req.user) {
    return req.user.tenantId;
  }
  return (req.header('x-tenant-id') as string | undefined) ?? 'tenant-default';
};

const checklistSchema = z.object({
  clause: z.string().min(1, 'Cláusula é obrigatória'),
  item: z.string().min(1, 'Item é obrigatório'),
  requirement: z.string().optional(),
  evidenceType: z.string().optional(),
  order: z.number().int().nonnegative(),
});

const createProgramSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  standard: z.string().min(1, 'Norma é obrigatória'),
  version: z.string().min(1, 'Versão é obrigatória'),
  isTemplate: z.boolean().optional().default(true),
  templateId: z.string().uuid().optional(),
  checklists: z.array(checklistSchema).default([]),
});

const updateProgramSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  standard: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  isTemplate: z.boolean().optional(),
  checklists: z.array(checklistSchema).optional(),
});

const instantiateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  standard: z.string().optional(),
  version: z.string().optional(),
  type: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
  audit: z
    .object({
      ano: z.number().int(),
      entidadeAuditora: z.string().optional(),
      iso: z.string().optional(),
      inicio: z.string().datetime().optional(),
      termino: z.string().datetime().optional(),
    })
    .optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const isTemplateQuery = req.query.isTemplate as string | undefined;
    const isTemplate = typeof isTemplateQuery !== 'undefined' ? isTemplateQuery === 'true' : undefined;

    const programs = await prisma.auditProgram.findMany({
      where: {
        tenantId,
        ...(typeof isTemplate === 'boolean' ? { isTemplate } : {}),
      },
      include: {
        checklists: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(programs);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const program = await prisma.auditProgram.findUnique({
      where: { id },
      include: { checklists: { orderBy: { order: 'asc' } }, template: true },
    });

    if (!program || program.tenantId !== tenantId) {
      return res.status(404).json({ message: 'Programa não encontrado.' });
    }

    res.json(program);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const payload = createProgramSchema.parse(req.body);

    if (payload.templateId) {
      const template = await prisma.auditProgram.findUnique({ where: { id: payload.templateId } });
      if (!template || template.tenantId !== tenantId || !template.isTemplate) {
        return res.status(400).json({ message: 'Template inválido para clonagem.' });
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const program = await tx.auditProgram.create({
        data: {
          tenantId,
          name: payload.name,
          description: payload.description,
          standard: payload.standard,
          version: payload.version,
          isTemplate: payload.isTemplate ?? true,
          templateId: payload.templateId,
        },
      });

      if (payload.checklists.length > 0) {
        await tx.auditChecklist.createMany({
          data: payload.checklists.map((item) => ({
            auditProgramId: program.id,
            clause: item.clause,
            item: item.item,
            requirement: item.requirement,
            evidenceType: item.evidenceType,
            order: item.order,
          })),
        });
      }

      return program;
    });

    const programWithChecklists = await prisma.auditProgram.findUnique({
      where: { id: created.id },
      include: { checklists: { orderBy: { order: 'asc' } } },
    });

    res.status(201).json(programWithChecklists);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos.', errors: error.errors });
    }
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const payload = updateProgramSchema.parse(req.body);

    const existing = await prisma.auditProgram.findUnique({
      where: { id },
      include: { checklists: true },
    });

    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ message: 'Programa não encontrado.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const program = await tx.auditProgram.update({
        where: { id },
        data: {
          ...(payload.name && { name: payload.name }),
          ...(payload.description !== undefined && { description: payload.description }),
          ...(payload.standard && { standard: payload.standard }),
          ...(payload.version && { version: payload.version }),
          ...(payload.isTemplate !== undefined && { isTemplate: payload.isTemplate }),
        },
      });

      if (payload.checklists) {
        await tx.auditChecklist.deleteMany({ where: { auditProgramId: id } });
        if (payload.checklists.length > 0) {
          await tx.auditChecklist.createMany({
            data: payload.checklists.map((item) => ({
              auditProgramId: id,
              clause: item.clause,
              item: item.item,
              requirement: item.requirement,
              evidenceType: item.evidenceType,
              order: item.order,
            })),
          });
        }
      }

      return program;
    });

    const programWithChecklists = await prisma.auditProgram.findUnique({
      where: { id: updated.id },
      include: { checklists: { orderBy: { order: 'asc' } } },
    });

    res.json(programWithChecklists);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos.', errors: error.errors });
    }
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const existing = await prisma.auditProgram.findUnique({
      where: { id },
    });

    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ message: 'Programa não encontrado.' });
    }

    const linkedInternal = await prisma.internalAudit.count({ where: { auditProgramId: id } });
    const linkedExternal = await prisma.externalAudit.count({ where: { auditProgramId: id } });
    const hasDerivatives = await prisma.auditProgram.count({ where: { templateId: id } });

    if (linkedInternal + linkedExternal + hasDerivatives > 0) {
      return res
        .status(400)
        .json({ message: 'Não é possível remover o programa porque existem auditorias ou instâncias associadas.' });
    }

    await prisma.auditProgram.delete({ where: { id } });

    res.json({ message: 'Programa removido com sucesso.' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/instantiate', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const payload = instantiateSchema.parse(req.body);

    const template = await prisma.auditProgram.findUnique({
      where: { id },
      include: { checklists: true },
    });

    if (!template || template.tenantId !== tenantId || !template.isTemplate) {
      return res.status(404).json({ message: 'Template não encontrado ou não elegível.' });
    }

    const programData = {
      tenantId,
      name: payload.name,
      description: payload.description ?? template.description,
      standard: payload.standard ?? template.standard,
      version: payload.version ?? template.version,
      isTemplate: false,
      templateId: template.id,
    };

    const result = await prisma.$transaction(async (tx) => {
      const newProgram = await tx.auditProgram.create({ data: programData });

      if (template.checklists.length > 0) {
        await tx.auditChecklist.createMany({
          data: template.checklists.map((item) => ({
            auditProgramId: newProgram.id,
            clause: item.clause,
            item: item.item,
            requirement: item.requirement,
            evidenceType: item.evidenceType,
            order: item.order,
          })),
        });
      }

      let audit: any = null;
      if (payload.audit) {
        const auditBase = {
          tenantId,
          auditProgramId: newProgram.id,
          ano: payload.audit.ano,
          entidadeAuditora: payload.audit.entidadeAuditora,
          iso: payload.audit.iso ?? programData.standard,
          inicio: payload.audit.inicio ? new Date(payload.audit.inicio) : undefined,
          termino: payload.audit.termino ? new Date(payload.audit.termino) : undefined,
        };

        if (payload.type === 'INTERNAL') {
          audit = await tx.internalAudit.create({ data: auditBase });
        } else {
          audit = await tx.externalAudit.create({ data: auditBase });
        }
      }

      return { newProgram, audit };
    });

    const fullProgram = await prisma.auditProgram.findUnique({
      where: { id: result.newProgram.id },
      include: { checklists: { orderBy: { order: 'asc' } } },
    });

    res.status(201).json({ program: fullProgram, audit: result.audit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos.', errors: error.errors });
    }
    next(error);
  }
});

export default router;


