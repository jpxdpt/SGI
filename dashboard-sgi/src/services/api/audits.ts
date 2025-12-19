import { apiRequest, API_BASE } from './base';

export const mockInternalAudits = [
    {
        id: 'INT-2025-001',
        ano: 2025,
        entidadeAuditora: 'Equipa Interna',
        iso: 'ISO 9001',
        inicio: '2025-02-01',
        termino: '2025-02-05',
        setor: 'Qualidade',
        responsavel: 'Maria Auditora',
        descricao: 'Auditoria interna de processos core.',
        status: 'PLANEADA',
    },
    {
        id: 'INT-2025-002',
        ano: 2025,
        entidadeAuditora: 'Equipa Interna',
        iso: 'ISO 14001',
        inicio: '2025-03-10',
        termino: '2025-03-12',
        setor: 'Ambiente',
        responsavel: 'João Silva',
        descricao: 'Avaliação de conformidade ambiental.',
        status: 'EXECUTADA',
    },
];

export const mockExternalAudits = [
    {
        id: 'EXT-2025-001',
        ano: 2025,
        entidadeAuditora: 'CertificaMais',
        iso: 'ISO 9001',
        inicio: '2025-04-15',
        termino: '2025-04-18',
        setor: 'Operações',
        responsavel: 'Ana Gomes',
        descricao: 'Revisão de certificação ISO 9001.',
        status: 'AGENDADA',
    },
];

export async function fetchInternalAudits(): Promise<any[]> {
    if (!API_BASE) return mockInternalAudits;
    try {
        const result = await apiRequest('/audits/internal');
        return result.data?.length ? result.data : mockInternalAudits;
    } catch {
        return mockInternalAudits;
    }
}

export async function fetchExternalAudits(): Promise<any[]> {
    if (!API_BASE) return mockExternalAudits;
    try {
        const result = await apiRequest('/audits/external');
        return result.data?.length ? result.data : mockExternalAudits;
    } catch {
        return mockExternalAudits;
    }
}

export async function createInternalAudit(data: any): Promise<any> {
    return await apiRequest('/audits/internal', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function createExternalAudit(data: any): Promise<any> {
    return await apiRequest('/audits/external', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateInternalAudit(id: string, data: any): Promise<any> {
    return await apiRequest(`/audits/internal/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function updateExternalAudit(id: string, data: any): Promise<any> {
    return await apiRequest(`/audits/external/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteInternalAudit(id: string): Promise<any> {
    return await apiRequest(`/audits/internal/${id}`, {
        method: 'DELETE',
    });
}

export async function deleteExternalAudit(id: string): Promise<any> {
    return await apiRequest(`/audits/external/${id}`, {
        method: 'DELETE',
    });
}
