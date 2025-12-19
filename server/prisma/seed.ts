import { PrismaClient, Role, OccurrenceType, WorkflowStepType, ActionStatus, Impact, OccurrenceStatus, OccurrenceSeverity } from '@prisma/client';
import { randomUUID } from 'crypto';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? 'tenant-default';

const iso9001Checklist = [
  {
    clause: '4.1',
    item: 'Compreender a organização e seu contexto',
    requirement: 'ISO 9001:2015 - 4.1',
    evidenceType: 'Entrevista / Análise documental',
  },
  {
    clause: '5.1',
    item: 'Liderança e comprometimento',
    requirement: 'ISO 9001:2015 - 5.1',
    evidenceType: 'Entrevista / Observação',
  },
  {
    clause: '6.1',
    item: 'Ações para tratar riscos e oportunidades',
    requirement: 'ISO 9001:2015 - 6.1',
    evidenceType: 'Plano de riscos / registos',
  },
  {
    clause: '7.2',
    item: 'Competência',
    requirement: 'ISO 9001:2015 - 7.2',
    evidenceType: 'Registos de formação / matrizes de competência',
  },
  {
    clause: '8.5',
    item: 'Produção e fornecimento de serviço',
    requirement: 'ISO 9001:2015 - 8.5',
    evidenceType: 'Observação / Procedimentos',
  },
  {
    clause: '10.2',
    item: 'Não conformidade e ação corretiva',
    requirement: 'ISO 9001:2015 - 10.2',
    evidenceType: 'Registos de NC / ações',
  },
];

async function seedAuditProgram(tenantId: string) {
  const program = await prisma.auditProgram.upsert({
    where: { id: 'audit-program-iso9001-template' },
    update: {
      tenantId,
      name: 'Programa ISO 9001 - Template',
      description: 'Template base para planeamento de auditorias ISO 9001',
      standard: 'ISO 9001',
      version: '2015',
      isTemplate: true,
      templateId: null,
    },
    create: {
      id: 'audit-program-iso9001-template',
      tenantId,
      name: 'Programa ISO 9001 - Template',
      description: 'Template base para planeamento de auditorias ISO 9001',
      standard: 'ISO 9001',
      version: '2015',
      isTemplate: true,
    },
  });

  await prisma.auditChecklist.deleteMany({ where: { auditProgramId: program.id } });
  await prisma.auditChecklist.createMany({
    data: iso9001Checklist.map((item, index) => ({
      auditProgramId: program.id,
      clause: item.clause,
      item: item.item,
      requirement: item.requirement,
      evidenceType: item.evidenceType,
      order: index + 1,
    })),
  });

  return program;
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT_ID },
    update: {},
    create: {
      id: DEFAULT_TENANT_ID,
      name: 'Tenant Demo',
      domain: 'demo.local',
    },
  });

  const adminPassword = await hashPassword('admin123');
  await prisma.user.upsert({
    where: { email: 'admin@demo.local' },
    update: { passwordHash: adminPassword },
    create: {
      id: randomUUID(),
      tenantId: tenant.id,
      name: 'Administrador Demo',
      email: 'admin@demo.local',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const sector = await prisma.sector.upsert({
    where: { id: 'default-sector' },
    update: {},
    create: {
      id: 'default-sector',
      tenantId: tenant.id,
      nome: 'Qualidade',
      responsavel: 'Maria Auditora',
      email: 'qualidade@demo.local',
      telefone: '+351 999 999 999',
      descricao: 'Setor responsável pelo SGI.',
    },
  });

  const auditProgram = await seedAuditProgram(tenant.id);

  const internalAudit = await prisma.internalAudit.create({
    data: {
      tenantId: tenant.id,
      auditProgramId: auditProgram.id,
      ano: new Date().getFullYear(),
      entidadeAuditora: 'Equipa Interna',
      iso: 'ISO 9001',
      inicio: new Date(),
      termino: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.externalAudit.create({
    data: {
      tenantId: tenant.id,
      auditProgramId: auditProgram.id,
      ano: new Date().getFullYear(),
      entidadeAuditora: 'CertificaMais',
      iso: 'ISO 9001',
      inicio: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      termino: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.actionItem.create({
    data: {
      tenantId: tenant.id,
      origem: 'INTERNA',
      acaoRelacionada: internalAudit.id,
      setor: sector.nome,
      descricao: 'Implementar plano corretivo',
      dataAbertura: new Date(),
      dataLimite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      impacto: Impact.MEDIO,
      status: ActionStatus.ANDAMENTO,
    },
  });

  await prisma.occurrence.create({
    data: {
      id: 'occ-ambiental-demo',
      tenantId: tenant.id,
      tipo: OccurrenceType.AMBIENTAL,
      setor: sector.nome,
      departamentosAtingidos: [sector.id],
      responsavel: 'Carlos Técnico',
      data: new Date(),
      descricao: 'Ocorrência de desvio no procedimento',
      gravidade: OccurrenceSeverity.MEDIA,
      status: OccurrenceStatus.EM_MITIGACAO,
      acaoGerada: 'Implementar plano corretivo',
    },
  });

  await prisma.occurrence.create({
    data: {
      id: 'occ-reclamacao-demo',
      tenantId: tenant.id,
      tipo: OccurrenceType.RECLAMACAO,
      setor: sector.nome,
      departamentosAtingidos: [sector.id],
      responsavel: 'Atendimento Cliente',
      data: new Date(),
      descricao: 'Reclamação de cliente sobre prazo de entrega.',
      gravidade: OccurrenceSeverity.ALTA,
      status: OccurrenceStatus.ABERTA,
      acaoGerada: 'Abrir ação corretiva',
    },
  });

  await prisma.occurrence.create({
    data: {
      id: 'occ-sugestao-demo',
      tenantId: tenant.id,
      tipo: OccurrenceType.SUGESTAO,
      setor: sector.nome,
      departamentosAtingidos: [sector.id],
      responsavel: 'Colaborador Loja',
      data: new Date(),
      descricao: 'Sugestão de melhoria no processo de retorno de produtos.',
      gravidade: OccurrenceSeverity.BAIXA,
      status: OccurrenceStatus.EM_MITIGACAO,
      acaoGerada: 'Avaliar viabilidade',
    },
  });

  // Workflows específicos para Reclamação e Sugestão
  const workflows = [
    {
      id: 'wf-reclamacao',
      name: 'Workflow Reclamação',
      description: 'Triagem e resolução de reclamações de clientes.',
      entityType: 'Occurrence',
      steps: [
        {
          stepOrder: 1,
          stepType: WorkflowStepType.APPROVAL,
          name: 'Triagem',
          description: 'Avaliar a reclamação e validar dados.',
          requiredRoles: ['GESTOR'],
        },
        {
          stepOrder: 2,
          stepType: WorkflowStepType.NOTIFICATION,
          name: 'Notificar Qualidade',
          description: 'Enviar notificação para equipa de Qualidade.',
          requiredRoles: ['GESTOR'],
        },
      ],
    },
    {
      id: 'wf-sugestao',
      name: 'Workflow Sugestão',
      description: 'Avaliação e implementação de sugestões.',
      entityType: 'Occurrence',
      steps: [
        {
          stepOrder: 1,
          stepType: WorkflowStepType.APPROVAL,
          name: 'Avaliar sugestão',
          description: 'Analisar viabilidade e impacto.',
          requiredRoles: ['GESTOR'],
        },
        {
          stepOrder: 2,
          stepType: WorkflowStepType.NOTIFICATION,
          name: 'Notificar responsável',
          description: 'Notificar responsável pela implementação.',
          requiredRoles: ['GESTOR'],
        },
      ],
    },
  ];

  for (const wf of workflows) {
    const def = await prisma.workflowDefinition.upsert({
      where: { id: wf.id },
      update: {
        name: wf.name,
        description: wf.description,
        entityType: wf.entityType,
        isActive: true,
      },
      create: {
        id: wf.id,
        tenantId: tenant.id,
        name: wf.name,
        description: wf.description,
        entityType: wf.entityType,
        isActive: true,
      },
    });

    await prisma.workflowStep.deleteMany({ where: { workflowDefinitionId: def.id } });
    await prisma.workflowStep.createMany({
      data: wf.steps.map((step) => ({
        workflowDefinitionId: def.id,
        stepOrder: step.stepOrder,
        stepType: step.stepType as WorkflowStepType,
        name: step.name,
        description: step.description,
        requiredRoles: step.requiredRoles,
        requiredUsers: [],
        autoAdvance: false,
      })),
    });
  }

  await prisma.importLog.create({
    data: {
      tenantId: tenant.id,
      fileName: 'seed.xlsx',
      mode: 'replace',
      entity: 'all',
      status: 'COMPLETED',
      totalRecords: 6,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });