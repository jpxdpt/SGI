import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActionItems } from '../services/mockApi';
import type { ActionItem, AcaoOrigem, AcaoStatus } from '../types/models';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';

const statusVariants: Record<AcaoStatus, 'success' | 'info' | 'danger'> = {
  Concluída: 'success',
  'Em andamento': 'info',
  Atrasada: 'danger',
};

export const ActionsPage = () => {
  const { data = [], isLoading } = useQuery({ queryKey: ['actions'], queryFn: fetchActionItems });
  const [filters, setFilters] = useState<{ origem: 'Todos' | AcaoOrigem; status: 'Todos' | AcaoStatus; setor: string }>({
    origem: 'Todos',
    status: 'Todos',
    setor: 'Todos',
  });

  const setores = Array.from(new Set(data.map((item) => item.setor)));

  const filtered = data.filter((action) => {
    const byOrigem = filters.origem === 'Todos' || action.origem === filters.origem;
    const byStatus = filters.status === 'Todos' || action.status === filters.status;
    const bySetor = filters.setor === 'Todos' || action.setor === filters.setor;
    return byOrigem && byStatus && bySetor;
  });

  return (
    <>
      <PageHeader
        title="Ações totais geradas"
        subtitle="Visualiza ações provenientes de auditorias internas, externas e ocorrências."
      />
      <Card title="Filtros">
        <div className="grid md:grid-cols-3 gap-4">
          <label className="text-sm font-medium flex flex-col gap-2">
            Origem
            <select
              value={filters.origem}
              onChange={(event) => setFilters((prev) => ({ ...prev, origem: event.target.value as typeof prev.origem }))}
              className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
            >
              {['Todos', 'Interna', 'Externa', 'Ocorrência'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium flex flex-col gap-2">
            Status
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value as typeof prev.status }))
              }
              className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
            >
              {['Todos', 'Concluída', 'Em andamento', 'Atrasada'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium flex flex-col gap-2">
            Setor
            <select
              value={filters.setor}
              onChange={(event) => setFilters((prev) => ({ ...prev, setor: event.target.value }))}
              className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
            >
              {['Todos', ...setores].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card title="Plano de ações" className="mt-6">
        {isLoading ? (
          <p>A carregar...</p>
        ) : (
          <Table<ActionItem>
            data={filtered}
            columns={[
              { key: 'id', title: 'ID' },
              { key: 'origem', title: 'Origem' },
              { key: 'acaoRelacionada', title: 'Referência' },
              { key: 'setor', title: 'Setor' },
              { key: 'descricao', title: 'Descrição' },
              {
                key: 'dataAbertura',
                title: 'Datas',
                render: (row) => (
                  <div className="text-xs space-y-1">
                    <p>Abertura: {row.dataAbertura}</p>
                    <p>Limite: {row.dataLimite}</p>
                    <p>Conclusão: {row.dataConclusao ?? '—'}</p>
                  </div>
                ),
              },
              {
                key: 'impacto',
                title: 'Impacto',
                render: (row) => <Badge variant="info">{row.impacto}</Badge>,
              },
              {
                key: 'status',
                title: 'Status',
                render: (row) => <Badge variant={statusVariants[row.status]}>{row.status}</Badge>,
              },
            ]}
          />
        )}
      </Card>
    </>
  );
};


