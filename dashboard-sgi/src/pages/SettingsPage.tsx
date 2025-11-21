import { useTheme } from '../theme/useTheme';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';

export const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <PageHeader title="Configurações" subtitle="Preferências gerais da aplicação." />
      <div className="grid xl:grid-cols-2 gap-6">
        <Card title="Tema" description="Escolhe como queres visualizar o painel.">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tema atual: <span className="font-semibold">{theme === 'light' ? 'Claro' : 'Escuro'}</span>
            </p>
            <button type="button" onClick={toggleTheme} className="px-4 py-2 rounded-full border">
              Alternar
            </button>
          </div>
        </Card>
      </div>
    </>
  );
};

