import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/Dashboard';
import { InternalAuditsPage } from './pages/InternalAudits';
import { ExternalAuditsPage } from './pages/ExternalAudits';
import { ActionsPage } from './pages/ActionsPage';
import { OccurrencesPage } from './pages/OccurrencesPage';
import { CadastroPage } from './pages/CadastroPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/auditorias-internas" element={<InternalAuditsPage />} />
        <Route path="/auditorias-externas" element={<ExternalAuditsPage />} />
        <Route path="/acoes" element={<ActionsPage />} />
        <Route path="/ocorrencias" element={<OccurrencesPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
