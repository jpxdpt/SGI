import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, User as UserIcon, Shield, Mail, Calendar } from 'lucide-react';
import { fetchUsers, createUser, deleteUser, type User } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/TableSkeleton';

export const UsersPage = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { data: users = [], isLoading } = useQuery<User[]>({
        queryKey: ['users'],
        queryFn: fetchUsers
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
        open: false,
        id: null,
    });

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'AUDITOR'
    });

    const createMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            setModalOpen(false);
            setFormData({ name: '', email: '', password: '', role: 'AUDITOR' });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            showToast('Utilizador criado com sucesso!', 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Erro ao criar utilizador.', 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            setDeleteConfirm({ open: false, id: null });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            showToast('Utilizador eliminado com sucesso!', 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Erro ao eliminar utilizador.', 'error');
        }
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    return (
        <>
            <PageHeader
                title="Gestão de Utilizadores"
                subtitle="Administre os utilizadores e permissões do sistema."
                actions={
                    <Button onClick={() => setModalOpen(true)} variant="primary">
                        <Plus className="h-4 w-4" /> Novo Utilizador
                    </Button>
                }
            />

            <Card className="mt-6">
                {isLoading ? (
                    <TableSkeleton columns={5} rows={3} />
                ) : (
                    <Table
                        data={users}
                        columns={[
                            {
                                key: 'name',
                                title: 'Nome',
                                render: (row: User) => (
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <UserIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <span className="font-medium">{row.name}</span>
                                    </div>
                                )
                            },
                            {
                                key: 'email',
                                title: 'Email',
                                render: (row: User) => (
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <Mail className="h-3 w-3" />
                                        {row.email}
                                    </div>
                                )
                            },
                            {
                                key: 'role',
                                title: 'Função',
                                render: (row: User) => {
                                    const variant = row.role === 'ADMIN' ? 'success' : row.role === 'GESTOR' ? 'primary' : 'secondary';
                                    return (
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-3 w-3" />
                                            <Badge variant={variant}>{row.role}</Badge>
                                        </div>
                                    );
                                }
                            },
                            {
                                key: 'createdAt',
                                title: 'Criado em',
                                render: (row: User) => (
                                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                                        <Calendar className="h-3 w-3" />
                                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'}
                                    </div>
                                )
                            },
                            {
                                key: 'actions',
                                title: 'Ações',
                                render: (row: User) => (
                                    <button
                                        onClick={() => setDeleteConfirm({ open: true, id: row.id })}
                                        className="text-rose-600 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                        title="Eliminar utilizador"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )
                            }
                        ]}
                    />
                )}
            </Card>

            <Modal
                title="Novo Utilizador"
                open={modalOpen}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <Input
                        label="Nome"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <Input
                        label="Palavra-passe"
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        required
                    />
                    <Select
                        label="Função"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                        options={[
                            { value: 'AUDITOR', label: 'Auditor' },
                            { value: 'GESTOR', label: 'Gestor' },
                            { value: 'ADMIN', label: 'Administrador' }
                        ]}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
                            Criar Utilizador
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, id: null })}
                onConfirm={() => deleteConfirm.id && deleteMutation.mutate(deleteConfirm.id)}
                title="Eliminar Utilizador"
                message="Tens a certeza que desejas eliminar este utilizador? Esta ação não pode ser desfeita."
                variant="danger"
                isLoading={deleteMutation.isPending}
            />
        </>
    );
};
