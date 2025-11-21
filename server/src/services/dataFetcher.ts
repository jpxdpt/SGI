import { prisma } from '../prisma';
import {
  mapInternalAuditFromDb,
  mapExternalAuditFromDb,
  mapActionItemFromDb,
  mapOccurrenceFromDb,
  mapSectorFromDb,
} from '../mappers';

/**
 * Funções auxiliares para buscar dados para relatórios
 * Todas recebem tenantId para garantir isolamento multi-tenant
 */

export const fetchInternalAudits = async (tenantId: string) => {
  const audits = await prisma.internalAudit.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
  return audits.map(mapInternalAuditFromDb);
};

export const fetchExternalAudits = async (tenantId: string) => {
  const audits = await prisma.externalAudit.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
  return audits.map(mapExternalAuditFromDb);
};

export const fetchActionItems = async (tenantId: string) => {
  const actions = await prisma.actionItem.findMany({
    where: { tenantId },
    orderBy: { dataAbertura: 'desc' },
  });
  return actions.map(mapActionItemFromDb);
};

export const fetchOccurrences = async (tenantId: string) => {
  const occurrences = await prisma.occurrence.findMany({
    where: { tenantId },
    orderBy: { data: 'desc' },
  });
  return occurrences.map(mapOccurrenceFromDb);
};

export const fetchSectors = async (tenantId: string) => {
  const sectors = await prisma.sector.findMany({
    where: { tenantId, ativo: true },
    orderBy: { nome: 'asc' },
  });
  return sectors.map(mapSectorFromDb);
};

export const fetchDashboardSummary = async (tenantId: string) => {
  const [totalInternas, totalExternas, totalAcoes, totalOcorrencias, setoresAtivos] = await Promise.all([
    prisma.internalAudit.count({ where: { tenantId } }),
    prisma.externalAudit.count({ where: { tenantId } }),
    prisma.actionItem.count({ where: { tenantId } }),
    prisma.occurrence.count({ where: { tenantId } }),
    prisma.sector.count({ where: { tenantId, ativo: true } }),
  ]);

  return {
    totalInternas,
    totalExternas,
    totalAcoes,
    totalOcorrencias,
    setoresAtivos,
  };
};





