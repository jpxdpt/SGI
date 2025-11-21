import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Edit2, Trash2, X } from 'lucide-react';
import {
  createComment,
  fetchComments,
  updateComment,
  deleteComment,
  type Comment,
} from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Textarea } from './ui/Input';
import { useToast } from './ui/Toast';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Spinner } from './ui/Spinner';
import { useAuth } from '../context/AuthContext';

interface CommentsSectionProps {
  entityType: Comment['entityType'];
  entityId: string;
}

export const CommentsSection = ({ entityType, entityId }: CommentsSectionProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
  
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: () => fetchComments(entityType, entityId),
    enabled: hasToken, // Só executar se houver token
  });

  const createMutation = useMutation({
    mutationFn: (content: string) => createComment(entityType, entityId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      setNewComment('');
      showToast('Comentário adicionado!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao adicionar comentário.';
      showToast(message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => updateComment(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      setEditingId(null);
      setEditContent('');
      showToast('Comentário atualizado!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar comentário.';
      showToast(message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      setDeleteConfirm({ open: false, id: null });
      showToast('Comentário eliminado!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao eliminar comentário.';
      showToast(message, 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      createMutation.mutate(newComment.trim());
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSaveEdit = () => {
    if (editingId && editContent.trim()) {
      updateMutation.mutate({ id: editingId, content: editContent.trim() });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const canEditOrDelete = (comment: Comment) => {
    return user && (comment.user.id === user.id || user.role === 'ADMIN');
  };

  return (
    <Card>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-slate-500" />
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
            Comentários
            {comments.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">({comments.length})</span>
            )}
          </h3>
        </div>

        {/* Formulário de novo comentário */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicionar comentário..."
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              icon={createMutation.isPending ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
              disabled={!newComment.trim() || createMutation.isPending}
            >
              Comentar
            </Button>
          </div>
        </form>

        {/* Lista de comentários */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : comments.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum comentário</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="p-3 rounded-lg border border-[var(--color-border)] bg-slate-50/50 dark:bg-slate-900/20"
              >
                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                        Guardar
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-sm font-medium text-[var(--color-foreground)]">
                          {comment.user.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(comment.createdAt).toLocaleString('pt-PT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {comment.updatedAt !== comment.createdAt && ' (editado)'}
                        </div>
                      </div>
                      {canEditOrDelete(comment) && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit2 className="h-3 w-3" />}
                            onClick={() => handleEdit(comment)}
                            title="Editar"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 className="h-3 w-3" />}
                            onClick={() => setDeleteConfirm({ open: true, id: comment.id })}
                            title="Eliminar"
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-[var(--color-foreground)] whitespace-pre-wrap">
                      {comment.content}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Eliminar comentário"
        message="Tens a certeza de que queres eliminar este comentário?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => deleteConfirm.id && handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        variant="danger"
      />
    </Card>
  );
};

