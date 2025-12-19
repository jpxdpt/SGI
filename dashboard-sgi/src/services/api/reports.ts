import { apiRequest, API_BASE } from './base';

export async function fetchReportTemplates(): Promise<any[]> {
    if (!API_BASE) return [];
    try { return await apiRequest('/reports/templates'); } catch { return []; }
}

export async function fetchScheduledReports(): Promise<any[]> {
    if (!API_BASE) return [];
    try { return await apiRequest('/reports/scheduled'); } catch { return []; }
}

export async function createReportTemplate(payload: any): Promise<any> {
    return await apiRequest('/reports/templates', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateReportTemplate(id: string, payload: any): Promise<any> {
    return await apiRequest(`/reports/templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteReportTemplate(id: string): Promise<void> {
    await apiRequest(`/reports/templates/${id}`, { method: 'DELETE' });
}

export async function generateReport(templateId: string, format: string = 'PDF'): Promise<Blob> {
    const { API_BASE } = await import('./base');
    if (!API_BASE) return new Blob();
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE}/reports/templates/${templateId}/generate?format=${format}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    return await response.blob();
}

export async function createScheduledReport(payload: any): Promise<any> {
    return await apiRequest('/reports/scheduled', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateScheduledReport(id: string, payload: any): Promise<any> {
    return await apiRequest(`/reports/scheduled/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteScheduledReport(id: string): Promise<void> {
    await apiRequest(`/reports/scheduled/${id}`, { method: 'DELETE' });
}
