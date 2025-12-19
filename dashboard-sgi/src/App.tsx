import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastContainer } from './components/ui/Toast';
import { Spinner } from './components/ui/Spinner';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy loading das páginas
const InternalAuditsPage = lazy(() => import('./pages/InternalAudits').then((m) => ({ default: m.InternalAuditsPage })));
const ExternalAuditsPage = lazy(() => import('./pages/ExternalAudits').then((m) => ({ default: m.ExternalAuditsPage })));
const ActionsPage = lazy(() => import('./pages/ActionsPage').then((m) => ({ default: m.ActionsPage })));
const LogsPage = lazy(() => import('./pages/LogsPage').then((m) => ({ default: m.LogsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const WorkflowsPage = lazy(() => import('./pages/WorkflowsPage').then((m) => ({ default: m.WorkflowsPage })));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const DocumentReadCompliancePage = lazy(() => import('./pages/DocumentReadCompliancePage').then((m) => ({ default: m.DocumentReadCompliancePage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))); // New Analytics Page
const InternalOccurrencesPage = lazy(() => import('./pages/InternalOccurrencesPage').then((m) => ({ default: m.InternalOccurrencesPage })));
const AuditProgramsPage = lazy(() => import('./pages/AuditProgramsPage').then((m) => ({ default: m.AuditProgramsPage })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Spinner size="lg" />
  </div>
);

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/analytics" element={<AnalyticsPage />} />
                      <Route path="/ocorrencias-internas" element={<InternalOccurrencesPage />} />
                      <Route path="/auditorias-internas" element={<InternalAuditsPage />} />
                      <Route path="/auditorias-externas" element={<ExternalAuditsPage />} />
                      <Route path="/programas-auditoria" element={<AuditProgramsPage />} />
                      <Route path="/acoes" element={<ActionsPage />} />
                      <Route path="/workflows" element={<WorkflowsPage />} />
                      <Route path="/documentos" element={<DocumentsPage />} />
                      <Route path="/documentos/conformidade-leitura" element={<DocumentReadCompliancePage />} />
                      <Route path="/relatorios" element={<ReportsPage />} />
                      <Route path="/logs" element={<LogsPage />} />
                      <Route path="/configuracoes" element={<SettingsPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </ErrorBoundary>
                </Suspense>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
