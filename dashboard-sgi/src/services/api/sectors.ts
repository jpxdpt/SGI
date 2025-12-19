import { apiRequest, API_BASE } from './base';

export async function fetchSectors(): Promise<any[]> {
    if (!API_BASE) return [];
    try {
        const response = await apiRequest('/sectors');
        return Array.isArray(response) ? response : (response?.data || []);
    } catch {
        return [];
    }
}

export async function createSector(data: any): Promise<any> {
    return await apiRequest('/sectors', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateSector(id: string, data: any): Promise<any> {
    return await apiRequest(`/sectors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteSector(id: string): Promise<any> {
    return await apiRequest(`/sectors/${id}`, {
        method: 'DELETE',
    });
}
