import { apiRequest, API_BASE } from './base';

export async function fetchOccurrences(): Promise<any[]> {
    if (!API_BASE) return [];
    try {
        const result = await apiRequest('/occurrences');
        return result.data || [];
    } catch {
        return [];
    }
}

export async function createOccurrence(data: any): Promise<any> {
    return await apiRequest('/occurrences', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateOccurrence(id: string, data: any): Promise<any> {
    return await apiRequest(`/occurrences/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteOccurrence(id: string): Promise<any> {
    return await apiRequest(`/occurrences/${id}`, {
        method: 'DELETE',
    });
}
