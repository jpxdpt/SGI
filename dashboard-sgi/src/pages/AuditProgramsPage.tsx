import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { createAuditProgram, deleteAuditProgram, fetchAuditPrograms, instantiateAuditProgram, updateAuditProgram, type AuditProgram } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/TableSkeleton';

const programSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  standard: z.string().min(1, 'Norma é obrigatória'),
  version: z.string().min(1, 'Versão é obrigatória'),
  isTemplate: z.boolean().optional(),
});

type ProgramForm = z.infer<typeof programSchema>;

export const AuditProgramsPage = () => {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery<AuditProgram[]>({
    queryKey: ['audit-programs'],
    queryFn: () => fetchAuditPrograms(),
  });
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AuditProgram | null>(null);
  const [form, setForm] = useState<ProgramForm>({
    name: '',
    description: '',
    standard: 'ISO 9001',
    version: '2015',
    isTemplate: true,
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm({
      name: '',
      description: '',
      standard: 'ISO 9001',
      version: '2015',
      isTemplate: true,
    });
  };

  const createMutation = useMutation({
    mutationFn: createAuditProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-programs'] });
      showToast('Programa criado com sucesso', 'success');
      closeModal();
    },
    onError: (error: any) => {
      showToast(error?.message ?? 'Erro ao criar programa', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProgramForm> }) => updateAuditProgram(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-programs'] });
      showToast('Programa atualizado com sucesso', 'success');
      closeModal();
    },
    onError: (error: any) => {
      showToast(error?.message ?? 'Erro ao atualizar programa', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAuditProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-programs'] });
      showToast('Programa removido', 'success');
    },
    onError: (error: any) => {
      showToast(error?.message ?? 'Erro ao remover programa', 'error');
    },
  });

  const instantiateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      instantiateAuditProgram(id, { name, type: 'INTERNAL', audit: { ano: new Date().getFullYear() } }),
    onSuccess: () => {
      showToast('Instância criada a partir do template', 'success');
    },
    onError: (error: any) => {
      showToast(error?.message ?? 'Erro ao instanciar programa', 'error');
    },
  });

  const onSubmit = () => {
    const parsed = programSchema.safeParse(form);
    if (!parsed.success) {
      showToast(parsed.error.errors[0]?.message ?? 'Dados inválidos', 'warning');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: parsed.data });
    } else {
      createMutation.mutate({ ...parsed.data, checklists: [] });
    }
  };

  const programsSorted = useMemo(
    () => [...data].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).reverse(),
    [data],
  );

  return (
    <>
      <PageHeader
        title="Programas de Auditoria"
        subtitle="Templates e instâncias de programas (ISO 9001)."
        actions={
          <Button onClick={() => setModalOpen(true)} variant="primary" size="md">
            Novo programa
          </Button>
        }
      />

      <Card title="Lista de programas">
        {isLoading ? (
          <TableSkeleton columns={6} rows={5} />
        ) : (
          <Table<AuditProgram>
            data={programsSorted}
            columns={[
              { key: 'name', title: 'Nome' },
              { key: 'standard', title: 'Norma' },
              { key: 'version', title: 'Versão' },
              {
                key: 'isTemplate',
                title: 'Tipo',
                render: (row) => (row.isTemplate ? 'Template' : 'Instância'),
              },
              {
                key: 'checklists',
                title: 'Itens',
                render: (row) => row.checklists?.length ?? 0,
              },
              {
                key: 'actions',
                title: 'Ações',
                render: (row) => (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(row);
                        setForm({
                          name: row.name,
                          description: row.description ?? '',
                          standard: row.standard,
                          version: row.version,
                          isTemplate: row.isTemplate,
                        });
                        setModalOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    {row.isTemplate && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => instantiateMutation.mutate({ id: row.id, name: `${row.name} - Instância` })}
                        isLoading={instantiateMutation.isPending}
                      >
                        Criar instância
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(row.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Remover
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal title={editing ? 'Editar programa' : 'Novo programa'} open={modalOpen} onClose={closeModal}>
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Textarea
            label="Descrição"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Norma"
              value={form.standard}
              onChange={(e) => setForm((p) => ({ ...p, standard: e.target.value }))}
            />
            <Input
              label="Versão"
              value={form.version}
              onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isTemplate ?? true}
              onChange={(e) => setForm((p) => ({ ...p, isTemplate: e.target.checked }))}
            />
            É template
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={onSubmit} isLoading={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Guardar alterações' : 'Criar programa'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AuditProgramsPage;


