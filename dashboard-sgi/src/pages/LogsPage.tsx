import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Filter, Download } from 'lucide-react';
import { fetchAuditLogs, type AuditLog, type AuditLogsQuery } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table, type TableColumn } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { exportToCsv } from '../utils/exportUtils';

const actionColors: Record<AuditLog['action'], 'success' | 'danger' | 'info' | 'warning' | 'default'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'default',
  LOGOUT: 'default',
  IMPORT: 'warning',
};

const actionLabels: Record<AuditLog['action'], string> = {
  CREATE: 'Criar',
  UPDATE: 'Atualizar',
  DELETE: 'Eliminar',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  IMPORT: 'Importar',
};

export const LogsPage = () => {
  const [filters, setFilters] = useState<AuditLogsQuery>({
    page: 1,
    limit: 50,
  });
  const [actionFilter, setActionFilter] = useState<AuditLog['action'] | ''>('');
  const [entityFilter, setEntityFilter] = useState('');

  const query = useQuery({
    queryKey: ['logs', filters, actionFilter, entityFilter],
    queryFn: () =>
      fetchAuditLogs({
        ...filters,
        action: actionFilter || undefined,
        entity: entityFilter || undefined,
      }),
  });

  const { data: logsData, isLoading } = query;
  const logs = logsData?.data || [];
  const pagination = logsData?.pagination;

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setFilters((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const exportCsv = () => {
    const headers = ['Data/Hora', 'Utilizador', 'Ação', 'Entidade', 'Descrição'];
    const rows = logs.map((log) => [
      new Date(log.createdAt).toLocaleString('pt-PT'),
      log.userName || log.userEmail || 'Sistema',
      actionLabels[log.action],
      log.entity,
      log.description,
    ]);

    exportToCsv('logs-auditoria.csv', headers, rows);
  };

  const clearFilters = () => {
    setActionFilter('');
    setEntityFilter('');
    setFilters({ page: 1, limit: 50 });
  };

  const filteredLogs = logs;

  const columns: TableColumn<AuditLog>[] = [
    {
      key: 'createdAt',
      title: 'Data/Hora',
      render: (log) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {new Date(log.createdAt).toLocaleString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'user',
      title: 'Utilizador',
      render: (log) => (
        <div className="text-sm">
          <div className="font-medium text-[var(--color-foreground)]">
            {log.userName || 'Sistema'}
          </div>
          {log.userEmail && (
            <div className="text-xs text-slate-600 dark:text-slate-300">{log.userEmail}</div>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      title: 'Ação',
      render: (log) => <Badge variant={actionColors[log.action]}>{actionLabels[log.action]}</Badge>,
    },
    {
      key: 'entity',
      title: 'Entidade',
      render: (log) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">{log.entity}</span>
      ),
    },
    {
      key: 'description',
      title: 'Descrição',
      render: (log) => (
        <span className="text-sm text-[var(--color-foreground)] max-w-md truncate block">
          {log.description}
        </span>
      ),
    },
    {
      key: 'metadata',
      title: 'Detalhes',
      render: (log) =>
        log.metadata && Object.keys(log.metadata).length > 0 ? (
          <details className="text-xs">
            <summary className="cursor-pointer text-brand-500 hover:text-brand-600">
              Ver detalhes
            </summary>
            <pre className="mt-2 p-2 bg-slate-50 dark:bg-slate-900 rounded text-xs overflow-auto max-w-xs">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </details>
        ) : (
          <span className="text-xs text-slate-600 dark:text-slate-300">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs de Auditoria"
        description="Registo de todas as ações realizadas no sistema"
        icon={<FileText className="h-6 w-6" />}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} icon={<Download className="h-4 w-4" />}>
              Exportar CSV
            </Button>
          </>
        }
      />

      {/* Filtros */}
      <Card>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Filter className="h-4 w-4" />
            Filtros
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Ação
              </label>
              <Select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as AuditLog['action'] | '')}
                className="w-full"
              >
                <option value="">Todas as ações</option>
                <option value="CREATE">Criar</option>
                <option value="UPDATE">Atualizar</option>
                <option value="DELETE">Eliminar</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="IMPORT">Importar</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Entidade
              </label>
              <input
                type="text"
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                placeholder="Ex: InternalAudit, ActionItem..."
                className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Limpar Filtros
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        {isLoading ? (
          <TableSkeleton columns={6} rows={10} />
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-600 dark:text-slate-300">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Nenhum log encontrado</p>
          </div>
        ) : (
          <>
            <Table columns={columns} data={filteredLogs} emptyState="Nenhum log encontrado" />

            {/* Paginação */}
            {pagination && pagination.totalPages > 1 && (
              <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}{' '}
                  registos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="text-sm"
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="text-sm"
                  >
                    Próxima
                  </Button>
                  <Select
                    value={pagination.limit}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                    className="text-sm w-auto"
                  >
                    <option value={20}>20 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                  </Select>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

