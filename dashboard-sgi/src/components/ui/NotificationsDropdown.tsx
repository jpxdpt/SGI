import { Bell, Check, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import clsx from 'clsx';
import { useToast } from './Toast';
import { useNavigate } from 'react-router-dom';

export interface Notification {
  id: string;
  type: 'audit_due' | 'action_overdue' | 'occurrence_critical' | 'audit_completed';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

export const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { notifications, unreadCount } = useRealtimeNotifications();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Carregar notificações lidas do localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sgi_read_notifications');
    if (stored) {
      try {
        setReadIds(new Set(JSON.parse(stored)));
      } catch {
        // Ignorar erros de parse
      }
    }
  }, []);

  // Guardar notificações lidas no localStorage
  useEffect(() => {
    if (readIds.size > 0) {
      localStorage.setItem('sgi_read_notifications', JSON.stringify(Array.from(readIds)));
    }
  }, [readIds]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Usar unreadCount do hook e calcular localmente para filtros
  const localUnreadCount = notifications.filter((n) => !readIds.has(n.id)).length;
  const displayUnreadCount = unreadCount > localUnreadCount ? unreadCount : localUnreadCount;
  const unreadNotifications = notifications.filter((n) => !readIds.has(n.id));
  const readNotifications = notifications.filter((n) => readIds.has(n.id)).slice(0, 5);

  const markAsRead = (id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    showToast('Todas as notificações marcadas como lidas', 'success');
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        aria-label={`Notificações${displayUnreadCount > 0 ? `, ${displayUnreadCount} não lidas` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Notificações"
      >
        <Bell className="h-5 w-5" />
        {displayUnreadCount > 0 && (
          <span 
            className="absolute top-1 right-1 h-2 w-2 bg-rose-500 rounded-full"
            aria-hidden="true"
          />
        )}
        {displayUnreadCount > 0 && (
          <span className="sr-only">{displayUnreadCount} notificação{displayUnreadCount !== 1 ? 'ões' : ''} não lida{displayUnreadCount !== 1 ? 's' : ''}</span>
        )}
      </button>

      {isOpen && (
        <div 
          role="menu"
          aria-label="Notificações"
          className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 animate-scale-in max-h-[500px] flex flex-col focus:outline-none"
          tabIndex={-1}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Notificações</h3>
              {displayUnreadCount > 0 && (
                <span 
                  className="px-2 py-0.5 text-xs font-medium bg-rose-500 text-white rounded-full"
                  aria-label={`${displayUnreadCount} não lidas`}
                >
                  {displayUnreadCount}
                </span>
              )}
            </div>
            {displayUnreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-brand-500 hover:text-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 rounded px-1"
                aria-label="Marcar todas as notificações como lidas"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Não há notificações</p>
              </div>
            ) : (
              <>
                {unreadNotifications.length > 0 && (
                  <div className="p-2">
                    {unreadNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        role="menuitem"
                        onClick={() => handleNotificationClick(notification)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNotificationClick(notification);
                          }
                        }}
                        className={clsx(
                          'w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2',
                          'border-l-4 border-rose-500 bg-rose-50/50 dark:bg-rose-900/10',
                          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1',
                        )}
                        aria-label={`${notification.title}: ${notification.message}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm mb-1">{notification.title}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">{notification.message}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {notification.timestamp.toLocaleTimeString('pt-PT', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-black/10 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 cursor-pointer"
                            aria-label={`Marcar ${notification.title} como lida`}
                          >
                            <Check className="h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {readNotifications.length > 0 && unreadNotifications.length > 0 && (
                  <div className="border-t border-[var(--color-border)] px-4 py-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Anteriores</p>
                  </div>
                )}

                {readNotifications.length > 0 && (
                  <div className="p-2">
                    {readNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2 opacity-60"
                      >
                        <p className="font-medium text-sm mb-1">{notification.title}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {notification.timestamp.toLocaleTimeString('pt-PT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

