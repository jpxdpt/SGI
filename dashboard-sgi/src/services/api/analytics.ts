import { apiRequest, API_BASE } from './base';

export async function fetchDashboardKPIs(): Promise<any> {
    if (!API_BASE) return { audits: { total: 0 }, actions: { total: 0 }, occurrences: { total: 0 } };
    try { return await apiRequest('/analytics/kpis'); } catch { return { audits: { total: 0 } }; }
}

export async function fetchAnalyticsTrends(): Promise<any[]> {
    if (!API_BASE) return [];
    try { return await apiRequest('/analytics/trends'); } catch { return []; }
}
