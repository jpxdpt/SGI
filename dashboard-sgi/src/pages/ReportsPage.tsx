import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Trash2,
  Edit,
  X,
  FileText,
  Download,
  Calendar,
  Play,
  Pause,
  Settings,
  Layout,
  BarChart3,
  PieChart,
  TrendingUp,
  Table,
  Type,
} from 'lucide-react';
import {
  API_BASE,
  fetchReportTemplates,
  fetchScheduledReports,
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  generateReport,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  type ReportTemplate,
  type ScheduledReport,
  type ReportComponent,
  type ReportType,
  type ReportComponentType,
} from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table as UITable } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { Spinner } from '../components/ui/Spinner';
import { ScheduledReportModal } from '../components/ScheduledReportModal';
import { z } from 'zod';
import clsx from 'clsx';

const reportTypes: ReportType[] = ['AUDIT_INTERNAL', 'AUDIT_EXTERNAL', 'ACTIONS', 'OCCURRENCES', 'CONSOLIDATED', 'CUSTOM'];
const reportStatuses: ReportStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];
const reportFrequencies: ReportFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ON_DEMAND'];
const componentTypes: ReportComponentType[] = ['KPI', 'TABLE', 'CHART_BAR', 'CHART_LINE', 'CHART_PIE', 'CHART_AREA', 'TEXT'];
const exportFormats = ['PDF', 'CSV'] as const;
const exportFormatLabels: Record<'PDF' | 'CSV', string> = {
  PDF: 'PDF',
  CSV: 'CSV (Excel)',
};

type ReportStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ON_DEMAND';

const reportTypeLabels: Record<ReportType, string> = {
  AUDIT_INTERNAL: 'Auditorias Internas',
  AUDIT_EXTERNAL: 'Auditorias Externas',
  ACTIONS: 'Ações',
  OCCURRENCES: 'Ocorrências',
  CONSOLIDATED: 'Consolidado',
  CUSTOM: 'Personalizado',
};

const reportStatusLabels: Record<ReportStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  ARCHIVED: 'Arquivado',
};

const reportFrequencyLabels: Record<ReportFrequency, string> = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
  ON_DEMAND: 'Sob Demanda',
};

const componentTypeLabels: Record<ReportComponentType, string> = {
  KPI: 'KPI',
  TABLE: 'Tabela',
  CHART_BAR: 'Gráfico de Barras',
  CHART_LINE: 'Gráfico de Linhas',
  CHART_PIE: 'Gráfico de Pizza',
  CHART_AREA: 'Gráfico de Área',
  TEXT: 'Texto',
  IMAGE: 'Imagem',
};

// Função helper para obter opções de campos por dataset
const getFieldOptions = (dataset: string): Array<{ value: string; label: string }> => {
  switch (dataset) {
    case 'internalAudits':
      return [
        { value: 'idAudit', label: 'ID Auditoria' },
        { value: 'ano', label: 'Ano' },
        { value: 'setor', label: 'Setor' },
        { value: 'responsavel', label: 'Responsável' },
        { value: 'descricao', label: 'Descrição' },
        { value: 'dataPrevista', label: 'Data Prevista' },
        { value: 'execucao', label: 'Execução (%)' },
        { value: 'status', label: 'Status' },
        { value: 'acoesGeradas', label: 'Ações Geradas' },
      ];
    case 'externalAudits':
      return [
        { value: 'idAudit', label: 'ID Auditoria' },
        { value: 'ano', label: 'Ano' },
        { value: 'entidade', label: 'Entidade' },
        { value: 'tipo', label: 'Tipo' },
        { value: 'dataPrevista', label: 'Data Prevista' },
        { value: 'execucao', label: 'Execução (%)' },
        { value: 'status', label: 'Status' },
        { value: 'acoesGeradas', label: 'Ações Geradas' },
      ];
    case 'actions':
      return [
        { value: 'idAcao', label: 'ID Ação' },
        { value: 'origem', label: 'Origem' },
        { value: 'descricao', label: 'Descrição' },
        { value: 'responsavel', label: 'Responsável' },
        { value: 'prazo', label: 'Prazo' },
        { value: 'status', label: 'Status' },
      ];
    case 'occurrences':
      return [
        { value: 'idOcorrencia', label: 'ID Ocorrência' },
        { value: 'tipo', label: 'Tipo' },
        { value: 'descricao', label: 'Descrição' },
        { value: 'setor', label: 'Setor' },
        { value: 'gravidade', label: 'Gravidade' },
        { value: 'data', label: 'Data' },
        { value: 'status', label: 'Status' },
      ];
    default:
      return [];
  }
};

const componentIcons: Record<ReportComponentType, any> = {
  KPI: Layout,
  TABLE: Table,
  CHART_BAR: BarChart3,
  CHART_LINE: TrendingUp,
  CHART_PIE: PieChart,
  CHART_AREA: TrendingUp,
  TEXT: Type,
  IMAGE: FileText,
};

const reportTemplateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  reportType: z.enum(['AUDIT_INTERNAL', 'AUDIT_EXTERNAL', 'ACTIONS', 'OCCURRENCES', 'CONSOLIDATED', 'CUSTOM']),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']).optional().default('DRAFT'),
  isPublic: z.boolean().optional().default(false),
  components: z.array(
    z.object({
      componentType: z.enum(['KPI', 'TABLE', 'CHART_BAR', 'CHART_LINE', 'CHART_PIE', 'CHART_AREA', 'TEXT', 'IMAGE']),
      order: z.number().int().positive(),
      title: z.string().optional(),
      configuration: z.any(),
      dataSource: z.any().optional(),
      style: z.any().optional(),
    }),
  ),
  metadata: z.any().optional(),
});

type ReportTemplateFormData = z.infer<typeof reportTemplateSchema>;

export const ReportsPage = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'templates' | 'scheduled'>('templates');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [scheduledModalOpen, setScheduledModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'CSV'>('PDF');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null; type: 'template' | 'scheduled' }>({
    open: false,
    id: null,
    type: 'template',
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['reports', 'templates'],
    queryFn: () => fetchReportTemplates(),
  });

  const { data: scheduled = [], isLoading: scheduledLoading } = useQuery({
    queryKey: ['reports', 'scheduled'],
    queryFn: () => fetchScheduledReports(),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ReportTemplateFormData>({
    resolver: zodResolver(reportTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      reportType: 'CUSTOM',
      status: 'DRAFT',
      isPublic: false,
      components: [],
    },
  });

  const { fields: componentFields, append: appendComponent, remove: removeComponent, move: moveComponent } = useFieldArray({
    control,
    name: 'components',
  });

  const watchedComponents = watch('components') || [];

  const createTemplateMutation = useMutation({
    mutationFn: createReportTemplate,
    onSuccess: () => {
      setTemplateModalOpen(false);
      reset();
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['reports', 'templates'] });
      showToast('Template criado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao criar template.';
      showToast(message, 'error');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ReportTemplateFormData> }) =>
      updateReportTemplate(id, payload),
    onSuccess: () => {
      setTemplateModalOpen(false);
      reset();
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['reports', 'templates'] });
      showToast('Template atualizado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar template.';
      showToast(message, 'error');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: deleteReportTemplate,
    onSuccess: () => {
      setDeleteConfirm({ open: false, id: null, type: 'template' });
      queryClient.invalidateQueries({ queryKey: ['reports', 'templates'] });
      showToast('Template eliminado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao eliminar template.';
      showToast(message, 'error');
    },
  });

  const deleteScheduledMutation = useMutation({
    mutationFn: deleteScheduledReport,
    onSuccess: () => {
      setDeleteConfirm({ open: false, id: null, type: 'template' });
      queryClient.invalidateQueries({ queryKey: ['reports', 'scheduled'] });
      showToast('Relatório agendado eliminado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao eliminar relatório agendado.';
      showToast(message, 'error');
    },
  });

  const generateMutation = useMutation({
    mutationFn: ({ templateId, format }: { templateId: string; format: 'PDF' | 'CSV' }) =>
      generateReport(templateId, format),
    onSuccess: async (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `relatorio-${Date.now()}.${variables.format.toLowerCase()}`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setGenerateModalOpen(false);
      showToast('Relatório gerado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao gerar relatório.';
      showToast(message, 'error');
    },
  });

  const createScheduledMutation = useMutation({
    mutationFn: createScheduledReport,
    onSuccess: () => {
      setScheduledModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['reports', 'scheduled'] });
      showToast('Relatório agendado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao agendar relatório.';
      showToast(message, 'error');
    },
  });

  const handleNewTemplate = () => {
    reset({
      name: '',
      description: '',
      reportType: 'CUSTOM',
      status: 'DRAFT',
      isPublic: false,
      components: [],
    });
    setEditingId(null);
    setTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: ReportTemplate) => {
    setValue('name', template.name);
    setValue('description', template.description || '');
    setValue('reportType', template.reportType);
    setValue('status', template.status);
    setValue('isPublic', template.isPublic);
    setValue('components', template.components.map((c) => ({ ...c })));
    setEditingId(template.id);
    setTemplateModalOpen(true);
  };

  const handleAddComponent = (type: ReportComponentType) => {
    const nextOrder = componentFields.length + 1;
    const defaultConfig: any = {};

    switch (type) {
      case 'KPI':
        // Adicionar um KPI exemplo por padrão
        defaultConfig.kpis = [
          { metric: 'internalAudits', aggregation: 'count', label: 'Total de Auditorias Internas', field: '' },
        ];
        break;
      case 'TABLE':
        defaultConfig.dataset = 'internalAudits';
        // Adicionar colunas exemplo por padrão
        defaultConfig.columns = [
          { field: 'idAudit', label: 'ID' },
          { field: 'setor', label: 'Setor' },
          { field: 'status', label: 'Status' },
        ];
        break;
      case 'CHART_BAR':
      case 'CHART_LINE':
      case 'CHART_PIE':
      case 'CHART_AREA':
        defaultConfig.dataset = 'internalAudits';
        defaultConfig.xField = '';
        defaultConfig.yField = '';
        break;
      case 'TEXT':
        defaultConfig.content = 'Digite o texto aqui...';
        break;
    }

    appendComponent({
      componentType: type,
      order: nextOrder,
      title: `${componentTypeLabels[type]} ${nextOrder}`,
      configuration: defaultConfig,
    });
  };

  const handleGenerate = () => {
    if (!selectedTemplateId) return;
    generateMutation.mutate({ templateId: selectedTemplateId, format: selectedFormat });
  };

  const onSubmitTemplate = (data: ReportTemplateFormData) => {
    if (!API_BASE) {
      showToast('Backend não configurado.', 'warning');
      return;
    }

    if (editingId) {
      updateTemplateMutation.mutate({ id: editingId, payload: data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Motor de Relatórios Avançado"
        description="Cria templates de relatórios e agenda gerações automáticas"
        icon={<FileText className="h-6 w-6" />}
        actions={
          <>
            {activeTab === 'templates' && (
              <Button onClick={handleNewTemplate} icon={<Plus className="h-4 w-4" />} disabled={!API_BASE}>
                Novo Template
              </Button>
            )}
            {activeTab === 'scheduled' && (
              <Button
                onClick={() => {
                  if (templates.length === 0) {
                    showToast('Cria primeiro um template antes de agendar um relatório.', 'warning');
                    return;
                  }
                  setScheduledModalOpen(true);
                }}
                icon={<Plus className="h-4 w-4" />}
                disabled={!API_BASE || templates.length === 0}
              >
                Agendar Relatório
              </Button>
            )}
          </>
        }
      />

      {/* Tabs */}
      <Card>
        <div className="border-b border-[var(--color-border)]">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={clsx(
                'px-4 py-3 font-medium text-sm border-b-2 transition-colors',
                activeTab === 'templates'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100',
              )}
            >
              Templates ({templates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scheduled')}
              className={clsx(
                'px-4 py-3 font-medium text-sm border-b-2 transition-colors',
                activeTab === 'scheduled'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100',
              )}
            >
              Agendados ({scheduled.length})
            </button>
          </div>
        </div>
      </Card>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <>
          {templatesLoading ? (
            <TableSkeleton columns={5} rows={5} />
          ) : templates.length === 0 ? (
            <Card>
              <div className="p-12 text-center text-slate-600 dark:text-slate-300">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm mb-4">Nenhum template encontrado.</p>
                <Button onClick={handleNewTemplate} icon={<Plus className="h-4 w-4" />} disabled={!API_BASE}>
                  Criar Primeiro Template
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <UITable
                data={templates}
                columns={[
                  {
                    key: 'name',
                    title: 'Nome',
                    render: (row) => (
                      <div>
                        <div className="font-semibold text-[var(--color-foreground)]">{row.name}</div>
                        {row.description && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{row.description}</div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'reportType',
                    title: 'Tipo',
                    render: (row) => <span className="text-sm text-slate-600 dark:text-slate-300">{reportTypeLabels[row.reportType]}</span>,
                  },
                  {
                    key: 'status',
                    title: 'Status',
                    render: (row) => (
                      <Badge variant={row.status === 'ACTIVE' ? 'success' : row.status === 'ARCHIVED' ? 'danger' : 'default'}>
                        {reportStatusLabels[row.status]}
                      </Badge>
                    ),
                  },
                  {
                    key: 'components',
                    title: 'Componentes',
                    render: (row) => <span className="text-sm text-slate-600 dark:text-slate-300">{row.components.length}</span>,
                  },
                  {
                    key: 'actions',
                    title: 'Operações',
                    render: (row) => (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          onClick={() => {
                            setSelectedTemplateId(row.id);
                            setGenerateModalOpen(true);
                          }}
                          disabled={!API_BASE || generateMutation.isPending}
                          title="Gerar relatório"
                        >
                          <Download className="h-3 w-3" />
                          Gerar
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          onClick={() => handleEditTemplate(row)}
                          disabled={!API_BASE}
                          title="Editar"
                        >
                          <Edit className="h-3 w-3" />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                          onClick={() => setDeleteConfirm({ open: true, id: row.id, type: 'template' })}
                          disabled={deleteTemplateMutation.isPending}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                          Eliminar
                        </button>
                      </div>
                    ),
                  },
                ]}
                emptyMessage="Nenhum template encontrado."
              />
            </Card>
          )}
        </>
      )}

      {/* Scheduled Tab */}
      {activeTab === 'scheduled' && (
        <>
          {scheduledLoading ? (
            <TableSkeleton columns={5} rows={5} />
          ) : scheduled.length === 0 ? (
            <Card>
              <div className="p-12 text-center text-slate-600 dark:text-slate-300">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm mb-4">Nenhum relatório agendado.</p>
                <Button
                  onClick={() => setScheduledModalOpen(true)}
                  icon={<Plus className="h-4 w-4" />}
                  disabled={!API_BASE || templates.length === 0}
                >
                  Agendar Primeiro Relatório
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <UITable
                data={scheduled}
                columns={[
                  {
                    key: 'name',
                    title: 'Nome',
                    render: (row) => (
                      <div>
                        <div className="font-semibold text-[var(--color-foreground)]">{row.name}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          Template: {row.reportTemplate.name}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'frequency',
                    title: 'Frequência',
                    render: (row) => <span className="text-sm text-slate-600 dark:text-slate-300">{reportFrequencyLabels[row.frequency]}</span>,
                  },
                  {
                    key: 'status',
                    title: 'Status',
                    render: (row) => (
                      <Badge variant={row.enabled && row.status === 'ACTIVE' ? 'success' : 'default'}>
                        {row.enabled && row.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                      </Badge>
                    ),
                  },
                  {
                    key: 'nextRun',
                    title: 'Próxima Execução',
                    render: (row) => (
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {row.nextRunAt ? new Date(row.nextRunAt).toLocaleString('pt-PT') : '-'}
                      </span>
                    ),
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
                            if (!API_BASE) {
                              showToast('Backend não configurado.', 'warning');
                              return;
                            }
                            // TODO: Adicionar endpoint de execução manual no backend
                            showToast('Execução manual em desenvolvimento. Use "Gerar" no template.', 'info');
                          }}
                          title="Executar agora"
                        >
                          <Play className="h-3 w-3" />
                          Executar
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                          onClick={() => {
                            if (!API_BASE) {
                              showToast('Backend não configurado.', 'warning');
                              return;
                            }
                            setDeleteConfirm({ open: true, id: row.id, type: 'scheduled' });
                          }}
                          disabled={!API_BASE}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                          Eliminar
                        </button>
                      </div>
                    ),
                  },
                ]}
                emptyMessage="Nenhum relatório agendado."
              />
            </Card>
          )}
        </>
      )}

      {/* Modal de Template */}
      <Modal
        title={editingId ? 'Editar Template' : 'Novo Template'}
        open={templateModalOpen}
        onClose={() => {
          setTemplateModalOpen(false);
          reset();
          setEditingId(null);
        }}
        size="xl"
      >
        <form className="space-y-6" onSubmit={handleSubmit(onSubmitTemplate)}>
          <Input label="Nome do Template" {...register('name')} error={errors.name?.message} required />
          <Textarea label="Descrição" {...register('description')} error={errors.description?.message} rows={2} />
          <div className="grid md:grid-cols-2 gap-4">
            <Select label="Tipo de Relatório" {...register('reportType')} error={errors.reportType?.message} required>
              {reportTypes.map((type) => (
                <option key={type} value={type}>
                  {reportTypeLabels[type]}
                </option>
              ))}
            </Select>
            <Select label="Status" {...register('status')} error={errors.status?.message}>
              {reportStatuses.map((status) => (
                <option key={status} value={status}>
                  {reportStatusLabels[status]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPublic" {...register('isPublic')} className="form-checkbox" />
            <label htmlFor="isPublic" className="text-sm text-slate-700 dark:text-slate-300">
              Template público (disponível para todos os tenants)
            </label>
          </div>

          {/* Componentes */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Componentes do Relatório</h3>
              <div className="flex flex-wrap gap-2">
                {componentTypes
                  .filter((t) => t !== 'IMAGE')
                  .map((type) => {
                    const Icon = componentIcons[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleAddComponent(type)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border border-[var(--color-border)] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title={`Adicionar ${componentTypeLabels[type]}`}
                      >
                        <Icon className="h-3 w-3" />
                        {componentTypeLabels[type]}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="space-y-4">
              {componentFields.map((field, index) => {
                const component = watchedComponents[index];
                const Icon = component.componentType ? componentIcons[component.componentType] : FileText;

                return (
                  <Card key={field.id} className="p-4 border border-[var(--color-border)]">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-slate-500" />
                        <Input
                          label="Título do Componente"
                          {...register(`components.${index}.title`)}
                          error={errors.components?.[index]?.title?.message}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (index > 0) moveComponent(index, index - 1);
                          }}
                          disabled={index === 0}
                          className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Mover para cima"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (index < componentFields.length - 1) moveComponent(index, index + 1);
                          }}
                          disabled={index === componentFields.length - 1}
                          className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Mover para baixo"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeComponent(index)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                          title="Remover"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 mb-2">
                      Tipo: {component.componentType ? componentTypeLabels[component.componentType] : 'N/A'} | Ordem: {index + 1}
                    </div>

                    {/* Configuração específica por tipo */}
                    {component.componentType === 'KPI' && (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">KPIs</label>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const currentKpis = component.configuration?.kpis || [];
                              const newKpi = { metric: 'internalAudits', aggregation: 'count', label: '' };
                              setValue(`components.${index}.configuration.kpis`, [...currentKpis, newKpi]);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar KPI
                          </Button>
                        </div>
                        {(component.configuration?.kpis || []).map((kpi: any, kpiIndex: number) => {
                          const watchedKpi = watch(`components.${index}.configuration.kpis.${kpiIndex}`);
                          const needsField = watchedKpi?.aggregation === 'sum' || watchedKpi?.aggregation === 'avg';
                          
                          return (
                            <Card key={kpiIndex} className="p-4 space-y-3 border border-[var(--color-border)] bg-slate-50 dark:bg-slate-800/30">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-[var(--color-foreground)]">KPI {kpiIndex + 1}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const currentKpis = component.configuration?.kpis || [];
                                    setValue(
                                      `components.${index}.configuration.kpis`,
                                      currentKpis.filter((_: any, i: number) => i !== kpiIndex),
                                    );
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <Select
                                  label="Fonte de Dados"
                                  {...register(`components.${index}.configuration.kpis.${kpiIndex}.metric`)}
                                  className="text-sm"
                                >
                                  <option value="internalAudits">📋 Auditorias Internas</option>
                                  <option value="externalAudits">📄 Auditorias Externas</option>
                                  <option value="actions">✅ Ações</option>
                                  <option value="occurrences">⚠️ Ocorrências</option>
                                </Select>
                                
                                <Select
                                  label="Cálculo"
                                  {...register(`components.${index}.configuration.kpis.${kpiIndex}.aggregation`)}
                                  className="text-sm"
                                >
                                  <option value="count">📊 Contar (Total)</option>
                                  <option value="sum">➕ Somar</option>
                                  <option value="avg">📈 Média</option>
                                </Select>
                              </div>
                              
                              {needsField && (
                                <Select
                                  label="Campo para calcular"
                                  {...register(`components.${index}.configuration.kpis.${kpiIndex}.field`)}
                                  className="text-sm"
                                >
                                  <option value="">Selecione um campo...</option>
                                  <option value="execucao">Execução (%)</option>
                                  <option value="acoesGeradas">Ações Geradas</option>
                                </Select>
                              )}
                              
                              <Input
                                label="Nome do KPI (como aparece no relatório)"
                                {...register(`components.${index}.configuration.kpis.${kpiIndex}.label`)}
                                placeholder="Ex: Total de Auditorias Internas"
                                className="text-sm"
                              />
                              
                              <div className="text-xs text-slate-500 bg-white dark:bg-slate-900 p-2 rounded border border-[var(--color-border)]">
                                💡 <strong>Preview:</strong> Este KPI mostrará{' '}
                                {watchedKpi?.aggregation === 'count' && 'o total de registos'}
                                {watchedKpi?.aggregation === 'sum' && `a soma de ${watchedKpi?.field || 'um campo'}`}
                                {watchedKpi?.aggregation === 'avg' && `a média de ${watchedKpi?.field || 'um campo'}`}
                                {' '}de <strong>{watchedKpi?.metric === 'internalAudits' && 'Auditorias Internas'}</strong>
                                <strong>{watchedKpi?.metric === 'externalAudits' && 'Auditorias Externas'}</strong>
                                <strong>{watchedKpi?.metric === 'actions' && 'Ações'}</strong>
                                <strong>{watchedKpi?.metric === 'occurrences' && 'Ocorrências'}</strong>
                              </div>
                            </Card>
                          );
                        })}
                        {(!component.configuration?.kpis || component.configuration.kpis.length === 0) && (
                          <p className="text-xs text-slate-500 text-center py-2">
                            Nenhum KPI configurado. Clica em "Adicionar KPI" para começar.
                          </p>
                        )}
                      </div>
                    )}

                    {component.componentType === 'TABLE' && (
                      <div className="mt-3 space-y-3">
                        <Select
                          label="Dataset"
                          {...register(`components.${index}.configuration.dataset`)}
                          className="text-xs"
                        >
                          <option value="internalAudits">Auditorias Internas</option>
                          <option value="externalAudits">Auditorias Externas</option>
                          <option value="actions">Ações</option>
                          <option value="occurrences">Ocorrências</option>
                        </Select>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Colunas</label>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const currentColumns = component.configuration?.columns || [];
                              const dataset = component.configuration?.dataset || 'internalAudits';
                              const fieldOptions = getFieldOptions(dataset);
                              const newColumn = { field: fieldOptions[0]?.value || '', label: '' };
                              setValue(`components.${index}.configuration.columns`, [...currentColumns, newColumn]);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar Coluna
                          </Button>
                        </div>
                        {(component.configuration?.columns || []).map((col: any, colIndex: number) => {
                          const dataset = component.configuration?.dataset || 'internalAudits';
                          const fieldOptions = getFieldOptions(dataset);
                          return (
                            <Card key={colIndex} className="p-3 space-y-2 border border-[var(--color-border)]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">Coluna {colIndex + 1}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const currentColumns = component.configuration?.columns || [];
                                    setValue(
                                      `components.${index}.configuration.columns`,
                                      currentColumns.filter((_: any, i: number) => i !== colIndex),
                                    );
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                              <Select
                                label="Campo"
                                {...register(`components.${index}.configuration.columns.${colIndex}.field`)}
                              >
                                {fieldOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </Select>
                              <Input
                                label="Label"
                                {...register(`components.${index}.configuration.columns.${colIndex}.label`)}
                                placeholder="Ex: ID da Auditoria"
                              />
                            </Card>
                          );
                        })}
                        {(!component.configuration?.columns || component.configuration.columns.length === 0) && (
                          <p className="text-xs text-slate-500 text-center py-2">
                            Nenhuma coluna configurada. Clica em "Adicionar Coluna" para começar.
                          </p>
                        )}
                      </div>
                    )}

                    {['CHART_BAR', 'CHART_LINE', 'CHART_PIE', 'CHART_AREA'].includes(component.componentType || '') && (
                      <div className="mt-3 space-y-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 text-xs">
                          💡 <strong>Nota:</strong> Os gráficos serão renderizados como imagens no PDF e como dados tabulares no CSV.
                        </div>
                        <Select
                          label="Dataset"
                          {...register(`components.${index}.configuration.dataset`)}
                          className="text-xs"
                        >
                          <option value="internalAudits">Auditorias Internas</option>
                          <option value="externalAudits">Auditorias Externas</option>
                          <option value="actions">Ações</option>
                          <option value="occurrences">Ocorrências</option>
                        </Select>
                        <Input
                          label="Campo X (opcional)"
                          {...register(`components.${index}.configuration.xField`)}
                          placeholder="Ex: setor"
                          className="text-xs"
                        />
                        <Input
                          label="Campo Y (opcional)"
                          {...register(`components.${index}.configuration.yField`)}
                          placeholder="Ex: execucao"
                          className="text-xs"
                        />
                      </div>
                    )}

                    {component.componentType === 'TEXT' && (
                      <Textarea
                        label="Conteúdo"
                        {...register(`components.${index}.configuration.content`)}
                        rows={3}
                        className="mt-3"
                        placeholder="Texto a exibir no relatório..."
                      />
                    )}
                  </Card>
                );
              })}
              {componentFields.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Nenhum componente adicionado. Clica nos botões acima para adicionar.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setTemplateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting || createTemplateMutation.isPending || updateTemplateMutation.isPending}>
              {editingId ? 'Atualizar' : 'Criar'} Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Geração */}
      <Modal
        title="Gerar Relatório"
        open={generateModalOpen}
        onClose={() => {
          setGenerateModalOpen(false);
          setSelectedTemplateId(null);
        }}
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Formato"
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as 'PDF' | 'CSV')}
          >
            {exportFormats.map((format) => (
              <option key={format} value={format}>
                {exportFormatLabels[format]}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setGenerateModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleGenerate}
              isLoading={generateMutation.isPending}
              disabled={!selectedTemplateId}
            >
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Agendamento */}
      <ScheduledReportModal
        open={scheduledModalOpen}
        onClose={() => {
          setScheduledModalOpen(false);
        }}
        onSubmit={(data) => {
          createScheduledMutation.mutate(data);
        }}
        templates={templates.filter((t) => t.status === 'ACTIVE')}
        isLoading={createScheduledMutation.isPending}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null, type: 'template' })}
        onConfirm={() => {
          if (deleteConfirm.id) {
            if (deleteConfirm.type === 'template') {
              deleteTemplateMutation.mutate(deleteConfirm.id);
            } else {
              deleteScheduledMutation.mutate(deleteConfirm.id);
            }
          }
        }}
        title={`Eliminar ${deleteConfirm.type === 'template' ? 'Template' : 'Relatório Agendado'}`}
        message={`Tens a certeza que queres eliminar este ${deleteConfirm.type === 'template' ? 'template' : 'relatório agendado'}? Esta ação não pode ser desfeita.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteTemplateMutation.isPending || deleteScheduledMutation.isPending}
      />
    </div>
  );
};



