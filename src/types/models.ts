export type AuditoriaStatus = 'Planeada' | 'Em execução' | 'Executada' | 'Exec+Atraso' | 'Atrasada';

export interface InternalAudit {
  id: string;
  ano: number;
  setor: string;
  responsavel: string;
  descricao: string;
  dataPrevista: string;
  execucao: number;
  status: AuditoriaStatus;
  acoesGeradas: number;
}

export interface ExternalAudit extends InternalAudit {
  entidadeAuditora: string;
  conclusoes: string;
}

export type AcaoOrigem = 'Interna' | 'Externa' | 'Ocorrência';
export type AcaoStatus = 'Concluída' | 'Em andamento' | 'Atrasada';

export interface ActionItem {
  id: string;
  origem: AcaoOrigem;
  acaoRelacionada: string;
  setor: string;
  descricao: string;
  dataAbertura: string;
  dataLimite: string;
  dataConclusao?: string;
  impacto: 'Baixo' | 'Médio' | 'Alto';
  status: AcaoStatus;
}

export interface Occurrence {
  id: string;
  setor: string;
  responsavel: string;
  data: string;
  descricao: string;
  gravidade: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  acaoGerada?: string;
  status: 'Aberta' | 'Em mitigação' | 'Resolvida';
}

export interface Sector {
  id: string;
  nome: string;
  responsavel: string;
  email: string;
  telefone: string;
  descricao: string;
  ativo: boolean;
}

export interface DashboardSummary {
  totalInternas: number;
  totalExternas: number;
  totalAcoes: number;
  totalOcorrencias: number;
  setoresAtivos: number;
}

export interface DatasetPayload {
  internalAudits?: InternalAudit[];
  externalAudits?: ExternalAudit[];
  actionItems?: ActionItem[];
  occurrences?: Occurrence[];
  sectors?: Sector[];
}

