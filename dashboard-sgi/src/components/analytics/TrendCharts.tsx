import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import type { AnalyticsTrendData } from '../../types/models';

interface TrendChartsProps {
  data: AnalyticsTrendData[];
}

export const TrendCharts = ({ data }: TrendChartsProps) => {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Tendências Mensais</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Criação, conclusão e atrasos de ações</p>
      <div className="h-80 w-full min-h-[320px]" style={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={320} minWidth={0}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#F97316" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" stroke="#94A3B8" />
            <YAxis stroke="#94A3B8" />
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--color-card)', 
                borderRadius: '8px', 
                border: '1px solid var(--color-border)', 
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
              }} 
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="created"
              stroke="#2563EB"
              strokeWidth={2}
              fill="url(#colorCreated)"
              fillOpacity={1}
              name="Criadas"
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="#22C55E"
              strokeWidth={2}
              fill="url(#colorCompleted)"
              fillOpacity={1}
              name="Executadas"
            />
            <Area
              type="monotone"
              dataKey="overdue"
              stroke="#F97316"
              strokeWidth={2}
              fill="url(#colorOverdue)"
              fillOpacity={1}
              name="Atrasadas"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
