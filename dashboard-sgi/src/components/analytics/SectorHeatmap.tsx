import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import type { SectorPerformanceEntry } from '../../types/models';

interface SectorHeatmapProps {
  data: SectorPerformanceEntry[];
}

export const SectorHeatmap = ({ data }: SectorHeatmapProps) => {
  // Transform data to match chart format
  const chartData = data.map((entry) => ({
    sector: entry.name || entry.sector || 'Sem nome',
    total: entry.total || 0,
    delayed: entry.overdue || 0,
    completed: (entry.completed || 0) - (entry.overdue || 0), // completed without overdue
  }));

  // Sort by total actions desc and take top 10
  const sortedData = [...chartData].sort((a, b) => b.total - a.total).slice(0, 10);

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Setores com mais ações atrasadas</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Top 10 setores ordenados por total de ações</p>
      <div className="h-80 w-full min-h-[320px]" style={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={320} minWidth={0}>
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="sector" width={120} />
            <Tooltip cursor={{ fill: 'transparent' }} />
            <Legend />
            <Bar dataKey="completed" name="Concluídas" stackId="a" fill="#10B981" />
            <Bar dataKey="delayed" name="Atrasadas" stackId="a" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
