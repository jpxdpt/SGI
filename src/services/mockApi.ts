import { internalAudits, externalAudits, actionItems, occurrences, sectors } from '../data/mockData';
import type {
  InternalAudit,
  ExternalAudit,
  ActionItem,
  Occurrence,
  Sector,
  DashboardSummary,
  DatasetPayload,
} from '../types/models';

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
export const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

const fetchFromApi = async <T>(path: string, fallback: T): Promise<T> => {
  if (!API_BASE) {
    await delay();
    return structuredClone(fallback);
  }

  try {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) throw new Error(`Falha ao obter ${path}: ${response.status}`);
    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    console.warn('[MockAPI] Falha no endpoint remoto, a usar mock local:', error);
    await delay();
    return structuredClone(fallback);
  }
};

export const fetchInternalAudits = () => fetchFromApi<InternalAudit[]>('/audits/internal', internalAudits);

export const fetchExternalAudits = () => fetchFromApi<ExternalAudit[]>('/audits/external', externalAudits);

export const fetchActionItems = () => fetchFromApi<ActionItem[]>('/actions', actionItems);

export const fetchOccurrences = () => fetchFromApi<Occurrence[]>('/occurrences', occurrences);

export const fetchSectors = () => fetchFromApi<Sector[]>('/sectors', sectors);

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const [intAudits, extAudits, actions, occs, sects] = await Promise.all([
    fetchInternalAudits(),
    fetchExternalAudits(),
    fetchActionItems(),
    fetchOccurrences(),
    fetchSectors(),
  ]);

  return {
    totalInternas: intAudits.length,
    totalExternas: extAudits.length,
    totalAcoes: actions.length,
    totalOcorrencias: occs.length,
    setoresAtivos: sects.filter((item) => item.ativo).length,
  };
};

const assertApiBase = () => {
  if (!API_BASE) {
    throw new Error('Define VITE_API_BASE_URL para usar esta ação.');
  }
};

export const importDataset = async (payload: DatasetPayload, mode: 'merge' | 'replace' = 'merge') => {
  assertApiBase();
  const path = mode === 'replace' ? '/import/replace' : '/import';
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Falha ao importar dados');
  }
  return response.json();
};

export const resetDataset = async () => {
  assertApiBase();
  const response = await fetch(`${API_BASE}/import/reset`, { method: 'DELETE' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Falha ao limpar dados');
  }
  return response.json();
};

const postJSON = async <T,>(path: string, body: unknown): Promise<T> => {
  assertApiBase();
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Falha ao guardar dados');
  }
  return response.json() as Promise<T>;
};

export const createInternalAudit = (payload: Partial<InternalAudit>) =>
  postJSON<InternalAudit>('/audits/internal', payload);

export const createExternalAudit = (payload: Partial<ExternalAudit>) =>
  postJSON<ExternalAudit>('/audits/external', payload);

export const createSector = (payload: Partial<Sector>) => postJSON<Sector>('/sectors', payload);

