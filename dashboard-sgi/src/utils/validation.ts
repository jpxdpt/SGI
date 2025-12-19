import { z } from 'zod';

export const internalAuditSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  ano: z.number().min(2000).max(2100, 'Ano inválido'),
  entidadeAuditora: z.string().optional(),
  iso: z.string().optional(),
  inicio: z.string().optional(),
  termino: z.string().optional(),
  actions: z.array(z.any()).optional(), // Array de ações será validado separadamente
});

export const externalAuditSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  ano: z.number().min(2000).max(2100, 'Ano inválido'),
  entidadeAuditora: z.string().min(1, 'Entidade auditora é obrigatória'),
  iso: z.string().optional(),
  inicio: z.string().optional(),
  termino: z.string().optional(),
  actions: z.array(z.any()).optional(), // Array de ações será validado separadamente
});

export const sectorSchema = z.object({
  nome: z.string().min(1, 'Nome do setor é obrigatório'),
  responsavel: z.string().min(1, 'Responsável é obrigatório'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional(),
  descricao: z.string().optional(),
  ativo: z.boolean(),
});

export const actionItemSchema = z.object({
  id: z.string().optional(),
  origem: z.enum(['Interna', 'Externa', 'Ocorrência']),
  acaoRelacionada: z.string().optional(),
  conformidade: z.enum(['Conformidade', 'Não conformidade']).optional(),
  numeroAssociado: z.string().optional(),
  ambito: z.string().optional(),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  causaRaizIdentificada: z.string().optional(),
  acaoCorretiva: z.string().optional(),
  local: z.string().optional(),
  responsavel: z.string().optional(),
  inicio: z.string().optional(),
  termino: z.string().optional(),
  conclusao: z.string().optional(),
  status: z.enum(['Executada', 'Executada+Atraso', 'Atrasada', 'Andamento']),
  mes: z.string().optional(),
  evidencia: z.string().optional(),
  avaliacaoEficacia: z.string().optional(),
});

export const occurrenceSchema = z.object({
  tipo: z.enum(['Ambiental', 'Segurança dos Trabalhadores', 'Segurança Alimentar', 'Reclamação', 'Sugestão'], {
    message: 'Tipo de ocorrência é obrigatório',
  }),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  resolucao: z.string().optional(),
  acaoGerada: z.string().optional(),
  departamentosAtingidos: z.array(z.string()).optional(), // Usado internamente após conversão do texto
  departamentosTexto: z.string().min(1, 'Departamento(s) atingido(s) é obrigatório'),
  setor: z.string().optional(), // Mantido para compatibilidade
  responsavel: z.string().min(1, 'Responsável é obrigatório'),
  data: z.string().min(1, 'Data é obrigatória'),
  gravidade: z.enum(['Baixa', 'Média', 'Alta', 'Crítica']),
  status: z.enum(['Aberta', 'Em mitigação', 'Resolvida']),
});



