import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE, createSector, fetchSectors } from '../services/mockApi';
import type { Sector } from '../types/models';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';

const initialForm: Omit<Sector, 'id'> = {
  nome: '',
  responsavel: '',
  email: '',
  telefone: '',
  descricao: '',
  ativo: true,
};

export const CadastroPage = () => {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['sectors'], queryFn: fetchSectors });
  const [form, setForm] = useState(initialForm);
  const [localData, setLocalData] = useState<Sector[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const tableData = useMemo(() => [...data, ...localData], [data, localData]);

  const createMutation = useMutation({
    mutationFn: createSector,
    onSuccess: () => {
      setForm(initialForm);
      setFormError(null);
      setLocalData([]);
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao guardar setor.';
      setFormError(message);
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!API_BASE) {
      setLocalData((prev) => [
        ...prev,
        {
          id: `SET-${Math.floor(Math.random() * 999)}`,
          ...form,
        },
      ]);
      setForm(initialForm);
      setFormError('Sem API definida — os dados só estão disponíveis nesta sessão.');
      return;
    }
    createMutation.mutate(form as Sector);
  };

  return (
    <>
      <PageHeader title="Cadastro de setores" subtitle="Adiciona novos setores e responsáveis em segundos." />
      <Card title="Novo setor">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Setor
            <input
              value={form.nome}
              onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
              className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Responsável
            <input
              value={form.responsavel}
              onChange={(event) => setForm((prev) => ({ ...prev, responsavel: event.target.value }))}
              className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Telefone
            <input
              value={form.telefone}
              onChange={(event) => setForm((prev) => ({ ...prev, telefone: event.target.value }))}
              className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
            Descrição
            <textarea
              value={form.descricao}
              onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
              className="border border-[var(--color-border)] rounded-xl px-3 py-2 bg-transparent"
            />
          </label>
          {formError && (
            <p className="md:col-span-2 text-sm text-rose-500">
              {formError}
            </p>
          )}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(event) => setForm((prev) => ({ ...prev, ativo: event.target.checked }))}
            />
            Ativo
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-brand-500 text-white disabled:opacity-60"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'A guardar...' : 'Guardar setor'}
            </button>
          </div>
        </form>
      </Card>

      <Card title="Setores registados" className="mt-6">
        <Table<Sector>
          data={tableData}
          columns={[
            { key: 'id', title: 'ID' },
            { key: 'nome', title: 'Setor' },
            { key: 'responsavel', title: 'Responsável' },
            { key: 'email', title: 'Email' },
            { key: 'telefone', title: 'Telefone' },
            { key: 'descricao', title: 'Descrição' },
            {
              key: 'ativo',
              title: 'Status',
              render: (row) => <Badge variant={row.ativo ? 'success' : 'danger'}>{row.ativo ? 'Ativo' : 'Inativo'}</Badge>,
            },
          ]}
        />
      </Card>
    </>
  );
};

