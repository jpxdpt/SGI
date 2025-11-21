import type {
  Prisma,
  InternalAudit as DbInternalAudit,
  ExternalAudit as DbExternalAudit,
  ActionItem as DbActionItem,
  Occurrence as DbOccurrence,
  Sector as DbSector,
  ActionOrigin as DbActionOrigin,
  ActionStatus as DbActionStatus,
  Impact as DbImpact,
  OccurrenceSeverity as DbOccurrenceSeverity,
  OccurrenceStatus as DbOccurrenceStatus,
  OccurrenceType as DbOccurrenceType,
  Conformidade as DbConformidade,
} from '@prisma/client';
import type { ActionItem, ExternalAudit, InternalAudit, Occurrence, Sector, Conformidade } from './types';

const isoOrFallback = (value: Date) => value.toISOString();

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const replaced = value.replace(',', '.');
    const casted = Number(replaced);
    return Number.isFinite(casted) ? casted : fallback;
  }
  return fallback;
};

const actionOriginToDb: Record<ActionItem['origem'], DbActionOrigin> = {
  Interna: 'INTERNA',
  Externa: 'EXTERNA',
  'Ocorrência': 'OCORRENCIA',
};

const actionOriginFromDb: Record<DbActionOrigin, ActionItem['origem']> = {
  INTERNA: 'Interna',
  EXTERNA: 'Externa',
  OCORRENCIA: 'Ocorrência',
};

const actionStatusToDb: Record<ActionItem['status'], DbActionStatus> = {
  Executada: 'EXECUTADA',
  'Executada+Atraso': 'EXECUTADA_ATRASO',
  Atrasada: 'ATRASADA',
  Andamento: 'ANDAMENTO',
};

const actionStatusFromDb: Record<DbActionStatus, ActionItem['status']> = {
  EXECUTADA: 'Executada',
  EXECUTADA_ATRASO: 'Executada+Atraso',
  ATRASADA: 'Atrasada',
  ANDAMENTO: 'Andamento',
  // Compatibilidade com valores antigos (usar as any para permitir)
} as Record<DbActionStatus, ActionItem['status']> & {
  CONCLUIDA?: ActionItem['status'];
  EM_ANDAMENTO?: ActionItem['status'];
};

// Função auxiliar para mapear status com compatibilidade
const mapActionStatus = (status: string): ActionItem['status'] => {
  if (status === 'CONCLUIDA') return 'Executada';
  if (status === 'EM_ANDAMENTO') return 'Andamento';
  return actionStatusFromDb[status as DbActionStatus] || 'Andamento';
};

const impactToDb: Record<ActionItem['impacto'], DbImpact> = {
  Baixo: 'BAIXO',
  Médio: 'MEDIO',
  Alto: 'ALTO',
};

const impactFromDb: Record<DbImpact, ActionItem['impacto']> = {
  BAIXO: 'Baixo',
  MEDIO: 'Médio',
  ALTO: 'Alto',
};

const occurrenceSeverityToDb: Record<Occurrence['gravidade'], DbOccurrenceSeverity> = {
  Baixa: 'BAIXA',
  Média: 'MEDIA',
  Alta: 'ALTA',
  Crítica: 'CRITICA',
};

const occurrenceSeverityFromDb: Record<DbOccurrenceSeverity, Occurrence['gravidade']> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
};

const occurrenceStatusToDb: Record<Occurrence['status'], DbOccurrenceStatus> = {
  Aberta: 'ABERTA',
  'Em mitigação': 'EM_MITIGACAO',
  Resolvida: 'RESOLVIDA',
};

const occurrenceStatusFromDb: Record<DbOccurrenceStatus, Occurrence['status']> = {
  ABERTA: 'Aberta',
  EM_MITIGACAO: 'Em mitigação',
  RESOLVIDA: 'Resolvida',
};

const occurrenceTypeToDb: Record<Occurrence['tipo'], DbOccurrenceType> = {
  Ambiental: 'AMBIENTAL',
  'Segurança dos Trabalhadores': 'SEGURANCA_TRABALHADORES',
  'Segurança Alimentar': 'SEGURANCA_ALIMENTAR',
};

const occurrenceTypeFromDb: Record<DbOccurrenceType, Occurrence['tipo']> = {
  AMBIENTAL: 'Ambiental',
  SEGURANCA_TRABALHADORES: 'Segurança dos Trabalhadores',
  SEGURANCA_ALIMENTAR: 'Segurança Alimentar',
};

const conformidadeToDb: Record<Conformidade, DbConformidade> = {
  Conformidade: 'CONFORMIDADE',
  'Não conformidade': 'NAO_CONFORMIDADE',
};

const conformidadeFromDb: Record<DbConformidade, Conformidade> = {
  CONFORMIDADE: 'Conformidade',
  NAO_CONFORMIDADE: 'Não conformidade',
};

export const mapInternalAuditFromDb = (record: DbInternalAudit): InternalAudit => ({
  id: record.id,
  ano: record.ano,
  entidadeAuditora: record.entidadeAuditora ?? undefined,
  iso: record.iso ?? undefined,
  inicio: record.inicio ? isoOrFallback(record.inicio) : undefined,
  termino: record.termino ? isoOrFallback(record.termino) : undefined,
});

export const mapExternalAuditFromDb = (record: DbExternalAudit): ExternalAudit => ({
  id: record.id,
  ano: record.ano,
  entidadeAuditora: record.entidadeAuditora,
  iso: record.iso ?? undefined,
  inicio: record.inicio ? isoOrFallback(record.inicio) : undefined,
  termino: record.termino ? isoOrFallback(record.termino) : undefined,
});

export const mapActionItemFromDb = (record: DbActionItem): ActionItem => ({
  id: record.id,
  origem: actionOriginFromDb[record.origem],
  acaoRelacionada: record.acaoRelacionada,
  conformidade: record.conformidade ? conformidadeFromDb[record.conformidade] : undefined,
  numeroAssociado: record.numeroAssociado ?? undefined,
  ambito: record.ambito ?? undefined,
  descricao: record.descricao,
  causaRaizIdentificada: record.causaRaizIdentificada ?? undefined,
  acaoCorretiva: record.acaoCorretiva ?? undefined,
  local: record.local ?? undefined,
  responsavel: record.responsavel ?? undefined,
  inicio: record.inicio ? isoOrFallback(record.inicio) : undefined,
  termino: record.termino ? isoOrFallback(record.termino) : undefined,
  conclusao: record.conclusao ? isoOrFallback(record.conclusao) : undefined,
  status: mapActionStatus(record.status),
  mes: record.mes ?? undefined,
  evidencia: record.evidencia ?? undefined,
  avaliacaoEficacia: record.avaliacaoEficacia ?? undefined,
  setor: record.setor,
  dataAbertura: isoOrFallback(record.dataAbertura),
  dataLimite: isoOrFallback(record.dataLimite),
  dataConclusao: record.dataConclusao ? isoOrFallback(record.dataConclusao) : undefined,
  impacto: impactFromDb[record.impacto],
});

export const mapOccurrenceFromDb = (record: DbOccurrence): Occurrence => ({
  id: record.id,
  tipo: occurrenceTypeFromDb[record.tipo],
  setor: record.setor,
  departamentosAtingidos: Array.isArray(record.departamentosAtingidos) 
    ? record.departamentosAtingidos as string[]
    : record.departamentosAtingidos 
      ? [String(record.departamentosAtingidos)]
      : [],
  responsavel: record.responsavel,
  data: isoOrFallback(record.data),
  descricao: record.descricao,
  resolucao: record.resolucao ?? undefined,
  gravidade: occurrenceSeverityFromDb[record.gravidade],
  acaoGerada: record.acaoGerada ?? undefined,
  status: occurrenceStatusFromDb[record.status],
});

export const mapSectorFromDb = (record: DbSector): Sector => ({
  id: record.id,
  nome: record.nome,
  responsavel: record.responsavel,
  email: record.email ?? '',
  telefone: record.telefone ?? '',
  descricao: record.descricao ?? '',
  ativo: record.ativo,
});

export const buildInternalAuditCreateData = (
  payload: Partial<InternalAudit>,
  tenantId: string,
): Prisma.InternalAuditUncheckedCreateInput => ({
  tenantId,
  ano: toNumber(payload.ano, new Date().getFullYear()),
  entidadeAuditora: payload.entidadeAuditora ?? null,
  iso: payload.iso ?? null,
  inicio: payload.inicio ? parseDate(payload.inicio) : null,
  termino: payload.termino ? parseDate(payload.termino) : null,
});

export const buildInternalAuditUpdateData = (
  payload: Partial<InternalAudit>,
): Prisma.InternalAuditUncheckedUpdateInput => {
  const data: Prisma.InternalAuditUncheckedUpdateInput = {};
  if (payload.ano !== undefined) data.ano = toNumber(payload.ano);
  if (payload.entidadeAuditora !== undefined) data.entidadeAuditora = payload.entidadeAuditora ?? null;
  if (payload.iso !== undefined) data.iso = payload.iso ?? null;
  if (payload.inicio !== undefined) data.inicio = payload.inicio ? parseDate(payload.inicio) : null;
  if (payload.termino !== undefined) data.termino = payload.termino ? parseDate(payload.termino) : null;
  return data;
};

export const buildExternalAuditCreateData = (
  payload: Partial<ExternalAudit>,
  tenantId: string,
): Prisma.ExternalAuditUncheckedCreateInput => ({
  tenantId,
  ano: toNumber(payload.ano, new Date().getFullYear()),
  entidadeAuditora: payload.entidadeAuditora ?? 'Entidade não informada',
  iso: payload.iso ?? null,
  inicio: payload.inicio ? parseDate(payload.inicio) : null,
  termino: payload.termino ? parseDate(payload.termino) : null,
});

export const buildExternalAuditUpdateData = (
  payload: Partial<ExternalAudit>,
): Prisma.ExternalAuditUncheckedUpdateInput => {
  const data: Prisma.ExternalAuditUncheckedUpdateInput = {};
  if (payload.ano !== undefined) data.ano = toNumber(payload.ano);
  if (payload.entidadeAuditora !== undefined) data.entidadeAuditora = payload.entidadeAuditora;
  if (payload.iso !== undefined) data.iso = payload.iso ?? null;
  if (payload.inicio !== undefined) data.inicio = payload.inicio ? parseDate(payload.inicio) : null;
  if (payload.termino !== undefined) data.termino = payload.termino ? parseDate(payload.termino) : null;
  return data;
};

export const buildActionItemCreateData = (
  payload: Partial<ActionItem>,
  tenantId: string,
): Prisma.ActionItemUncheckedCreateInput => ({
  tenantId,
  origem: actionOriginToDb[payload.origem ?? 'Interna'],
  acaoRelacionada: payload.acaoRelacionada ?? '',
  conformidade: payload.conformidade ? conformidadeToDb[payload.conformidade] : null,
  numeroAssociado: payload.numeroAssociado ?? null,
  ambito: payload.ambito ?? null,
  descricao: payload.descricao ?? '',
  causaRaizIdentificada: payload.causaRaizIdentificada ?? null,
  acaoCorretiva: payload.acaoCorretiva ?? null,
  local: payload.local ?? null,
  responsavel: payload.responsavel ?? null,
  inicio: payload.inicio ? parseDate(payload.inicio) : null,
  termino: payload.termino ? parseDate(payload.termino) : null,
  conclusao: payload.conclusao ? parseDate(payload.conclusao) : null,
    status: actionStatusToDb[payload.status ?? 'Andamento'],
  mes: payload.mes ?? null,
  evidencia: payload.evidencia ?? null,
  avaliacaoEficacia: payload.avaliacaoEficacia ?? null,
  setor: payload.setor ?? 'Sem setor',
  dataAbertura: payload.dataAbertura ? parseDate(payload.dataAbertura) : new Date(),
  dataLimite: payload.dataLimite ? parseDate(payload.dataLimite) : new Date(),
  dataConclusao: payload.dataConclusao ? parseDate(payload.dataConclusao) : undefined,
  impacto: impactToDb[payload.impacto ?? 'Médio'],
});

export const buildActionItemUpdateData = (
  payload: Partial<ActionItem>,
): Prisma.ActionItemUncheckedUpdateInput => {
  const data: Prisma.ActionItemUncheckedUpdateInput = {};
  if (payload.origem !== undefined) data.origem = actionOriginToDb[payload.origem];
  if (payload.acaoRelacionada !== undefined) data.acaoRelacionada = payload.acaoRelacionada;
  if (payload.conformidade !== undefined) data.conformidade = payload.conformidade ? conformidadeToDb[payload.conformidade] : null;
  if (payload.numeroAssociado !== undefined) data.numeroAssociado = payload.numeroAssociado ?? null;
  if (payload.ambito !== undefined) data.ambito = payload.ambito ?? null;
  if (payload.descricao !== undefined) data.descricao = payload.descricao;
  if (payload.causaRaizIdentificada !== undefined) data.causaRaizIdentificada = payload.causaRaizIdentificada ?? null;
  if (payload.acaoCorretiva !== undefined) data.acaoCorretiva = payload.acaoCorretiva ?? null;
  if (payload.local !== undefined) data.local = payload.local ?? null;
  if (payload.responsavel !== undefined) data.responsavel = payload.responsavel ?? null;
  if (payload.inicio !== undefined) data.inicio = payload.inicio ? parseDate(payload.inicio) : null;
  if (payload.termino !== undefined) data.termino = payload.termino ? parseDate(payload.termino) : null;
  if (payload.conclusao !== undefined) data.conclusao = payload.conclusao ? parseDate(payload.conclusao) : null;
  if (payload.status !== undefined) data.status = actionStatusToDb[payload.status];
  if (payload.mes !== undefined) data.mes = payload.mes ?? null;
  if (payload.evidencia !== undefined) data.evidencia = payload.evidencia ?? null;
  if (payload.avaliacaoEficacia !== undefined) data.avaliacaoEficacia = payload.avaliacaoEficacia ?? null;
  if (payload.setor !== undefined) data.setor = payload.setor;
  if (payload.dataAbertura !== undefined) data.dataAbertura = parseDate(payload.dataAbertura);
  if (payload.dataLimite !== undefined) data.dataLimite = parseDate(payload.dataLimite);
  if (payload.dataConclusao !== undefined) data.dataConclusao = payload.dataConclusao ? parseDate(payload.dataConclusao) : null;
  if (payload.impacto !== undefined) data.impacto = impactToDb[payload.impacto];
  return data;
};

export const buildOccurrenceCreateData = (
  payload: Partial<Occurrence>,
  tenantId: string,
): Prisma.OccurrenceUncheckedCreateInput => ({
  tenantId,
  tipo: payload.tipo ? occurrenceTypeToDb[payload.tipo] : 'AMBIENTAL',
  setor: payload.setor ?? (payload.departamentosAtingidos && payload.departamentosAtingidos.length > 0 
    ? payload.departamentosAtingidos[0] 
    : 'Sem setor'),
  departamentosAtingidos: payload.departamentosAtingidos && payload.departamentosAtingidos.length > 0
    ? payload.departamentosAtingidos
    : (payload.setor ? [payload.setor] : []),
  responsavel: payload.responsavel ?? 'Sem responsável',
  data: parseDate(payload.data) ?? new Date(),
  descricao: payload.descricao ?? '',
  resolucao: payload.resolucao,
  gravidade: occurrenceSeverityToDb[payload.gravidade ?? 'Média'],
  acaoGerada: payload.acaoGerada,
  status: occurrenceStatusToDb[payload.status ?? 'Aberta'],
});

export const buildOccurrenceUpdateData = (
  payload: Partial<Occurrence>,
): Prisma.OccurrenceUncheckedUpdateInput => {
  const data: Prisma.OccurrenceUncheckedUpdateInput = {};
  if (payload.tipo !== undefined) data.tipo = occurrenceTypeToDb[payload.tipo];
  if (payload.setor !== undefined) data.setor = payload.setor;
  if (payload.departamentosAtingidos !== undefined) {
    data.departamentosAtingidos = payload.departamentosAtingidos.length > 0
      ? payload.departamentosAtingidos
      : (payload.setor ? [payload.setor] : []);
  }
  if (payload.responsavel !== undefined) data.responsavel = payload.responsavel;
  if (payload.data !== undefined) data.data = parseDate(payload.data);
  if (payload.descricao !== undefined) data.descricao = payload.descricao;
  if (payload.resolucao !== undefined) data.resolucao = payload.resolucao;
  if (payload.gravidade !== undefined) data.gravidade = occurrenceSeverityToDb[payload.gravidade];
  if (payload.acaoGerada !== undefined) data.acaoGerada = payload.acaoGerada;
  if (payload.status !== undefined) data.status = occurrenceStatusToDb[payload.status];
  return data;
};

export const buildSectorCreateData = (
  payload: Partial<Sector>,
  tenantId: string,
): Prisma.SectorUncheckedCreateInput => ({
  tenantId,
  nome: payload.nome ?? 'Setor sem nome',
  responsavel: payload.responsavel ?? 'Sem responsável',
  email: payload.email ?? '',
  telefone: payload.telefone ?? '',
  descricao: payload.descricao ?? '',
  ativo: payload.ativo ?? true,
});

export const buildSectorUpdateData = (payload: Partial<Sector>): Prisma.SectorUncheckedUpdateInput => {
  const data: Prisma.SectorUncheckedUpdateInput = {};
  if (payload.nome !== undefined) data.nome = payload.nome;
  if (payload.responsavel !== undefined) data.responsavel = payload.responsavel;
  if (payload.email !== undefined) data.email = payload.email;
  if (payload.telefone !== undefined) data.telefone = payload.telefone;
  if (payload.descricao !== undefined) data.descricao = payload.descricao;
  if (payload.ativo !== undefined) data.ativo = payload.ativo;
  return data;
};



