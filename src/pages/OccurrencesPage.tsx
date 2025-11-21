import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOccurrences } from '../services/mockApi';
import type { Occurrence } from '../types/models';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';

export const OccurrencesPage = () => {
  const { data = [], isLoading } = useQuery({ queryKey: ['occurrences'], queryFn: fetchOccurrences });
  const [filters, setFilters] = useState({ gravidade: 'Todos', status: 'Todos' });

  const filtered = data.filter((occ) => {
    const byGravidade = filters.gravidade === 'Todos' || occ.gravidade === filters.gravidade;
    const byStatus = filters.status === 'Todos' || occ.status === filters.status;
    return byGravidade && byStatus;
  });

  return (
    <>
      <PageHeader title="Ocorrências internas" subtitle="Monitoriza tendências e severidade dos incidentes." />
      <Card title="Filtros">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: 'Gravidade', key: 'gravidade', options: ['Todos', 'Baixa', 'Média', 'Alta', 'Crítica'] },
            { label: 'Status', key: 'status', options: ['Todos', 'Aberta', 'Em mitigação', 'Resolvida'] },
          ].map((filter) => (
            <label key={filter.key} className="text-sm font-medium flex flex-col gap-2">
              {filter.label}
              <select
                value={filters[filter.key as keyof typeof filters]}
                onChange={(event) => setFilters((prev) => ({ ...prev, [filter.key]: event.target.value }))}
                className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
              >
                {filter.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Registos de ocorrências" className="mt-6">
        {isLoading ? (
          <p>A carregar...</p>
        ) : (
          <Table<Occurrence>
            data={filtered}
            columns={[
              { key: 'id', title: 'ID' },
              { key: 'setor', title: 'Setor' },
              { key: 'responsavel', title: 'Responsável' },
              { key: 'data', title: 'Data' },
              { key: 'descricao', title: 'Descrição' },
              {
                key: 'gravidade',
                title: 'Gravidade',
                render: (row) => <Badge variant="danger">{row.gravidade}</Badge>,
              },
              { key: 'acaoGerada', title: 'Ação gerada' },
              {
                key: 'status',
                title: 'Status',
                render: (row) => <Badge variant="info">{row.status}</Badge>,
              },
            ]}
          />
        )}
      </Card>
    </>
  );
};


