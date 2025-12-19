import { apiRequest, API_BASE } from './base';

export interface ActionItem {
    id: string;
    origem: string;
    descricao: string;
    responsavel: string;
    dataLimite: string;
    status: string;
}

export async function fetchActionItems(): Promise<ActionItem[]> {
    if (!API_BASE) return [];
    try {
        const result = await apiRequest('/actions');
        return result.data || [];
    } catch {
        return [];
    }
}

export async function createActionItem(data: any): Promise<ActionItem> {
    return await apiRequest('/actions', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateActionItem(id: string, data: any): Promise<ActionItem> {
    return await apiRequest(`/actions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteActionItem(id: string): Promise<any> {
    return await apiRequest(`/actions/${id}`, {
        method: 'DELETE',
    });
}
