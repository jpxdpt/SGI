import { PrismaClient, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? 'tenant-default';

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

  const internalAudit = await prisma.internalAudit.create({
    data: {
      tenantId: tenant.id,
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
      impacto: 'MEDIO',
      status: 'ANDAMENTO',
    },
  });

  await prisma.occurrence.create({
    data: {
      tenantId: tenant.id,
      tipo: 'AMBIENTAL',
      setor: sector.nome,
      departamentosAtingidos: [sector.id],
      responsavel: 'Carlos Técnico',
      data: new Date(),
      descricao: 'Ocorrência de desvio no procedimento',
      gravidade: 'MEDIA',
      status: 'EM_MITIGACAO',
      acaoGerada: 'Implementar plano corretivo',
    },
  });

  await prisma.importLog.create({
    data: {
      tenantId: tenant.id,
      fileName: 'seed.xlsx',
      mode: 'replace',
      entity: 'all',
      status: 'COMPLETED',
      totalRecords: 4,
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



import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? 'tenant-default';

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

  const internalAudit = await prisma.internalAudit.create({
    data: {
      tenantId: tenant.id,
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
      impacto: 'MEDIO',
      status: 'ANDAMENTO',
    },
  });

  await prisma.occurrence.create({
    data: {
      tenantId: tenant.id,
      tipo: 'AMBIENTAL',
      setor: sector.nome,
      departamentosAtingidos: [sector.id],
      responsavel: 'Carlos Técnico',
      data: new Date(),
      descricao: 'Ocorrência de desvio no procedimento',
      gravidade: 'MEDIA',
      status: 'EM_MITIGACAO',
      acaoGerada: 'Implementar plano corretivo',
    },
  });

  await prisma.importLog.create({
    data: {
      tenantId: tenant.id,
      fileName: 'seed.xlsx',
      mode: 'replace',
      entity: 'all',
      status: 'COMPLETED',
      totalRecords: 4,
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




