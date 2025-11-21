import { internalAudits, externalAudits, actionItems, occurrences, sectors } from '../data/mockData';
import type {
  InternalAudit,
  ExternalAudit,
  ActionItem,
  Occurrence,
  Sector,
  DashboardSummary,
  DatasetPayload,
  AnalyticsKPIs,
  AnalyticsTrendData,
  SectorPerformanceEntry,
} from '../types/models';
import { checkAuthError, handleTokenExpired } from '../utils/authUtils';

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
export const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('sgi_current_tenant');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Incluir tenant-id se disponível
  if (tenantId) {
    try {
      const tenant = JSON.parse(tenantId) as { id: string };
      headers['x-tenant-id'] = tenant.id;
    } catch {
      // Se não conseguir fazer parse, usar o valor direto
      headers['x-tenant-id'] = tenantId;
    }
  }
  
  return headers;
};

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const fetchFromApi = async <T>(path: string, fallback: T, options?: { page?: number; limit?: number }): Promise<T> => {
  if (!API_BASE) {
    await delay();
    return structuredClone(fallback);
  }

  try {
    // Se API_BASE começar com /, é uma URL relativa (usa proxy do Vite)
    const isRelative = API_BASE.startsWith('/');
    let url: URL | string;
    
    if (isRelative) {
      // URL relativa - o proxy do Vite vai redirecionar
      url = `${API_BASE}${path}`;
      if (options?.page) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}page=${options.page}`;
      }
      if (options?.limit) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}limit=${options.limit}`;
      }
    } else {
      // URL absoluta
      url = new URL(`${API_BASE}${path}`);
      if (options?.page) url.searchParams.set('page', String(options.page));
      if (options?.limit) url.searchParams.set('limit', String(options.limit));
      url = url.toString();
    }

    const response = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      // Verificar se é erro de autenticação e fazer logout automático
      await checkAuthError(response);
      
      const errorText = await response.text().catch(() => `Falha ao obter ${path}: ${response.status}`);
      throw new Error(errorText || `Falha ao obter ${path}: ${response.status}`);
    }
    const data = (await response.json()) as T | PaginatedResponse<T>;
    
    // Se a resposta tem paginação, extrair apenas o array de dados para compatibilidade
    if (typeof data === 'object' && data !== null && 'data' in data && 'pagination' in data) {
      return (data as PaginatedResponse<T>).data as T;
    }
    
    return data as T;
  } catch (error) {
    console.warn('[API] Falha no endpoint remoto, a usar mock local:', error);
    await delay();
    return structuredClone(fallback);
  }
};

// Função para buscar com paginação (retorna dados + metadados)
const fetchPaginatedFromApi = async <T>(
  path: string,
  fallback: T[],
  options?: { page?: number; limit?: number },
): Promise<PaginatedResponse<T>> => {
  if (!API_BASE) {
    await delay();
    return {
      data: structuredClone(fallback),
      pagination: { page: 1, limit: fallback.length, total: fallback.length, totalPages: 1 },
    };
  }

  try {
    // Se API_BASE começar com /, é uma URL relativa (usa proxy do Vite)
    const isRelative = API_BASE.startsWith('/');
    let url: URL | string;
    
    if (isRelative) {
      // URL relativa - o proxy do Vite vai redirecionar
      url = `${API_BASE}${path}`;
      if (options?.page) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}page=${options.page}`;
      }
      if (options?.limit) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}limit=${options.limit}`;
      }
    } else {
      // URL absoluta
      url = new URL(`${API_BASE}${path}`);
      if (options?.page) url.searchParams.set('page', String(options.page));
      if (options?.limit) url.searchParams.set('limit', String(options.limit));
      url = url.toString();
    }

    const response = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      // Verificar se é erro de autenticação e fazer logout automático
      await checkAuthError(response);
      
      throw new Error(`Falha ao obter ${path}: ${response.status}`);
    }
    const result = (await response.json()) as PaginatedResponse<T>;
    
    // Se não tem paginação (compatibilidade com versões antigas), criar estrutura
    if (!('pagination' in result)) {
      return {
        data: result as unknown as T[],
        pagination: { page: 1, limit: (result as unknown as T[]).length, total: (result as unknown as T[]).length, totalPages: 1 },
      };
    }
    
    return result;
  } catch (error) {
    console.warn('[API] Falha no endpoint remoto, a usar mock local:', error);
    await delay();
    return {
      data: structuredClone(fallback),
      pagination: { page: 1, limit: fallback.length, total: fallback.length, totalPages: 1 },
    };
  }
};

export const fetchInternalAudits = (options?: { page?: number; limit?: number }) =>
  fetchFromApi<InternalAudit[]>('/audits/internal', internalAudits, options);

export const fetchExternalAudits = (options?: { page?: number; limit?: number }) =>
  fetchFromApi<ExternalAudit[]>('/audits/external', externalAudits, options);

export const fetchActionItems = (options?: { page?: number; limit?: number }) =>
  fetchFromApi<ActionItem[]>('/actions', actionItems, options);

export const fetchOccurrences = (options?: { page?: number; limit?: number }) =>
  fetchFromApi<Occurrence[]>('/occurrences', occurrences, options);

export const fetchSectors = (options?: { page?: number; limit?: number }) =>
  fetchFromApi<Sector[]>('/sectors', sectors, options);

// Versões com paginação completa
export const fetchInternalAuditsPaginated = (options?: { page?: number; limit?: number }) =>
  fetchPaginatedFromApi<InternalAudit>('/audits/internal', internalAudits, options);

export const fetchExternalAuditsPaginated = (options?: { page?: number; limit?: number }) =>
  fetchPaginatedFromApi<ExternalAudit>('/audits/external', externalAudits, options);

export const fetchActionItemsPaginated = (options?: { page?: number; limit?: number }) =>
  fetchPaginatedFromApi<ActionItem>('/actions', actionItems, options);

export const fetchOccurrencesPaginated = (options?: { page?: number; limit?: number }) =>
  fetchPaginatedFromApi<Occurrence>('/occurrences', occurrences, options);

export const fetchSectorsPaginated = (options?: { page?: number; limit?: number }) =>
  fetchPaginatedFromApi<Sector>('/sectors', sectors, options);

const analyticsKPIFallback: AnalyticsKPIs = {
  audits: { internal: 0, external: 0, total: 0 },
  actions: { total: 0, overdue: 0, complianceRate: 100 },
  occurrences: { open: 0 },
};

const analyticsTrendsFallback: AnalyticsTrendData[] = [
  { month: new Date().toISOString().slice(0, 7), created: 0, completed: 0, overdue: 0 },
];

const sectorPerformanceFallback: SectorPerformanceEntry[] = [];

export const fetchDashboardKPIs = () =>
  fetchFromApi<AnalyticsKPIs>('/analytics/kpis', analyticsKPIFallback);

export const fetchAnalyticsTrends = () =>
  fetchFromApi<AnalyticsTrendData[]>('/analytics/trends', analyticsTrendsFallback);

export const fetchSectorPerformance = () =>
  fetchFromApi<SectorPerformanceEntry[]>('/analytics/sectors', sectorPerformanceFallback);

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
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao importar dados');
  }
  return response.json();
};

export const resetDataset = async () => {
  assertApiBase();
  const response = await fetch(`${API_BASE}/import/reset`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao limpar dados');
  }
  return response.json();
};

const postJSON = async <T,>(path: string, body: unknown): Promise<T> => {
  assertApiBase();
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao guardar dados');
  }
  return response.json() as Promise<T>;
};

const putJSON = async <T,>(path: string, body: unknown): Promise<T> => {
  assertApiBase();
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao atualizar dados');
  }
  return response.json() as Promise<T>;
};

const deleteJSON = async (path: string): Promise<void> => {
  assertApiBase();
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao eliminar registo');
  }
};

// CREATE
export const createInternalAudit = (payload: Partial<InternalAudit>) =>
  postJSON<InternalAudit>('/audits/internal', payload);

export const createExternalAudit = (payload: Partial<ExternalAudit>) =>
  postJSON<ExternalAudit>('/audits/external', payload);

export const createSector = (payload: Partial<Sector>) => postJSON<Sector>('/sectors', payload);

export const createActionItem = (payload: Partial<ActionItem>) =>
  postJSON<ActionItem>('/actions', payload);

export const createOccurrence = (payload: Partial<Occurrence>) =>
  postJSON<Occurrence>('/occurrences', payload);

// UPDATE
export const updateInternalAudit = (id: string, payload: Partial<InternalAudit>) =>
  putJSON<InternalAudit>(`/audits/internal/${encodeURIComponent(id)}`, payload);

export const updateExternalAudit = (id: string, payload: Partial<ExternalAudit>) =>
  putJSON<ExternalAudit>(`/audits/external/${encodeURIComponent(id)}`, payload);

export const updateSector = (id: string, payload: Partial<Sector>) =>
  putJSON<Sector>(`/sectors/${encodeURIComponent(id)}`, payload);

export const updateActionItem = (id: string, payload: Partial<ActionItem>) =>
  putJSON<ActionItem>(`/actions/${encodeURIComponent(id)}`, payload);

export const updateOccurrence = (id: string, payload: Partial<Occurrence>) =>
  putJSON<Occurrence>(`/occurrences/${encodeURIComponent(id)}`, payload);

// DELETE
export const deleteInternalAudit = (id: string) => deleteJSON(`/audits/internal/${encodeURIComponent(id)}`);

export const deleteSector = (id: string) => deleteJSON(`/sectors/${encodeURIComponent(id)}`);

export const deleteExternalAudit = (id: string) => deleteJSON(`/audits/external/${encodeURIComponent(id)}`);

export const deleteActionItem = (id: string) => deleteJSON(`/actions/${encodeURIComponent(id)}`);

export const deleteOccurrence = (id: string) => deleteJSON(`/occurrences/${encodeURIComponent(id)}`);

// AUDIT TRAIL / LOGS
export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'IMPORT';
  entity: string;
  entityId: string | null;
  description: string;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface AuditLogsQuery {
  page?: number;
  limit?: number;
  action?: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'IMPORT';
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export const fetchAuditLogs = async (query?: AuditLogsQuery): Promise<PaginatedResponse<AuditLog>> => {
  assertApiBase();
  const params = new URLSearchParams();
  
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.action) params.set('action', query.action);
  if (query?.entity) params.set('entity', query.entity);
  if (query?.userId) params.set('userId', query.userId);
  if (query?.startDate) params.set('startDate', query.startDate);
  if (query?.endDate) params.set('endDate', query.endDate);
  
  const url = `${API_BASE}/logs${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  
  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao buscar logs');
  }
  
  return response.json() as Promise<PaginatedResponse<AuditLog>>;
};

// ATTACHMENTS
export interface Attachment {
  id: string;
  entityType: 'InternalAudit' | 'ExternalAudit' | 'ActionItem' | 'Occurrence';
  entityId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

export const uploadAttachment = async (
  entityType: Attachment['entityType'],
  entityId: string,
  file: File,
): Promise<Attachment> => {
  assertApiBase();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityType', entityType);
  formData.append('entityId', entityId);

  const headers = getAuthHeaders();
  // Remover Content-Type para FormData - o browser fará isso automaticamente
  delete (headers as any)['Content-Type'];
  
  const response = await fetch(`${API_BASE}/attachments`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao enviar anexo');
  }

  return response.json() as Promise<Attachment>;
};

export const fetchAttachments = async (
  entityType: Attachment['entityType'],
  entityId: string,
): Promise<Attachment[]> => {
  assertApiBase();
  
  // Se não há token, retornar array vazio sem fazer pedido
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return [];
  }
  
  const response = await fetch(`${API_BASE}/attachments/${entityType}/${entityId}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    if (response.status === 401 || response.status === 403) {
      handleTokenExpired();
    }
    const text = await response.text();
    throw new Error(text || 'Falha ao buscar anexos');
  }

  return response.json() as Promise<Attachment[]>;
};

export const downloadAttachment = async (id: string, originalName: string): Promise<void> => {
  assertApiBase();
  const response = await fetch(`${API_BASE}/attachments/${id}/download`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao fazer download do anexo');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = originalName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const deleteAttachment = async (id: string): Promise<void> => {
  assertApiBase();
  const response = await fetch(`${API_BASE}/attachments/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao eliminar anexo');
  }
};

// COMMENTS
export interface Comment {
  id: string;
  entityType: 'InternalAudit' | 'ExternalAudit' | 'ActionItem' | 'Occurrence';
  entityId: string;
  content: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const createComment = async (
  entityType: Comment['entityType'],
  entityId: string,
  content: string,
): Promise<Comment> => {
  assertApiBase();
  return postJSON<Comment>('/comments', { entityType, entityId, content });
};

export const fetchComments = async (
  entityType: Comment['entityType'],
  entityId: string,
): Promise<Comment[]> => {
  assertApiBase();
  
  // Se não há token, retornar array vazio sem fazer pedido
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return [];
  }
  
  const response = await fetch(`${API_BASE}/comments/${entityType}/${entityId}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    if (response.status === 401 || response.status === 403) {
      handleTokenExpired();
    }
    const text = await response.text();
    throw new Error(text || 'Falha ao buscar comentários');
  }

  return response.json() as Promise<Comment[]>;
};

export const updateComment = async (id: string, content: string): Promise<Comment> => {
  return putJSON<Comment>(`/comments/${encodeURIComponent(id)}`, { content });
};

export const deleteComment = async (id: string): Promise<void> => {
  return deleteJSON(`/comments/${encodeURIComponent(id)}`);
};

// APPROVALS
export interface Approval {
  id: string;
  entityType: 'InternalAudit' | 'ExternalAudit' | 'ActionItem' | 'Occurrence';
  entityId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  approvedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
}

export const createApproval = async (
  entityType: Approval['entityType'],
  entityId: string,
  comments?: string,
): Promise<Approval> => {
  assertApiBase();
  return postJSON<Approval>('/approvals', { entityType, entityId, comments });
};

export const fetchApproval = async (
  entityType: Approval['entityType'],
  entityId: string,
): Promise<Approval | null> => {
  assertApiBase();
  
  // Se não há token, retornar null sem fazer pedido
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return null;
  }
  
  const response = await fetch(`${API_BASE}/approvals/${entityType}/${entityId}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    if (response.status === 401 || response.status === 403) {
      handleTokenExpired();
    }
    // Se não encontrado, retornar null silenciosamente
    if (response.status === 404) {
      return null;
    }
    const text = await response.text();
    throw new Error(text || 'Falha ao buscar aprovação');
  }

  return response.json() as Promise<Approval>;
};

export const updateApproval = async (
  id: string,
  status: 'APPROVED' | 'REJECTED',
  comments?: string,
): Promise<Approval> => {
  return putJSON<Approval>(`/approvals/${encodeURIComponent(id)}/approve`, { status, comments });
};

// ===== WORKFLOWS =====
export interface WorkflowStep {
  id?: string;
  stepOrder: number;
  stepType: 'APPROVAL' | 'NOTIFICATION' | 'CONDITION';
  name: string;
  description?: string;
  requiredRoles?: string[];
  requiredUsers?: string[];
  conditionExpression?: any;
  notificationTemplate?: string;
  autoAdvance?: boolean;
  timeoutDays?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  isActive: boolean;
  steps: WorkflowStep[];
  instancesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowInstance {
  id: string;
  workflowDefinition: {
    id: string;
    name: string;
    entityType: string;
  };
  entityType: string;
  entityId: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  currentStepOrder?: number;
  startedBy: {
    id: string;
    name: string;
    email: string;
  };
  steps: Array<WorkflowStep & { execution?: any }>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export const fetchWorkflowDefinitions = async (filters?: {
  entityType?: string;
  isActive?: boolean;
}): Promise<WorkflowDefinition[]> => {
  const params = new URLSearchParams();
  if (filters?.entityType) params.set('entityType', filters.entityType);
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));

  const query = params.toString();
  return fetchFromApi<WorkflowDefinition[]>(
    `/workflows/definitions${query ? `?${query}` : ''}`,
    [],
  );
};

export const fetchWorkflowDefinition = async (id: string): Promise<WorkflowDefinition> => {
  return fetchFromApi<WorkflowDefinition>(`/workflows/definitions/${encodeURIComponent(id)}`, {
    id,
    name: '',
    entityType: '',
    isActive: false,
    steps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

export const createWorkflowDefinition = async (
  payload: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'updatedAt' | 'instancesCount'>,
): Promise<WorkflowDefinition> => {
  assertApiBase();
  return postJSON<WorkflowDefinition>('/workflows/definitions', payload);
};

export const updateWorkflowDefinition = async (
  id: string,
  payload: Partial<Omit<WorkflowDefinition, 'id' | 'createdAt' | 'updatedAt' | 'instancesCount'>>,
): Promise<WorkflowDefinition> => {
  assertApiBase();
  return putJSON<WorkflowDefinition>(`/workflows/definitions/${encodeURIComponent(id)}`, payload);
};

export const deleteWorkflowDefinition = async (id: string): Promise<void> => {
  assertApiBase();
  return deleteJSON(`/workflows/definitions/${encodeURIComponent(id)}`);
};

export const startWorkflow = async (payload: {
  workflowDefinitionId: string;
  entityType: string;
  entityId: string;
}): Promise<{ instanceId: string; status: string }> => {
  assertApiBase();
  return postJSON<{ instanceId: string; status: string }>('/workflows/start', payload);
};

export const fetchWorkflowInstance = async (
  entityType: string,
  entityId: string,
): Promise<WorkflowInstance | null> => {
  if (!API_BASE) return null;
  try {
    const response = await fetch(
      `${API_BASE}/workflows/instances/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
      {
        headers: getAuthHeaders(),
        credentials: 'include',
      },
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      // Verificar se é erro de autenticação e fazer logout automático
      await checkAuthError(response);
      
      throw new Error('Falha ao buscar workflow instance');
    }
    return response.json() as Promise<WorkflowInstance>;
  } catch {
    return null;
  }
};

export const approveWorkflowStep = async (instanceId: string, comments?: string): Promise<any> => {
  assertApiBase();
  return postJSON(`/workflows/instances/${encodeURIComponent(instanceId)}/approve`, { comments });
};

export const rejectWorkflowStep = async (instanceId: string, comments?: string): Promise<void> => {
  assertApiBase();
  return postJSON(`/workflows/instances/${encodeURIComponent(instanceId)}/reject`, { comments });
};

export const cancelWorkflow = async (instanceId: string): Promise<void> => {
  assertApiBase();
  return postJSON(`/workflows/instances/${encodeURIComponent(instanceId)}/cancel`, {});
};

// ===== DOCUMENTS (DMS) =====
export interface DocumentTag {
  id: string;
  name: string;
  color?: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  originalName: string;
  mimeType: string;
  size: number;
  changeNotes?: string;
  uploadedBy: string;
  isCurrent: boolean;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  accessLevel: 'PRIVATE' | 'INTERNAL' | 'PUBLIC';
  currentVersion: number;
  allowedRoles: string[];
  allowedUsers: string[];
  tags: DocumentTag[];
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  currentFile?: {
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    version: number;
    createdAt: string;
  } | null;
  workflow?: {
    id: string;
    status: string;
    workflowDefinition?: {
      id: string;
      name: string;
    };
  } | null;
  metadata?: any;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedDocumentsResponse {
  data: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const fetchDocuments = async (filters?: {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedDocumentsResponse> => {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const query = params.toString();
  const url = `/documents${query ? `?${query}` : ''}`;

  if (!API_BASE) {
    await delay();
    return {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      // Verificar se é erro de autenticação e fazer logout automático
      await checkAuthError(response);
      
      const errorText = await response.text().catch(() => `Falha ao obter ${url}: ${response.status}`);
      throw new Error(errorText || `Falha ao obter ${url}: ${response.status}`);
    }
    return response.json() as Promise<PaginatedDocumentsResponse>;
  } catch (error) {
    console.warn('[API] Falha no endpoint remoto, a usar mock local:', error);
    await delay();
    return {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }
};

export const fetchDocument = async (id: string): Promise<Document> => {
  return fetchFromApi<Document>(`/documents/${encodeURIComponent(id)}`, {
    id,
    title: '',
    status: 'DRAFT',
    accessLevel: 'INTERNAL',
    currentVersion: 1,
    allowedRoles: [],
    allowedUsers: [],
    tags: [],
    createdBy: { id: '', name: '', email: '' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

export const createDocument = async (
  formData: FormData,
): Promise<Document> => {
  assertApiBase();
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('sgi_current_tenant');
  
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenantId) {
    try {
      const tenant = JSON.parse(tenantId) as { id: string };
      headers['x-tenant-id'] = tenant.id;
    } catch {
      headers['x-tenant-id'] = tenantId;
    }
  }
  // Não definir Content-Type - o browser vai definir com boundary correto para FormData

  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });
  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao criar documento');
  }
  return response.json() as Promise<Document>;
};

export const updateDocument = async (
  id: string,
  payload: Partial<Omit<Document, 'id' | 'createdAt' | 'updatedAt' | 'currentFile' | 'createdBy'>>,
): Promise<Document> => {
  assertApiBase();
  return putJSON<Document>(`/documents/${encodeURIComponent(id)}`, payload);
};

export const deleteDocument = async (id: string): Promise<void> => {
  assertApiBase();
  return deleteJSON(`/documents/${encodeURIComponent(id)}`);
};

export const uploadDocumentVersion = async (
  documentId: string,
  formData: FormData,
): Promise<DocumentVersion> => {
  assertApiBase();
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('sgi_current_tenant');
  
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenantId) {
    try {
      const tenant = JSON.parse(tenantId) as { id: string };
      headers['x-tenant-id'] = tenant.id;
    } catch {
      headers['x-tenant-id'] = tenantId;
    }
  }
  // Não definir Content-Type - o browser vai definir com boundary correto para FormData

  const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(documentId)}/versions`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });
  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao fazer upload da nova versão');
  }
  return response.json() as Promise<DocumentVersion>;
};

export const downloadDocumentVersion = async (
  documentId: string,
  versionId: string,
): Promise<Blob> => {
  assertApiBase();
  const response = await fetch(
    `${API_BASE}/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(versionId)}/download`,
    {
      headers: getAuthHeaders(),
      credentials: 'include',
    },
  );
  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao fazer download da versão');
  }
  return response.blob();
};

export const archiveDocument = async (id: string): Promise<Document> => {
  assertApiBase();
  return postJSON<Document>(`/documents/${encodeURIComponent(id)}/archive`, {});
};

// ===== REPORTS (Motor de Relatórios Avançado) =====
export type ReportType = 'AUDIT_INTERNAL' | 'AUDIT_EXTERNAL' | 'ACTIONS' | 'OCCURRENCES' | 'CONSOLIDATED' | 'CUSTOM';
export type ReportStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ON_DEMAND';
export type ReportComponentType = 'KPI' | 'TABLE' | 'CHART_BAR' | 'CHART_LINE' | 'CHART_PIE' | 'CHART_AREA' | 'TEXT' | 'IMAGE';

export interface ReportComponent {
  id?: string;
  componentType: ReportComponentType;
  order: number;
  title?: string;
  configuration: any;
  dataSource?: any;
  style?: any;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  reportType: ReportType;
  status: ReportStatus;
  isPublic: boolean;
  components: ReportComponent[];
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  instancesCount?: number;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledReport {
  id: string;
  reportTemplateId: string;
  reportTemplate: {
    id: string;
    name: string;
    reportType: ReportType;
  };
  name: string;
  description?: string;
  frequency: ReportFrequency;
  schedule: string;
  recipients: string[];
  format: ('PDF' | 'CSV')[];
  filters?: any;
  status: ReportStatus;
  enabled: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  recentExecutions?: Array<{
    id: string;
    status: string;
    errorMessage?: string;
    startedAt: string;
    completedAt?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const fetchReportTemplates = async (filters?: {
  reportType?: ReportType;
  status?: ReportStatus;
  isPublic?: boolean;
}): Promise<ReportTemplate[]> => {
  const params = new URLSearchParams();
  if (filters?.reportType) params.set('reportType', filters.reportType);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.isPublic !== undefined) params.set('isPublic', String(filters.isPublic));

  const query = params.toString();
  return fetchFromApi<ReportTemplate[]>(`/reports/templates${query ? `?${query}` : ''}`, []);
};

export const fetchReportTemplate = async (id: string): Promise<ReportTemplate> => {
  return fetchFromApi<ReportTemplate>(`/reports/templates/${encodeURIComponent(id)}`, {
    id,
    name: '',
    reportType: 'CUSTOM',
    status: 'DRAFT',
    isPublic: false,
    components: [],
    createdBy: { id: '', name: '', email: '' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

export const createReportTemplate = async (
  payload: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'instancesCount'>,
): Promise<ReportTemplate> => {
  assertApiBase();
  return postJSON<ReportTemplate>('/reports/templates', payload);
};

export const updateReportTemplate = async (
  id: string,
  payload: Partial<Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'instancesCount'>>,
): Promise<ReportTemplate> => {
  assertApiBase();
  return putJSON<ReportTemplate>(`/reports/templates/${encodeURIComponent(id)}`, payload);
};

export const deleteReportTemplate = async (id: string): Promise<void> => {
  assertApiBase();
  return deleteJSON(`/reports/templates/${encodeURIComponent(id)}`);
};

export const generateReport = async (
  templateId: string,
  format: 'PDF' | 'CSV',
  filters?: any,
): Promise<Blob> => {
  assertApiBase();
  const response = await fetch(`${API_BASE}/reports/generate/${encodeURIComponent(templateId)}`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ format, filters }),
  });
  if (!response.ok) {
    // Verificar se é erro de autenticação e fazer logout automático
    await checkAuthError(response);
    
    const text = await response.text();
    throw new Error(text || 'Falha ao gerar relatório');
  }
  return response.blob();
};

export const fetchScheduledReports = async (filters?: { enabled?: boolean }): Promise<ScheduledReport[]> => {
  const params = new URLSearchParams();
  if (filters?.enabled !== undefined) params.set('enabled', String(filters.enabled));

  const query = params.toString();
  return fetchFromApi<ScheduledReport[]>(`/reports/scheduled${query ? `?${query}` : ''}`, []);
};

export const createScheduledReport = async (
  payload: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'reportTemplate' | 'recentExecutions'>,
): Promise<ScheduledReport> => {
  assertApiBase();
  return postJSON<ScheduledReport>('/reports/scheduled', payload);
};

export const updateScheduledReport = async (
  id: string,
  payload: Partial<Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'reportTemplate' | 'recentExecutions'>>,
): Promise<ScheduledReport> => {
  assertApiBase();
  return putJSON<ScheduledReport>(`/reports/scheduled/${encodeURIComponent(id)}`, payload);
};

export const deleteScheduledReport = async (id: string): Promise<void> => {
  assertApiBase();
  return deleteJSON(`/reports/scheduled/${encodeURIComponent(id)}`);
};



