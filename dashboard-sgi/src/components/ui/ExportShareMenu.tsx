import { Download, FileText, FileSpreadsheet, Mail, Printer, Share2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchInternalAudits,
  fetchExternalAudits,
  fetchActionItems,
  fetchOccurrences,
  fetchSectors,
} from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportToCsv } from '../../utils/exportUtils';
import { useToast } from './Toast';
import { Button } from './Button';
import { Modal } from './Modal';
import { Input, Textarea } from './Input';
import { useAuth } from '../../context/AuthContext';

interface ExportShareMenuProps {
  variant?: 'icon' | 'button';
}

export const ExportShareMenu = ({ variant = 'icon' }: ExportShareMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('Relatório SGI');
  const [emailMessage, setEmailMessage] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const { user } = useAuth();

  const internalAuditsQuery = useQuery({ queryKey: ['audits', 'internal'], queryFn: () => fetchInternalAudits() });
  const externalAuditsQuery = useQuery({ queryKey: ['audits', 'external'], queryFn: () => fetchExternalAudits() });
  const actionsQuery = useQuery({ queryKey: ['actions'], queryFn: () => fetchActionItems() });
  const occurrencesQuery = useQuery({ queryKey: ['occurrences'], queryFn: () => fetchOccurrences() });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    doc.setFontSize(16);
    doc.text('Relatório Completo - Sistema de Gestão Integrado', 40, 40);
    doc.setFontSize(10);
    doc.text(`Data de emissão: ${new Date().toLocaleString('pt-PT')}`, 40, 55);

    let yPos = 75;

    // Auditorias Internas
    if ((internalAuditsQuery.data ?? []).length > 0) {
      const headers = [['ID', 'Ano', 'Setor', 'Responsável', 'Status']];
      const rows = (internalAuditsQuery.data ?? []).slice(0, 20).map((audit) => [
        String(audit.id).slice(0, 10),
        String(audit.ano),
        audit.setor ?? '',
        audit.responsavel ?? '',
        audit.status,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: headers,
        body: rows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42] },
        margin: { top: yPos, left: 40, right: 40 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 20;
    }

    doc.save('relatorio-completo-sgi.pdf');
    showToast('Relatório PDF exportado com sucesso!', 'success');
    setIsOpen(false);
  };

  const exportToExcel = () => {
    const allData = {
      'Auditorias Internas': (internalAuditsQuery.data ?? []).map((audit) => ({
        ID: audit.id,
        Ano: audit.ano,
        Setor: audit.setor,
        Responsável: audit.responsavel,
        Status: audit.status,
        'Data Prevista': audit.dataPrevista ? new Date(audit.dataPrevista).toLocaleDateString('pt-PT') : '',
      })),
      'Auditorias Externas': (externalAuditsQuery.data ?? []).map((audit) => ({
        ID: audit.id,
        Ano: audit.ano,
        'Entidade Auditora': audit.entidadeAuditora,
        Setor: audit.setor,
        Status: audit.status,
      })),
      'Ações': (actionsQuery.data ?? []).map((action) => ({
        ID: action.id,
        Origem: action.origem,
        Setor: action.setor,
        Status: action.status,
        'Data Limite': action.dataLimite ? new Date(action.dataLimite).toLocaleDateString('pt-PT') : '',
      })),
      'Ocorrências': (occurrencesQuery.data ?? []).map((occ) => ({
        ID: occ.id,
        Setor: occ.setor,
        Gravidade: occ.gravidade,
        Status: occ.status,
      })),
    };

    // Exportar cada tipo como CSV separado
    Object.entries(allData).forEach(([sheetName, data]) => {
      if (data.length > 0) {
        exportToCsv(data, `relatorio-${sheetName.toLowerCase().replace(/\s+/g, '-')}`, {} as never);
      }
    });

    showToast('Relatórios CSV exportados com sucesso!', 'success');
    setIsOpen(false);
  };

  const handlePrint = () => {
    window.print();
    setIsOpen(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Relatório SGI',
          text: 'Relatório do Sistema de Gestão Integrado',
          url: window.location.href,
        });
        showToast('Partilhado com sucesso!', 'success');
      } catch (error) {
        // Usuário cancelou ou erro
      }
    } else {
      // Fallback: copiar URL para clipboard
      navigator.clipboard.writeText(window.location.href);
      showToast('URL copiada para a área de transferência!', 'success');
    }
    setIsOpen(false);
  };

  const handleSendEmail = () => {
    if (!emailTo.trim()) {
      showToast('Por favor, indica um endereço de email.', 'warning');
      return;
    }

    // Construir corpo do email
    const emailBody = `
${emailMessage || 'Relatório do Sistema de Gestão Integrado'}

---
Gerado por: ${user?.name || 'Sistema'}
Data: ${new Date().toLocaleString('pt-PT')}
URL: ${window.location.href}
    `.trim();

    // Criar mailto link
    const mailtoLink = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;

    showToast('Abrindo cliente de email...', 'info');
    setShowEmailModal(false);
    setIsOpen(false);
    setEmailTo('');
  };

  const buttonContent = (
    <>
      <Download className="h-4 w-4" />
      <span className="hidden lg:inline">Exportar</span>
    </>
  );

  return (
    <>
      <div className="relative" ref={menuRef}>
        {variant === 'icon' ? (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Exportar/Partilhar"
          >
            <Share2 className="h-5 w-5" />
          </button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setIsOpen(!isOpen)}>
            {buttonContent}
          </Button>
        )}

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 animate-scale-in py-2">
            <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-[var(--color-border)] mb-2">
              Exportar
            </div>
            <button
              type="button"
              onClick={exportToPDF}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm text-left"
            >
              <FileText className="h-4 w-4 text-slate-500" />
              <span>Exportar PDF</span>
            </button>
            <button
              type="button"
              onClick={exportToExcel}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm text-left"
            >
              <FileSpreadsheet className="h-4 w-4 text-slate-500" />
              <span>Exportar Excel (CSV)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm text-left"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Imprimir</span>
            </button>

            <div className="border-t border-[var(--color-border)] my-2"></div>

            <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-[var(--color-border)] mb-2">
              Partilhar
            </div>
            <button
              type="button"
              onClick={() => {
                setShowEmailModal(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm text-left"
            >
              <Mail className="h-4 w-4 text-slate-500" />
              <span>Enviar por Email</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm text-left"
            >
              <Share2 className="h-4 w-4 text-slate-500" />
              <span>Partilhar Link</span>
            </button>
          </div>
        )}
      </div>

      <Modal
        title="Enviar por Email"
        open={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setEmailTo('');
          setEmailSubject('Relatório SGI');
          setEmailMessage('');
        }}
      >
        <div className="space-y-4">
          <Input
            label="Para"
            type="email"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="exemplo@empresa.com"
            required
          />
          <Input
            label="Assunto"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            required
          />
          <Textarea
            label="Mensagem"
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            rows={4}
            placeholder="Mensagem opcional..."
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowEmailModal(false);
                setEmailTo('');
              }}
            >
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={handleSendEmail}>
              Enviar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};







