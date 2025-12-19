// API Base URL - pode ser definido via window.__ENV__ ou import.meta.env
export const API_BASE = (window as any).__ENV__?.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

// Helper para fazer requisições autenticadas
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('accessToken');
    const tenantId = localStorage.getItem('tenantId') || 'tenant-default';

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (tenantId) {
        headers['x-tenant-id'] = tenantId;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro na requisição' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}
