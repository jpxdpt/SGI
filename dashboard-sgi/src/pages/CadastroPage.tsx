import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Trash2 } from 'lucide-react';
import { API_BASE, createSector, updateSector, deleteSector, fetchSectors } from '../services/api';
import type { Sector } from '../types/models';
import { sectorSchema } from '../utils/validation';
import type { z } from 'zod';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';

type FormData = z.infer<typeof sectorSchema>;

export const CadastroPage = () => {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['sectors'], queryFn: () => fetchSectors() });
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localData, setLocalData] = useState<Sector[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(sectorSchema),
    defaultValues: {
      nome: '',
      responsavel: '',
      email: '',
      telefone: '',
      descricao: '',
      ativo: true,
    },
  });

  const tableData = useMemo(() => [...data, ...localData], [data, localData]);

  const createMutation = useMutation({
    mutationFn: createSector,
    onSuccess: () => {
      reset();
      setEditingId(null);
      setLocalData([]);
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      showToast('Setor criado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao guardar setor.';
      showToast(message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Sector> }) => updateSector(id, payload),
    onSuccess: () => {
      reset();
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      showToast('Setor atualizado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar setor.';
      showToast(message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSector(id),
    onSuccess: () => {
      setDeleteConfirm({ open: false, id: null });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      showToast('Setor eliminado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao eliminar setor.';
      showToast(message, 'error');
    },
  });

  const handleEdit = (sector: Sector) => {
    setValue('nome', sector.nome);
    setValue('responsavel', sector.responsavel);
    setValue('email', sector.email);
    setValue('telefone', sector.telefone || '');
    setValue('descricao', sector.descricao || '');
    setValue('ativo', sector.ativo);
    setEditingId(sector.id);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    reset();
    setEditingId(null);
  };

  const onSubmit = async (data: FormData) => {
    if (!API_BASE) {
      setLocalData((prev) => [
        ...prev,
        {
          id: editingId || `SET-${Math.floor(Math.random() * 999)}`,
          ...data,
        },
      ]);
      reset();
      setEditingId(null);
      showToast('Sem API definida — os dados só estão disponíveis nesta sessão.', 'warning');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: data });
    } else {
      createMutation.mutate(data as Sector);
    }
  };

  return (
    <>
      <PageHeader title="Cadastro de setores" subtitle="Adiciona novos setores e responsáveis em segundos." />
      <Card title={editingId ? 'Editar setor' : 'Novo setor'}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Setor"
            {...register('nome')}
            error={errors.nome?.message}
            required
          />
          <Input
            label="Responsável"
            {...register('responsavel')}
            error={errors.responsavel?.message}
            required
          />
          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            required
          />
          <Input
            label="Telefone"
            {...register('telefone')}
            error={errors.telefone?.message}
          />
          <Textarea
            label="Descrição"
            {...register('descricao')}
            error={errors.descricao?.message}
            rows={3}
            className="md:col-span-2"
          />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              {...register('ativo')}
              className="rounded border-[var(--color-border)]"
            />
            Ativo
          </label>
          <div className="md:col-span-2 flex justify-end gap-3">
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'Atualizar setor' : 'Guardar setor'}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Setores registados" className="mt-6">
        <Table<Sector>
          data={tableData}
          columns={[
            { key: 'id', title: 'ID' },
            { key: 'nome', title: 'Setor' },
            { key: 'responsavel', title: 'Responsável' },
            { key: 'email', title: 'Email' },
            { key: 'telefone', title: 'Telefone' },
            { key: 'descricao', title: 'Descrição' },
            {
              key: 'ativo',
              title: 'Status',
              render: (row) => <Badge variant={row.ativo ? 'success' : 'danger'}>{row.ativo ? 'Ativo' : 'Inativo'}</Badge>,
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
      </Card>

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => {
          if (deleteConfirm.id) {
            deleteMutation.mutate(deleteConfirm.id);
          }
        }}
        title="Eliminar setor"
        message={`Tens a certeza que queres eliminar este setor? Esta ação não pode ser desfeita.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};



