import { apiRequest, API_BASE } from './base';

export interface Document {
    id: string;
    title: string;
    description?: string;
    category?: string;
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
    accessLevel: 'PRIVATE' | 'INTERNAL' | 'PUBLIC';
    currentVersion: number;
    createdBy: any;
    currentFile?: any;
    tags: any[];
    createdAt: string;
    updatedAt: string;
}

export interface DocumentTag {
    id: string;
    name: string;
    color?: string;
}

export interface DocumentReadConfirmation {
    id: string;
    documentId: string;
    userId: string;
    confirmedAt: string;
    user?: any;
}

export async function fetchDocuments(params?: any): Promise<any> {
    if (!API_BASE) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/documents${query ? `?${query}` : ''}`);
}

export async function fetchDocument(id: string): Promise<Document> {
    return await apiRequest(`/documents/${id}`);
}

export async function createDocument(formData: FormData): Promise<Document> {
    const token = localStorage.getItem('accessToken');
    const tenantId = localStorage.getItem('tenantId') || 'tenant-default';

    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const response = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (!response.ok) throw new Error('Erro ao criar documento');
    return response.json();
}

export async function updateDocument(id: string, payload: any): Promise<Document> {
    return await apiRequest(`/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function deleteDocument(id: string): Promise<void> {
    await apiRequest(`/documents/${id}`, { method: 'DELETE' });
}

export async function archiveDocument(id: string): Promise<any> {
    return await apiRequest(`/documents/${id}/archive`, { method: 'POST' });
}

// Read Confirmation
export async function confirmDocumentRead(documentId: string): Promise<any> {
    return await apiRequest(`/documents/${documentId}/read-confirmation`, { method: 'POST' });
}

export async function checkDocumentReadStatus(documentId: string): Promise<any> {
    if (!API_BASE) return { confirmed: false, confirmation: null };
    try {
        return await apiRequest(`/documents/${documentId}/read-confirmation`);
    } catch {
        return { confirmed: false, confirmation: null };
    }
}

export async function uploadDocumentVersion(documentId: string, formData: FormData): Promise<any> {
    const { API_BASE } = await import('./base');
    const token = localStorage.getItem('accessToken');
    const tenantId = localStorage.getItem('tenantId') || 'tenant-default';
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const response = await fetch(`${API_BASE}/documents/${documentId}/versions`, {
        method: 'POST',
        headers,
        body: formData,
    });
    if (!response.ok) throw new Error('Falha no upload');
    return response.json();
}

export async function downloadDocumentVersion(documentId: string, versionId: string): Promise<Blob> {
    const { API_BASE } = await import('./base');
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/documents/${documentId}/versions/${versionId}/download`, {
        headers,
    });
    if (!response.ok) throw new Error('Falha no download');
    return response.blob();
}

export async function fetchDocumentReadConfirmations(documentId: string): Promise<any[]> {
    const { apiRequest } = await import('./base');
    try {
        return await apiRequest(`/documents/${documentId}/read-confirmations`);
    } catch {
        return [];
    }
}

export async function fetchUnreadDocuments(params?: any): Promise<any> {
    const { apiRequest, API_BASE } = await import('./base');
    if (!API_BASE) return { data: [], pagination: { total: 0 } };
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/documents/unread?${query}`);
}

export async function fetchDocumentReadComplianceStats(params?: any): Promise<any> {
    const { apiRequest, API_BASE } = await import('./base');
    if (!API_BASE) return { overview: {}, byDocument: [], byCategory: [], byUser: [] };
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/documents/compliance/stats?${query}`);
}
