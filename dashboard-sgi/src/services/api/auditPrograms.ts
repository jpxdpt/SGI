import { apiRequest, API_BASE } from './base';

export async function fetchAuditPrograms(params?: any): Promise<any[]> {
    if (!API_BASE) return [];
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/audit-programs${query ? `?${query}` : ''}`);
}

export async function fetchAuditProgram(id: string): Promise<any> {
    return await apiRequest(`/audit-programs/${id}`);
}

export async function createAuditProgram(payload: any): Promise<any> {
    return await apiRequest('/audit-programs', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function updateAuditProgram(id: string, payload: any): Promise<any> {
    return await apiRequest(`/audit-programs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function deleteAuditProgram(id: string): Promise<void> {
    await apiRequest(`/audit-programs/${id}`, { method: 'DELETE' });
}

export async function instantiateAuditProgram(id: string, payload: any): Promise<any> {
    return await apiRequest(`/audit-programs/${id}/instantiate`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
