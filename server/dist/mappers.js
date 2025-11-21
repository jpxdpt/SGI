"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSectorUpdateData = exports.buildSectorCreateData = exports.buildOccurrenceUpdateData = exports.buildOccurrenceCreateData = exports.buildActionItemUpdateData = exports.buildActionItemCreateData = exports.buildExternalAuditUpdateData = exports.buildExternalAuditCreateData = exports.buildInternalAuditUpdateData = exports.buildInternalAuditCreateData = exports.mapSectorFromDb = exports.mapOccurrenceFromDb = exports.mapActionItemFromDb = exports.mapExternalAuditFromDb = exports.mapInternalAuditFromDb = void 0;
const isoOrFallback = (value) => value.toISOString();
const parseDate = (value) => {
    if (!value)
        return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};
const toNumber = (value, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const replaced = value.replace(',', '.');
        const casted = Number(replaced);
        return Number.isFinite(casted) ? casted : fallback;
    }
    return fallback;
};
const auditoriaStatusToDb = {
    Planeada: 'PLANEADA',
    'Em execução': 'EM_EXECUCAO',
    'Exec+Atraso': 'EXEC_ATRASO',
    Atrasada: 'ATRASADA',
    Executada: 'EXECUTADA',
};
const auditoriaStatusFromDb = {
    PLANEADA: 'Planeada',
    EM_EXECUCAO: 'Em execução',
    EXEC_ATRASO: 'Exec+Atraso',
    ATRASADA: 'Atrasada',
    EXECUTADA: 'Executada',
};
const actionOriginToDb = {
    Interna: 'INTERNA',
    Externa: 'EXTERNA',
    'Ocorrência': 'OCORRENCIA',
};
const actionOriginFromDb = {
    INTERNA: 'Interna',
    EXTERNA: 'Externa',
    OCORRENCIA: 'Ocorrência',
};
const actionStatusToDb = {
    Concluída: 'CONCLUIDA',
    'Em andamento': 'EM_ANDAMENTO',
    Atrasada: 'ATRASADA',
};
const actionStatusFromDb = {
    CONCLUIDA: 'Concluída',
    EM_ANDAMENTO: 'Em andamento',
    ATRASADA: 'Atrasada',
};
const impactToDb = {
    Baixo: 'BAIXO',
    Médio: 'MEDIO',
    Alto: 'ALTO',
};
const impactFromDb = {
    BAIXO: 'Baixo',
    MEDIO: 'Médio',
    ALTO: 'Alto',
};
const occurrenceSeverityToDb = {
    Baixa: 'BAIXA',
    Média: 'MEDIA',
    Alta: 'ALTA',
    Crítica: 'CRITICA',
};
const occurrenceSeverityFromDb = {
    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
    CRITICA: 'Crítica',
};
const occurrenceStatusToDb = {
    Aberta: 'ABERTA',
    'Em mitigação': 'EM_MITIGACAO',
    Resolvida: 'RESOLVIDA',
};
const occurrenceStatusFromDb = {
    ABERTA: 'Aberta',
    EM_MITIGACAO: 'Em mitigação',
    RESOLVIDA: 'Resolvida',
};
const mapInternalAuditFromDb = (record) => ({
    id: record.id,
    ano: record.ano,
    setor: record.setor,
    responsavel: record.responsavel,
    descricao: record.descricao,
    dataPrevista: isoOrFallback(record.dataPrevista),
    execucao: Number(record.execucao),
    status: auditoriaStatusFromDb[record.status],
    acoesGeradas: record.acoesGeradas,
});
exports.mapInternalAuditFromDb = mapInternalAuditFromDb;
const mapExternalAuditFromDb = (record) => ({
    id: record.id,
    ano: record.ano,
    setor: record.setor,
    responsavel: record.responsavel,
    descricao: record.descricao,
    dataPrevista: isoOrFallback(record.dataPrevista),
    execucao: Number(record.execucao),
    status: auditoriaStatusFromDb[record.status],
    acoesGeradas: record.acoesGeradas,
    entidadeAuditora: record.entidadeAuditora,
    conclusoes: record.conclusoes,
});
exports.mapExternalAuditFromDb = mapExternalAuditFromDb;
const mapActionItemFromDb = (record) => ({
    id: record.id,
    origem: actionOriginFromDb[record.origem],
    acaoRelacionada: record.acaoRelacionada,
    setor: record.setor,
    descricao: record.descricao,
    dataAbertura: isoOrFallback(record.dataAbertura),
    dataLimite: isoOrFallback(record.dataLimite),
    dataConclusao: record.dataConclusao ? isoOrFallback(record.dataConclusao) : undefined,
    impacto: impactFromDb[record.impacto],
    status: actionStatusFromDb[record.status],
});
exports.mapActionItemFromDb = mapActionItemFromDb;
const mapOccurrenceFromDb = (record) => ({
    id: record.id,
    setor: record.setor,
    responsavel: record.responsavel,
    data: isoOrFallback(record.data),
    descricao: record.descricao,
    gravidade: occurrenceSeverityFromDb[record.gravidade],
    acaoGerada: record.acaoGerada ?? undefined,
    status: occurrenceStatusFromDb[record.status],
});
exports.mapOccurrenceFromDb = mapOccurrenceFromDb;
const mapSectorFromDb = (record) => ({
    id: record.id,
    nome: record.nome,
    responsavel: record.responsavel,
    email: record.email ?? '',
    telefone: record.telefone ?? '',
    descricao: record.descricao ?? '',
    ativo: record.ativo,
});
exports.mapSectorFromDb = mapSectorFromDb;
const buildInternalAuditCreateData = (payload, tenantId) => ({
    tenantId,
    ano: toNumber(payload.ano, new Date().getFullYear()),
    setor: payload.setor ?? 'Sem setor',
    responsavel: payload.responsavel ?? 'Sem responsável',
    descricao: payload.descricao ?? '',
    dataPrevista: parseDate(payload.dataPrevista),
    execucao: toNumber(payload.execucao),
    status: auditoriaStatusToDb[payload.status ?? 'Planeada'],
    acoesGeradas: toNumber(payload.acoesGeradas),
});
exports.buildInternalAuditCreateData = buildInternalAuditCreateData;
const buildInternalAuditUpdateData = (payload) => {
    const data = {};
    if (payload.ano !== undefined)
        data.ano = toNumber(payload.ano);
    if (payload.setor !== undefined)
        data.setor = payload.setor;
    if (payload.responsavel !== undefined)
        data.responsavel = payload.responsavel;
    if (payload.descricao !== undefined)
        data.descricao = payload.descricao;
    if (payload.dataPrevista !== undefined)
        data.dataPrevista = parseDate(payload.dataPrevista);
    if (payload.execucao !== undefined)
        data.execucao = toNumber(payload.execucao);
    if (payload.status !== undefined)
        data.status = auditoriaStatusToDb[payload.status];
    if (payload.acoesGeradas !== undefined)
        data.acoesGeradas = toNumber(payload.acoesGeradas);
    return data;
};
exports.buildInternalAuditUpdateData = buildInternalAuditUpdateData;
const buildExternalAuditCreateData = (payload, tenantId) => ({
    tenantId,
    ano: toNumber(payload.ano, new Date().getFullYear()),
    setor: payload.setor ?? 'Sem setor',
    responsavel: payload.responsavel ?? 'Sem responsável',
    descricao: payload.descricao ?? '',
    dataPrevista: parseDate(payload.dataPrevista),
    execucao: toNumber(payload.execucao),
    status: auditoriaStatusToDb[payload.status ?? 'Planeada'],
    acoesGeradas: toNumber(payload.acoesGeradas),
    entidadeAuditora: payload.entidadeAuditora ?? 'Entidade não informada',
    conclusoes: payload.conclusoes ?? '',
});
exports.buildExternalAuditCreateData = buildExternalAuditCreateData;
const buildExternalAuditUpdateData = (payload) => {
    const data = {};
    if (payload.ano !== undefined)
        data.ano = toNumber(payload.ano);
    if (payload.setor !== undefined)
        data.setor = payload.setor;
    if (payload.responsavel !== undefined)
        data.responsavel = payload.responsavel;
    if (payload.descricao !== undefined)
        data.descricao = payload.descricao;
    if (payload.dataPrevista !== undefined)
        data.dataPrevista = parseDate(payload.dataPrevista);
    if (payload.execucao !== undefined)
        data.execucao = toNumber(payload.execucao);
    if (payload.status !== undefined)
        data.status = auditoriaStatusToDb[payload.status];
    if (payload.acoesGeradas !== undefined)
        data.acoesGeradas = toNumber(payload.acoesGeradas);
    if (payload.entidadeAuditora !== undefined)
        data.entidadeAuditora = payload.entidadeAuditora;
    if (payload.conclusoes !== undefined)
        data.conclusoes = payload.conclusoes;
    return data;
};
exports.buildExternalAuditUpdateData = buildExternalAuditUpdateData;
const buildActionItemCreateData = (payload, tenantId) => ({
    tenantId,
    origem: actionOriginToDb[payload.origem ?? 'Interna'],
    acaoRelacionada: payload.acaoRelacionada ?? '',
    setor: payload.setor ?? 'Sem setor',
    descricao: payload.descricao ?? '',
    dataAbertura: parseDate(payload.dataAbertura),
    dataLimite: parseDate(payload.dataLimite),
    dataConclusao: payload.dataConclusao ? parseDate(payload.dataConclusao) : undefined,
    impacto: impactToDb[payload.impacto ?? 'Médio'],
    status: actionStatusToDb[payload.status ?? 'Em andamento'],
});
exports.buildActionItemCreateData = buildActionItemCreateData;
const buildActionItemUpdateData = (payload) => {
    const data = {};
    if (payload.origem !== undefined)
        data.origem = actionOriginToDb[payload.origem];
    if (payload.acaoRelacionada !== undefined)
        data.acaoRelacionada = payload.acaoRelacionada;
    if (payload.setor !== undefined)
        data.setor = payload.setor;
    if (payload.descricao !== undefined)
        data.descricao = payload.descricao;
    if (payload.dataAbertura !== undefined)
        data.dataAbertura = parseDate(payload.dataAbertura);
    if (payload.dataLimite !== undefined)
        data.dataLimite = parseDate(payload.dataLimite);
    if (payload.dataConclusao !== undefined)
        data.dataConclusao = payload.dataConclusao ? parseDate(payload.dataConclusao) : null;
    if (payload.impacto !== undefined)
        data.impacto = impactToDb[payload.impacto];
    if (payload.status !== undefined)
        data.status = actionStatusToDb[payload.status];
    return data;
};
exports.buildActionItemUpdateData = buildActionItemUpdateData;
const buildOccurrenceCreateData = (payload, tenantId) => ({
    tenantId,
    setor: payload.setor ?? 'Sem setor',
    responsavel: payload.responsavel ?? 'Sem responsável',
    data: parseDate(payload.data),
    descricao: payload.descricao ?? '',
    gravidade: occurrenceSeverityToDb[payload.gravidade ?? 'Média'],
    acaoGerada: payload.acaoGerada,
    status: occurrenceStatusToDb[payload.status ?? 'Aberta'],
});
exports.buildOccurrenceCreateData = buildOccurrenceCreateData;
const buildOccurrenceUpdateData = (payload) => {
    const data = {};
    if (payload.setor !== undefined)
        data.setor = payload.setor;
    if (payload.responsavel !== undefined)
        data.responsavel = payload.responsavel;
    if (payload.data !== undefined)
        data.data = parseDate(payload.data);
    if (payload.descricao !== undefined)
        data.descricao = payload.descricao;
    if (payload.gravidade !== undefined)
        data.gravidade = occurrenceSeverityToDb[payload.gravidade];
    if (payload.acaoGerada !== undefined)
        data.acaoGerada = payload.acaoGerada;
    if (payload.status !== undefined)
        data.status = occurrenceStatusToDb[payload.status];
    return data;
};
exports.buildOccurrenceUpdateData = buildOccurrenceUpdateData;
const buildSectorCreateData = (payload, tenantId) => ({
    tenantId,
    nome: payload.nome ?? 'Setor sem nome',
    responsavel: payload.responsavel ?? 'Sem responsável',
    email: payload.email ?? '',
    telefone: payload.telefone ?? '',
    descricao: payload.descricao ?? '',
    ativo: payload.ativo ?? true,
});
exports.buildSectorCreateData = buildSectorCreateData;
const buildSectorUpdateData = (payload) => {
    const data = {};
    if (payload.nome !== undefined)
        data.nome = payload.nome;
    if (payload.responsavel !== undefined)
        data.responsavel = payload.responsavel;
    if (payload.email !== undefined)
        data.email = payload.email;
    if (payload.telefone !== undefined)
        data.telefone = payload.telefone;
    if (payload.descricao !== undefined)
        data.descricao = payload.descricao;
    if (payload.ativo !== undefined)
        data.ativo = payload.ativo;
    return data;
};
exports.buildSectorUpdateData = buildSectorUpdateData;
