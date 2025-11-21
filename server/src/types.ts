export interface InternalAudit {
  id: string;
  ano: number;
  entidadeAuditora?: string;
  iso?: string;
  inicio?: string;
  termino?: string;
}

export interface ExternalAudit {
  id: string;
  ano: number;
  entidadeAuditora: string;
  iso?: string;
  inicio?: string;
  termino?: string;
}

export type AcaoOrigem = 'Interna' | 'Externa' | 'Ocorrência';
export type AcaoStatus = 'Executada' | 'Executada+Atraso' | 'Atrasada' | 'Andamento';
export type Conformidade = 'Conformidade' | 'Não conformidade';

export interface ActionItem {
  id: string;
  origem: AcaoOrigem;
  acaoRelacionada: string;
  conformidade?: Conformidade;
  numeroAssociado?: string;
  ambito?: string;
  descricao: string;
  causaRaizIdentificada?: string;
  acaoCorretiva?: string;
  local?: string;
  responsavel?: string;
  inicio?: string;
  termino?: string;
  conclusao?: string;
  status: AcaoStatus;
  mes?: string;
  evidencia?: string;
  avaliacaoEficacia?: string;
  setor: string;
  dataAbertura: string;
  dataLimite: string;
  dataConclusao?: string;
  impacto: 'Baixo' | 'Médio' | 'Alto';
}

export interface Occurrence {
  id: string;
  tipo: 'Ambiental' | 'Segurança dos Trabalhadores' | 'Segurança Alimentar';
  setor: string; // Mantido para compatibilidade
  departamentosAtingidos: string[]; // Array de departamentos atingidos
  responsavel: string;
  data: string;
  descricao: string;
  resolucao?: string;
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

export interface DatabaseSchema {
  internalAudits: InternalAudit[];
  externalAudits: ExternalAudit[];
  actionItems: ActionItem[];
  occurrences: Occurrence[];
  sectors: Sector[];
}



