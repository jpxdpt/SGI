import { Menu, LogOut, User, Search, Bell, Grid, Download, Printer, Share2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from '../ui/ThemeToggle';
import { TenantSelector } from '../ui/TenantSelector';
import { NotificationsDropdown } from '../ui/NotificationsDropdown';
import { GlobalSearch } from '../ui/GlobalSearch';
import { ExportShareMenu } from '../ui/ExportShareMenu';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)] text-[var(--color-foreground)] overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 bg-[var(--color-bg)]/90 backdrop-blur border-b border-[var(--color-border)] py-3 px-4 lg:px-6 flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg border border-[var(--color-border)] shrink-0"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Abrir menu de navegação"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </button>
            <div className="hidden lg:block min-w-0">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">Sistema Integrado</p>
              <h1 className="font-display text-xl">Painel de controlo</h1>
            </div>
            {/* Search Bar */}
            <div className="hidden md:block flex-1 max-w-md">
              <GlobalSearch />
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Actions */}
            <div className="hidden lg:flex items-center gap-1 border-r border-[var(--color-border)] pr-2 mr-2">
              <ExportShareMenu variant="icon" />
            </div>
            
            {/* Notifications */}
            <NotificationsDropdown />
            
            {/* Tenant Selector */}
            <TenantSelector />
            
            {/* User */}
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm">
                <User className="h-4 w-4 text-slate-600 dark:text-slate-300 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{user.name}</span>
              </div>
            )}
            
            {/* Logout & Theme */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Terminar sessão"
              aria-label="Terminar sessão"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Terminar sessão</span>
            </button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 py-6 bg-[var(--color-bg)] min-w-0 px-4 lg:px-6 overflow-x-hidden">
          <div className="w-full max-w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};

