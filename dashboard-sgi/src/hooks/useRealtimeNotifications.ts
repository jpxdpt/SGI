import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInternalAudits, fetchExternalAudits, fetchActionItems } from '../services/api';
import type { Notification } from '../components/ui/NotificationsDropdown';

const POLLING_INTERVAL = 30000; // 30 segundos
const NOTIFICATIONS_KEY = 'sgi_notifications_history';

export const useRealtimeNotifications = () => {
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const intervalRef = useRef<number | null>(null);
  const prevDataRef = useRef<{
    audits: string[];
    actions: string[];
  } | null>(null);

  // Carregar histórico de notificações do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const history = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        setNotifications(history.slice(0, 100)); // Manter apenas últimas 100
      } catch {
        // Ignorar erros de parse
      }
    }
  }, []);

  // Guardar histórico no localStorage
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem(
        NOTIFICATIONS_KEY,
        JSON.stringify(notifications.slice(0, 100)),
      );
    }
  }, [notifications]);

  // React Query com refetch automático
  const { data: internalAudits } = useQuery({
    queryKey: ['audits', 'internal'],
    queryFn: () => fetchInternalAudits(),
    refetchInterval: POLLING_INTERVAL,
    refetchIntervalInBackground: true,
  });

  const { data: externalAudits } = useQuery({
    queryKey: ['audits', 'external'],
    queryFn: () => fetchExternalAudits(),
    refetchInterval: POLLING_INTERVAL,
    refetchIntervalInBackground: true,
  });

  const { data: actions } = useQuery({
    queryKey: ['actions'],
    queryFn: () => fetchActionItems(),
    refetchInterval: POLLING_INTERVAL,
    refetchIntervalInBackground: true,
  });


  // Gerar novas notificações comparando dados atuais com anteriores
  const generateNotifications = useCallback(() => {
    const now = new Date();
    const newNotifications: Notification[] = [];
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const currentAudits = [
      ...(internalAudits ?? []).map((a) => a.id),
      ...(externalAudits ?? []).map((a) => a.id),
    ];
    const currentActions = (actions ?? []).map((a) => a.id);

    // Detectar novas auditorias
    if (prevDataRef.current) {
      const newAudits = currentAudits.filter(
        (id) => !prevDataRef.current!.audits.includes(id),
      );
      newAudits.forEach((id) => {
        const audit = [...(internalAudits ?? []), ...(externalAudits ?? [])].find(
          (a) => a.id === id,
        );
        if (audit) {
          newNotifications.push({
            id: `audit-new-${id}-${now.getTime()}`,
            type: 'audit_completed',
            title: 'Nova auditoria',
            message: `${audit.id} - ${audit.setor} foi adicionada`,
            timestamp: now,
            read: false,
            link: audit.id.startsWith('INT-') ? '/auditorias-internas' : '/auditorias-externas',
          });
        }
      });
    }

    // Obter notificações existentes para verificar duplicatas
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));

      // Auditorias próximas (próximos 3 dias)
      [...(internalAudits ?? []), ...(externalAudits ?? [])].forEach((audit) => {
        const dueDate = new Date(audit.dataPrevista);
        if (dueDate >= now && dueDate <= threeDaysFromNow && audit.status !== 'Executada') {
          const notificationId = `audit-due-${audit.id}`;
          if (!existingIds.has(notificationId)) {
            newNotifications.push({
              id: notificationId,
              type: 'audit_due',
              title: 'Auditoria próxima',
              message: `${audit.id} - ${audit.setor} está agendada para ${dueDate.toLocaleDateString('pt-PT')}`,
              timestamp: now,
              read: false,
              link: audit.id.startsWith('INT-') ? '/auditorias-internas' : '/auditorias-externas',
            });
          }
        }
      });

      // Ações atrasadas
      (actions ?? []).forEach((action) => {
        if (action.status === 'Atrasada') {
          const dueDate = new Date(action.dataLimite);
          const notificationId = `action-overdue-${action.id}`;
          if (!existingIds.has(notificationId)) {
            newNotifications.push({
              id: notificationId,
              type: 'action_overdue',
              title: 'Ação atrasada',
              message: `Ação ${action.id} no setor ${action.setor} está atrasada desde ${dueDate.toLocaleDateString('pt-PT')}`,
              timestamp: now,
              read: false,
              link: '/acoes',
            });
          }
        }
      });

      // Detectar mudanças de status crítico
      if (prevDataRef.current && actions) {
        actions.forEach((action) => {
          if (action.status === 'Atrasada') {
            const prevAction = prevDataRef.current?.actions.includes(action.id);
            if (!prevAction) {
              // Nova ação atrasada
              const dueDate = new Date(action.dataLimite);
              const notificationId = `action-new-overdue-${action.id}-${now.getTime()}`;
              if (!existingIds.has(notificationId)) {
                newNotifications.push({
                  id: notificationId,
                  type: 'action_overdue',
                  title: 'Ação ficou atrasada',
                  message: `Ação ${action.id} no setor ${action.setor} está agora atrasada`,
                  timestamp: now,
                  read: false,
                  link: '/acoes',
                });
              }
            }
          }
        });
      }

      // Atualizar referência para próxima verificação
      prevDataRef.current = {
        audits: currentAudits,
        actions: currentActions,
      };

      if (newNotifications.length > 0) {
        return [...newNotifications, ...prev].slice(0, 100);
      }

      return prev;
    });

    setLastCheck(now);
  }, [internalAudits, externalAudits, actions]);

  // Polling manual para garantir atualizações mesmo quando a aba está inativa
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      // Invalidar queries para forçar refetch
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      
      // Gerar notificações após um pequeno delay para os dados atualizarem
      setTimeout(generateNotifications, 1000);
    }, POLLING_INTERVAL);

    // Gerar notificações na montagem inicial
    generateNotifications();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryClient, generateNotifications]);

  return {
    notifications: notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    lastCheck,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
};



