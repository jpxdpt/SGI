import { Calendar, Clock, Mail, Trash2, Plus, Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Modal } from './Modal';
import { Input } from './Input';
import { Select } from './Select';
import { useToast } from './Toast';
import { Badge } from './Badge';
import clsx from 'clsx';

interface ScheduledReport {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  email: string;
  lastSent: Date | null;
  nextRun: Date;
  enabled: boolean;
}

const STORAGE_KEY = 'sgi_scheduled_reports';

const generateNextRun = (frequency: 'daily' | 'weekly' | 'monthly', time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  if (frequency === 'daily') {
    if (next <= new Date()) {
      next.setDate(next.getDate() + 1);
    }
  } else if (frequency === 'weekly') {
    next.setDate(next.getDate() + (7 - next.getDay()));
  } else if (frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
  }

  return next;
};

export const ScheduledReports = () => {
  const [reports, setReports] = useState<ScheduledReport[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored).map((r: ScheduledReport) => ({
          ...r,
          lastSent: r.lastSent ? new Date(r.lastSent) : null,
          nextRun: new Date(r.nextRun),
        }));
      }
    } catch {
      // Ignorar erros
    }
    return [];
  });

  const [showModal, setShowModal] = useState(false);
  const [newReport, setNewReport] = useState<Partial<ScheduledReport>>({
    name: '',
    frequency: 'weekly',
    time: '09:00',
    email: '',
    enabled: true,
  });

  const { showToast } = useToast();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch {
      // Ignorar erros
    }
  }, [reports]);

  // Simular envio automático (em produção, seria um cron job no backend)
  useEffect(() => {
    const checkAndSend = () => {
      const now = new Date();
      reports.forEach((report) => {
        if (report.enabled && report.nextRun <= now) {
          // Simular envio
          showToast(`Relatório "${report.name}" enviado para ${report.email}`, 'success');
          
          setReports((prev) =>
            prev.map((r) =>
              r.id === report.id
                ? {
                    ...r,
                    lastSent: new Date(),
                    nextRun: generateNextRun(r.frequency, r.time),
                  }
                : r,
            ),
          );
        }
      });
    };

    const interval = setInterval(checkAndSend, 60000); // Verificar a cada minuto
    return () => clearInterval(interval);
  }, [reports, showToast]);

  const handleAddReport = () => {
    if (!newReport.name || !newReport.email) {
      showToast('Por favor, preenche o nome e email do relatório.', 'warning');
      return;
    }

    const report: ScheduledReport = {
      id: `report-${Date.now()}`,
      name: newReport.name!,
      frequency: newReport.frequency || 'weekly',
      time: newReport.time || '09:00',
      email: newReport.email!,
      lastSent: null,
      nextRun: generateNextRun(newReport.frequency || 'weekly', newReport.time || '09:00'),
      enabled: true,
    };

    setReports((prev) => [...prev, report]);
    setShowModal(false);
    setNewReport({
      name: '',
      frequency: 'weekly',
      time: '09:00',
      email: '',
      enabled: true,
    });
    showToast('Relatório agendado com sucesso!', 'success');
  };

  const handleDelete = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    showToast('Relatório eliminado com sucesso!', 'success');
  };

  const handleToggle = (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    );
  };

  const handleSendNow = (id: string) => {
    const report = reports.find((r) => r.id === id);
    if (report) {
      showToast(`Relatório "${report.name}" enviado para ${report.email}`, 'success');
      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                lastSent: new Date(),
                nextRun: generateNextRun(r.frequency, r.time),
              }
            : r,
        ),
      );
    }
  };

  const frequencyLabels = {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
  };

  if (reports.length === 0 && !showModal) {
    return (
      <Card title="Relatórios agendados" className="mb-6">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-400 opacity-50" />
          <p className="text-sm text-slate-500 mb-4">Nenhum relatório agendado</p>
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Agendar relatório
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Relatórios agendados"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Novo
          </Button>
        }
        className="mb-6"
      >
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{report.name}</h4>
                    <Badge variant={report.enabled ? 'success' : 'default'} className="text-xs">
                      {report.enabled ? 'Ativo' : 'Pausado'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {frequencyLabels[report.frequency]} às {report.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {report.email}
                    </span>
                  </div>
                  {report.lastSent && (
                    <p className="text-xs text-slate-400 mt-1">
                      Último envio: {report.lastSent.toLocaleString('pt-PT')}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    Próximo envio: {report.nextRun.toLocaleString('pt-PT')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSendNow(report.id)}
                    title="Enviar agora"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(report.id)}
                    title={report.enabled ? 'Pausar' : 'Ativar'}
                  >
                    {report.enabled ? 'Pausar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(report.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-3 w-3 text-rose-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        title="Agendar relatório"
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setNewReport({
            name: '',
            frequency: 'weekly',
            time: '09:00',
            email: '',
            enabled: true,
          });
        }}
      >
        <div className="space-y-4">
          <Input
            label="Nome do relatório"
            value={newReport.name || ''}
            onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
            placeholder="Ex: Relatório Semanal"
            required
          />
          <Input
            label="Email"
            type="email"
            value={newReport.email || ''}
            onChange={(e) => setNewReport({ ...newReport, email: e.target.value })}
            placeholder="exemplo@empresa.com"
            required
          />
          <Select
            label="Frequência"
            value={newReport.frequency || 'weekly'}
            onChange={(e) => setNewReport({ ...newReport, frequency: e.target.value as ScheduledReport['frequency'] })}
          >
            <option value="daily">Diário</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </Select>
          <Input
            label="Hora"
            type="time"
            value={newReport.time || '09:00'}
            onChange={(e) => setNewReport({ ...newReport, time: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setNewReport({
                  name: '',
                  frequency: 'weekly',
                  time: '09:00',
                  email: '',
                  enabled: true,
                });
              }}
            >
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={handleAddReport}>
              Agendar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};



