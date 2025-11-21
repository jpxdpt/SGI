import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Edit, Download, Save, Bookmark, X } from 'lucide-react';
import {
  API_BASE,
  updateActionItem,
  deleteActionItem,
  fetchActionItems,
  fetchInternalAudits,
  fetchExternalAudits,
  updateInternalAudit,
  updateExternalAudit,
} from '../services/api';
import type { ActionItem, AcaoOrigem, AcaoStatus, Conformidade, InternalAudit, ExternalAudit } from '../types/models';
import { actionItemSchema } from '../utils/validation';
import type { z } from 'zod';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { exportToCsv } from '../utils/exportUtils';
import { useSavedFilters } from '../hooks/useSavedFilters';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

const statusVariants: Record<AcaoStatus, 'success' | 'info' | 'danger'> = {
  Executada: 'success',
  'Executada+Atraso': 'danger',
  Atrasada: 'danger',
  Andamento: 'info',
};

const COLORS = ['#86efac', '#fca5a5', '#fb923c', '#93c5fd', '#c4b5fd', '#34d399'];

type FormData = z.infer<typeof actionItemSchema>;

export const ActionsPage = () => {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['actions'], queryFn: () => fetchActionItems() });
  const { data: internalAudits = [] } = useQuery({ queryKey: ['audits', 'internal'], queryFn: () => fetchInternalAudits() });
  const { data: externalAudits = [] } = useQuery({ queryKey: ['audits', 'external'], queryFn: () => fetchExternalAudits() });
  const { showToast } = useToast();
  const [filters, setFilters] = useState<{ origem: 'Todos' | AcaoOrigem; status: 'Todos' | AcaoStatus; setor: string }>({
    origem: 'Todos',
    status: 'Todos',
    setor: 'Todos',
  });
  const [chartAuditType, setChartAuditType] = useState<'Interna' | 'Externa'>('Interna');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [relatedAudit, setRelatedAudit] = useState<InternalAudit | ExternalAudit | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [saveFilterModal, setSaveFilterModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const { savedFilters, saveFilter, deleteFilter, applyFilter } = useSavedFilters<typeof filters>('actions');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(actionItemSchema),
    defaultValues: {
      origem: 'Interna',
      acaoRelacionada: '',
      conformidade: undefined,
      numeroAssociado: '',
      ambito: '',
      descricao: '',
      causaRaizIdentificada: '',
      acaoCorretiva: '',
      local: '',
      responsavel: '',
      inicio: '',
      termino: '',
      conclusao: '',
      status: 'Andamento',
      mes: '',
      evidencia: '',
      avaliacaoEficacia: '',
    },
  });

  const setores = Array.from(new Set(data.map((item) => item.setor)));

  // Função auxiliar para obter auditorias disponíveis baseado na origem
  const getAvailableAudits = (origem: AcaoOrigem) => {
    if (origem === 'Interna') {
      return internalAudits.map((audit) => ({
        id: audit.id,
        label: `${audit.id}${audit.entidadeAuditora ? ' - ' + audit.entidadeAuditora : ''} (${audit.ano})`,
      }));
    } else if (origem === 'Externa') {
      return externalAudits.map((audit) => ({
        id: audit.id,
        label: `${audit.id} - ${audit.entidadeAuditora} (${audit.ano})`,
      }));
    }
    return [];
  };

  // Função para carregar auditoria relacionada quando acaoRelacionada muda
  const loadRelatedAudit = async (acaoRelacionada: string, origem: AcaoOrigem) => {
    if (!acaoRelacionada) {
      setRelatedAudit(null);
      return;
    }

    if (origem === 'Interna') {
      const audit = internalAudits.find((a) => a.id === acaoRelacionada);
      if (audit) {
        setRelatedAudit(audit);
      } else {
        setRelatedAudit(null);
      }
    } else if (origem === 'Externa') {
      const audit = externalAudits.find((a) => a.id === acaoRelacionada);
      if (audit) {
        setRelatedAudit(audit);
      } else {
        setRelatedAudit(null);
      }
    } else {
      setRelatedAudit(null);
    }
  };

  const filtered = data.filter((action) => {
    const byOrigem = filters.origem === 'Todos' || action.origem === filters.origem;
    const byStatus = filters.status === 'Todos' || action.status === filters.status;
    const bySetor = filters.setor === 'Todos' || action.setor === filters.setor;
    return byOrigem && byStatus && bySetor;
  });

  // Dados para gráfico de status (filtrado por tipo de auditoria)
  const statusChartData = useMemo(() => {
    const actionsForChart = data.filter(
      (action) => action.acaoRelacionada && action.origem === chartAuditType,
    );
    const statusCounts: Record<AcaoStatus, number> = {
      Executada: 0,
      'Executada+Atraso': 0,
      Atrasada: 0,
      Andamento: 0,
    };
    actionsForChart.forEach((action) => {
      statusCounts[action.status] = (statusCounts[action.status] || 0) + 1;
    });
    const total = actionsForChart.length;
    return Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: status,
        value: count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0',
      }));
  }, [data, chartAuditType]);

  const totalActionsForChart = useMemo(() => {
    return data.filter(
      (action) => action.acaoRelacionada && action.origem === chartAuditType,
    ).length;
  }, [data, chartAuditType]);

  // Dados para gráfico de setores com mais ações atrasadas
  const sectorsDelayedData = useMemo(() => {
    const delayedActions = data.filter((action) => action.status === 'Atrasada');
    const sectorCounts: Record<string, number> = {};
    delayedActions.forEach((action) => {
      sectorCounts[action.setor] = (sectorCounts[action.setor] || 0) + 1;
    });
    return Object.entries(sectorCounts)
      .map(([setor, count]) => ({ setor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteActionItem(id),
    onSuccess: () => {
      setDeleteConfirm({ open: false, id: null });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      showToast('Ação eliminada com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao eliminar ação.';
      showToast(message, 'error');
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ActionItem> }) =>
      updateActionItem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      showToast('Ação atualizada com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar ação.';
      showToast(message, 'error');
    },
  });

  const updateAuditMutation = useMutation({
    mutationFn: ({
      auditId,
      payload,
      isInternal,
    }: {
      auditId: string;
      payload: Partial<InternalAudit | ExternalAudit>;
      isInternal: boolean;
    }) => {
      if (isInternal) {
        return updateInternalAudit(auditId, payload as Partial<InternalAudit>);
      } else {
        return updateExternalAudit(auditId, payload as Partial<ExternalAudit>);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      showToast('Auditoria atualizada com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar auditoria.';
      showToast(message, 'error');
    },
  });

  const exportCsv = () => {
    if (filtered.length === 0) {
      showToast('Não existem ações para exportar.', 'warning');
      return;
    }

    try {
      const csvData = filtered.map((action) => ({
        ID: action.id,
        Origem: action.origem,
        Referencia: action.acaoRelacionada ?? '',
        Conformidade: action.conformidade ?? '',
        NumeroAssociado: action.numeroAssociado ?? '',
        Ambito: action.ambito ?? '',
        Descricao: action.descricao,
        CausaRaizIdentificada: action.causaRaizIdentificada ?? '',
        AcaoCorretiva: action.acaoCorretiva ?? '',
        Local: action.local ?? '',
        Responsavel: action.responsavel ?? '',
        Inicio: action.inicio ?? '',
        Termino: action.termino ?? '',
        Conclusao: action.conclusao ?? '',
        Status: action.status,
        Mes: action.mes ?? '',
        Evidencia: action.evidencia ?? '',
        AvaliacaoEficacia: action.avaliacaoEficacia ?? '',
        Setor: action.setor,
        DataAbertura: action.dataAbertura,
        DataLimite: action.dataLimite,
        DataConclusao: action.dataConclusao ?? '',
        Impacto: action.impacto,
      }));

      exportToCsv(csvData, 'acoes');
      showToast('Ações exportadas para CSV com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar ações para CSV:', error);
      showToast('Erro ao exportar ações para CSV.', 'error');
    }
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      showToast('Por favor, indica um nome para o filtro.', 'warning');
      return;
    }
    try {
      saveFilter(filterName.trim(), filters);
      setSaveFilterModal(false);
      setFilterName('');
      showToast('Filtro guardado com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao guardar filtro.', 'error');
    }
  };

  const handleApplySavedFilter = (savedFilterId: string) => {
    const savedFilter = applyFilter(savedFilterId);
    if (savedFilter) {
      setFilters(savedFilter);
      showToast('Filtro aplicado com sucesso!', 'success');
    }
  };

  const handleDeleteSavedFilter = (savedFilterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      deleteFilter(savedFilterId);
      showToast('Filtro eliminado com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao eliminar filtro.', 'error');
    }
  };

  const handleEdit = async (action: ActionItem) => {
    setValue('origem', action.origem);
    setValue('acaoRelacionada', action.acaoRelacionada || '');
    setValue('conformidade', action.conformidade);
    setValue('numeroAssociado', action.numeroAssociado || '');
    setValue('ambito', action.ambito || '');
    setValue('descricao', action.descricao);
    setValue('causaRaizIdentificada', action.causaRaizIdentificada || '');
    setValue('acaoCorretiva', action.acaoCorretiva || '');
    setValue('local', action.local || '');
    setValue('responsavel', action.responsavel || '');
    setValue(
      'inicio',
      action.inicio && action.inicio.includes('T') ? action.inicio.split('T')[0] : action.inicio || '',
    );
    setValue(
      'termino',
      action.termino && action.termino.includes('T') ? action.termino.split('T')[0] : action.termino || '',
    );
    setValue(
      'conclusao',
      action.conclusao && action.conclusao.includes('T') ? action.conclusao.split('T')[0] : action.conclusao || '',
    );
    setValue('status', action.status);
    setValue('mes', action.mes || '');
    setValue('evidencia', action.evidencia || '');
    setValue('avaliacaoEficacia', action.avaliacaoEficacia || '');

    // Carregar auditoria relacionada
    if (action.acaoRelacionada) {
      if (action.origem === 'Interna') {
        const audit = internalAudits.find((a) => a.id === action.acaoRelacionada);
        if (audit) {
          setRelatedAudit(audit);
        } else {
          setRelatedAudit(null);
        }
      } else if (action.origem === 'Externa') {
        const audit = externalAudits.find((a) => a.id === action.acaoRelacionada);
        if (audit) {
          setRelatedAudit(audit);
        } else {
          setRelatedAudit(null);
        }
      } else {
        setRelatedAudit(null);
      }
    } else {
      setRelatedAudit(null);
    }

    setEditingId(action.id);
    setModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    if (!API_BASE) {
      showToast('Define VITE_API_BASE_URL para guardar no backend.', 'warning');
      return;
    }
    if (editingId) {
      // Atualizar ação
      updateActionMutation.mutate({ id: editingId, payload: data });

      // Se houver auditoria relacionada e os campos da auditoria foram alterados, atualizar a auditoria também
      if (relatedAudit) {
        const origem = watch('origem');
        const isInternal = origem === 'Interna';
        const auditUpdate: Partial<InternalAudit | ExternalAudit> = {};

        // Sincronizar campos da auditoria se necessário
        // Nota: Por enquanto, apenas sincronizamos se os campos mudarem no formulário da auditoria
        // Aqui podemos adicionar lógica adicional se necessário

        // Por enquanto, apenas atualizamos a ação
        // A sincronização bidirecional pode ser implementada se necessário no futuro
      }
    }
  };

  const origemWatch = watch('origem');
  const acaoRelacionadaWatch = watch('acaoRelacionada');

  return (
    <>
      <PageHeader
        title="Ações totais geradas"
        subtitle="Visualiza ações provenientes de auditorias internas, externas e ocorrências."
        actions={
          <Button onClick={exportCsv} variant="secondary" size="md">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        }
      />

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card title="Status das Ações Corretivas">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant={chartAuditType === 'Interna' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setChartAuditType('Interna')}
              >
                Internas
              </Button>
              <Button
                variant={chartAuditType === 'Externa' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setChartAuditType('Externa')}
              >
                Externas
              </Button>
            </div>
            {statusChartData.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300 py-8">
                Não há dados disponíveis para o gráfico.
              </p>
            ) : (
              <div className="relative w-full" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="44.5%"
                      labelLine={false}
                      label={({ value, percentage }) => `${value}, ${percentage}%`}
                      outerRadius={90}
                      innerRadius={55}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => <span className="text-sm text-slate-700 dark:text-slate-300">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  className="absolute pointer-events-none"
                  style={{ 
                    top: '40%',
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{totalActionsForChart}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Setores com Mais Ações Atrasadas">
          {sectorsDelayedData.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 py-8">Não há ações atrasadas.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectorsDelayedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="setor" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="count" fill="#ef4444" name="Ações Atrasadas" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card title="Filtros">
        {savedFilters.length > 0 && (
          <div className="mb-4 pb-4 border-b border-[var(--color-border)]">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Filtros guardados:</p>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map((saved) => (
                <button
                  key={saved.id}
                  type="button"
                  onClick={() => handleApplySavedFilter(saved.id)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-full border border-[var(--color-border)] bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Bookmark className="h-3 w-3" />
                  {saved.name}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSavedFilter(saved.id, e)}
                    className="ml-1 hover:text-rose-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid md:grid-cols-3 gap-4">
          <label className="text-sm font-medium flex flex-col gap-2">
            Origem
            <select
              value={filters.origem}
              onChange={(event) => setFilters((prev) => ({ ...prev, origem: event.target.value as typeof prev.origem }))}
              className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
            >
              {['Todos', 'Interna', 'Externa', 'Ocorrência'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium flex flex-col gap-2">
            Status
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value as typeof prev.status }))
              }
              className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
            >
              {['Todos', 'Executada', 'Executada+Atraso', 'Atrasada', 'Andamento'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium flex flex-col gap-2">
            Setor
            <select
              value={filters.setor}
              onChange={(event) => setFilters((prev) => ({ ...prev, setor: event.target.value }))}
              className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
            >
              {['Todos', ...setores].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card title="Plano de ações" className="mt-6">
        {isLoading ? (
          <TableSkeleton columns={9} rows={5} />
        ) : (
          <Table<ActionItem>
            data={filtered}
            columns={[
              { key: 'id', title: 'ID' },
              { key: 'origem', title: 'Origem' },
              { key: 'acaoRelacionada', title: 'Referência' },
              { key: 'setor', title: 'Setor' },
              { key: 'descricao', title: 'Descrição' },
              {
                key: 'status',
                title: 'Status',
                render: (row) => <Badge variant={statusVariants[row.status]}>{row.status}</Badge>,
              },
              {
                key: 'actions',
                title: 'Operações',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      onClick={() => handleEdit(row)}
                      disabled={!API_BASE}
                      title={!API_BASE ? 'Edição disponível apenas com backend configurado' : 'Editar'}
                    >
                      <Edit className="h-3 w-3" />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                      onClick={() => {
                        if (!API_BASE) {
                          showToast('Eliminação disponível apenas com backend configurado (VITE_API_BASE_URL).', 'warning');
                          return;
                        }
                        setDeleteConfirm({ open: true, id: row.id });
                      }}
                      disabled={deleteMutation.isPending}
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                      Eliminar
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title={editingId ? 'Editar ação' : 'Nova ação'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          reset();
          setEditingId(null);
          setRelatedAudit(null);
        }}
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {/* Campos da Auditoria Relacionada */}
          {relatedAudit && (
            <div className="border border-[var(--color-border)] rounded-xl p-4 space-y-4 mb-4 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Auditoria Relacionada</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="ID"
                  value={relatedAudit.id}
                  disabled
                  className="bg-slate-100 dark:bg-slate-700"
                />
                <Input
                  label="Ano"
                  type="number"
                  value={relatedAudit.ano}
                  disabled
                  className="bg-slate-100 dark:bg-slate-700"
                />
              </div>
              {'entidadeAuditora' in relatedAudit && (
                <Input
                  label="Entidade Auditora"
                  value={relatedAudit.entidadeAuditora}
                  disabled
                  className="bg-slate-100 dark:bg-slate-700"
                />
              )}
              <Input
                label="ISO"
                value={relatedAudit.iso || ''}
                disabled
                className="bg-slate-100 dark:bg-slate-700"
              />
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Data Início"
                  type="date"
                  value={relatedAudit.inicio ? (relatedAudit.inicio.includes('T') ? relatedAudit.inicio.split('T')[0] : relatedAudit.inicio) : ''}
                  disabled
                  className="bg-slate-100 dark:bg-slate-700"
                />
                <Input
                  label="Data Fim"
                  type="date"
                  value={relatedAudit.termino ? (relatedAudit.termino.includes('T') ? relatedAudit.termino.split('T')[0] : relatedAudit.termino) : ''}
                  disabled
                  className="bg-slate-100 dark:bg-slate-700"
                />
              </div>
            </div>
          )}

          {/* Campos da Ação */}
          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Origem"
              {...register('origem', {
                onChange: (e) => {
                  // Quando origem muda, limpar auditoria relacionada se necessário
                  const newOrigem = e.target.value as AcaoOrigem;
                  const currentAcaoRelacionada = watch('acaoRelacionada');
                  if (currentAcaoRelacionada) {
                    loadRelatedAudit(currentAcaoRelacionada, newOrigem);
                  }
                },
              })}
              error={errors.origem?.message}
            >
              {['Interna', 'Externa', 'Ocorrência'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Select
              label="Auditoria relacionada"
              {...register('acaoRelacionada', {
                onChange: (e) => {
                  loadRelatedAudit(e.target.value, origemWatch);
                },
              })}
              error={errors.acaoRelacionada?.message}
            >
              <option value="">Nenhuma</option>
              {getAvailableAudits(origemWatch).map((audit) => (
                <option key={audit.id} value={audit.id}>
                  {audit.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Conformidade"
              {...register('conformidade')}
              error={errors.conformidade?.message}
            >
              <option value="">Selecione...</option>
              <option value="Conformidade">Conformidade</option>
              <option value="Não conformidade">Não conformidade</option>
            </Select>
            <Input
              label="Número Associado"
              {...register('numeroAssociado')}
              error={errors.numeroAssociado?.message}
            />
          </div>

          <Input
            label="Âmbito"
            {...register('ambito')}
            error={errors.ambito?.message}
            placeholder="Ex: 9001, 14001, NP4469"
          />

          <Textarea
            label="Descrição"
            {...register('descricao')}
            error={errors.descricao?.message}
            rows={3}
            required
          />

          <Textarea
            label="Causa Raíz Identificada"
            {...register('causaRaizIdentificada')}
            error={errors.causaRaizIdentificada?.message}
            rows={3}
            placeholder="Análise de causa (metodologia 5 Porquês, Ishikawa) e causa raiz"
          />

          <Textarea
            label="Ação Corretiva"
            {...register('acaoCorretiva')}
            error={errors.acaoCorretiva?.message}
            rows={3}
            placeholder="Descrição detalhada da ação específica a implementar"
          />

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Local"
              {...register('local')}
              error={errors.local?.message}
              placeholder="Ex: SGI, D. Técnico e Qualidade, Operações, Manutenção"
            />
            <Input
              label="Responsável"
              {...register('responsavel')}
              error={errors.responsavel?.message}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Input
              label="Início"
              type="date"
              {...register('inicio')}
              error={errors.inicio?.message}
            />
            <Input
              label="Término"
              type="date"
              {...register('termino')}
              error={errors.termino?.message}
            />
            <Input
              label="Conclusão"
              type="date"
              {...register('conclusao')}
              error={errors.conclusao?.message}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Status"
              {...register('status')}
              error={errors.status?.message}
            >
              {['Andamento', 'Executada', 'Executada+Atraso', 'Atrasada'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Input
              label="Mês"
              {...register('mes')}
              error={errors.mes?.message}
              placeholder="Ex: Janeiro 2025"
            />
          </div>

          <Textarea
            label="Evidência"
            {...register('evidencia')}
            error={errors.evidencia?.message}
            rows={3}
            placeholder="Documentação/registo que comprova a implementação da ação"
          />

          <Textarea
            label="Avaliação de Eficácia"
            {...register('avaliacaoEficacia')}
            error={errors.avaliacaoEficacia?.message}
            rows={3}
            placeholder="Critérios para verificar se a ação resolveu efetivamente o problema"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                reset();
                setEditingId(null);
                setRelatedAudit(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting || updateActionMutation.isPending}
            >
              Atualizar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => {
          if (deleteConfirm.id) {
            deleteMutation.mutate(deleteConfirm.id);
          }
        }}
        title="Eliminar ação"
        message={`Tens a certeza que queres eliminar a ação ${deleteConfirm.id}? Esta ação não pode ser desfeita.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      <Modal
        title="Guardar filtros"
        open={saveFilterModal}
        onClose={() => {
          setSaveFilterModal(false);
          setFilterName('');
        }}
      >
        <div className="space-y-4">
          <Input
            label="Nome do filtro"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="Ex: Ações Atrasadas - Setor X"
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSaveFilterModal(false);
                setFilterName('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveFilter}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};


