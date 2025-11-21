import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Edit, X, Check, ArrowRight, Workflow as WorkflowIcon } from 'lucide-react';
import {
  API_BASE,
  fetchWorkflowDefinitions,
  createWorkflowDefinition,
  updateWorkflowDefinition,
  deleteWorkflowDefinition,
  type WorkflowDefinition,
  type WorkflowStep,
} from '../services/api';
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
import { z } from 'zod';
import clsx from 'clsx';

const entityTypes = ['InternalAudit', 'ExternalAudit', 'ActionItem', 'Occurrence', 'Document'] as const;
const stepTypes = ['APPROVAL', 'NOTIFICATION', 'CONDITION'] as const;
const roles = ['ADMIN', 'GESTOR', 'AUDITOR'] as const;

const workflowStepSchema = z.object({
  stepOrder: z.number().int().positive(),
  stepType: z.enum(stepTypes),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  requiredRoles: z.array(z.enum(roles)).optional().default([]),
  requiredUsers: z.array(z.string()).optional().default([]),
  conditionExpression: z.any().optional(),
  notificationTemplate: z.string().optional(),
  autoAdvance: z.boolean().optional().default(false),
  timeoutDays: z.number().int().positive().optional(),
});

const workflowDefinitionSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  entityType: z.enum(entityTypes),
  isActive: z.boolean().optional().default(true),
  steps: z.array(workflowStepSchema).optional().default([]),
});

type WorkflowFormData = z.infer<typeof workflowDefinitionSchema>;

export const WorkflowsPage = () => {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['workflows', 'definitions'],
    queryFn: () => fetchWorkflowDefinitions(),
  });
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [entityFilter, setEntityFilter] = useState<string>('Todos');
  const [activeFilter, setActiveFilter] = useState<string>('Todos');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowDefinitionSchema),
    defaultValues: {
      name: '',
      description: '',
      entityType: 'InternalAudit',
      isActive: true,
      steps: [],
    },
  });

  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    control,
    name: 'steps',
  });

  // Watch para valores de steps (para renderizar condicionalmente)
  const watchedSteps = useWatch({
    control,
    name: 'steps',
    defaultValue: [],
  });

  const createMutation = useMutation({
    mutationFn: createWorkflowDefinition,
    onSuccess: () => {
      setModalOpen(false);
      reset();
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      showToast('Workflow criado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao guardar workflow.';
      showToast(message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WorkflowFormData }) =>
      updateWorkflowDefinition(id, payload),
    onSuccess: () => {
      setModalOpen(false);
      reset();
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      showToast('Workflow atualizado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar workflow.';
      showToast(message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkflowDefinition,
    onSuccess: () => {
      setDeleteConfirm({ open: false, id: null });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      showToast('Workflow eliminado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao eliminar workflow.';
      showToast(message, 'error');
    },
  });

  const handleEdit = (workflow: WorkflowDefinition) => {
    setValue('name', workflow.name);
    setValue('description', workflow.description || '');
    setValue('entityType', workflow.entityType as typeof entityTypes[number]);
    setValue('isActive', workflow.isActive);
    setValue('steps', workflow.steps.map((step) => ({ ...step, id: undefined })));
    setEditingId(workflow.id);
    setModalOpen(true);
  };

  const handleNew = () => {
    reset({
      name: '',
      description: '',
      entityType: 'InternalAudit',
      isActive: true,
      steps: [],
    });
    setEditingId(null);
    setModalOpen(true);
  };

  const onSubmit = async (formData: WorkflowFormData) => {
    if (!API_BASE) {
      showToast('Backend não configurado. Apenas simulação.', 'warning');
      return;
    }
    try {
      // Ordenar passos por stepOrder antes de enviar
      const sortedSteps = formData.steps
        .map((step, index) => ({ ...step, stepOrder: index + 1 }))
        .sort((a, b) => a.stepOrder - b.stepOrder);

      const payload = {
        ...formData,
        steps: sortedSteps,
      };

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch (error) {
      // Erro já tratado pelo onError da mutation
    }
  };

  const filtered = data.filter((workflow) => {
    const matchesEntity = entityFilter === 'Todos' || workflow.entityType === entityFilter;
    const matchesActive =
      activeFilter === 'Todos' ||
      (activeFilter === 'Ativos' && workflow.isActive) ||
      (activeFilter === 'Inativos' && !workflow.isActive);
    return matchesEntity && matchesActive;
  });

  const addStep = () => {
    const nextOrder = stepFields.length + 1;
    appendStep({
      stepOrder: nextOrder,
      stepType: 'APPROVAL',
      name: `Passo ${nextOrder}`,
      description: '',
      requiredRoles: [],
      requiredUsers: [],
      autoAdvance: false,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Configuração de workflows de aprovação para entidades"
        icon={<WorkflowIcon className="h-6 w-6" />}
        actions={
          <>
            <Button onClick={handleNew} icon={<Plus className="h-4 w-4" />} disabled={!API_BASE}>
              Novo Workflow
            </Button>
          </>
        }
      />

      {/* Filtros */}
      <Card>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <X className="h-4 w-4" />
            Filtros
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Tipo de Entidade
              </label>
              <Select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-full"
              >
                <option value="Todos">Todos os tipos</option>
                {entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <Select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="w-full"
              >
                <option value="Todos">Todos</option>
                <option value="Ativos">Ativos</option>
                <option value="Inativos">Inativos</option>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabela de Workflows */}
      {isLoading ? (
        <TableSkeleton columns={5} rows={10} />
      ) : filtered.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-slate-600 dark:text-slate-300">
            <WorkflowIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Nenhum workflow encontrado.</p>
          </div>
        </Card>
      ) : (
        <Table
          data={filtered}
          columns={[
            {
              key: 'name',
              title: 'Nome',
              render: (row) => (
                <div>
                  <div className="font-semibold text-[var(--color-foreground)]">{row.name}</div>
                  {row.description && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {row.description}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'entityType',
              title: 'Tipo de Entidade',
              render: (row) => (
                <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">{row.entityType}</span>
              ),
            },
            {
              key: 'steps',
              title: 'Passos',
              render: (row) => (
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {row.steps.length} passo{row.steps.length !== 1 ? 's' : ''}
                </span>
              ),
            },
            {
              key: 'isActive',
              title: 'Status',
              render: (row) => (
                <Badge variant={row.isActive ? 'success' : 'default'}>
                  {row.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              ),
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
                    aria-label={`Editar workflow ${row.name}`}
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
                    aria-label={`Eliminar workflow ${row.name}`}
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

      {/* Modal de Criação/Edição */}
      <Modal
        title={editingId ? 'Editar workflow' : 'Novo workflow'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          reset();
          setEditingId(null);
        }}
        size="large"
      >
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Nome"
              {...register('name')}
              error={errors.name?.message}
              required
            />
            <Select
              label="Tipo de Entidade"
              {...register('entityType')}
              error={errors.entityType?.message}
              required
            >
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>

          <Textarea
            label="Descrição"
            {...register('description')}
            error={errors.description?.message}
            rows={2}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              {...register('isActive')}
              className="rounded border-[var(--color-border)]"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-[var(--color-foreground)]">
              Workflow ativo
            </label>
          </div>

          {/* Passos do Workflow */}
          <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[var(--color-foreground)]">Passos do Workflow</h4>
              <Button type="button" variant="secondary" size="sm" onClick={addStep} icon={<Plus className="h-4 w-4" />}>
                Adicionar Passo
              </Button>
            </div>

            {stepFields.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-600 dark:text-slate-300">
                Nenhum passo configurado. Adiciona o primeiro passo para começar.
              </div>
            ) : (
              <div className="space-y-4">
                {stepFields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">Passo {index + 1}</Badge>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600"
                        aria-label={`Remover passo ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        label="Nome do Passo"
                        {...register(`steps.${index}.name`)}
                        error={errors.steps?.[index]?.name?.message}
                        required
                      />
                      <Select
                        label="Tipo de Passo"
                        {...register(`steps.${index}.stepType`)}
                        error={errors.steps?.[index]?.stepType?.message}
                        required
                      >
                        <option value="APPROVAL">Aprovação</option>
                        <option value="NOTIFICATION">Notificação</option>
                        <option value="CONDITION">Condição</option>
                      </Select>
                    </div>

                    <Textarea
                      label="Descrição"
                      {...register(`steps.${index}.description`)}
                      error={errors.steps?.[index]?.description?.message}
                      rows={2}
                      className="mt-4"
                    />

                    {watchedSteps[index]?.stepType === 'APPROVAL' && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Roles Requeridas
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {roles.map((role) => {
                              const currentRoles = watchedSteps[index]?.requiredRoles || [];
                              const isSelected = currentRoles.includes(role);
                              return (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => {
                                    const current = watchedSteps[index]?.requiredRoles || [];
                                    const newRoles = isSelected
                                      ? current.filter((r: string) => r !== role)
                                      : [...current, role];
                                    setValue(`steps.${index}.requiredRoles`, newRoles);
                                  }}
                                  className={clsx(
                                    'px-3 py-1 rounded-full text-xs border transition-colors',
                                    isSelected
                                      ? 'bg-brand-500 text-white border-brand-500'
                                      : 'border-[var(--color-border)] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                                  )}
                                >
                                  {role}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`autoAdvance-${index}`}
                            {...register(`steps.${index}.autoAdvance`)}
                            className="rounded border-[var(--color-border)]"
                          />
                          <label
                            htmlFor={`autoAdvance-${index}`}
                            className="text-sm text-slate-600 dark:text-slate-300"
                          >
                            Avançar automaticamente
                          </label>
                        </div>
                      </div>
                    )}

                    {watchedSteps[index]?.stepType === 'NOTIFICATION' && (
                      <div className="mt-4">
                        <Input
                          label="Template de Notificação"
                          {...register(`steps.${index}.notificationTemplate`)}
                          error={errors.steps?.[index]?.notificationTemplate?.message}
                          placeholder="Template de email ou SMS"
                        />
                      </div>
                    )}

                    <div className="mt-4">
                      <Input
                        label="Timeout (dias)"
                        type="number"
                        {...register(`steps.${index}.timeoutDays`, { valueAsNumber: true })}
                        error={errors.steps?.[index]?.timeoutDays?.message}
                        min={1}
                        placeholder="Opcional"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
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
            <Button type="submit" variant="primary" isLoading={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Atualizar' : 'Guardar'}
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
        title="Eliminar workflow"
        message="Tens a certeza que queres eliminar este workflow? Esta ação não pode ser desfeita."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};


