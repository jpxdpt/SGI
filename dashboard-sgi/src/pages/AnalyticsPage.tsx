import { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/analytics/KPICard';
import { TrendCharts } from '../components/analytics/TrendCharts';
import { SectorHeatmap } from '../components/analytics/SectorHeatmap';
import { fetchDashboardKPIs, fetchAnalyticsTrends, fetchSectorPerformance, fetchSectors, fetchOccurrencesAnalytics } from '../services/api';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '../components/ui/Spinner';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Sector {
  id: string;
  nome: string;
}

export const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: startOfMonth(subMonths(new Date(), 11)),
    end: endOfMonth(new Date()),
  });
  const [sector, setSector] = useState<string>('');
  const [sectors, setSectors] = useState<Sector[]>([]);

  useEffect(() => {
    fetchSectors()
      .then((data) => {
        // fetchSectors já retorna um array
        setSectors(data.map((s: any) => ({ id: s.id, nome: s.nome || s.nome })));
      })
      .catch(() => {
        // Em caso de erro, manter array vazio
        setSectors([]);
      });
  }, []);

  const { data: kpis, isLoading: loadingKPIs } = useQuery({
    queryKey: ['analytics', 'kpis', dateRange, sector],
    queryFn: () => fetchDashboardKPIs() // Em produção passaria os filtros aqui
  });

  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ['analytics', 'trends', dateRange, sector],
    queryFn: () => fetchAnalyticsTrends() // Em produção passaria os filtros aqui
  });

  const { data: sectorPerformance, isLoading: loadingSectors } = useQuery({
    queryKey: ['analytics', 'sectors', dateRange],
    queryFn: () => fetchSectorPerformance() // Em produção passaria os filtros aqui
  });

  const { data: occurrencesAnalytics, isLoading: loadingOccurrences } = useQuery({
    queryKey: ['analytics', 'occurrences'],
    queryFn: () => fetchOccurrencesAnalytics(),
  });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório de Business Intelligence', 14, 22);
    doc.setFontSize(11);
    const periodText = dateRange.start && dateRange.end
      ? `${dateRange.start.toLocaleDateString()} a ${dateRange.end.toLocaleDateString()}`
      : 'Período não definido';
    doc.text(`Período: ${periodText}`, 14, 30);
    if (sector) doc.text(`Setor: ${sector}`, 14, 36);

    // KPIs
    const kpiData = [
      ['Indicador', 'Valor'],
      ['Total Auditorias', kpis?.audits?.total || 0],
      ['Auditorias Internas', kpis?.audits?.internal || 0],
      ['Auditorias Externas', kpis?.audits?.external || 0],
      ['Taxa de Conformidade', `${kpis?.actions?.complianceRate || 0}%`],
      ['Ações em Atraso', kpis?.actions?.overdue || 0],
      ['Ocorrências Abertas', kpis?.occurrences?.open || 0],
    ];

    autoTable(doc, {
      head: [['Indicador', 'Valor']],
      body: kpiData.slice(1),
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Performance por Setor
    if (sectorPerformance && sectorPerformance.length > 0) {
      const sectorData = sectorPerformance.map((s: any) => [s.name, s.total, s.completed, s.overdue]);
      autoTable(doc, {
        head: [['Setor', 'Total Ações', 'Concluídas', 'Atrasadas']],
        body: sectorData,
        startY: (doc as any).lastAutoTable.finalY + 15,
        theme: 'striped'
      });
    }

    doc.save('relatorio-bi.pdf');
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // KPIs Sheet
    const kpiData = [
      { Indicador: 'Total Auditorias', Valor: kpis?.audits?.total || 0 },
      { Indicador: 'Auditorias Internas', Valor: kpis?.audits?.internal || 0 },
      { Indicador: 'Auditorias Externas', Valor: kpis?.audits?.external || 0 },
      { Indicador: 'Taxa de Conformidade', Valor: `${kpis?.actions?.complianceRate || 0}%` },
      { Indicador: 'Ações em Atraso', Valor: kpis?.actions?.overdue || 0 },
      { Indicador: 'Ocorrências Abertas', Valor: kpis?.occurrences?.open || 0 },
    ];
    const wsKPI = XLSX.utils.json_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, wsKPI, 'KPIs');

    // Trends Sheet
    if (trends && trends.length > 0) {
      const wsTrends = XLSX.utils.json_to_sheet(trends);
      XLSX.utils.book_append_sheet(wb, wsTrends, 'Tendências Mensais');
    }

    // Sectors Sheet
    if (sectorPerformance && sectorPerformance.length > 0) {
      const wsSectors = XLSX.utils.json_to_sheet(sectorPerformance);
      XLSX.utils.book_append_sheet(wb, wsSectors, 'Performance Setores');
    }

    XLSX.writeFile(wb, 'relatorio-bi.xlsx');
  };

  const isLoading = loadingKPIs || loadingTrends || loadingSectors || loadingOccurrences;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Analytics & BI"
        subtitle="Análise de dados, tendências e indicadores de performance."
        actions={
          <div className="flex gap-3">
            <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={handleExportExcel}>
              Exportar Excel
            </Button>
            <Button variant="primary" icon={<Download className="h-4 w-4" />} onClick={handleExportPDF}>
              Exportar PDF
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
            <DateRangePicker
              value={dateRange}
              onChange={(range) => setDateRange(range)}
            />
          </div>

          <div className="w-full md:w-64">
            <Select
              label="Filtrar por Setor"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              options={[
                { value: '', label: 'Todos os setores' },
                ...sectors.map(s => ({ value: s.nome, label: s.nome }))
              ]}
            />
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Auditorias internas" value={kpis?.audits?.internal ?? 0} />
        <KPICard label="Auditorias externas" value={kpis?.audits?.external ?? 0} />
        <KPICard
          label="Ações geradas"
          value={kpis?.actions?.total ?? 0}
          delta={kpis?.actions?.overdue > 0 ? `${kpis.actions.overdue} em atraso` : undefined}
          accent={kpis?.actions?.overdue > 0 ? 'secondary' : 'primary'}
        />
        <KPICard
          label="Conformidade"
          value={`${kpis?.actions?.complianceRate ?? 0}%`}
          detail="Taxa de conclusão"
          accent={(kpis?.actions?.complianceRate ?? 0) >= 80 ? 'primary' : 'secondary'}
        />
        {occurrencesAnalytics?.byType && (
          <>
            <KPICard
              label="Reclamações"
              value={occurrencesAnalytics.byType.find((t: any) => t.tipo === 'RECLAMACAO')?._count?._all || 0}
            />
            <KPICard
              label="Sugestões"
              value={occurrencesAnalytics.byType.find((t: any) => t.tipo === 'SUGESTAO')?._count?._all || 0}
            />
          </>
        )}
      </section>

      {/* Gráficos */}
      <section className="grid gap-4 lg:grid-cols-2">
        <TrendCharts data={trends ?? []} />
        <SectorHeatmap data={sectorPerformance ?? []} />
        {occurrencesAnalytics?.byType && (
          <Card title="Ocorrências por tipo">
            <div className="space-y-2">
              {occurrencesAnalytics.byType.map((item: any) => (
                <div key={item.tipo} className="flex justify-between text-sm">
                  <span>{item.tipo}</span>
                  <span className="font-semibold">{item._count?._all ?? 0}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
};
