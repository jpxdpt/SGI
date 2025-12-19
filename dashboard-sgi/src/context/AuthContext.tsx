import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenant?: {
    id: string;
    name: string;
  };
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se há token guardado
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch {
        // Se houver erro ao parsear, limpar
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tenantId');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    if (!API_BASE) {
      // Modo de desenvolvimento sem backend - usar dados mockados
      const mockUser: User = {
        id: 'mock-user-1',
        name: 'Administrador',
        email: 'admin@demo.local',
        role: 'ADMIN',
        tenantId: 'tenant-default',
        tenant: {
          id: 'tenant-default',
          name: 'Empresa Padrão',
        },
      };

      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('tenantId', 'tenant-default');
      setUser(mockUser);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro ao fazer login' }));
        throw new Error(error.message || 'Credenciais inválidas');
      }

      const data = await response.json();
      const userData: User = data.user;

      // Guardar token e dados do utilizador
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
      if (userData.tenantId) {
        localStorage.setItem('tenantId', userData.tenantId);
      }

      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
