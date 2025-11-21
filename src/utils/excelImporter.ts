import { read, utils } from 'xlsx';
import type { WorkBook } from 'xlsx';
import type {
  InternalAudit,
  ExternalAudit,
  ActionItem,
  Occurrence,
  Sector,
  DatasetPayload,
  AuditoriaStatus,
} from '../types/models';

type RawRow = Record<string, unknown>;

const SHEET_CANDIDATES = {
  internal: ['Auditorias Internas', 'Internas', 'Auditoria Interna'],
  external: ['Auditorias Externas', 'Externas', 'Auditoria Externa'],
  actions: ['Ações', 'Planos de Ação', 'Acoes', 'Ações Geradas'],
  occurrences: ['Ocorrências', 'Ocorrencias', 'Incidentes'],
  sectors: ['Cadastro', 'Setores', 'Setor', 'Responsáveis'],
};

const normalizeString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

const pick = (row: RawRow, keys: string[], fallback = ''): string => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && normalizeString(value) !== '') {
      return normalizeString(value);
    }
  }
  return fallback;
};

const pickNumber = (row: RawRow, keys: string[], fallback = 0) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return normalizeNumber(row[key], fallback);
    }
  }
  return fallback;
};

const readSheet = (workbook: WorkBook, names: string[]): RawRow[] => {
  for (const name of names) {
    const variations = [name, name.toUpperCase(), name.toLowerCase()];
    for (const candidate of variations) {
      const sheet = workbook.Sheets[candidate];
      if (sheet) {
        return utils.sheet_to_json<RawRow>(sheet, { defval: null });
      }
    }
  }
  return [];
};

const mapStatus = (value: string): AuditoriaStatus => {
  const normalized = value.toLowerCase();
  if (normalized.includes('exec') && normalized.includes('atra')) return 'Exec+Atraso';
  if (normalized.includes('atra')) return 'Atrasada';
  if (normalized.includes('anda')) return 'Em execução';
  if (normalized.includes('plan')) return 'Planeada';
  return 'Executada';
};

const parseInternalAudits = (rows: RawRow[]): InternalAudit[] =>
  rows
    .map((row, index) => {
      const id = pick(row, ['ID', 'Id', 'Código', 'Codigo'], `INT-${index + 1}`);
      return {
        id,
        ano: pickNumber(row, ['Ano', 'Year', 'Exercise'], new Date().getFullYear()),
        setor: pick(row, ['Setor', 'Sector', 'Área', 'Area'], 'Não definido'),
        responsavel: pick(row, ['Responsável', 'Responsavel', 'Owner'], 'Não definido'),
        descricao: pick(row, ['Descrição', 'Descricao', 'Escopo', 'Scope']),
        dataPrevista: pick(row, ['Data', 'Data Prevista', 'Previsto'], new Date().toISOString().slice(0, 10)),
        execucao: pickNumber(row, ['Execução', '% Execução', '% Execucao', 'Execucao']),
        status: mapStatus(pick(row, ['Status', 'Situação', 'Situacao', 'Etapa'], 'Executada')),
        acoesGeradas: pickNumber(row, ['Ações', 'Acoes', 'Qtd Ações', 'Qtd Acoes']),
      };
    })
    .filter((audit) => Boolean(audit.setor));

const parseExternalAudits = (rows: RawRow[]): ExternalAudit[] =>
  rows
    .map((row, index) => {
      const base = parseInternalAudits([row])[0];
      return {
        ...base,
        id: base?.id ?? `EXT-${index + 1}`,
        entidadeAuditora: pick(row, ['Entidade', 'Entidade Auditora', 'Auditor'], 'Não informado'),
        conclusoes: pick(row, ['Conclusões', 'Conclusoes', 'Observações', 'Observacoes']),
      };
    })
    .filter(Boolean) as ExternalAudit[];

const parseActions = (rows: RawRow[]): ActionItem[] =>
  rows.map((row, index) => ({
    id: pick(row, ['ID', 'Id', 'Código', 'Codigo'], `AC-${index + 1}`),
    origem: (pick(row, ['Origem', 'Fonte'], 'Interna') as ActionItem['origem']) ?? 'Interna',
    acaoRelacionada: pick(row, ['Auditoria', 'Referência', 'Referencia']),
    setor: pick(row, ['Setor', 'Sector'], 'Não definido'),
    descricao: pick(row, ['Descrição', 'Descricao', 'Ação', 'Acao']),
    dataAbertura: pick(row, ['Data Abertura', 'Abertura'], new Date().toISOString().slice(0, 10)),
    dataLimite: pick(row, ['Data Limite', 'Prazo'], new Date().toISOString().slice(0, 10)),
    dataConclusao: pick(row, ['Data Conclusão', 'Data Conclusao']),
    impacto: (pick(row, ['Impacto', 'Criticidade'], 'Médio') as ActionItem['impacto']) ?? 'Médio',
    status: (pick(row, ['Status', 'Situação', 'Situacao'], 'Em andamento') as ActionItem['status']) ?? 'Em andamento',
  }));

const parseOccurrences = (rows: RawRow[]): Occurrence[] =>
  rows.map((row, index) => ({
    id: pick(row, ['ID', 'Id', 'Código', 'Codigo'], `OC-${index + 1}`),
    setor: pick(row, ['Setor', 'Sector'], 'Não definido'),
    responsavel: pick(row, ['Responsável', 'Responsavel'], 'Não definido'),
    data: pick(row, ['Data', 'Ocorrência', 'Ocorrencia'], new Date().toISOString().slice(0, 10)),
    descricao: pick(row, ['Descrição', 'Descricao', 'Observação', 'Observacao']),
    gravidade: (pick(row, ['Gravidade', 'Criticidade'], 'Média') as Occurrence['gravidade']) ?? 'Média',
    acaoGerada: pick(row, ['Ação Relacionada', 'Acao Relacionada']),
    status: (pick(row, ['Status', 'Situação', 'Situacao'], 'Aberta') as Occurrence['status']) ?? 'Aberta',
  }));

const parseSectors = (rows: RawRow[]): Sector[] =>
  rows.map((row, index) => ({
    id: pick(row, ['ID', 'Id', 'Código', 'Codigo'], `SET-${index + 1}`),
    nome: pick(row, ['Setor', 'Sector', 'Nome'], 'Sem nome'),
    responsavel: pick(row, ['Responsável', 'Responsavel'], 'Sem responsável'),
    email: pick(row, ['Email', 'E-mail']),
    telefone: pick(row, ['Telefone', 'Telemóvel', 'Telemovel']),
    descricao: pick(row, ['Descrição', 'Descricao']),
    ativo: normalizeString(row['Ativo'] ?? 'true').toLowerCase() !== 'false',
  }));

export const parseExcelFile = async (file: File): Promise<DatasetPayload> => {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });

  const internalSheet = readSheet(workbook, SHEET_CANDIDATES.internal);
  const externalSheet = readSheet(workbook, SHEET_CANDIDATES.external);
  const actionsSheet = readSheet(workbook, SHEET_CANDIDATES.actions);
  const occurrencesSheet = readSheet(workbook, SHEET_CANDIDATES.occurrences);
  const sectorsSheet = readSheet(workbook, SHEET_CANDIDATES.sectors);

  return {
    internalAudits: parseInternalAudits(internalSheet),
    externalAudits: parseExternalAudits(externalSheet),
    actionItems: parseActions(actionsSheet),
    occurrences: parseOccurrences(occurrencesSheet),
    sectors: parseSectors(sectorsSheet),
  };
};

