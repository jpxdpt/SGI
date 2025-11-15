import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload } from 'lucide-react';
import { API_BASE, createExternalAudit, fetchExternalAudits, importDataset } from '../services/mockApi';
import { parseExcelFile } from '../utils/excelImporter';
import type { ExternalAudit, AuditoriaStatus } from '../types/models';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

const statusOptions: AuditoriaStatus[] = ['Planeada', 'Em execução', 'Exec+Atraso', 'Atrasada', 'Executada'];

const initialForm: ExternalAudit = {
  id: 'EXT-000',
  ano: new Date().getFullYear(),
  setor: '',
  responsavel: '',
  descricao: '',
  dataPrevista: '',
  execucao: 0,
  status: 'Planeada',
  acoesGeradas: 0,
  entidadeAuditora: '',
  conclusoes: '',
};

export const ExternalAuditsPage = () => {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['audits', 'external'], queryFn: fetchExternalAudits });
  const [filters, setFilters] = useState({ ano: 'Todos', status: 'Todos' });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ExternalAudit>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createExternalAudit,
    onSuccess: () => {
      setModalOpen(false);
      setForm(initialForm);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['audits', 'external'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao guardar auditoria.';
      setFormError(message);
    },
  });

  const anos = useMemo(() => Array.from(new Set(data.map((audit) => audit.ano.toString()))), [data]);

  const filtered = data.filter((audit) => {
    const byAno = filters.ano === 'Todos' || audit.ano.toString() === filters.ano;
    const byStatus = filters.status === 'Todos' || audit.status === filters.status;
    return byAno && byStatus;
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!API_BASE) {
      setFormError('Define VITE_API_BASE_URL para guardar no backend.');
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <>
      <PageHeader
        title="Auditorias Externas"
        subtitle="Acompanhamento das entidades certificadoras e suas conclusões."
        actions={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 text-white px-4 py-2 text-sm"
            >
              <Plus className="h-4 w-4" /> Nova Auditoria
            </button>
            <label className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm cursor-pointer relative overflow-hidden bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-brand-500 transition">
              <input
                type="file"
                accept=".xlsx"
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={!API_BASE}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file || !API_BASE) return;
                  try {
                    const dataset = await parseExcelFile(file);
                    await importDataset({ externalAudits: dataset.externalAudits }, 'merge');
                    queryClient.invalidateQueries({ queryKey: ['audits', 'external'] });
                  } catch (error) {
                    console.error(error);
                  } finally {
                    event.target.value = '';
                  }
                }}
              />
              <Upload className="h-4 w-4" /> Importar Excel
            </label>
          </>
        }
      />

      <Card title="Filtros">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: 'Ano', key: 'ano', options: ['Todos', ...anos] },
            { label: 'Status', key: 'status', options: ['Todos', ...statusOptions] },
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

      <Card title="Lista de auditorias" className="mt-6">
        {isLoading ? (
          <p>A carregar...</p>
        ) : (
          <Table
            data={filtered}
            columns={[
              { key: 'id', title: 'ID' },
              { key: 'ano', title: 'Ano' },
              { key: 'entidadeAuditora', title: 'Entidade auditora' },
              { key: 'setor', title: 'Setor' },
              { key: 'responsavel', title: 'Responsável' },
              { key: 'descricao', title: 'Descrição' },
              { key: 'conclusoes', title: 'Conclusões' },
              {
                key: 'status',
                title: 'Status',
                render: (row) => <Badge variant="info">{row.status}</Badge>,
              },
              {
                key: 'acoesGeradas',
                title: 'Ações',
                render: (row) => <span>{row.acoesGeradas}</span>,
              },
            ]}
          />
        )}
      </Card>

      <Modal title="Nova auditoria externa" open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm font-medium flex flex-col gap-2">
              ID
            <input
              value={form.id}
              onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
              className="border border-[var(--color-border)] rounded-lg px-3 py-2 bg-transparent"
              required
            />
            </label>
            <label className="text-sm font-medium flex flex-col gap-2">
              Ano
            <input
              type="number"
              value={form.ano}
              onChange={(event) => setForm((prev) => ({ ...prev, ano: Number(event.target.value) }))}
              className="border border-[var(--color-border)] rounded-lg px-3 py-2 bg-transparent"
              required
            />
            </label>
          </div>
          <label className="text-sm font-medium flex flex-col gap-2">
            Entidade auditora
            <input
              value={form.entidadeAuditora}
              onChange={(event) => setForm((prev) => ({ ...prev, entidadeAuditora: event.target.value }))}
              className="border border-[var(--color-border)] rounded-lg px-3 py-2 bg-transparent"
              required
            />
          </label>
          <label className="text-sm font-medium flex flex-col gap-2">
            Conclusões
            <textarea
              value={form.conclusoes}
              onChange={(event) => setForm((prev) => ({ ...prev, conclusoes: event.target.value }))}
              className="border border-[var(--color-border)] rounded-lg px-3 py-2 bg-transparent"
            />
          </label>
          <div className="grid md:grid-cols-3 gap-4">
            <label className="text-sm font-medium flex flex-col gap-2">
              Setor
              <input
                value={form.setor}
                onChange={(event) => setForm((prev) => ({ ...prev, setor: event.target.value }))}
                className="border border-[var(--color-border)] rounded-lg px-3 py-2 bg-transparent"
                required
              />
            </label>
            <label className="text-sm font-medium flex flex-col gap-2">
              Responsável
              <input
                value={form.responsavel}
                onChange={(event) => setForm((prev) => ({ ...prev, responsavel: event.target.value }))}
                className="border border-[var(--color-border)] rounded-lg px-3 py-2 bg-transparent"
                required
              />
            </label>
            <label className="text-sm font-medium flex flex-col gap-2">
              Status
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as AuditoriaStatus }))}
                className="border border-[var(--color-border)] rounded-lg px-3 py-2 bg-transparent"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-sm font-medium flex flex-col gap-2">
            Descrição
            <textarea
              value={form.descricao}
              onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
              className="border border-[var(--color-border)] rounded-lg px-3 py-2 bg-transparent"
            />
          </label>
          {formError && <p className="text-sm text-rose-500">{formError}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-full border">
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-brand-500 text-white disabled:opacity-60"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

