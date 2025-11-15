import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from '../ui/ThemeToggle';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)] text-[var(--color-foreground)]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 bg-[var(--color-bg)]/90 backdrop-blur border-b border-[var(--color-border)] py-4 px-4 lg:px-6 flex items-center justify-between">
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg border border-[var(--color-border)]"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Sistema Integrado</p>
            <h1 className="font-display text-xl">Painel de controlo</h1>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 py-6 bg-[var(--color-bg)] w-full px-6">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};

