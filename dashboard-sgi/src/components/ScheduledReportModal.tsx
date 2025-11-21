import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { Select } from './ui/Select';
import type { ScheduledReport, ReportTemplate, ReportFrequency } from '../services/api';
import { Calendar, Clock, Mail } from 'lucide-react';

const scheduledReportSchema = z.object({
  reportTemplateId: z.string().uuid('Template é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ON_DEMAND']),
  schedule: z.string().min(1, 'Horário é obrigatório'),
  recipients: z.array(z.string().email()).min(1, 'Pelo menos um destinatário é obrigatório'),
  format: z.array(z.enum(['PDF', 'CSV'])).min(1, 'Pelo menos um formato é obrigatório'),
  filters: z.any().optional(),
  enabled: z.boolean().optional().default(true),
});

type ScheduledReportFormData = z.infer<typeof scheduledReportSchema>;

const reportFrequencyLabels: Record<ReportFrequency, string> = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
  ON_DEMAND: 'Sob Demanda',
};

interface ScheduledReportModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ScheduledReportFormData) => void;
  templates: ReportTemplate[];
  isLoading?: boolean;
  initialData?: Partial<ScheduledReport>;
}

export const ScheduledReportModal = ({
  open,
  onClose,
  onSubmit,
  templates,
  isLoading = false,
  initialData,
}: ScheduledReportModalProps) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<('PDF' | 'CSV')[]>(['PDF']);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduledReportFormData>({
    resolver: zodResolver(scheduledReportSchema),
    defaultValues: {
      reportTemplateId: initialData?.reportTemplateId || '',
      name: initialData?.name || '',
      description: initialData?.description || '',
      frequency: initialData?.frequency || 'WEEKLY',
      schedule: initialData?.schedule || '09:00',
      recipients: initialData?.recipients || [],
      format: initialData?.format || ['PDF'],
      enabled: initialData?.enabled ?? true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        reportTemplateId: initialData.reportTemplateId || '',
        name: initialData.name || '',
        description: initialData.description || '',
        frequency: initialData.frequency || 'WEEKLY',
        schedule: initialData.schedule || '09:00',
        recipients: initialData.recipients || [],
        format: initialData.format || ['PDF'],
        enabled: initialData.enabled ?? true,
      });
      setSelectedFormats(initialData.format || ['PDF']);
    }
  }, [initialData, reset]);

  const watchedRecipients = watch('recipients') || [];

  const handleAddRecipient = () => {
    if (recipientEmail && !watchedRecipients.includes(recipientEmail)) {
      const newRecipients = [...watchedRecipients, recipientEmail];
      setValue('recipients', newRecipients);
      setRecipientEmail('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setValue(
      'recipients',
      watchedRecipients.filter((r) => r !== email),
    );
  };

  const handleToggleFormat = (format: 'PDF' | 'CSV') => {
    const newFormats = selectedFormats.includes(format)
      ? selectedFormats.filter((f) => f !== format)
      : [...selectedFormats, format];
    setSelectedFormats(newFormats);
    setValue('format', newFormats);
  };

  return (
    <Modal title="Agendar Relatório" open={open} onClose={onClose} size="lg">
      <form className="space-y-6" onSubmit={handleSubmit((data) => onSubmit({ ...data, format: selectedFormats }))}>
        <Select
          label="Template de Relatório"
          {...register('reportTemplateId')}
          error={errors.reportTemplateId?.message}
          required
        >
          <option value="">Seleciona um template...</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.reportType})
            </option>
          ))}
        </Select>

        <Input label="Nome do Agendamento" {...register('name')} error={errors.name?.message} required />
        <Textarea label="Descrição" {...register('description')} error={errors.description?.message} rows={2} />

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Frequência
            </label>
            <Select {...register('frequency')} error={errors.frequency?.message} required>
              {(Object.keys(reportFrequencyLabels) as ReportFrequency[]).map((freq) => (
                <option key={freq} value={freq}>
                  {reportFrequencyLabels[freq]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Clock className="h-4 w-4 inline mr-1" />
              Horário
            </label>
            <Input type="time" {...register('schedule')} error={errors.schedule?.message} required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Mail className="h-4 w-4 inline mr-1" />
            Destinatários
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddRecipient();
                }
              }}
              placeholder="email@exemplo.com"
              className="flex-1"
            />
            <Button type="button" variant="secondary" size="sm" onClick={handleAddRecipient}>
              Adicionar
            </Button>
          </div>
          {watchedRecipients.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {watchedRecipients.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-brand-500 text-white"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(email)}
                    className="hover:bg-brand-600 rounded-full p-0.5"
                    aria-label={`Remover ${email}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.recipients && <p className="mt-1 text-xs text-red-600">{errors.recipients.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Formatos de Exportação</label>
          <div className="flex gap-3">
            {(['PDF', 'CSV'] as const).map((format) => (
              <label key={format} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFormats.includes(format)}
                  onChange={() => handleToggleFormat(format)}
                  className="form-checkbox h-4 w-4 text-brand-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{format === 'CSV' ? 'CSV (Excel)' : format}</span>
              </label>
            ))}
          </div>
          {errors.format && <p className="mt-1 text-xs text-red-600">{errors.format.message}</p>}
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="enabled" {...register('enabled')} className="form-checkbox h-4 w-4 text-brand-600" />
          <label htmlFor="enabled" className="text-sm text-slate-700 dark:text-slate-300">
            Ativar agendamento imediatamente
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Agendar Relatório
          </Button>
        </div>
      </form>
    </Modal>
  );
};

