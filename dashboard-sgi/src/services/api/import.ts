import { apiRequest, API_BASE } from './base';

export async function importData(type: string, file: File): Promise<any> {
    const { API_BASE } = await import('./base');
    if (!API_BASE) return;
    const token = localStorage.getItem('accessToken');
    const tenantId = localStorage.getItem('tenantId') || 'tenant-default';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const response = await fetch(`${API_BASE}/import`, {
        method: 'POST',
        headers,
        body: formData,
    });
    if (!response.ok) throw new Error('Falha na importação');
    return response.json();
}

export async function fetchImportTemplate(type: string): Promise<Blob> {
    const { API_BASE } = await import('./base');
    if (!API_BASE) return new Blob();
    const token = localStorage.getItem('accessToken');

    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/import/template?type=${type}`, {
        method: 'GET',
        headers,
    });
    if (!response.ok) throw new Error('Falha ao descarregar template');
    return response.blob();
}
