import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Upload, Download, Trash2, FileText, Image, File } from 'lucide-react';
import {
  uploadAttachment,
  fetchAttachments,
  downloadAttachment,
  deleteAttachment,
  type Attachment,
} from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { useToast } from './ui/Toast';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Spinner } from './ui/Spinner';

interface AttachmentsSectionProps {
  entityType: Attachment['entityType'];
  entityId: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

export const AttachmentsSection = ({ entityType, entityId }: AttachmentsSectionProps) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
  
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['attachments', entityType, entityId],
    queryFn: () => fetchAttachments(entityType, entityId),
    enabled: hasToken, // Só executar se houver token
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(entityType, entityId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityId] });
      showToast('Anexo enviado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao enviar anexo.';
      showToast(message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAttachment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityId] });
      setDeleteConfirm({ open: false, id: null });
      showToast('Anexo eliminado com sucesso!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao eliminar anexo.';
      showToast(message, 'error');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
    // Reset input para permitir selecionar o mesmo ficheiro novamente
    e.target.value = '';
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      await downloadAttachment(attachment.id, attachment.originalName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao fazer download.';
      showToast(message, 'error');
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <Card>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-slate-500" />
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Anexos</h3>
            {attachments.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">({attachments.length})</span>
            )}
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploadMutation.isPending}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
            <Button
              variant="outline"
              size="sm"
              icon={uploadMutation.isPending ? <Spinner size="sm" /> : <Upload className="h-4 w-4" />}
              disabled={uploadMutation.isPending}
            >
              Adicionar
            </Button>
          </label>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum anexo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-100/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="text-slate-500 dark:text-slate-400">{getFileIcon(attachment.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-foreground)] truncate">
                    {attachment.originalName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatFileSize(attachment.size)} •{' '}
                    {new Date(attachment.createdAt).toLocaleDateString('pt-PT')}
                    {attachment.uploadedBy && ` • ${attachment.uploadedBy.name}`}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Download className="h-4 w-4" />}
                    onClick={() => handleDownload(attachment)}
                    title="Download"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setDeleteConfirm({ open: true, id: attachment.id })}
                    title="Eliminar"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Eliminar anexo"
        message="Tens a certeza de que queres eliminar este anexo? Esta ação não pode ser desfeita."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => deleteConfirm.id && handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        variant="danger"
      />
    </Card>
  );
};

