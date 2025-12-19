import { apiRequest, API_BASE } from './base';

export async function fetchRootCauseAnalysis(actionItemId: string): Promise<any | null> {
    if (!API_BASE) return null;
    try {
        return await apiRequest(`/root-cause-analysis/${actionItemId}`);
    } catch (error: any) {
        if (error.message?.includes('404')) return null;
        throw error;
    }
}

export async function saveRootCauseAnalysis(actionItemId: string, analysisType: string, data: any): Promise<any> {
    return await apiRequest('/root-cause-analysis', {
        method: 'POST',
        body: JSON.stringify({ actionItemId, analysisType, data }),
    });
}

export async function updateRootCauseAnalysis(actionItemId: string, analysisType: string, data: any): Promise<any> {
    return await apiRequest(`/root-cause-analysis/${actionItemId}`, {
        method: 'PUT',
        body: JSON.stringify({ analysisType, data }),
    });
}

export async function deleteRootCauseAnalysis(actionItemId: string): Promise<void> {
    await apiRequest(`/root-cause-analysis/${actionItemId}`, { method: 'DELETE' });
}
