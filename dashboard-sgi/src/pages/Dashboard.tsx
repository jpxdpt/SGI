import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  Brush,
  Area,
  AreaChart,
} from 'recharts';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { KpiCard } from '../components/ui/KpiCard';
import { WelcomeCard } from '../components/ui/WelcomeCard';
import { AlertReminderSystem } from '../components/ui/AlertReminderSystem';
import { ScheduledReports } from '../components/ui/ScheduledReports';
import { InteractiveChart } from '../components/ui/InteractiveChart';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { DashboardFiltersPanel, type DashboardFilters } from '../components/DashboardFilters';
import { ClipboardList, Briefcase, ListChecks, ShieldAlert, Building2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '../components/ui/Toast';
import {
  fetchActionItems,
  fetchDashboardSummary,
  fetchExternalAudits,
  fetchInternalAudits,
  fetchOccurrences,
  fetchSectors,
} from '../services/api';
const COLORS = ['#0ea5e9', '#38bdf8', '#f97316', '#ef4444', '#8b5cf6', '#10b981'];

export const DashboardPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>({
    dateRange: null,
    ano: 'Todos',
  });

  const internalAuditsQuery = useQuery({ queryKey: ['audits', 'internal'], queryFn: () => fetchInternalAudits() });
  const externalAuditsQuery = useQuery({ queryKey: ['audits', 'external'], queryFn: () => fetchExternalAudits() });
  const actionsQuery = useQuery({ queryKey: ['actions'], queryFn: () => fetchActionItems() });
  const occurrencesQuery = useQuery({ queryKey: ['occurrences'], queryFn: () => fetchOccurrences() });
  const summaryQuery = useQuery({ queryKey: ['summary'], queryFn: () => fetchDashboardSummary() });
  const sectorsQuery = useQuery({ queryKey: ['sectors'], queryFn: () => fetchSectors() });

  const allInternas = internalAuditsQuery.data ?? [];
  const allExternas = externalAuditsQuery.data ?? [];
  const allActions = actionsQuery.data ?? [];
  const allOccs = occurrencesQuery.data ?? [];
  const sectors = sectorsQuery.data ?? [];

  // TODOS OS HOOKS DEVEM SER CHAMADOS ANTES DE QUALQUER RETURN
  // Aplicar filtros aos dados - useMemo devem estar antes do early return
  const internas = useMemo(() => {
    return allInternas.filter((audit) => {
      if (dashboardFilters.ano !== 'Todos' && audit.ano.toString() !== dashboardFilters.ano) return false;
      if (dashboardFilters.dateRange) {
        // Usar inicio ou termino para filtro de data (prioridade: termino > inicio)
        const auditDate = audit.termino ? new Date(audit.termino) : 
                         audit.inicio ? new Date(audit.inicio) : null;
        if (!auditDate) return true; // Se não houver data, não filtrar
        const startDate = dashboardFilters.dateRange.start ? new Date(dashboardFilters.dateRange.start) : null;
        const endDate = dashboardFilters.dateRange.end ? new Date(dashboardFilters.dateRange.end) : null;
        if (startDate && auditDate < startDate) return false;
        if (endDate && auditDate > endDate) return false;
      }
      return true;
    });
  }, [allInternas, dashboardFilters]);

  const externas = useMemo(() => {
    return allExternas.filter((audit) => {
      if (dashboardFilters.ano !== 'Todos' && audit.ano.toString() !== dashboardFilters.ano) return false;
      if (dashboardFilters.dateRange) {
        // Usar inicio ou termino para filtro de data (prioridade: termino > inicio)
        const auditDate = audit.termino ? new Date(audit.termino) : 
                         audit.inicio ? new Date(audit.inicio) : null;
        if (!auditDate) return true; // Se não houver data, não filtrar
        const startDate = dashboardFilters.dateRange.start ? new Date(dashboardFilters.dateRange.start) : null;
        const endDate = dashboardFilters.dateRange.end ? new Date(dashboardFilters.dateRange.end) : null;
        if (startDate && auditDate < startDate) return false;
        if (endDate && auditDate > endDate) return false;
      }
      return true;
    });
  }, [allExternas, dashboardFilters]);

  const actions = useMemo(() => {
    return allActions.filter((action) => {
      if (dashboardFilters.setor !== 'Todos' && action.setor !== dashboardFilters.setor) return false;
      if (dashboardFilters.dateRange) {
        const actionDate = new Date(action.dataAbertura);
        const startDate = dashboardFilters.dateRange.start ? new Date(dashboardFilters.dateRange.start) : null;
        const endDate = dashboardFilters.dateRange.end ? new Date(dashboardFilters.dateRange.end) : null;
        if (startDate && actionDate < startDate) return false;
        if (endDate && actionDate > endDate) return false;
      }
      return true;
    });
  }, [allActions, dashboardFilters]);

  const occs = useMemo(() => {
    return allOccs.filter((occ) => {
      if (dashboardFilters.setor !== 'Todos' && occ.setor !== dashboardFilters.setor) return false;
      if (dashboardFilters.dateRange) {
        const occDate = new Date(occ.data);
        const startDate = dashboardFilters.dateRange.start ? new Date(dashboardFilters.dateRange.start) : null;
        const endDate = dashboardFilters.dateRange.end ? new Date(dashboardFilters.dateRange.end) : null;
        if (startDate && occDate < startDate) return false;
        if (endDate && occDate > endDate) return false;
      }
      return true;
    });
  }, [allOccs, dashboardFilters]);

  // Obter setores únicos para filtro (apenas de ações e ocorrências)
  const uniqueSetores = useMemo(() => {
    const setores = new Set<string>();
    allActions.forEach((a) => setores.add(a.setor));
    allOccs.forEach((o) => setores.add(o.setor));
    return Array.from(setores).sort();
  }, [allActions, allOccs]);

  // Cruzar ações com auditorias: contar ações relacionadas a cada auditoria
  const actionsByAudit = useMemo(() => {
    const result: Record<string, number> = {};
    actions.forEach((action) => {
      if (action.acaoRelacionada) {
        result[action.acaoRelacionada] = (result[action.acaoRelacionada] ?? 0) + 1;
      }
    });
    return result;
  }, [actions]);

  // Distribuição por ano (substituindo distribuição por status) - DEVE ESTAR ANTES DO EARLY RETURN
  const internasByAno = useMemo(() => {
    return internas.reduce<Record<number, number>>((acc, audit) => {
      acc[audit.ano] = (acc[audit.ano] ?? 0) + 1;
      return acc;
    }, {});
  }, [internas]);

  const externasByAno = useMemo(() => {
    return externas.reduce<Record<number, number>>((acc, audit) => {
      acc[audit.ano] = (acc[audit.ano] ?? 0) + 1;
      return acc;
    }, {});
  }, [externas]);

  const loading =
    internalAuditsQuery.isLoading ||
    externalAuditsQuery.isLoading ||
    actionsQuery.isLoading ||
    occurrencesQuery.isLoading ||
    summaryQuery.isLoading ||
    sectorsQuery.isLoading;

  const hasAnyData = internas.length + externas.length + actions.length + occs.length + sectors.length > 0;

  // Early return APÓS todos os hooks serem chamados
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" variant="rectangular" />
          <Skeleton className="h-4 w-96" variant="text" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="gap-2 h-full">
              <Skeleton className="h-3 w-32" variant="text" />
              <Skeleton className="h-8 w-16" variant="text" />
            </Card>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} title="">
              <Skeleton className="h-64 w-full" variant="rectangular" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calcular mudanças percentuais (mock para demo - em produção, calcular com dados históricos)
  const calculateChange = (current: number) => {
    // Simulação: assumir 10-20% de crescimento para demo
    return Math.floor(Math.random() * 15) + 10;
  };

  const cards = [
    {
      title: 'AUDITORIAS INTERNAS',
      value: summaryQuery.data?.totalInternas ?? internas.length,
      change: calculateChange(internas.length),
      icon: <ClipboardList className="h-6 w-6" />,
      iconBgColor: 'bg-blue-500',
    },
    {
      title: 'AUDITORIAS EXTERNAS',
      value: summaryQuery.data?.totalExternas ?? externas.length,
      change: calculateChange(externas.length),
      icon: <Briefcase className="h-6 w-6" />,
      iconBgColor: 'bg-orange-500',
    },
    {
      title: 'AÇÕES TOTAIS',
      value: summaryQuery.data?.totalAcoes ?? actions.length,
      change: calculateChange(actions.length),
      icon: <ListChecks className="h-6 w-6" />,
      iconBgColor: 'bg-green-500',
    },
    {
      title: 'OCORRÊNCIAS',
      value: summaryQuery.data?.totalOcorrencias ?? occs.length,
      change: calculateChange(occs.length),
      icon: <ShieldAlert className="h-6 w-6" />,
      iconBgColor: 'bg-rose-500',
    },
    {
      title: 'SETORES ATIVOS',
      value: summaryQuery.data?.setoresAtivos ?? sectors.length,
      change: calculateChange(sectors.length),
      icon: <Building2 className="h-6 w-6" />,
      iconBgColor: 'bg-purple-500',
    },
  ];

  const actionsByOrigin = actions.reduce<Record<string, number>>((acc, action) => {
    acc[action.origem] = (acc[action.origem] ?? 0) + 1;
    return acc;
  }, {});

  // Função auxiliar para obter o número de ações relacionadas a uma auditoria
  const getActionsCountForAudit = (auditId: string) => actionsByAudit[auditId] ?? 0;

  const occByGravidade = occs.reduce<Record<string, number>>((acc, occ) => {
    acc[occ.gravidade] = (acc[occ.gravidade] ?? 0) + 1;
    return acc;
  }, {});

  const evolucao = [...internas, ...externas].reduce<Record<string, { ano: string; internas: number; externas: number }>>(
    (acc, audit) => {
      const key = audit.ano.toString();
      const current = acc[key] ?? { ano: key, internas: 0, externas: 0 };
      if (internas.find((item) => item.id === audit.id)) current.internas += 1;
      else current.externas += 1;
      acc[key] = current;
      return acc;
    },
    {},
  );

  const evolucaoData = Object.values(evolucao).sort((a, b) => Number(a.ano) - Number(b.ano));

  const userName = user?.name?.split(' ')[0] || 'Utilizador';

  const generateDashboardReport = () => {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    // ===== CAPA =====
    // Fundo com cor de marca
    doc.setFillColor(123, 92, 246); // Purple
    doc.rect(0, 0, pageWidth, 80, 'F');

    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Executivo', pageWidth / 2, 35, { align: 'center' });
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestão Integrado', pageWidth / 2, 50, { align: 'center' });

    // Informações da capa
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    let yPos = 120;

    // Box de informações
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(40, 100, pageWidth - 80, 100);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Informações do Relatório', 50, 115);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Data de Emissão: ${dateStr} às ${timeStr}`, 50, 130);
    doc.text(`Gerado por: ${user?.name || 'Sistema'}`, 50, 145);
    doc.text(`Período de Análise: Dados atualizados em tempo real`, 50, 160);
    doc.text(`Empresa: ${user?.tenant?.name || 'N/A'}`, 50, 175);

    yPos = 220;

    // ===== SUMÁRIO EXECUTIVO =====
    doc.addPage();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(123, 92, 246);
    doc.text('1. SUMÁRIO EXECUTIVO', 40, 40);
    doc.setDrawColor(123, 92, 246);
    doc.setLineWidth(1);
    doc.line(40, 45, pageWidth - 40, 45);

    yPos = 60;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Este relatório apresenta uma visão consolidada do estado atual do Sistema de Gestão Integrado,', 40, yPos);
    yPos += 12;
    doc.text('incluindo métricas de auditorias, ações corretivas e ocorrências registadas.', 40, yPos);
    yPos += 20;

    // KPIs em formato de cards visuais
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicadores Principais', 40, yPos);
    yPos += 15;

    const kpis = [
      { label: 'Auditorias Internas', value: internas.length, color: [59, 130, 246] },
      { label: 'Auditorias Externas', value: externas.length, color: [249, 115, 22] },
      { label: 'Ações Totais', value: actions.length, color: [16, 185, 129] },
      { label: 'Ocorrências', value: occs.length, color: [239, 68, 68] },
      { label: 'Setores Ativos', value: sectors.length, color: [139, 92, 246] },
    ];

    const cardWidth = (pageWidth - 100) / 5;
    let xPos = 40;

    kpis.forEach((kpi, index) => {
      // Card background
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.rect(xPos, yPos, cardWidth - 5, 35, 'F');

      // Texto
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(String(kpi.value), xPos + cardWidth / 2 - 10, yPos + 20, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(kpi.label, xPos + cardWidth / 2 - 10, yPos + 30, { align: 'center' });

      xPos += cardWidth;
      if ((index + 1) % 5 === 0) {
        xPos = 40;
        yPos += 50;
      }
    });

    yPos += 50;

    // Análise por Ano
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Distribuição por Ano', 40, yPos);
    yPos += 15;

    if (Object.keys(internasByAno).length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Auditorias Internas por Ano:', 50, yPos);
      yPos += 10;

      Object.entries(internasByAno).sort(([a], [b]) => Number(b) - Number(a)).forEach(([ano, count]) => {
        if (count > 0) {
          const percentage = ((count / internas.length) * 100).toFixed(1);
          doc.text(`  • ${ano}: ${count} auditoria(s) (${percentage}%)`, 60, yPos);
          yPos += 10;
        }
      });
      yPos += 5;
    }

    // Alertas e pontos críticos
    const acoesAtrasadas = actions.filter((a) => a.status === 'Atrasada').length;
    const ocorrenciasCriticas = occs.filter((o) => o.gravidade === 'Crítica' && o.status !== 'Resolvida').length;

    if (acoesAtrasadas > 0 || ocorrenciasCriticas > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text('⚠ Pontos de Atenção', 40, yPos);
      yPos += 12;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      if (acoesAtrasadas > 0) {
        doc.text(`  • ${acoesAtrasadas} ação(ões) atrasada(s) requerem atenção imediata`, 50, yPos);
        yPos += 10;
      }
      if (ocorrenciasCriticas > 0) {
        doc.text(`  • ${ocorrenciasCriticas} ocorrência(s) crítica(s) não resolvida(s)`, 50, yPos);
        yPos += 10;
      }
      yPos += 5;
    }

    // ===== DETALHAMENTO POR CATEGORIA =====
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = 40;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(123, 92, 246);
    doc.text('2. AUDITORIAS INTERNAS', 40, yPos);
    doc.setDrawColor(123, 92, 246);
    doc.setLineWidth(1);
    doc.line(40, yPos + 5, pageWidth - 40, yPos + 5);
    yPos += 20;

    if (internas.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Total: ${internas.length} auditoria(s) | Últimas 15 registadas:`, 40, yPos);
      yPos += 12;

      const headers = [['ID', 'Ano', 'ISO', 'Início', 'Término', 'Ações']];
      const rows = internas.slice(0, 15).map((audit) => [
        String(audit.id).slice(0, 12),
        String(audit.ano),
        (audit.iso || '').slice(0, 25),
        audit.inicio ? new Date(audit.inicio).toLocaleDateString('pt-PT') : '-',
        audit.termino ? new Date(audit.termino).toLocaleDateString('pt-PT') : '-',
        String(getActionsCountForAudit(audit.id)),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: headers,
        body: rows,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2.5 },
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: yPos, left: 40, right: 40 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 35 },
          2: { cellWidth: 80 },
          3: { cellWidth: 80 },
          4: { cellWidth: 70 },
          5: { cellWidth: 50, halign: 'center' },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhuma auditoria interna registada.', 40, yPos);
      yPos += 15;
    }

    // ===== AUDITORIAS EXTERNAS =====
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = 40;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(123, 92, 246);
    doc.text('3. AUDITORIAS EXTERNAS', 40, yPos);
    doc.setDrawColor(123, 92, 246);
    doc.setLineWidth(1);
    doc.line(40, yPos + 5, pageWidth - 40, yPos + 5);
    yPos += 20;

    if (externas.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Total: ${externas.length} auditoria(s) | Últimas 15 registadas:`, 40, yPos);
      yPos += 12;

      const headers = [['ID', 'Ano', 'Entidade Auditora', 'ISO', 'Início', 'Término', 'Ações']];
      const rows = externas.slice(0, 15).map((audit) => [
        String(audit.id).slice(0, 12),
        String(audit.ano),
        (audit.entidadeAuditora || '').slice(0, 25),
        (audit.iso || '').slice(0, 20),
        audit.inicio ? new Date(audit.inicio).toLocaleDateString('pt-PT') : '-',
        audit.termino ? new Date(audit.termino).toLocaleDateString('pt-PT') : '-',
        String(getActionsCountForAudit(audit.id)),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: headers,
        body: rows,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2.5 },
        headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: yPos, left: 40, right: 40 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 35 },
          2: { cellWidth: 120 },
          3: { cellWidth: 100 },
          4: { cellWidth: 70 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhuma auditoria externa registada.', 40, yPos);
      yPos += 15;
    }

    // ===== AÇÕES CORRETIVAS =====
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = 40;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(123, 92, 246);
    doc.text('4. AÇÕES CORRETIVAS', 40, yPos);
    doc.setDrawColor(123, 92, 246);
    doc.setLineWidth(1);
    doc.line(40, yPos + 5, pageWidth - 40, yPos + 5);
    yPos += 20;

    if (actions.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Total: ${actions.length} ação(ões) | Últimas 15 registadas:`, 40, yPos);
      yPos += 12;

      const headers = [['ID', 'Setor', 'Origem', 'Data Limite', 'Status']];
      const rows = actions.slice(0, 15).map((action) => [
        String(action.id).slice(0, 12),
        (action.setor || '').slice(0, 25),
        (action.origem || '').slice(0, 25),
        action.dataLimite ? new Date(action.dataLimite).toLocaleDateString('pt-PT') : 'N/A',
        action.status,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: headers,
        body: rows,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2.5 },
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: yPos, left: 40, right: 40 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 100 },
          2: { cellWidth: 100 },
          3: { cellWidth: 70 },
          4: { cellWidth: 80 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhuma ação registada.', 40, yPos);
      yPos += 15;
    }

    // ===== OCORRÊNCIAS =====
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = 40;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(123, 92, 246);
    doc.text('5. OCORRÊNCIAS INTERNAS', 40, yPos);
    doc.setDrawColor(123, 92, 246);
    doc.setLineWidth(1);
    doc.line(40, yPos + 5, pageWidth - 40, yPos + 5);
    yPos += 20;

    if (occs.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Total: ${occs.length} ocorrência(s) | Últimas 15 registadas:`, 40, yPos);
      yPos += 12;

      const headers = [['ID', 'Setor', 'Gravidade', 'Status', 'Data']];
      const rows = occs.slice(0, 15).map((occ) => [
        String(occ.id).slice(0, 12),
        (occ.setor || '').slice(0, 25),
        occ.gravidade,
        occ.status,
        occ.dataAbertura ? new Date(occ.dataAbertura).toLocaleDateString('pt-PT') : 'N/A',
      ]);

      autoTable(doc, {
        startY: yPos,
        head: headers,
        body: rows,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2.5 },
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: yPos, left: 40, right: 40 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 120 },
          2: { cellWidth: 70 },
          3: { cellWidth: 80 },
          4: { cellWidth: 70 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhuma ocorrência registada.', 40, yPos);
      yPos += 15;
    }

    // ===== CONCLUSÕES E RECOMENDAÇÕES =====
    if (yPos > pageHeight - 150) {
      doc.addPage();
      yPos = 40;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(123, 92, 246);
    doc.text('6. CONCLUSÕES E RECOMENDAÇÕES', 40, yPos);
    doc.setDrawColor(123, 92, 246);
    doc.setLineWidth(1);
    doc.line(40, yPos + 5, pageWidth - 40, yPos + 5);
    yPos += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const recomendacoes = [];
    if (acoesAtrasadas > 0) {
      recomendacoes.push(`Priorizar o acompanhamento das ${acoesAtrasadas} ação(ões) atrasada(s) para garantir a conformidade.`);
    }
    if (ocorrenciasCriticas > 0) {
      recomendacoes.push(`Implementar medidas imediatas para resolução das ${ocorrenciasCriticas} ocorrência(s) crítica(s) identificadas.`);
    }
    if (internas.filter((a) => a.status === 'Atrasada').length > 0) {
      recomendacoes.push('Revisar o planeamento de auditorias internas para evitar atrasos futuros.');
    }
    if (recomendacoes.length === 0) {
      recomendacoes.push('O sistema apresenta um bom nível de conformidade. Manter os processos de monitorização ativos.');
    }

    recomendacoes.forEach((rec, index) => {
      doc.text(`${index + 1}. ${rec}`, 50, yPos);
      yPos += 12;
    });

    // ===== RODAPÉ PROFISSIONAL =====
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(40, pageHeight - 30, pageWidth - 40, pageHeight - 30);

      // Texto do rodapé
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' },
      );
      doc.text(
        `Sistema de Gestão Integrado - Relatório Confidencial`,
        pageWidth / 2,
        pageHeight - 12,
        { align: 'center' },
      );
    }

    doc.save(`relatorio-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Relatório do dashboard gerado com sucesso!', 'success');
  };

  return (
    <section className="animate-fade-in space-y-6" aria-label="Dashboard principal">
      {/* Welcome Section com Filtros */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">Bem-vindo de volta, {userName}!</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Tens {actions.filter((a) => a.status === 'Em andamento').length} ações em andamento e{' '}
            {occs.filter((o) => o.status === 'Aberta').length} ocorrências abertas.
          </p>
        </div>
        <div className="relative">
          <DashboardFiltersPanel onFiltersChange={setDashboardFilters} setores={uniqueSetores} />
        </div>
      </div>

      {/* Alertas e lembretes */}
      <AlertReminderSystem />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <KpiCard
            key={card.title}
            title={card.title}
            value={card.value}
            change={card.change}
            icon={card.icon}
            iconBgColor={card.iconBgColor}
          />
        ))}
      </div>

      {/* Welcome Card + Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <WelcomeCard
          title={`Bem-vindo de volta, ${userName}!`}
          message="Sistema de Gestão Integrado. Monitoriza e gere todas as auditorias, ações e ocorrências num único lugar."
          actionLabel="Gerar relatório"
          gradient="purple"
          onAction={generateDashboardReport}
        />

        <InteractiveChart title="Auditorias internas por status" className="lg:col-span-2">
          <Card title="Auditorias internas por status">
            {Object.keys(internasByAno).length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Ainda não existem auditorias internas registadas para calcular a distribuição.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie 
                    data={Object.entries(internasByAno).sort(([a], [b]) => Number(b) - Number(a)).map(([ano, value]) => ({ ano, value }))} 
                    dataKey="value" 
                    nameKey="ano" 
                    innerRadius={60} 
                    outerRadius={100} 
                    paddingAngle={4}
                  >
                    {Object.entries(internasByAno).sort(([a], [b]) => Number(b) - Number(a)).map((entry, index) => (
                      <Cell key={entry[0]} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </InteractiveChart>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InteractiveChart title="Auditorias externas por status">
          <Card title="Auditorias externas por status">
            {Object.keys(externasByAno).length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Ainda não existem auditorias externas registadas para calcular a distribuição.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie 
                    data={Object.entries(externasByAno).sort(([a], [b]) => Number(b) - Number(a)).map(([ano, value]) => ({ ano, value }))} 
                    dataKey="value" 
                    nameKey="ano" 
                    innerRadius={60} 
                    outerRadius={100} 
                    paddingAngle={4}
                  >
                    {Object.entries(externasByAno).sort(([a], [b]) => Number(b) - Number(a)).map((entry, index) => (
                      <Cell key={entry[0]} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    formatter={(value: number, name: string) => [`${value}`, name]}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value: string) => value}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </InteractiveChart>

        <InteractiveChart title="Total de ações por origem">
          <Card title="Total de ações por origem">
            {Object.keys(actionsByOrigin).length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Ainda não existem ações registadas.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={Object.entries(actionsByOrigin).map(([origem, total], index) => ({ origem, total, color: COLORS[index % COLORS.length] }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="origem" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    formatter={(value: number) => [`${value} ação(ões)`, 'Total']}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]} name="Ações">
                    {Object.entries(actionsByOrigin).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </InteractiveChart>

        <InteractiveChart title="Ocorrências internas por gravidade">
          <Card title="Ocorrências internas por gravidade">
            {Object.keys(occByGravidade).length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Ainda não existem ocorrências registadas.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={Object.entries(occByGravidade).map(([gravidade, total]) => ({ gravidade, total }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="gravidade" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    formatter={(value: number) => [`${value} ocorrência(s)`, 'Total']}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]} name="Ocorrências">
                    {Object.entries(occByGravidade).map(([gravidade], index) => {
                      const gravidadeColors: Record<string, string> = {
                        Baixa: '#10b981',
                        Média: '#f59e0b',
                        Alta: '#ef4444',
                        Crítica: '#dc2626',
                      };
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={gravidadeColors[gravidade] || COLORS[index % COLORS.length]}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </InteractiveChart>
      </div>

      <InteractiveChart title="Evolução anual de auditorias">
        <Card title="Evolução anual de auditorias" className="mt-6">
          {evolucaoData.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Ainda não existem dados suficientes para mostrar a evolução anual de auditorias.
              </p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={evolucaoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ano" />
                <YAxis allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                    formatter={(value: number, name: string) => [
                      `${value} auditoria(s)`,
                      name === 'internas' ? 'Internas' : 'Externas',
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value: string) => (value === 'internas' ? 'Internas' : value === 'externas' ? 'Externas' : value)}
                  />
                  <Brush dataKey="ano" height={30} stroke="#6366f1" />
                  <Line
                    type="monotone"
                    dataKey="internas"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    dot={{ r: 6, fill: '#0ea5e9' }}
                    activeDot={{ r: 8, fill: '#0ea5e9' }}
                    name="Internas"
                  />
                  <Line
                    type="monotone"
                    dataKey="externas"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ r: 6, fill: '#8b5cf6' }}
                    activeDot={{ r: 8, fill: '#8b5cf6' }}
                    name="Externas"
                  />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </InteractiveChart>

      {/* Tabelas de Auditorias */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Auditorias Internas">
          {internas.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 py-8 text-center">
              Ainda não existem auditorias internas registadas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-900/40">
                  <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">ID</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">Ano</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">Setor</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">Responsável</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {internas.slice(0, 10).map((audit, index) => (
                    <tr
                      key={audit.id}
                      className={`border-t border-[var(--color-border)] transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/40 dark:bg-slate-900/20'
                      } hover:bg-slate-100/80 dark:hover:bg-slate-800/60`}
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[var(--color-foreground)]">
                        {String(audit.id).slice(0, 12)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[var(--color-foreground)]">{audit.ano}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[var(--color-foreground)]">
                        {audit.setor || '-'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[var(--color-foreground)]">
                        {audit.responsavel || '-'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[var(--color-foreground)]">{audit.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {internas.length > 10 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
                  Mostrando 10 de {internas.length} auditorias internas
                </p>
              )}
            </div>
          )}
        </Card>

        <Card title="Auditorias Externas">
          {externas.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 py-8 text-center">
              Ainda não existem auditorias externas registadas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-900/40">
                  <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">ID</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">Ano</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">Entidade Auditora</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">Setor</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {externas.slice(0, 10).map((audit, index) => (
                    <tr
                      key={audit.id}
                      className={`border-t border-[var(--color-border)] transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/40 dark:bg-slate-900/20'
                      } hover:bg-slate-100/80 dark:hover:bg-slate-800/60`}
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[var(--color-foreground)]">
                        {String(audit.id).slice(0, 12)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[var(--color-foreground)]">{audit.ano}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[var(--color-foreground)]">
                        {audit.entidadeAuditora || '-'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[var(--color-foreground)]">
                        {audit.setor || '-'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[var(--color-foreground)]">{audit.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {externas.length > 10 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
                  Mostrando 10 de {externas.length} auditorias externas
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Relatórios agendados */}
      <ScheduledReports />
    </section>
  );
};

