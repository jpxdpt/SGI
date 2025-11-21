import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import {
  fetchApproval,
  createApproval,
  updateApproval,
  type Approval,
} from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Textarea } from './ui/Input';
import { useToast } from './ui/Toast';
import { Spinner } from './ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

interface ApprovalSectionProps {
  entityType: Approval['entityType'];
  entityId: string;
}

const statusConfig: Record<
  Approval['status'],
  { label: string; variant: 'success' | 'danger' | 'warning' | 'default'; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'Pendente',
    variant: 'warning',
    icon: <Clock className="h-4 w-4" />,
  },
  APPROVED: {
    label: 'Aprovado',
    variant: 'success',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  REJECTED: {
    label: 'Rejeitado',
    variant: 'danger',
    icon: <XCircle className="h-4 w-4" />,
  },
};

export const ApprovalSection = ({ entityType, entityId }: ApprovalSectionProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [requestComments, setRequestComments] = useState('');
  const [approveStatus, setApproveStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [approveComments, setApproveComments] = useState('');

  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
  
  const { data: approval, isLoading } = useQuery({
    queryKey: ['approval', entityType, entityId],
    queryFn: () => fetchApproval(entityType, entityId),
    enabled: hasToken, // Só executar se houver token
  });

  const createMutation = useMutation({
    mutationFn: (comments?: string) => createApproval(entityType, entityId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval', entityType, entityId] });
      setRequestModalOpen(false);
      setRequestComments('');
      showToast('Aprovação solicitada!', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao solicitar aprovação.';
      showToast(message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ status, comments }: { status: 'APPROVED' | 'REJECTED'; comments?: string }) =>
      updateApproval(approval!.id, status, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval', entityType, entityId] });
      setApproveModalOpen(false);
      setApproveComments('');
      showToast(`Aprovação ${approveStatus === 'APPROVED' ? 'aprovada' : 'rejeitada'}!`, 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar aprovação.';
      showToast(message, 'error');
    },
  });

  const canRequest = !approval && user;
  const canApprove =
    approval &&
    approval.status === 'PENDING' &&
    user &&
    (user.role === 'ADMIN' || user.role === 'GESTOR');

  const handleRequest = () => {
    createMutation.mutate(requestComments || undefined);
  };

  const handleApprove = () => {
    if (approval) {
      updateMutation.mutate({ status: approveStatus, comments: approveComments || undefined });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-4 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Aprovação</h3>
            {canRequest && (
              <Button size="sm" variant="outline" onClick={() => setRequestModalOpen(true)}>
                Solicitar Aprovação
              </Button>
            )}
            {canApprove && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setApproveStatus('APPROVED');
                    setApproveModalOpen(true);
                  }}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                >
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setApproveStatus('REJECTED');
                    setApproveModalOpen(true);
                  }}
                  icon={<XCircle className="h-4 w-4" />}
                >
                  Rejeitar
                </Button>
              </div>
            )}
          </div>

          {!approval ? (
            <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p>Nenhuma aprovação solicitada</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={statusConfig[approval.status].variant} icon={statusConfig[approval.status].icon}>
                  {statusConfig[approval.status].label}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Solicitado por: </span>
                  <span className="font-medium text-[var(--color-foreground)]">
                    {approval.requestedBy.name}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2">
                    {new Date(approval.createdAt).toLocaleDateString('pt-PT')}
                  </span>
                </div>

                {approval.approvedBy && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">
                      {approval.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'} por:{' '}
                    </span>
                    <span className="font-medium text-[var(--color-foreground)]">
                      {approval.approvedBy.name}
                    </span>
                    {approval.approvedAt && (
                      <span className="text-slate-500 dark:text-slate-400 ml-2">
                        {new Date(approval.approvedAt).toLocaleDateString('pt-PT')}
                      </span>
                    )}
                  </div>
                )}

                {approval.comments && (
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300">
                    {approval.comments}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Modal de solicitar aprovação */}
      <Modal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Solicitar Aprovação"
      >
        <div className="space-y-4">
          <Textarea
            value={requestComments}
            onChange={(e) => setRequestComments(e.target.value)}
            placeholder="Comentários (opcional)..."
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRequestModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRequest}
              disabled={createMutation.isPending}
              icon={createMutation.isPending ? <Spinner size="sm" /> : undefined}
            >
              Solicitar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de aprovar/rejeitar */}
      <Modal
        open={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title={approveStatus === 'APPROVED' ? 'Aprovar' : 'Rejeitar'}
      >
        <div className="space-y-4">
          <Textarea
            value={approveComments}
            onChange={(e) => setApproveComments(e.target.value)}
            placeholder="Comentários (opcional)..."
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setApproveModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={updateMutation.isPending}
              variant={approveStatus === 'REJECTED' ? 'danger' : 'default'}
              icon={updateMutation.isPending ? <Spinner size="sm" /> : undefined}
            >
              {approveStatus === 'APPROVED' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

