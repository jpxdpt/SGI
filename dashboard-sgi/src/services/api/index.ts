export * from './base';
export * from './audits';
export * from './actions';
export * from './occurrences';
export * from './sectors';
export * from './documents';
export * from './logs';
export * from './analytics';
export * from './comments';
export * from './rootCause';
export * from './auditPrograms';
export * from './workflows';
export * from './reports';
export * from './import';

// Approvals
export async function fetchApprovals(): Promise<any[]> {
    const { apiRequest, API_BASE } = await import('./base');
    if (!API_BASE) return [];
    return await apiRequest('/approvals');
}

export async function fetchApproval(id: string): Promise<any> {
    const { apiRequest } = await import('./base');
    return await apiRequest(`/approvals/${id}`);
}

export async function createApproval(data: any): Promise<any> {
    const { apiRequest } = await import('./base');
    return await apiRequest('/approvals', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateApproval(id: string, data: any): Promise<any> {
    const { apiRequest } = await import('./base');
    return await apiRequest(`/approvals/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function approveItem(id: string, comment?: string): Promise<any> {
    const { apiRequest } = await import('./base');
    return await apiRequest(`/approvals/${id}/approve`, { method: 'POST', body: JSON.stringify({ comment }) });
}

export async function rejectItem(id: string, comment?: string): Promise<any> {
    const { apiRequest } = await import('./base');
    return await apiRequest(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ comment }) });
}

export async function fetchDashboardSummary(): Promise<any> {
    const { apiRequest, API_BASE } = await import('./base');
    if (!API_BASE) return {};
    try { return await apiRequest('/summary'); } catch { return {}; }
}

// Attachments placeholders
export async function deleteAttachment(id: string): Promise<void> {
    const { apiRequest, API_BASE } = await import('./base');
    if (!API_BASE) return;
    await apiRequest(`/attachments/${id}`, { method: 'DELETE' });
}

export async function fetchAttachments(entityType?: string, entityId?: string): Promise<any[]> {
    const { apiRequest, API_BASE } = await import('./base');
    if (!API_BASE) return [];
    const query = new URLSearchParams();
    if (entityType) query.append('entityType', entityType);
    if (entityId) query.append('entityId', entityId);
    return await apiRequest(`/attachments?${query.toString()}`);
}

export async function uploadAttachment(formData: FormData): Promise<any> {
    const { API_BASE } = await import('./base');
    if (!API_BASE) return;
    const token = localStorage.getItem('accessToken');
    const tenantId = localStorage.getItem('tenantId') || 'tenant-default';

    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const response = await fetch(`${API_BASE}/attachments/upload`, {
        method: 'POST',
        headers,
        body: formData,
    });
    if (!response.ok) throw new Error('Falha no upload');
    return response.json();
}

export async function downloadAttachment(id: string): Promise<Blob> {
    const { API_BASE } = await import('./base');
    if (!API_BASE) return new Blob();
    const token = localStorage.getItem('accessToken');
    const tenantId = localStorage.getItem('tenantId') || 'tenant-default';

    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const response = await fetch(`${API_BASE}/attachments/${id}/download`, {
        method: 'GET',
        headers,
    });
    if (!response.ok) throw new Error('Falha no download');
    return response.blob();
}
