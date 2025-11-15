import { useTheme } from '../theme/useTheme';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { API_BASE } from '../services/mockApi';

export const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const apiBase = API_BASE;

  return (
    <>
      <PageHeader title="Configurações" subtitle="Preferências gerais da aplicação." />
      <div className="grid xl:grid-cols-2 gap-6">
        <Card title="Tema" description="Escolhe como queres visualizar o painel.">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Tema atual: <span className="font-semibold">{theme === 'light' ? 'Claro' : 'Escuro'}</span>
            </p>
            <button type="button" onClick={toggleTheme} className="px-4 py-2 rounded-full border">
              Alternar
            </button>
          </div>
        </Card>

        <Card title="Feed de informação" description="Define de onde vêm as auditorias, ações e ocorrências.">
          <ol className="text-sm text-slate-500 space-y-2 list-decimal list-inside">
            <li>
              Por omissão usamos os mocks em <code>src/data/mockData.ts</code>. Basta editar os arrays para novos dados de
              demonstração.
            </li>
            <li>
              Para ligar a um backend real, cria um ficheiro <code>.env</code> com{' '}
              <code>VITE_API_BASE_URL=https://o-teu-servidor</code>. Os endpoints esperados são:
              <ul className="list-disc list-inside mt-1">
                <li><code>/audits/internal</code></li>
                <li><code>/audits/external</code></li>
                <li><code>/actions</code>, <code>/occurrences</code>, <code>/sectors</code></li>
              </ul>
              Se a API devolver JSON compatível com as interfaces em <code>types/models.ts</code>, a UI atualiza automaticamente.
            </li>
            <li>
              Caso o endpoint falhe, o sistema faz fallback para os mocks, garantindo disponibilidade em apresentações.
            </li>
          </ol>
          <p className="text-xs text-slate-400 mt-3">
            Fonte atual:{' '}
            <span className="font-semibold">{apiBase ? `API remota (${apiBase})` : 'Mock local / ficheiro default'}</span>
          </p>
        </Card>
      </div>
    </>
  );
};

