import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Briefcase,
  ListChecks,
  ShieldAlert,
  Building2,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/auditorias-internas', label: 'Auditorias Internas', icon: ClipboardList },
  { to: '/auditorias-externas', label: 'Auditorias Externas', icon: Briefcase },
  { to: '/acoes', label: 'Ações Geradas', icon: ListChecks },
  { to: '/ocorrencias', label: 'Ocorrências Internas', icon: ShieldAlert },
  { to: '/cadastro', label: 'Cadastro de Setores', icon: Building2 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => (
  <>
    <div
      className={clsx(
        'fixed inset-0 bg-black/50 lg:hidden transition-opacity',
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      )}
      onClick={onClose}
    />
    <aside
      className={clsx(
        'fixed z-40 inset-y-0 left-0 w-72 bg-[var(--color-card)] border-r border-[var(--color-border)] transition-transform duration-300 lg:translate-x-0 lg:static',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[var(--color-border)]">
        <div className="h-10 w-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-semibold">
          SGI
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-500">PL-SGI-017</p>
          <p className="font-semibold text-lg text-[var(--color-foreground)]">Monitorização</p>
        </div>
      </div>
      <nav className="flex flex-col px-4 py-6 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-brand-500/15 text-brand-600 dark:text-brand-200'
                    : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/40',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  </>
);


