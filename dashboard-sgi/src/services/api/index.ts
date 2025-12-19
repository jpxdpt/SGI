export * from './base';
export * from './audits';
export * from './actions';
export * from './occurrences';
export * from './sectors';
export * from './documents';
export * from './logs';
export * from './analytics';

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
