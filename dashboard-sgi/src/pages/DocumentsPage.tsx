import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Trash2,
  Edit,
  X,
  Download,
  Upload,
  FileText,
  Eye,
  History,
  Tag as TagIcon,
  Archive,
  Search,
  BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  API_BASE,
  fetchDocuments,
  fetchDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentVersion,
  downloadDocumentVersion,
  archiveDocument,
  fetchWorkflowDefinitions,
  confirmDocumentRead,
  checkDocumentReadStatus,
  type Document,
  type DocumentTag,
  type PaginatedDocumentsResponse,
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

const documentStatuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ARCHIVED'] as const;
const accessLevels = ['PRIVATE', 'INTERNAL', 'PUBLIC'] as const;
const roles = ['ADMIN', 'GESTOR', 'AUDITOR'] as const;

const documentSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  category: z.string().optional(),
  accessLevel: z.enum(accessLevels).optional().default('INTERNAL'),
  allowedRoles: z.array(z.enum(roles)).optional().default([]),
  allowedUsers: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  workflowDefinitionId: z.string().uuid().optional(),
  changeNotes: z.string().optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

const statusVariant = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
    case 'ARCHIVED':
      return 'danger';
    case 'PENDING_APPROVAL':
      return 'info';
    case 'DRAFT':
    default:
      return 'default';
  }
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_APPROVAL: 'Pendente Aprovação',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  ARCHIVED: 'Arquivado',
};

const accessLevelLabels: Record<string, string> = {
  PRIVATE: 'Privado',
  INTERNAL: 'Interno',
  PUBLIC: 'Público',
};

export const DocumentsPage = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const versionFileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [isCheckingReadStatus, setIsCheckingReadStatus] = useState(false);
  const [hasReadConfirmation, setHasReadConfirmation] = useState(false);

  const { data, isLoading } = useQuery<PaginatedDocumentsResponse>({
    queryKey: ['documents', page, limit, filters],
    queryFn: () => fetchDocuments({ ...filters, page, limit }),
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows', 'definitions', 'Document'],
    queryFn: () => fetchWorkflowDefinitions({ entityType: 'Document', isActive: true }),
    enabled: !!API_BASE,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      accessLevel: 'INTERNAL',
      allowedRoles: [],
      allowedUsers: [],
      tags: [],
      changeNotes: '',
    },
  });

  const watchedTags = watch('tags') || [];
  const watchedRoles = watch('allowedRoles') || [];
  const [tagInput, setTagInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => createDocument(formData),
    onSuccess: () => {
      setModalOpen(false);
      setUploadModalOpen(false);
      reset();
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast('Documento criado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao guardar documento.';
      showToast(message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<DocumentFormData> }) =>
      updateDocument(id, payload),
    onSuccess: () => {
      setModalOpen(false);
      reset();
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast('Documento atualizado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar documento.';
      showToast(message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      setDeleteConfirm({ open: false, id: null });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast('Documento eliminado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao eliminar documento.';
      showToast(message, 'error');
    },
  });

  const uploadVersionMutation = useMutation({
    mutationFn: async ({ documentId, formData }: { documentId: string; formData: FormData }) =>
      uploadDocumentVersion(documentId, formData),
    onSuccess: () => {
      setVersionModalOpen(false);
      setSelectedFile(null);
      if (versionFileInputRef.current) versionFileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast('Nova versão carregada com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao carregar nova versão.';
      showToast(message, 'error');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast('Documento arquivado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao arquivar documento.';
      showToast(message, 'error');
    },
  });

  const confirmReadMutation = useMutation({
    mutationFn: confirmDocumentRead,
    onSuccess: () => {
      setReadConfirmed(true);
      setHasReadConfirmation(true);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast('Leitura do documento confirmada!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao confirmar leitura.';
      showToast(message, 'error');
    },
  });

  const handleNew = () => {
    reset({
      title: '',
      description: '',
      category: '',
      accessLevel: 'INTERNAL',
      allowedRoles: [],
      allowedUsers: [],
      tags: [],
      changeNotes: '',
    });
    setEditingId(null);
    setSelectedFile(null);
    setUploadModalOpen(true);
  };

  const handleEdit = (document: Document) => {
    setValue('title', document.title);
    setValue('description', document.description || '');
    setValue('category', document.category || '');
    setValue('accessLevel', document.accessLevel);
    setValue('allowedRoles', document.allowedRoles as typeof roles[number][]);
    setValue('allowedUsers', document.allowedUsers);
    setValue('tags', document.tags.map((tag) => tag.name));
    setEditingId(document.id);
    setModalOpen(true);
  };

  const handleView = async (document: Document) => {
    try {
      // Tentar buscar documento completo da API se disponível
      if (API_BASE) {
        try {
          const fullDoc = await fetchDocument(document.id);
          setSelectedDocument(fullDoc);
          
          // Verificar status de confirmação de leitura
          setIsCheckingReadStatus(true);
          try {
            const readStatus = await checkDocumentReadStatus(fullDoc.id);
            setHasReadConfirmation(readStatus.confirmed);
            setReadConfirmed(readStatus.confirmed);
          } catch {
            setHasReadConfirmation(false);
            setReadConfirmed(false);
          } finally {
            setIsCheckingReadStatus(false);
          }
          
          setDetailsModalOpen(true);
          return;
        } catch {
          // Se falhar, usar documento disponível
        }
      }
      setSelectedDocument(document);
      setReadConfirmed(false);
      setHasReadConfirmation(false);
      setDetailsModalOpen(true);
    } catch {
      setSelectedDocument(document);
      setReadConfirmed(false);
      setHasReadConfirmation(false);
      setDetailsModalOpen(true);
    }
  };

  const handleDownload = async (document: Document) => {
    if (!document.currentFile) return;

    try {
      const blob = await downloadDocumentVersion(document.id, document.currentFile.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.currentFile.originalName;
      window.document.body.appendChild(anchor);
      anchor.click();
      window.document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      showToast('Download iniciado!', 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao fazer download.';
      showToast(message, 'error');
    }
  };

  const onSubmitUpload = async (formData: DocumentFormData) => {
    if (!API_BASE) {
      showToast('Backend não configurado. Apenas simulação.', 'warning');
      return;
    }

    if (!selectedFile) {
      showToast('Seleciona um ficheiro para upload.', 'error');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('file', selectedFile);
    uploadData.append('title', formData.title);
    if (formData.description) uploadData.append('description', formData.description);
    if (formData.category) uploadData.append('category', formData.category);
    uploadData.append('accessLevel', formData.accessLevel || 'INTERNAL');
    uploadData.append('allowedRoles', JSON.stringify(formData.allowedRoles || []));
    uploadData.append('allowedUsers', JSON.stringify(formData.allowedUsers || []));
    uploadData.append('tags', JSON.stringify(formData.tags || []));
    if (formData.workflowDefinitionId) uploadData.append('workflowDefinitionId', formData.workflowDefinitionId);
    if (formData.changeNotes) uploadData.append('changeNotes', formData.changeNotes);

    await createMutation.mutateAsync(uploadData);
  };

  const onSubmitEdit = async (formData: DocumentFormData) => {
    if (!API_BASE || !editingId) {
      showToast('Backend não configurado. Apenas simulação.', 'warning');
      return;
    }

    await updateMutation.mutateAsync({
      id: editingId,
      payload: {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        accessLevel: formData.accessLevel,
        allowedRoles: formData.allowedRoles,
        allowedUsers: formData.allowedUsers,
        tags: formData.tags,
        metadata: undefined,
      },
    });
  };

  const onSubmitVersion = async () => {
    if (!API_BASE || !selectedDocumentId || !selectedFile) {
      showToast('Ficheiro é obrigatório.', 'error');
      return;
    }

    const versionData = new FormData();
    versionData.append('file', selectedFile);
    const changeNotes = (document.getElementById('version-changeNotes') as HTMLTextAreaElement)?.value;
    if (changeNotes) versionData.append('changeNotes', changeNotes);

    await uploadVersionMutation.mutateAsync({
      documentId: selectedDocumentId,
      formData: versionData,
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      setValue('tags', [...watchedTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter((tag) => tag !== tagToRemove));
  };

  const toggleRole = (role: typeof roles[number]) => {
    const currentRoles = watchedRoles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    setValue('allowedRoles', newRoles);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Documentos"
        description="Upload, versionamento e gestão de documentos com aprovação"
        icon={<FileText className="h-6 w-6" />}
        actions={
          <>
            <Button
              onClick={() => navigate('/documentos/conformidade-leitura')}
              variant="secondary"
              icon={<BarChart3 className="h-4 w-4" />}
              disabled={!API_BASE}
            >
              Relatório de Conformidade
            </Button>
            <Button onClick={handleNew} icon={<Plus className="h-4 w-4" />} disabled={!API_BASE}>
              Novo Documento
            </Button>
          </>
        }
      />

      {/* Filtros */}
      <Card>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Search className="h-4 w-4" />
            Filtros
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Pesquisar"
              placeholder="Título ou descrição..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              icon={<Search className="h-4 w-4" />}
            />
            <Select
              label="Categoria"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">Todas as categorias</option>
              <option value="Auditoria">Auditoria</option>
              <option value="Relatório">Relatório</option>
              <option value="Procedimento">Procedimento</option>
              <option value="Manual">Manual</option>
              <option value="Formulário">Formulário</option>
            </Select>
            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Todos os status</option>
              {documentStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabela de Documentos */}
      {isLoading ? (
        <TableSkeleton columns={6} rows={10} />
      ) : !data || data.data.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-slate-600 dark:text-slate-300">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Nenhum documento encontrado.</p>
          </div>
        </Card>
      ) : (
        <>
          <Table
            data={data.data}
            columns={[
              {
                key: 'title',
                title: 'Documento',
                render: (row) => (
                  <div>
                    <div className="font-semibold text-[var(--color-foreground)]">{row.title}</div>
                    {row.description && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate max-w-md">
                        {row.description}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {row.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          <TagIcon className="h-3 w-3 mr-1" />
                          {tag.name}
                        </span>
                      ))}
                      {row.tags.length > 3 && (
                        <span className="text-xs text-slate-500">+{row.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'category',
                title: 'Categoria',
                render: (row) => (
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {row.category || '-'}
                  </span>
                ),
              },
              {
                key: 'currentFile',
                title: 'Ficheiro',
                render: (row) =>
                  row.currentFile ? (
                    <div className="text-sm">
                      <div className="text-slate-600 dark:text-slate-300">{row.currentFile.originalName}</div>
                      <div className="text-xs text-slate-500">
                        v{row.currentFile.version} • {(row.currentFile.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500">Sem ficheiro</span>
                  ),
              },
              {
                key: 'status',
                title: 'Status',
                render: (row) => (
                  <Badge variant={statusVariant(row.status)}>{statusLabels[row.status]}</Badge>
                ),
              },
              {
                key: 'accessLevel',
                title: 'Acesso',
                render: (row) => (
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    {accessLevelLabels[row.accessLevel]}
                  </span>
                ),
              },
              {
                key: 'actions',
                title: 'Operações',
                render: (row) => (
                  <div className="flex items-center gap-1 flex-wrap">
                    {row.currentFile && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        onClick={() => handleDownload(row)}
                        title="Download"
                        aria-label={`Download ${row.title}`}
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </button>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      onClick={() => handleView(row)}
                      title="Ver detalhes"
                      aria-label={`Ver detalhes de ${row.title}`}
                    >
                      <Eye className="h-3 w-3" />
                      Detalhes
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                      onClick={() => {
                        setSelectedDocumentId(row.id);
                        setSelectedFile(null);
                        setVersionModalOpen(true);
                      }}
                      disabled={!API_BASE}
                      title="Nova versão"
                      aria-label={`Carregar nova versão de ${row.title}`}
                    >
                      <Upload className="h-3 w-3" />
                      Versão
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      onClick={() => handleEdit(row)}
                      disabled={!API_BASE}
                      title="Editar"
                      aria-label={`Editar ${row.title}`}
                    >
                      <Edit className="h-3 w-3" />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                      onClick={() => {
                        if (!API_BASE) {
                          showToast('Eliminação disponível apenas com backend configurado.', 'warning');
                          return;
                        }
                        setDeleteConfirm({ open: true, id: row.id });
                      }}
                      disabled={deleteMutation.isPending}
                      title="Eliminar"
                      aria-label={`Eliminar ${row.title}`}
                    >
                      <Trash2 className="h-3 w-3" />
                      Eliminar
                    </button>
                  </div>
                ),
              },
            ]}
          />

          {/* Paginação */}
          {data.pagination.totalPages > 1 && (
            <Card>
              <div className="p-4 flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Mostrando {data.pagination.page * data.pagination.limit - data.pagination.limit + 1} a{' '}
                  {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} de{' '}
                  {data.pagination.total} documentos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Página {data.pagination.page} de {data.pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page === data.pagination.totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal de Upload/Criação */}
      <Modal
        title="Novo Documento"
        open={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          reset();
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        size="large"
      >
        <form className="space-y-6" onSubmit={handleSubmit(onSubmitUpload)}>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ficheiro <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600 cursor-pointer"
                required
              />
              {selectedFile && (
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          </div>

          <Input
            label="Título"
            {...register('title')}
            error={errors.title?.message}
            required
          />

          <Textarea
            label="Descrição"
            {...register('description')}
            error={errors.description?.message}
            rows={3}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Categoria"
              {...register('category')}
              error={errors.category?.message}
              placeholder="ex: Auditoria, Relatório..."
            />
            <Select
              label="Nível de Acesso"
              {...register('accessLevel')}
              error={errors.accessLevel?.message}
            >
              {accessLevels.map((level) => (
                <option key={level} value={level}>
                  {accessLevelLabels[level]}
                </option>
              ))}
            </Select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tags
            </label>
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Adicionar tag..."
                className="flex-1"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addTag}>
                Adicionar
              </Button>
            </div>
            {watchedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {watchedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-brand-500 text-white"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:bg-brand-600 rounded-full p-0.5"
                      aria-label={`Remover tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Roles Permitidas (apenas para PRIVATE) */}
          {watch('accessLevel') === 'PRIVATE' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Roles Permitidas
              </label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => {
                  const isSelected = watchedRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
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
          )}

          {/* Workflow */}
          {workflows.length > 0 && (
            <Select
              label="Workflow de Aprovação (opcional)"
              {...register('workflowDefinitionId')}
            >
              <option value="">Sem workflow</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </Select>
          )}

          <Textarea
            label="Notas de Alteração"
            {...register('changeNotes')}
            error={errors.changeNotes?.message}
            rows={2}
            placeholder="Descreve as alterações nesta versão..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setUploadModalOpen(false);
                reset();
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting || createMutation.isPending}
              disabled={!selectedFile}
            >
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição */}
      <Modal
        title="Editar Documento"
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          reset();
          setEditingId(null);
        }}
        size="large"
      >
        <form className="space-y-6" onSubmit={handleSubmit(onSubmitEdit)}>
          <Input
            label="Título"
            {...register('title')}
            error={errors.title?.message}
            required
          />

          <Textarea
            label="Descrição"
            {...register('description')}
            error={errors.description?.message}
            rows={3}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Categoria"
              {...register('category')}
              error={errors.category?.message}
            />
            <Select
              label="Nível de Acesso"
              {...register('accessLevel')}
              error={errors.accessLevel?.message}
            >
              {accessLevels.map((level) => (
                <option key={level} value={level}>
                  {accessLevelLabels[level]}
                </option>
              ))}
            </Select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tags
            </label>
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Adicionar tag..."
                className="flex-1"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addTag}>
                Adicionar
              </Button>
            </div>
            {watchedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {watchedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-brand-500 text-white"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:bg-brand-600 rounded-full p-0.5"
                      aria-label={`Remover tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {watch('accessLevel') === 'PRIVATE' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Roles Permitidas
              </label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => {
                  const isSelected = watchedRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
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
          )}

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
            <Button type="submit" variant="primary" isLoading={isSubmitting || updateMutation.isPending}>
              Atualizar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Nova Versão */}
      <Modal
        title="Carregar Nova Versão"
        open={versionModalOpen}
        onClose={() => {
          setVersionModalOpen(false);
          setSelectedFile(null);
          setSelectedDocumentId(null);
          if (versionFileInputRef.current) versionFileInputRef.current.value = '';
        }}
        size="md"
      >
        <form className="space-y-6" onSubmit={(e) => {
          e.preventDefault();
          onSubmitVersion();
        }}>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Novo Ficheiro <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                ref={versionFileInputRef}
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600 cursor-pointer"
                required
              />
              {selectedFile && (
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          </div>

          <Textarea
            label="Notas de Alteração"
            id="version-changeNotes"
            rows={3}
            placeholder="Descreve as alterações nesta nova versão..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setVersionModalOpen(false);
                setSelectedFile(null);
                setSelectedDocumentId(null);
                if (versionFileInputRef.current) versionFileInputRef.current.value = '';
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={uploadVersionMutation.isPending}
              disabled={!selectedFile || !selectedDocumentId}
            >
              Carregar Versão
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Detalhes */}
      <Modal
        title={selectedDocument?.title || 'Detalhes do Documento'}
        open={detailsModalOpen}
        onClose={() => {
          if (selectedDocument && selectedDocument.status === 'APPROVED' && !readConfirmed && !hasReadConfirmation) {
            showToast('Deves confirmar a leitura do documento antes de fechar.', 'warning');
            return;
          }
          setDetailsModalOpen(false);
          setSelectedDocument(null);
          setReadConfirmed(false);
          setHasReadConfirmation(false);
        }}
        size="large"
      >
        {selectedDocument && (
          <div className="space-y-6">
            {/* Botão de Download no cabeçalho se tiver ficheiro */}
            {selectedDocument.currentFile && (
              <div className="flex justify-end pb-2 border-b border-[var(--color-border)]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload(selectedDocument)}
                  icon={<Download className="h-4 w-4" />}
                >
                  Download Versão Atual
                </Button>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Título
                </label>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">{selectedDocument.title}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <Badge variant={statusVariant(selectedDocument.status)}>
                  {statusLabels[selectedDocument.status]}
                </Badge>
              </div>
              {selectedDocument.description && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrição
                  </label>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{selectedDocument.description}</p>
                </div>
              )}
              {selectedDocument.category && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{selectedDocument.category}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nível de Acesso
                </label>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {accessLevelLabels[selectedDocument.accessLevel]}
                </p>
              </div>
            </div>

            {selectedDocument.currentFile && (
              <div className="border-t border-[var(--color-border)] pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-[var(--color-foreground)]">Ficheiro Atual</h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(selectedDocument)}
                    icon={<Download className="h-4 w-4" />}
                  >
                    Download
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nome do Ficheiro
                    </label>
                    <p className="text-slate-600 dark:text-slate-300">
                      {selectedDocument.currentFile.originalName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Versão
                    </label>
                    <p className="text-slate-600 dark:text-slate-300">
                      v{selectedDocument.currentVersion}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tamanho
                    </label>
                    <p className="text-slate-600 dark:text-slate-300">
                      {(selectedDocument.currentFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tipo
                    </label>
                    <p className="text-slate-600 dark:text-slate-300">
                      {selectedDocument.currentFile.mimeType}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedDocument.tags && selectedDocument.tags.length > 0 && (
              <div className="border-t border-[var(--color-border)] pt-4">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedDocument.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <TagIcon className="h-3 w-3 mr-1" />
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Histórico de Versões */}
            {'versions' in selectedDocument && Array.isArray(selectedDocument.versions) && selectedDocument.versions.length > 0 && (
              <div className="border-t border-[var(--color-border)] pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-[var(--color-foreground)] flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Versões ({selectedDocument.versions.length})
                  </h4>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedDocument.versions.map((version: any) => (
                    <div
                      key={version.id}
                      className={clsx(
                        'p-3 rounded-lg border',
                        version.isCurrent
                          ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-[var(--color-border)]',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[var(--color-foreground)]">
                              {version.originalName}
                            </span>
                            <Badge variant={version.isCurrent ? 'success' : 'default'}>
                              v{version.version} {version.isCurrent ? '(Atual)' : ''}
                            </Badge>
                          </div>
                          {version.changeNotes && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                              {version.changeNotes}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>{(version.size / 1024).toFixed(1)} KB</span>
                            <span>{new Date(version.createdAt).toLocaleString('pt-PT')}</span>
                          </div>
                        </div>
                        {API_BASE && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              try {
                                const blob = await downloadDocumentVersion(
                                  selectedDocument.id,
                                  version.id,
                                );
                                const url = window.URL.createObjectURL(blob);
                                const anchor = window.document.createElement('a');
                                anchor.href = url;
                                anchor.download = version.originalName;
                                window.document.body.appendChild(anchor);
                                anchor.click();
                                window.document.body.removeChild(anchor);
                                window.URL.revokeObjectURL(url);
                                showToast('Download iniciado!', 'success');
                              } catch (error: unknown) {
                                const message = error instanceof Error ? error.message : 'Falha ao fazer download.';
                                showToast(message, 'error');
                              }
                            }}
                            icon={<Download className="h-3 w-3" />}
                          >
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmação de Leitura - Obrigatória para documentos aprovados */}
            {selectedDocument.status === 'APPROVED' && API_BASE && (
              <div className="border-t border-[var(--color-border)] pt-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    id="read-confirmation"
                    checked={readConfirmed || hasReadConfirmation}
                    onChange={async (e) => {
                      if (e.target.checked && selectedDocument && !hasReadConfirmation) {
                        try {
                          await confirmReadMutation.mutateAsync(selectedDocument.id);
                        } catch {
                          // Erro já tratado na mutation
                        }
                      } else {
                        setReadConfirmed(e.target.checked);
                      }
                    }}
                    disabled={hasReadConfirmation || confirmReadMutation.isPending || isCheckingReadStatus}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <label htmlFor="read-confirmation" className="block text-sm font-medium text-[var(--color-foreground)] cursor-pointer">
                      Confirmo que li e compreendi este documento
                      {!hasReadConfirmation && <span className="text-rose-500 ml-1">*</span>}
                    </label>
                    {hasReadConfirmation && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✓ Leitura confirmada em {new Date().toLocaleString('pt-PT')}
                      </p>
                    )}
                    {isCheckingReadStatus && (
                      <p className="text-xs text-slate-500 mt-1">A verificar status de leitura...</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-[var(--color-border)] pt-4">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Criado por
              </label>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {selectedDocument.createdBy.name} ({selectedDocument.createdBy.email})
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(selectedDocument.createdAt).toLocaleString('pt-PT')}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => {
          if (deleteConfirm.id) {
            deleteMutation.mutate(deleteConfirm.id);
          }
        }}
        title="Eliminar documento"
        message="Tens a certeza que queres eliminar este documento? Esta ação não pode ser desfeita e todas as versões serão eliminadas."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

