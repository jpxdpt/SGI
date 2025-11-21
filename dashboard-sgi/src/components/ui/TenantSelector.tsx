import { Building2, ChevronDown, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { useToast } from './Toast';

// Função para gerar ID a partir do nome (slug)
const generateTenantId = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
    .replace(/^-+|-+$/g, '') // Remove hífens do início e fim
    .substring(0, 50); // Limita o tamanho
};

export const TenantSelector = () => {
  const { currentTenant, tenants, setCurrentTenant, addTenant, removeTenant } = useTenant();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantId, setNewTenantId] = useState('');
  const [isManualEdit, setIsManualEdit] = useState(false);

  // Gerar ID automaticamente quando o nome muda
  const handleNameChange = (name: string) => {
    setNewTenantName(name);
    if (!isManualEdit && name.trim()) {
      const generatedId = generateTenantId(name);
      setNewTenantId(generatedId);
    }
  };

  // Resetar quando abre o modal
  const handleOpenModal = () => {
    setNewTenantName('');
    setNewTenantId('');
    setIsManualEdit(false);
    setShowAddModal(true);
    setIsOpen(false);
  };

  const handleAddTenant = () => {
    if (!newTenantName.trim()) {
      showToast('Por favor, indica o nome da empresa.', 'warning');
      return;
    }

    // Se o ID estiver vazio, gerar automaticamente
    const finalTenantId = newTenantId.trim() || generateTenantId(newTenantName.trim());

    if (!finalTenantId) {
      showToast('Não foi possível gerar um ID válido. Tenta novamente.', 'error');
      return;
    }

    if (tenants.some((t) => t.id === finalTenantId)) {
      showToast('Já existe uma empresa com este ID. Altera o ID manualmente.', 'error');
      setIsManualEdit(true);
      return;
    }

    const newTenant = {
      id: finalTenantId,
      name: newTenantName.trim(),
    };

    addTenant(newTenant);
    setShowAddModal(false);
    setNewTenantName('');
    setNewTenantId('');
    setIsManualEdit(false);
    showToast('Empresa adicionada com sucesso!', 'success');
  };

  const handleRemoveTenant = (tenantId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tenants.length <= 1) {
      showToast('Não podes eliminar a última empresa.', 'warning');
      return;
    }
    removeTenant(tenantId);
    showToast('Empresa eliminada com sucesso!', 'success');
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
        >
          <Building2 className="h-4 w-4 text-brand-500" />
          <span className="font-medium truncate max-w-[120px]">{currentTenant?.name || 'Selecionar empresa'}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-lg z-50 animate-scale-in">
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Empresas
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {tenants.map((tenant) => (
                    <button
                      key={tenant.id}
                      type="button"
                      onClick={() => {
                        setCurrentTenant(tenant);
                        setIsOpen(false);
                        showToast(`Empresa alterada para: ${tenant.name}`, 'success');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentTenant?.id === tenant.id
                          ? 'bg-brand-500 text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{tenant.name}</span>
                      {tenants.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveTenant(tenant.id, e)}
                          className="ml-2 p-1 rounded hover:bg-black/10 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-[var(--color-border)] mt-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenModal}
                    className="w-full justify-start"
                  >
                    <Plus className="h-3 w-3" /> Adicionar empresa
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        title="Adicionar empresa"
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewTenantName('');
          setNewTenantId('');
          setIsManualEdit(false);
        }}
      >
        <div className="space-y-4">
          <Input
            label="Nome da empresa"
            value={newTenantName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ex: Filial Centro"
            required
          />
          <div>
            <Input
              label="ID da empresa"
              value={newTenantId}
              onChange={(e) => {
                setNewTenantId(e.target.value);
                setIsManualEdit(true);
              }}
              placeholder="Gerado automaticamente..."
              required
              title="Identificador único para a empresa (gerado automaticamente a partir do nome)"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isManualEdit 
                ? 'ID editado manualmente. Podes editá-lo ou deixar em branco para gerar automaticamente.'
                : 'ID gerado automaticamente a partir do nome. Podes editá-lo se necessário.'
              }
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setNewTenantName('');
                setNewTenantId('');
              }}
            >
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={handleAddTenant}>
              Adicionar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

