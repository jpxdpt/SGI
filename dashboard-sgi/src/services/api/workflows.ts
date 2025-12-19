import { apiRequest, API_BASE } from './base';

export async function fetchWorkflowDefinitions(params?: any): Promise<any[]> {
    if (!API_BASE) return [];
    try {
        const query = new URLSearchParams(params).toString();
        return await apiRequest(`/workflows/definitions${query ? `?${query}` : ''}`);
    } catch {
        return [];
    }
}

export async function createWorkflowDefinition(payload: any): Promise<any> {
    return await apiRequest('/workflows/definitions', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function updateWorkflowDefinition(id: string, payload: any): Promise<any> {
    return await apiRequest(`/workflows/definitions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function deleteWorkflowDefinition(id: string): Promise<void> {
    await apiRequest(`/workflows/definitions/${id}`, { method: 'DELETE' });
}
