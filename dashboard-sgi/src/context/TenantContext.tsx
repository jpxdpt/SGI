import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

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

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Chaves de storage dinâmicas por utilizador
  const userPrefix = user?.id ? `user_${user.id}_` : '';
  const STORAGE_KEY = `${userPrefix}sgi_current_tenant`;
  const TENANTS_STORAGE_KEY = `${userPrefix}sgi_tenants`;

  useEffect(() => {
    if (!user) {
      setCurrentTenantState(null);
      setTenants([]);
      return;
    }

    try {
      const storedTenant = localStorage.getItem(STORAGE_KEY);
      const storedTenants = localStorage.getItem(TENANTS_STORAGE_KEY);

      let loadedTenants: Tenant[] = [];

      if (storedTenants) {
        loadedTenants = JSON.parse(storedTenants);
      } else {
        // Se o utilizador não tem empresas guardadas localmente, 
        // começar com a empresa associada ao seu perfil na base de dados
        loadedTenants = [{
          id: user.tenantId,
          name: user.tenant?.name || 'A Minha Empresa'
        }];
        localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(loadedTenants));
      }

      setTenants(loadedTenants);

      if (storedTenant) {
        setCurrentTenantState(JSON.parse(storedTenant));
      } else if (loadedTenants.length > 0) {
        setCurrentTenantState(loadedTenants[0]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedTenants[0]));
      }
    } catch (error) {
      console.error('Erro ao carregar tenants:', error);
    }
  }, [user, STORAGE_KEY, TENANTS_STORAGE_KEY]);

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

