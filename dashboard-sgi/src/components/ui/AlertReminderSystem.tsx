import { AlertTriangle, Clock, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchInternalAudits,
  fetchExternalAudits,
  fetchActionItems,
} from '../../services/api';
import { Card } from './Card';
import { Badge } from './Badge';
import clsx from 'clsx';
import { useToast } from './Toast';

export const AlertReminderSystem = () => {
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'warning' | 'danger' | 'info';
    title: string;
    message: string;
    action?: string;
  }>>([]);

  const internalAuditsQuery = useQuery({ queryKey: ['audits', 'internal'], queryFn: () => fetchInternalAudits() });
  const externalAuditsQuery = useQuery({ queryKey: ['audits', 'external'], queryFn: () => fetchExternalAudits() });
  const actionsQuery = useQuery({ queryKey: ['actions'], queryFn: () => fetchActionItems() });

  useEffect(() => {
    const newAlerts: typeof alerts = [];
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Auditorias próximas (próximos 3 dias)
    [...(internalAuditsQuery.data ?? []), ...(externalAuditsQuery.data ?? [])].forEach((audit) => {
      const dueDate = new Date(audit.dataPrevista);
      if (dueDate >= now && dueDate <= threeDaysFromNow && audit.status !== 'Executada') {
        const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        newAlerts.push({
          id: `audit-${audit.id}`,
          type: daysUntil <= 1 ? 'danger' : 'warning',
          title: `Auditoria próxima: ${audit.id}`,
          message: `${audit.setor} - ${daysUntil === 0 ? 'Hoje' : `Em ${daysUntil} dias`}`,
          action: `/auditorias-${audit.id.startsWith('INT-') ? 'internas' : 'externas'}`,
        });
      }
    });

    // Ações atrasadas
    (actionsQuery.data ?? []).forEach((action) => {
      if (action.status === 'Atrasada') {
        const dueDate = new Date(action.dataLimite);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
        newAlerts.push({
          id: `action-${action.id}`,
          type: 'danger',
          title: `Ação atrasada: ${action.id}`,
          message: `${action.setor} - Atrasada há ${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'}`,
          action: '/acoes',
        });
      } else if (action.status === 'Em andamento') {
        const dueDate = new Date(action.dataLimite);
        if (dueDate >= now && dueDate <= tomorrow) {
          newAlerts.push({
            id: `action-due-${action.id}`,
            type: 'warning',
            title: `Ação com prazo próximo: ${action.id}`,
            message: `${action.setor} - Prazo: ${dueDate.toLocaleDateString('pt-PT')}`,
            action: '/acoes',
          });
        }
      }
    });

    setAlerts(newAlerts);
  }, [
    internalAuditsQuery.data,
    externalAuditsQuery.data,
    actionsQuery.data,
  ]);

  if (alerts.length === 0) return null;

  const criticalAlerts = alerts.filter((a) => a.type === 'danger');
  const warningAlerts = alerts.filter((a) => a.type === 'warning');
  const infoAlerts = alerts.filter((a) => a.type === 'info');

  return (
    <Card title="Alertas e lembretes" className="mb-6">
      <div className="space-y-3">
        {criticalAlerts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Crítico</span>
              <Badge variant="danger" className="text-xs">{criticalAlerts.length}</Badge>
            </div>
            <div className="space-y-2">
              {criticalAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg border-l-4 border-rose-500 bg-rose-50/50 dark:bg-rose-900/10"
                >
                  <p className="font-medium text-sm mb-1">{alert.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {warningAlerts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Aviso</span>
              <Badge variant="warning" className="text-xs">{warningAlerts.length}</Badge>
            </div>
            <div className="space-y-2">
              {warningAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-900/10"
                >
                  <p className="font-medium text-sm mb-1">{alert.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {alerts.length > 6 && (
          <p className="text-xs text-slate-500 text-center pt-2">
            E mais {alerts.length - 6} alertas...
          </p>
        )}
      </div>
    </Card>
  );
};





