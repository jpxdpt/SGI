import { apiRequest, API_BASE } from './base';

export async function fetchAuditLogs(params: any = {}): Promise<any> {
    const mock = [
        { id: 'log-1', action: 'CREATE', entity: 'Occurrence', description: 'Criação de ocorrência', createdAt: new Date().toISOString() }
    ];
    if (!API_BASE) return { data: mock, pagination: { page: 1, limit: 1, total: 1, totalPages: 1 } };
    try {
        return await apiRequest('/logs');
    } catch {
        return { data: mock, pagination: { page: 1, limit: 1, total: 1, totalPages: 1 } };
    }
}
