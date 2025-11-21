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
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import {
  fetchActionItems,
  fetchDashboardSummary,
  fetchExternalAudits,
  fetchInternalAudits,
  fetchOccurrences,
  fetchSectors,
} from '../services/mockApi';
import type { AuditoriaStatus } from '../types/models';

const COLORS = ['#0ea5e9', '#38bdf8', '#f97316', '#ef4444', '#8b5cf6', '#10b981'];

const buildStatusDistribution = (dataset: { status: AuditoriaStatus }[]) => {
  const counts = dataset.reduce<Record<AuditoriaStatus, number>>(
    (acc, audit) => ({
      ...acc,
      [audit.status]: (acc[audit.status] ?? 0) + 1,
    }),
    {
      Planeada: 0,
      'Em execução': 0,
      Executada: 0,
      'Exec+Atraso': 0,
      Atrasada: 0,
    },
  );
  return Object.entries(counts).map(([status, value]) => ({ status, value }));
};

export const DashboardPage = () => {
  const internalAuditsQuery = useQuery({ queryKey: ['audits', 'internal'], queryFn: fetchInternalAudits });
  const externalAuditsQuery = useQuery({ queryKey: ['audits', 'external'], queryFn: fetchExternalAudits });
  const actionsQuery = useQuery({ queryKey: ['actions'], queryFn: fetchActionItems });
  const occurrencesQuery = useQuery({ queryKey: ['occurrences'], queryFn: fetchOccurrences });
  const summaryQuery = useQuery({ queryKey: ['summary'], queryFn: fetchDashboardSummary });
  const sectorsQuery = useQuery({ queryKey: ['sectors'], queryFn: fetchSectors });

  const loading =
    internalAuditsQuery.isLoading ||
    externalAuditsQuery.isLoading ||
    actionsQuery.isLoading ||
    occurrencesQuery.isLoading ||
    summaryQuery.isLoading ||
    sectorsQuery.isLoading;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-200 rounded-xl" />
        <div className="grid md:grid-cols-3 gap-4">
          <div className="h-40 bg-slate-200 rounded-2xl" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const internas = internalAuditsQuery.data ?? [];
  const externas = externalAuditsQuery.data ?? [];
  const actions = actionsQuery.data ?? [];
  const occs = occurrencesQuery.data ?? [];
  const sectors = sectorsQuery.data ?? [];

  const cards = [
    { title: 'Auditorias Internas', value: summaryQuery.data?.totalInternas ?? internas.length },
    { title: 'Auditorias Externas', value: summaryQuery.data?.totalExternas ?? externas.length },
    { title: 'Ações Totais', value: summaryQuery.data?.totalAcoes ?? actions.length },
    { title: 'Ocorrências', value: summaryQuery.data?.totalOcorrencias ?? occs.length },
    { title: 'Setores ativos', value: summaryQuery.data?.setoresAtivos ?? sectors.length },
  ];

  const internasStatus = buildStatusDistribution(internas);
  const externasStatus = buildStatusDistribution(externas);

  const actionsByOrigin = actions.reduce<Record<string, number>>((acc, action) => {
    acc[action.origem] = (acc[action.origem] ?? 0) + 1;
    return acc;
  }, {});

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

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Resumo inteligente das auditorias, ações e ocorrências." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.title} className="gap-2">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{card.title}</p>
            <p className="text-3xl font-semibold">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 mt-6 xl:grid-cols-2">
        <Card title="Auditorias internas por status">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={internasStatus} dataKey="value" nameKey="status" innerRadius={60} outerRadius={100} paddingAngle={4}>
                {internasStatus.map((entry, index) => (
                  <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Auditorias externas por status">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={externasStatus} dataKey="value" nameKey="status" innerRadius={60} outerRadius={100} paddingAngle={4}>
                {externasStatus.map((entry, index) => (
                  <Cell key={entry.status} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Total de ações por origem">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={Object.entries(actionsByOrigin).map(([origem, total]) => ({ origem, total }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="origem" />
              <YAxis allowDecimals={false} />
              <RechartsTooltip />
              <Bar dataKey="total" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Ocorrências internas por gravidade">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={Object.entries(occByGravidade).map(([gravidade, total]) => ({ gravidade, total }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="gravidade" />
              <YAxis allowDecimals={false} />
              <RechartsTooltip />
              <Bar dataKey="total" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Evolução anual de auditorias" className="mt-6">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={evolucaoData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="ano" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip />
            <Legend />
            <Line type="monotone" dataKey="internas" stroke="#0ea5e9" strokeWidth={3} />
            <Line type="monotone" dataKey="externas" stroke="#8b5cf6" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
};

