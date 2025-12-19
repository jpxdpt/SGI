import { apiRequest, API_BASE } from './base';

export async function fetchComments(entityType: string, entityId: string): Promise<any[]> {
    if (!API_BASE) return [];
    try {
        const query = new URLSearchParams({ entityType, entityId }).toString();
        return await apiRequest(`/comments?${query}`);
    } catch {
        return [];
    }
}

export async function createComment(data: any): Promise<any> {
    return await apiRequest('/comments', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateComment(id: string, data: any): Promise<any> {
    return await apiRequest(`/comments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteComment(id: string): Promise<any> {
    return await apiRequest(`/comments/${id}`, {
        method: 'DELETE',
    });
}
