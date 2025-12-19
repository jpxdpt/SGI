import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Download,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  API_BASE,
  fetchDocumentReadComplianceStats,
  type DocumentReadComplianceStats,
} from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { useToast } from '../components/ui/Toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const complianceRateVariant = (rate: number) => {
  if (rate >= 80) return 'success';
  if (rate >= 50) return 'info';
  return 'danger';
};

const complianceRateLabel = (rate: number) => {
  if (rate >= 80) return 'Excelente';
  if (rate >= 50) return 'Aceitável';
  return 'Baixa';
};

export const DocumentReadCompliancePage = () => {
  const { showToast } = useToast();
  const [filters, setFilters] = useState({
    category: '',
    startDate: '',
    endDate: '',
  });

  const { data: stats, isLoading } = useQuery<DocumentReadComplianceStats>({
    queryKey: ['document-read-compliance', filters],
    queryFn: () => fetchDocumentReadComplianceStats(filters),
    enabled: !!API_BASE,
  });

  const handleExport = async () => {
    if (!stats) {
      showToast('Não há dados para exportar.', 'warning');
      return;
    }

    // Criar CSV simples
    let csv = 'Relatório de Conformidade de Leitura de Documentos\n\n';
    csv += `Período: ${filters.startDate || 'Início'} a ${filters.endDate || 'Fim'}\n\n`;
    
    csv += 'VISÃO GERAL\n';
    csv += `Total de Documentos,${stats.overview.totalDocuments}\n`;
    csv += `Total de Utilizadores,${stats.overview.totalUsers}\n`;
    csv += `Total de Confirmações,${stats.overview.totalConfirmations}\n`;
    csv += `Taxa de Conformidade,${stats.overview.overallComplianceRate.toFixed(2)}%\n\n`;

    csv += 'POR DOCUMENTO\n';
    csv += 'Título,Categoria,Confirmados,Esperados,Taxa de Conformidade\n';
    stats.byDocument.forEach((doc) => {
      csv += `"${doc.title}","${doc.category || 'N/A'}",${doc.totalConfirmed},${doc.totalExpected},${doc.complianceRate.toFixed(2)}%\n`;
    });

    csv += '\nPOR CATEGORIA\n';
    csv += 'Categoria,Documentos,Confirmados,Esperados,Taxa de Conformidade\n';
    stats.byCategory.forEach((cat) => {
      csv += `"${cat.category}",${cat.totalDocuments},${cat.totalConfirmations},${cat.totalExpected},${cat.complianceRate.toFixed(2)}%\n`;
    });

    csv += '\nPOR UTILIZADOR\n';
    csv += 'Nome,Email,Lidos,Esperados,Taxa de Conformidade\n';
    stats.byUser.forEach((user) => {
      csv += `"${user.userName}","${user.userEmail}",${user.totalRead},${user.totalExpected},${user.complianceRate.toFixed(2)}%\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `conformidade-leitura-documentos-${Date.now()}.csv`;
    window.document.body.appendChild(anchor);
    anchor.click();
    window.document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    showToast('Relatório exportado com sucesso!', 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conformidade de Leitura de Documentos"
        description="Relatórios e estatísticas sobre a conformidade de leitura de documentos"
        icon={<FileText className="h-6 w-6" />}
        actions={
          <Button
            onClick={handleExport}
            icon={<Download className="h-4 w-4" />}
            disabled={!API_BASE || isLoading || !stats}
          >
            Exportar CSV
          </Button>
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
            <Input
              label="Data Início"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              icon={<Calendar className="h-4 w-4" />}
            />
            <Input
              label="Data Fim"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              icon={<Calendar className="h-4 w-4" />}
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <TableSkeleton columns={4} rows={5} />
      ) : !stats ? (
        <Card>
          <div className="p-12 text-center text-slate-600 dark:text-slate-300">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Não há dados disponíveis.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* KPIs Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Documentos</span>
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-[var(--color-foreground)]">
                  {stats.overview.totalDocuments}
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Utilizadores</span>
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-[var(--color-foreground)]">
                  {stats.overview.totalUsers}
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Confirmações</span>
                  <CheckCircle2 className="h-5 w-5 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-[var(--color-foreground)]">
                  {stats.overview.totalConfirmations}
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Conformidade</span>
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-2xl font-bold text-[var(--color-foreground)]">
                  {stats.overview.overallComplianceRate.toFixed(1)}%
                </div>
                <Badge variant={complianceRateVariant(stats.overview.overallComplianceRate)} className="mt-1">
                  {complianceRateLabel(stats.overview.overallComplianceRate)}
                </Badge>
              </div>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gráfico por Categoria */}
            {stats.byCategory.length > 0 && (
              <Card>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
                    Conformidade por Categoria
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.byCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <Bar dataKey="complianceRate" fill="#3b82f6" name="Taxa de Conformidade (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Gráfico de Pizza - Distribuição */}
            {stats.byCategory.length > 0 && (
              <Card>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
                    Distribuição de Documentos por Categoria
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.byCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, totalDocuments }) => `${category}: ${totalDocuments}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalDocuments"
                        nameKey="category"
                      >
                        {stats.byCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>

          {/* Tabela por Documento */}
          {stats.byDocument.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-4 p-4 border-b border-[var(--color-border)]">
                Conformidade por Documento
              </h3>
              <Table
                data={stats.byDocument}
                columns={[
                  {
                    key: 'title',
                    title: 'Documento',
                    render: (row) => (
                      <div>
                        <div className="font-semibold text-[var(--color-foreground)]">{row.title}</div>
                        {row.category && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{row.category}</div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'totalConfirmed',
                    title: 'Confirmados',
                    render: (row) => (
                      <span className="text-sm text-slate-600 dark:text-slate-300">{row.totalConfirmed}</span>
                    ),
                  },
                  {
                    key: 'totalExpected',
                    title: 'Esperados',
                    render: (row) => (
                      <span className="text-sm text-slate-600 dark:text-slate-300">{row.totalExpected}</span>
                    ),
                  },
                  {
                    key: 'complianceRate',
                    title: 'Conformidade',
                    render: (row) => (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--color-foreground)]">
                          {row.complianceRate.toFixed(1)}%
                        </span>
                        <Badge variant={complianceRateVariant(row.complianceRate)}>
                          {complianceRateLabel(row.complianceRate)}
                        </Badge>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          )}

          {/* Tabela por Utilizador */}
          {stats.byUser.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-4 p-4 border-b border-[var(--color-border)]">
                Conformidade por Utilizador
              </h3>
              <Table
                data={stats.byUser}
                columns={[
                  {
                    key: 'userName',
                    title: 'Utilizador',
                    render: (row) => (
                      <div>
                        <div className="font-semibold text-[var(--color-foreground)]">{row.userName || 'N/A'}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{row.userEmail}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'totalRead',
                    title: 'Lidos',
                    render: (row) => (
                      <span className="text-sm text-slate-600 dark:text-slate-300">{row.totalRead}</span>
                    ),
                  },
                  {
                    key: 'totalExpected',
                    title: 'Esperados',
                    render: (row) => (
                      <span className="text-sm text-slate-600 dark:text-slate-300">{row.totalExpected}</span>
                    ),
                  },
                  {
                    key: 'complianceRate',
                    title: 'Conformidade',
                    render: (row) => (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--color-foreground)]">
                          {row.complianceRate.toFixed(1)}%
                        </span>
                        <Badge variant={complianceRateVariant(row.complianceRate)}>
                          {complianceRateLabel(row.complianceRate)}
                        </Badge>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
};







