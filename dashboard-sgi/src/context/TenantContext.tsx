import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface Tenant {
  id: string;
  name: string;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  setCurrentTenant: (tenant: Tenant) => void;
  addTenant: (tenant: Tenant) => void;
  removeTenant: (tenantId: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const STORAGE_KEY = 'sgi_current_tenant';
const TENANTS_STORAGE_KEY = 'sgi_tenants';

// Tenants padrão (pode ser substituído por uma API no futuro)
const DEFAULT_TENANTS: Tenant[] = [
  { id: 'tenant-default', name: 'Empresa Principal' },
  { id: 'tenant-1', name: 'Filial Norte' },
  { id: 'tenant-2', name: 'Filial Sul' },
];

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>(DEFAULT_TENANTS);

  // Carregar tenant atual e lista de tenants do localStorage
  useEffect(() => {
    try {
      const storedTenant = localStorage.getItem(STORAGE_KEY);
      const storedTenants = localStorage.getItem(TENANTS_STORAGE_KEY);

      if (storedTenants) {
        const parsed = JSON.parse(storedTenants) as Tenant[];
        setTenants(parsed);
      }

      if (storedTenant) {
        const parsed = JSON.parse(storedTenant) as Tenant;
        setCurrentTenantState(parsed);
      } else if (DEFAULT_TENANTS.length > 0) {
        // Se não houver tenant selecionado, usar o primeiro por padrão
        setCurrentTenantState(DEFAULT_TENANTS[0]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TENANTS[0]));
      }
    } catch (error) {
      console.error('Erro ao carregar tenant:', error);
      if (DEFAULT_TENANTS.length > 0) {
        setCurrentTenantState(DEFAULT_TENANTS[0]);
      }
    }
  }, []);

  const setCurrentTenant = (tenant: Tenant) => {
    setCurrentTenantState(tenant);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tenant));
      // Invalidar todas as queries para recarregar dados do novo tenant
      queryClient.invalidateQueries();
    } catch (error) {
      console.error('Erro ao guardar tenant:', error);
    }
  };

  const addTenant = (tenant: Tenant) => {
    setTenants((prev) => {
      const updated = [...prev, tenant];
      try {
        localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Erro ao guardar lista de tenants:', error);
      }
      return updated;
    });
  };

  const removeTenant = (tenantId: string) => {
    setTenants((prev) => {
      const updated = prev.filter((t) => t.id !== tenantId);
      try {
        localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Erro ao remover tenant:', error);
      }
      // Se o tenant removido era o atual, selecionar o primeiro disponível
      if (currentTenant?.id === tenantId && updated.length > 0) {
        setCurrentTenant(updated[0]);
      }
      return updated;
    });
  };

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        tenants,
        setCurrentTenant,
        addTenant,
        removeTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant deve ser usado dentro de um TenantProvider');
  }
  return context;
};

