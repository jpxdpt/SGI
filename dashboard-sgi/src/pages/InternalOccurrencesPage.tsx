import { useMemo, useState } from 'react';
import type { Occurrence } from '../types/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Edit, X, AlertTriangle } from 'lucide-react';
import { createOccurrence, updateOccurrence, deleteOccurrence, fetchOccurrences } from '../services/api';
import { occurrenceSchema } from '../utils/validation';
import type { z } from 'zod';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { Spinner } from '../components/ui/Spinner';
import { TableSkeleton } from '../components/ui/TableSkeleton';

type FormData = z.infer<typeof occurrenceSchema>;

const statusVariant = (status: Occurrence['status']) => {
  switch (status) {
    case 'Resolvida':
      return 'success';
    case 'Aberta':
      return 'danger';
    case 'Em mitigação':
      return 'info';
    default:
      return 'default';
  }
};

const gravidadeVariant = (gravidade: Occurrence['gravidade']) => {
  switch (gravidade) {
    case 'Crítica':
      return 'danger';
    case 'Alta':
      return 'warning';
    case 'Média':
      return 'info';
    case 'Baixa':
      return 'success';
    default:
      return 'default';
  }
};

const tipoOptions = [
  { value: 'Ambiental', label: 'Ambiental' },
  { value: 'Segurança dos Trabalhadores', label: 'Segurança dos Trabalhadores' },
  { value: 'Segurança Alimentar', label: 'Segurança Alimentar' },
  { value: 'Reclamação', label: 'Reclamação' },
  { value: 'Sugestão', label: 'Sugestão' },
];

export const InternalOccurrencesPage = () => {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery<Occurrence[]>({ queryKey: ['occurrences'], queryFn: () => fetchOccurrences() });
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(occurrenceSchema),
    defaultValues: {
      tipo: 'Ambiental',
      descricao: '',
      resolucao: '',
      acaoGerada: '',
      departamentosAtingidos: [],
      responsavel: '',
      data: new Date().toISOString().split('T')[0],
      gravidade: 'Média',
      status: 'Aberta',
      setor: '',
      departamentosTexto: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: createOccurrence,
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      showToast('Ocorrência interna criada com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Erro ao criar ocorrência';
      showToast(message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Occurrence> }) =>
      updateOccurrence(id, payload),
    onSuccess: () => {
      reset();
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      showToast('Ocorrência interna atualizada com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar ocorrência';
      showToast(message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOccurrence(id),
    onSuccess: () => {
      setDeleteConfirm({ open: false, id: null });
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      showToast('Ocorrência interna eliminada com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Erro ao eliminar ocorrência';
      showToast(message, 'error');
    },
  });

  const handleEdit = (occurrence: Occurrence) => {
    const departamentosTexto = occurrence.departamentosAtingidos && occurrence.departamentosAtingidos.length > 0
      ? occurrence.departamentosAtingidos.join(', ')
      : occurrence.setor || '';
    
    setValue('tipo', occurrence.tipo);
    setValue('descricao', occurrence.descricao);
    setValue('resolucao', occurrence.resolucao || '');
    setValue('acaoGerada', occurrence.acaoGerada || '');
    setValue('departamentosTexto', departamentosTexto);
    setValue('departamentosAtingidos', occurrence.departamentosAtingidos || []);
    setValue('responsavel', occurrence.responsavel);
    setValue('data', occurrence.data.split('T')[0]);
    setValue('gravidade', occurrence.gravidade);
    setValue('status', occurrence.status);
    setValue('setor', occurrence.setor);
    setEditingId(occurrence.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    reset();
    setEditingId(null);
  };

  const onSubmit = async (data: FormData & { departamentosTexto?: string }) => {
    if (!data.departamentosTexto || data.departamentosTexto.trim() === '') {
      showToast('Departamento(s) atingido(s) é obrigatório', 'error');
      return;
    }

    // Converter o texto em array (separado por vírgula, ponto e vírgula ou nova linha)
    const departamentos = data.departamentosTexto
      .split(/[,;\n]/)
      .map(d => d.trim())
      .filter(d => d.length > 0);

    const payload: Partial<Occurrence> = {
      tipo: data.tipo,
      descricao: data.descricao,
      resolucao: data.resolucao || undefined,
      acaoGerada: data.acaoGerada || undefined,
      departamentosAtingidos: departamentos,
      setor: departamentos[0] || '',
      responsavel: data.responsavel,
      data: new Date(data.data).toISOString(),
      gravidade: data.gravidade,
      status: data.status,
    };
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload as Occurrence);
    }
  };

  type TableRow = {
    id: string;
    tipo: string;
    descricao: string;
    resolucao: string;
    acaoGerada: string;
    departamentos: string;
    responsavel: string;
    data: string;
    gravidade: Occurrence['gravidade'];
    status: Occurrence['status'];
  };

  const tableData = useMemo<TableRow[]>(() => {
    return data.map((occurrence) => {
      // Obter texto dos departamentos
      const departamentosTexto = occurrence.departamentosAtingidos && occurrence.departamentosAtingidos.length > 0
        ? occurrence.departamentosAtingidos.join(', ')
        : occurrence.setor || '-';
      
      return {
        id: occurrence.id,
        tipo: occurrence.tipo,
        descricao: occurrence.descricao,
        resolucao: occurrence.resolucao || '-',
        acaoGerada: occurrence.acaoGerada || '-',
        departamentos: departamentosTexto,
        responsavel: occurrence.responsavel,
        data: new Date(occurrence.data).toLocaleDateString('pt-PT'),
        gravidade: occurrence.gravidade,
        status: occurrence.status,
      };
    });
  }, [data]);

  const columns = [
    { 
      key: 'tipo', 
      title: 'Tipo',
      render: (row: TableRow) => <span className="font-medium">{row.tipo}</span>
    },
    { 
      key: 'descricao', 
      title: 'Descrição',
      render: (row: TableRow) => <span className="max-w-xs truncate block" title={row.descricao}>{row.descricao}</span>
    },
    { key: 'departamentos', title: 'Departamentos' },
    { key: 'responsavel', title: 'Responsável' },
    { key: 'data', title: 'Data' },
    { 
      key: 'gravidade', 
      title: 'Gravidade',
      render: (row: TableRow) => <Badge variant={gravidadeVariant(row.gravidade)}>{row.gravidade}</Badge>
    },
    { 
      key: 'status', 
      title: 'Status',
      render: (row: TableRow) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
    },
    {
      key: 'actions',
      title: 'Ações',
      render: (row: TableRow) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(data.find((o) => o.id === row.id)!)}
            title="Editar ocorrência"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteConfirm({ open: true, id: row.id })}
            title="Eliminar ocorrência"
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
          >
            <Trash2 className="h-4 w-4" />
            <span className="ml-1">Eliminar</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Gestão de Ocorrências Internas"
        subtitle="Insira e monitorize ocorrências internas individualmente."
      />
      
      <Card title={editingId ? 'Editar Ocorrência' : 'Nova Ocorrência Interna'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Tipo de Ocorrência"
              {...register('tipo')}
              error={errors.tipo?.message}
              required
              options={tipoOptions}
            />

            <Input
              label="Data"
              type="date"
              {...register('data')}
              error={errors.data?.message}
              required
            />

            <Input
              label="Responsável"
              {...register('responsavel')}
              error={errors.responsavel?.message}
              required
            />

            <Select
              label="Gravidade"
              {...register('gravidade')}
              error={errors.gravidade?.message}
              required
              options={[
                { value: 'Baixa', label: 'Baixa' },
                { value: 'Média', label: 'Média' },
                { value: 'Alta', label: 'Alta' },
                { value: 'Crítica', label: 'Crítica' },
              ]}
            />

            <Select
              label="Status"
              {...register('status')}
              error={errors.status?.message}
              required
              options={[
                { value: 'Aberta', label: 'Aberta' },
                { value: 'Em mitigação', label: 'Em mitigação' },
                { value: 'Resolvida', label: 'Resolvida' },
              ]}
            />
          </div>

          <Textarea
            label="Departamento(s) Atingido(s)"
            {...register('departamentosTexto')}
            error={errors.departamentosTexto?.message || errors.departamentosAtingidos?.message}
            required
            rows={3}
            placeholder="Digite os departamentos atingidos separados por vírgula (ex: Produção, Qualidade, Logística)..."
          />

          <Textarea
            label="Descrição da Ocorrência"
            {...register('descricao')}
            error={errors.descricao?.message}
            required
            rows={4}
            placeholder="Descreva detalhadamente a ocorrência..."
          />

          <Textarea
            label="Resolução do Problema"
            {...register('resolucao')}
            error={errors.resolucao?.message}
            rows={4}
            placeholder="Descreva como o problema foi ou será resolvido..."
          />

          <Textarea
            label="Ação Corretiva Gerada"
            {...register('acaoGerada')}
            error={errors.acaoGerada?.message}
            rows={3}
            placeholder="Descreva a ação corretiva gerada a partir desta ocorrência..."
          />

          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? (
                <Spinner size="sm" />
              ) : editingId ? (
                'Atualizar Ocorrência'
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Criar Ocorrência
                </>
              )}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={handleCancel}>
                <X className="h-4 w-4" />
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card title="Ocorrências Registadas">
        {isLoading ? (
          <TableSkeleton columns={8} rows={5} />
        ) : tableData.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <p>Nenhuma ocorrência registada ainda.</p>
            <p className="text-sm mt-2">Comece por criar uma nova ocorrência acima.</p>
          </div>
        ) : (
          <Table
            data={tableData}
            columns={columns}
          />
        )}
      </Card>

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        title="Eliminar Ocorrência"
        message="Tem certeza de que deseja eliminar esta ocorrência? Esta ação não pode ser desfeita."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirm.id) {
            deleteMutation.mutate(deleteConfirm.id);
          }
        }}
      />
    </>
  );
};

