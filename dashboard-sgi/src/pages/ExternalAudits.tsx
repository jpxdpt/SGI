import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, FileText, Download, Save, Bookmark, Trash2, Edit, X, Eye } from 'lucide-react';
import { API_BASE, createExternalAudit, updateExternalAudit, deleteExternalAudit, fetchExternalAudits, fetchActionItems, createActionItem, updateActionItem, deleteActionItem } from '../services/api';
import { ActionsForm } from '../components/ActionsForm';
import type { ActionItem } from '../types/models';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExternalAudit } from '../types/models';
import { externalAuditSchema } from '../utils/validation';
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
import { EntityDetailsModal } from '../components/EntityDetailsModal';


type FormData = z.infer<typeof externalAuditSchema>;

export const ExternalAuditsPage = () => {
  const mockAudits: ExternalAudit[] = [
    {
      id: 'EXT-2025-001',
      ano: 2025,
      entidadeAuditora: 'CertificaMais',
      iso: 'ISO 9001',
      inicio: '2025-04-15',
      termino: '2025-04-18',
      setor: 'Operações',
      responsavel: 'Ana Gomes',
      descricao: 'Revisão de certificação ISO 9001.',
      status: 'AGENDADA',
    },
    {
      id: 'EXT-2025-002',
      ano: 2025,
      entidadeAuditora: 'Bureau Veritas',
      iso: 'ISO 45001',
      inicio: '2025-05-05',
      termino: '2025-05-07',
      setor: 'Segurança',
      responsavel: 'Carlos Técnico',
      descricao: 'Auditoria de segurança ocupacional.',
      status: 'CONCLUÍDA',
    },
  ];

  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery<ExternalAudit[]>({
    queryKey: ['audits', 'external'],
    queryFn: async () => {
      const result = await fetchExternalAudits();
      console.log('[ExternalAuditsPage] fetched', result);
      return result;
    },
  });
  const { data: allActions = [] } = useQuery<ActionItem[]>({ queryKey: ['actions'], queryFn: () => fetchActionItems() });
  const { showToast } = useToast();
  const [filters, setFilters] = useState({ ano: 'Todos' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [saveFilterModal, setSaveFilterModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [hiddenAuditIds, setHiddenAuditIds] = useState<Set<string>>(new Set());
  const { savedFilters, saveFilter, deleteFilter, applyFilter } = useSavedFilters<typeof filters>('externalAudits');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(externalAuditSchema),
    defaultValues: {
      id: `EXT-${Date.now().toString().slice(-6)}`,
      ano: new Date().getFullYear(),
      entidadeAuditora: '',
      iso: '',
      inicio: '',
      termino: '',
      actions: [],
    },
  });

  const [actions, setActions] = useState<Partial<ActionItem>[]>([]);
  const auditId = watch('id');

  const createMutation = useMutation({
    mutationFn: async (data: FormData & { actions?: Partial<ActionItem>[] }) => {
      const audit = await createExternalAudit(data);
      // Criar ações associadas
      if (data.actions && data.actions.length > 0) {
        await Promise.all(
          data.actions.map((action) =>
            createActionItem({
              ...action,
              origem: 'Externa',
              acaoRelacionada: audit.id,
            } as Partial<ActionItem>)
          )
        );
      }
      return audit;
    },
    onSuccess: () => {
      setModalOpen(false);
      reset();
      setActions([]);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['audits', 'external'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      showToast('Auditoria externa criada com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao guardar auditoria.';
      showToast(message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload, actions }: { id: string; payload: Partial<ExternalAudit>; actions?: Partial<ActionItem>[] }) => {
      // Atualizar a auditoria
      const updatedAudit = await updateExternalAudit(id, payload);
      
      // Sincronizar ações relacionadas
      if (actions !== undefined) {
        // Obter ações existentes relacionadas a esta auditoria
        const allActions = await fetchActionItems();
        const existingActions = allActions.filter(
          (action) => action.acaoRelacionada === id && action.origem === 'Externa'
        );
        
        // Identificar ações a eliminar (existem no backend mas não nas novas)
        const newActionIds = new Set(actions.filter(a => a.id).map(a => a.id!));
        const toDelete = existingActions.filter(a => !newActionIds.has(a.id));
        
        // Eliminar ações removidas
        await Promise.all(toDelete.map(action => deleteActionItem(action.id)));
        
        // Processar ações para criar ou atualizar
        await Promise.all(
          actions.map(async (action) => {
            if (action.id) {
              // Atualizar ação existente
              await updateActionItem(action.id, {
                ...action,
                origem: 'Externa',
                acaoRelacionada: id,
              });
            } else {
              // Criar nova ação
              await createActionItem({
                ...action,
                origem: 'Externa',
                acaoRelacionada: id,
              });
            }
          })
        );
      }
      
      return updatedAudit;
    },
    onSuccess: () => {
      setModalOpen(false);
      reset();
      setActions([]);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['audits', 'external'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      showToast('Auditoria externa atualizada com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar auditoria.';
      showToast(message, 'error');
    },
  });

  const updateCacheAfterDelete = async (deletedId: string) => {
    // Primeiro, invalidar a query para garantir que será refeita
    await queryClient.invalidateQueries({ queryKey: ['audits', 'external'] });
    
    // Atualizar cache imediatamente removendo o item eliminado
    queryClient.setQueryData<ExternalAudit[]>(['audits', 'external'], (oldData) => {
      if (!oldData || oldData.length === 0) return [];
      const filtered = oldData.filter((audit) => audit.id !== deletedId);
      // Garantir que retornamos um novo array (referência diferente)
      return [...filtered];
    });
    
    // Invalidar outras queries relacionadas
    queryClient.invalidateQueries({ queryKey: ['actions'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    
    // Forçar refetch imediato de forma síncrona
    try {
      await queryClient.refetchQueries({ 
        queryKey: ['audits', 'external'],
        type: 'active'
      });
    } catch {
      // Ignorar erros no refetch
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExternalAudit(id),
    onSuccess: async (_, deletedId) => {
      setDeleteConfirm({ open: false, id: null });
      await updateCacheAfterDelete(deletedId);
      setHiddenAuditIds((prev) => {
        const next = new Set(prev);
        next.add(deletedId);
        return next;
      });
      showToast('Auditoria externa eliminada com sucesso!', 'success');
    },
    onError: async (error: unknown, deletedId: string) => {
      // Se o erro é 404 (registro não encontrado), significa que já foi eliminado
      // Tratar como sucesso e atualizar o cache
      const errorMessage = error instanceof Error ? error.message : '';
      const isNotFound = errorMessage.includes('não encontrado') || 
                         errorMessage.includes('not found') || 
                         errorMessage.includes('404');
      
      if (isNotFound) {
        setDeleteConfirm({ open: false, id: null });
        await updateCacheAfterDelete(deletedId);
        setHiddenAuditIds((prev) => {
          const next = new Set(prev);
          next.add(deletedId);
          return next;
        });
        showToast('Auditoria externa eliminada com sucesso!', 'success');
      } else {
        const message = error instanceof Error ? error.message : 'Falha ao eliminar auditoria.';
        showToast(message, 'error');
      }
    },
  });

  const handleEdit = async (audit: ExternalAudit) => {
    setValue('id', audit.id);
    setValue('ano', audit.ano);
    setValue('entidadeAuditora', audit.entidadeAuditora);
    setValue('iso', audit.iso || '');
    setValue('inicio', audit.inicio || '');
    setValue('termino', audit.termino || '');
    
    // Carregar ações relacionadas
    if (API_BASE) {
      try {
        const allActions = await fetchActionItems();
        const relatedActions = allActions.filter(
          (action) => action.acaoRelacionada === audit.id && action.origem === 'Externa'
        );
        setActions(relatedActions);
      } catch (error) {
        console.error('Erro ao carregar ações:', error);
        setActions([]);
      }
    }
    
    setEditingId(audit.id);
    setModalOpen(true);
  };

  const handleNew = () => {
    reset({
      id: `EXT-${Date.now().toString().slice(-6)}`,
      ano: new Date().getFullYear(),
      entidadeAuditora: '',
      iso: '',
      inicio: '',
      termino: '',
      actions: [],
    });
    setActions([]);
    setEditingId(null);
    setModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    if (!API_BASE) {
      showToast('Define VITE_API_BASE_URL para gravar os dados no backend.', 'warning');
      return;
    }
    if (editingId) {
      const { id, actions, ...payload } = data;
      updateMutation.mutate({ id: editingId, payload, actions });
    } else {
      createMutation.mutate({ ...data, actions });
    }
  };

  const displayAudits = data.length ? data : mockAudits;

  const anos = useMemo(() => Array.from(new Set(displayAudits.map((audit) => audit.ano.toString()))), [displayAudits]);

  // Função auxiliar para contar ações relacionadas a uma auditoria
  const getActionsCountForAudit = (auditId: string) => {
    return allActions.filter((action) => action.acaoRelacionada === auditId && action.origem === 'Externa').length;
  };

  const filtered = displayAudits
    .filter((audit) => {
      const byAno = filters.ano === 'Todos' || audit.ano.toString() === filters.ano;
      return byAno;
    })
    .filter((audit) => !hiddenAuditIds.has(audit.id));

  const exportCsv = () => {
    if (filtered.length === 0) {
      showToast('Não existem auditorias externas para exportar.', 'warning');
      return;
    }

    try {
      const csvData = filtered.map((audit) => ({
        ID: audit.id,
        Ano: audit.ano,
        'Entidade Auditora': audit.entidadeAuditora,
        ISO: audit.iso || '',
        Início: audit.inicio ? new Date(audit.inicio).toLocaleDateString('pt-PT') : '',
        Término: audit.termino ? new Date(audit.termino).toLocaleDateString('pt-PT') : '',
        'Número de Ações': getActionsCountForAudit(audit.id),
      }));

      exportToCsv(csvData, 'relatorio-auditorias-externas');

      showToast('Ficheiro CSV exportado com sucesso!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao exportar CSV.', 'error');
    }
  };

  const exportPdf = () => {
    if (filtered.length === 0) {
      showToast('Não existem auditorias externas para exportar.', 'warning');
      return;
    }

    const doc = new jsPDF('landscape', 'pt', 'a4');

    doc.setFontSize(16);
    doc.text('Relatório de Auditorias Externas', 40, 40);
    doc.setFontSize(10);
    doc.text(`Data de emissão: ${new Date().toLocaleString()}`, 40, 55);

    const headers = [['ID', 'Ano', 'Entidade Auditora', 'ISO', 'Início', 'Término', 'Ações']];

    const rows = filtered.map((audit) => [
      String(audit.id).slice(0, 12),
      String(audit.ano),
      audit.entidadeAuditora ?? '',
      audit.iso ?? '',
      audit.inicio ? new Date(audit.inicio).toLocaleDateString('pt-PT') : '',
      audit.termino ? new Date(audit.termino).toLocaleDateString('pt-PT') : '',
      String(getActionsCountForAudit(audit.id)),
    ]);

    autoTable(doc, {
      startY: 65,
      head: headers,
      body: rows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 80 },
        3: { cellWidth: 60 },
        4: { cellWidth: 80 },
        5: { cellWidth: 60 },
        6: { cellWidth: 40 },
        7: { cellWidth: 30 },
      },
    });

    doc.save('relatorio-auditorias-externas.pdf');
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

  return (
    <>
      <PageHeader
        title="Auditorias Externas"
        subtitle="Acompanhamento das entidades certificadoras e suas conclusões."
        actions={
          <>
            <Button onClick={handleNew} variant="primary" size="md">
              <Plus className="h-4 w-4" /> Nova Auditoria
            </Button>
            <Button onClick={exportPdf} variant="secondary" size="md">
              <FileText className="h-4 w-4" /> PDF
            </Button>
            <Button onClick={exportCsv} variant="secondary" size="md">
              <Download className="h-4 w-4" /> CSV
            </Button>
          </>
        }
      />
      <Card title="Filtros" className="mt-6">
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
                      aria-label={`Eliminar filtro ${saved.name}`}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Eliminar filtro</span>
                    </button>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: 'Ano', key: 'ano', options: ['Todos', ...anos] },
          ].map((filter) => (
            <label key={filter.key} className="text-sm font-medium flex flex-col gap-2">
              {filter.label}
              <select
                value={filters[filter.key as keyof typeof filters]}
                onChange={(event) => setFilters((prev) => ({ ...prev, [filter.key]: event.target.value }))}
                className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
              >
                {filter.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSaveFilterModal(true)}
            >
              <Save className="h-3 w-3" /> Guardar filtros
            </Button>
          </div>
        </Card>

      <Card title="Lista de auditorias" className="mt-6">
        {isLoading ? (
          <TableSkeleton columns={10} rows={5} />
        ) : (
          <Table
            data={filtered}
            columns={[
              { key: 'id', title: 'ID' },
              { key: 'ano', title: 'Ano' },
              { key: 'entidadeAuditora', title: 'Entidade auditora' },
              { key: 'iso', title: 'ISO' },
              { 
                key: 'inicio', 
                title: 'Início',
                render: (row: ExternalAudit) => row.inicio ? new Date(row.inicio).toLocaleDateString('pt-PT') : '-',
              },
              { 
                key: 'termino', 
                title: 'Término',
                render: (row: ExternalAudit) => row.termino ? new Date(row.termino).toLocaleDateString('pt-PT') : '-',
              },
              {
                key: 'acoes',
                title: 'Ações',
                render: (row: ExternalAudit) => {
                  const count = getActionsCountForAudit(row.id);
                  return count > 0 ? (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{count} ação{count !== 1 ? 'ões' : ''}</span>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  );
                },
              },
              {
                key: 'actions',
                title: 'Operações',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                      onClick={() => {
                        setSelectedAuditId(row.id);
                        setDetailsModalOpen(true);
                      }}
                      title="Ver detalhes"
                      aria-label={`Ver detalhes da auditoria externa ${row.id}`}
                    >
                      <Eye className="h-3 w-3" />
                      Detalhes
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      onClick={() => handleEdit(row)}
                      disabled={!API_BASE}
                      title={!API_BASE ? 'Edição disponível apenas com backend configurado' : 'Editar'}
                      aria-label={`Editar auditoria externa ${row.id}`}
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
                      aria-label={`Eliminar auditoria externa ${row.id}`}
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
        title={editingId ? 'Editar auditoria externa' : 'Nova auditoria externa'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          reset();
          setActions([]);
          setEditingId(null);
        }}
      >
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="ID"
              {...register('id')}
              error={errors.id?.message}
              required
              disabled
            />
            <Input
              label="Ano"
              type="number"
              {...register('ano', { valueAsNumber: true })}
              error={errors.ano?.message}
              required
            />
          </div>

          <Input
            label="Entidade auditora"
            {...register('entidadeAuditora')}
            error={errors.entidadeAuditora?.message}
            required
          />

          <Input
            label="ISO"
            {...register('iso')}
            error={errors.iso?.message}
            placeholder="Ex: ISO 9001, ISO 14001, NP 4469"
          />

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Data Início"
              type="date"
              {...register('inicio')}
              error={errors.inicio?.message}
            />
            <Input
              label="Data Fim"
              type="date"
              {...register('termino')}
              error={errors.termino?.message}
            />
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <ActionsForm
              actions={actions}
              onChange={setActions}
              origem="Externa"
              auditId={auditId}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                reset();
                setActions([]);
                setEditingId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'Atualizar' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      {selectedAuditId && (
        <EntityDetailsModal
          open={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedAuditId(null);
          }}
          title="Detalhes da Auditoria Externa"
          entityType="ExternalAudit"
          entityId={selectedAuditId}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => {
          if (deleteConfirm.id) {
            deleteMutation.mutate(deleteConfirm.id);
          }
        }}
        title="Eliminar auditoria externa"
        message={`Tens a certeza que queres eliminar a auditoria externa ${deleteConfirm.id}? Esta ação não pode ser desfeita.`}
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
            placeholder="Ex: Auditorias 2025 - ISO 9001"
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

