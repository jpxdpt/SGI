import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Edit, Download, Save, Bookmark, X } from 'lucide-react';
import { API_BASE, updateOccurrence, deleteOccurrence, fetchOccurrences } from '../services/api';
import type { Occurrence } from '../types/models';
import { occurrenceSchema } from '../utils/validation';
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

type FormData = z.infer<typeof occurrenceSchema>;

export const OccurrencesPage = () => {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery<Occurrence[]>({ queryKey: ['occurrences'], queryFn: () => fetchOccurrences() });
  const { showToast } = useToast();
  const [filters, setFilters] = useState({ gravidade: 'Todos', status: 'Todos' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [saveFilterModal, setSaveFilterModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const { savedFilters, saveFilter, deleteFilter, applyFilter } = useSavedFilters<typeof filters>('occurrences');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(occurrenceSchema),
    defaultValues: {
      setor: '',
      responsavel: '',
      data: new Date().toISOString().split('T')[0],
      descricao: '',
      gravidade: 'Média',
      acaoGerada: undefined,
      status: 'Aberta',
    },
  });

  const filtered = data.filter((occ) => {
    const byGravidade = filters.gravidade === 'Todos' || occ.gravidade === filters.gravidade;
    const byStatus = filters.status === 'Todos' || occ.status === filters.status;
    return byGravidade && byStatus;
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOccurrence(id),
    onSuccess: () => {
      setDeleteConfirm({ open: false, id: null });
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      showToast('Ocorrência eliminada com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao eliminar ocorrência.';
      showToast(message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Occurrence> }) =>
      updateOccurrence(id, payload),
    onSuccess: () => {
      setModalOpen(false);
      reset();
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      showToast('Ocorrência atualizada com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar ocorrência.';
      showToast(message, 'error');
    },
  });

  const handleEdit = (occurrence: Occurrence) => {
    setValue('setor', occurrence.setor);
    setValue('responsavel', occurrence.responsavel);
    setValue('data', occurrence.data.includes('T') ? occurrence.data.split('T')[0] : occurrence.data);
    setValue('descricao', occurrence.descricao);
    setValue('gravidade', occurrence.gravidade);
    setValue('acaoGerada', occurrence.acaoGerada || undefined);
    setValue('status', occurrence.status);
    setEditingId(occurrence.id);
    setModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    if (!API_BASE) {
      showToast('Define VITE_API_BASE_URL para guardar no backend.', 'warning');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: data });
    }
  };

  const exportCsv = () => {
    if (filtered.length === 0) {
      showToast('Não existem ocorrências para exportar.', 'warning');
      return;
    }

    try {
      const csvData = filtered.map((occurrence) => ({
        ID: occurrence.id,
        Setor: occurrence.setor,
        Responsável: occurrence.responsavel,
        Data: occurrence.data ? new Date(occurrence.data).toLocaleDateString('pt-PT') : '',
        Descrição: occurrence.descricao,
        Gravidade: occurrence.gravidade,
        'Ação Gerada': occurrence.acaoGerada || '',
        Status: occurrence.status,
      }));

      exportToCsv(csvData, 'relatorio-ocorrencias-internas', {
        ID: 'ID',
        Setor: 'Setor',
        Responsável: 'Responsável',
        Data: 'Data',
        Descrição: 'Descrição',
        Gravidade: 'Gravidade',
        'Ação Gerada': 'Ação Gerada',
        Status: 'Status',
      } as never);

      showToast('Ficheiro CSV exportado com sucesso!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao exportar CSV.', 'error');
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

  return (
    <>
      <PageHeader
        title="Ocorrências internas"
        subtitle="Monitoriza tendências e severidade dos incidentes."
        actions={
          <Button onClick={exportCsv} variant="secondary" size="md">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        }
      />
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
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: 'Gravidade', key: 'gravidade', options: ['Todos', 'Baixa', 'Média', 'Alta', 'Crítica'] },
            { label: 'Status', key: 'status', options: ['Todos', 'Aberta', 'Em mitigação', 'Resolvida'] },
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

      <Card title="Registos de ocorrências" className="mt-6">
        {isLoading ? (
          <TableSkeleton columns={9} rows={5} />
        ) : (
          <Table<Occurrence>
            data={filtered}
            columns={[
              { key: 'id', title: 'ID' },
              { key: 'setor', title: 'Setor' },
              { key: 'responsavel', title: 'Responsável' },
              { key: 'data', title: 'Data' },
              { key: 'descricao', title: 'Descrição' },
              {
                key: 'gravidade',
                title: 'Gravidade',
                render: (row) => <Badge variant="danger">{row.gravidade}</Badge>,
              },
              { key: 'acaoGerada', title: 'Ação gerada' },
              {
                key: 'status',
                title: 'Status',
                render: (row) => <Badge variant="info">{row.status}</Badge>,
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
        title={editingId ? 'Editar ocorrência' : 'Nova ocorrência'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          reset();
          setEditingId(null);
        }}
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Textarea
            label="Descrição"
            {...register('descricao')}
            error={errors.descricao?.message}
            rows={3}
            required
          />
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Setor"
              {...register('setor')}
              error={errors.setor?.message}
              required
            />
            <Input
              label="Responsável"
              {...register('responsavel')}
              error={errors.responsavel?.message}
              required
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Data"
              type="date"
              {...register('data')}
              error={errors.data?.message}
              required
            />
            <Select
              label="Gravidade"
              {...register('gravidade')}
              error={errors.gravidade?.message}
            >
              {['Baixa', 'Média', 'Alta', 'Crítica'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Status"
              {...register('status')}
              error={errors.status?.message}
            >
              {['Aberta', 'Em mitigação', 'Resolvida'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Input
              label="Ação gerada"
              {...register('acaoGerada')}
              error={errors.acaoGerada?.message}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                reset();
                setEditingId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting || updateMutation.isPending}
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
        title="Eliminar ocorrência"
        message={`Tens a certeza que queres eliminar a ocorrência ${deleteConfirm.id}? Esta ação não pode ser desfeita.`}
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
            placeholder="Ex: Ocorrências Críticas - 2025"
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


