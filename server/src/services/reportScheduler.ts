import { prisma } from '../prisma';
import { ReportEngine, type ReportData, type ReportContext } from './reportEngine';
import {
  fetchInternalAudits,
  fetchExternalAudits,
  fetchActionItems,
  fetchOccurrences,
  fetchSectors,
  fetchDashboardSummary,
} from './dataFetcher';
import { ReportFrequency } from '@prisma/client';
import fs from 'fs';

/**
 * Serviço de agendamento de relatórios
 * Executa relatórios agendados periodicamente
 */
export class ReportScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Inicia o scheduler (verifica a cada minuto)
   */
  start() {
    if (this.intervalId) {
      return; // Já está a correr
    }

    console.log('[ReportScheduler] Iniciando scheduler de relatórios...');
    this.intervalId = setInterval(() => {
      this.checkAndExecute().catch((error) => {
        console.error('[ReportScheduler] Erro ao verificar relatórios agendados:', error);
      });
    }, 60000); // Verificar a cada minuto

    // Executar imediatamente na inicialização
    this.checkAndExecute().catch((error) => {
      console.error('[ReportScheduler] Erro na execução inicial:', error);
    });
  }

  /**
   * Para o scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[ReportScheduler] Scheduler parado.');
    }
  }

  /**
   * Verifica e executa relatórios agendados que estão prontos
   */
  private async checkAndExecute() {
    if (this.isRunning) {
      return; // Evitar execuções concorrentes
    }

    this.isRunning = true;

    try {
      const now = new Date();
      
      // Buscar relatórios agendados que estão prontos para execução
      const scheduledReports = await prisma.scheduledReport.findMany({
        where: {
          enabled: true,
          status: 'ACTIVE',
          nextRunAt: {
            lte: now,
          },
        },
        include: {
          reportTemplate: {
            include: {
              components: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });

      console.log(`[ReportScheduler] Encontrados ${scheduledReports.length} relatórios prontos para execução.`);

      for (const scheduled of scheduledReports) {
        try {
          await this.executeScheduledReport(scheduled);
        } catch (error: any) {
          console.error(`[ReportScheduler] Erro ao executar relatório ${scheduled.id}:`, error);
          
          // Registrar falha
          await prisma.reportExecution.create({
            data: {
              scheduledReportId: scheduled.id,
              status: 'FAILED',
              errorMessage: error.message || 'Erro desconhecido',
              startedAt: new Date(),
              completedAt: new Date(),
            },
          });
        }
      }
    } catch (error) {
      console.error('[ReportScheduler] Erro ao verificar relatórios:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Executa um relatório agendado
   */
  private async executeScheduledReport(scheduled: any) {
    console.log(`[ReportScheduler] Executando relatório: ${scheduled.name} (${scheduled.id})`);

    const tenantId = scheduled.tenantId;
    const executionId = `exec-${Date.now()}`;

    // Criar registro de execução
    const execution = await prisma.reportExecution.create({
      data: {
        scheduledReportId: scheduled.id,
        status: 'PENDING',
        startedAt: new Date(),
      },
    });

    try {
      // Buscar dados
      const [internalAudits, externalAudits, actions, occurrences, sectors, summary] = await Promise.all([
        fetchInternalAudits(tenantId),
        fetchExternalAudits(tenantId),
        fetchActionItems(tenantId),
        fetchOccurrences(tenantId),
        fetchSectors(tenantId),
        fetchDashboardSummary(tenantId),
      ]);

      const reportData: ReportData = {
        internalAudits,
        externalAudits,
        actions,
        occurrences,
        sectors,
        summary,
      };

      const context: ReportContext = {
        tenantId,
        userId: scheduled.createdBy,
        filters: scheduled.filters,
      };

      // Gerar relatórios nos formatos solicitados
      const formats = Array.isArray(scheduled.format)
        ? scheduled.format
        : (scheduled.format ? JSON.parse(scheduled.format as string) : ['PDF']);

      const generatedFiles: string[] = [];

      for (const format of formats) {
        try {
          let result: { filePath: string; fileName: string };

          switch (format) {
            case 'PDF':
              result = await ReportEngine.generatePdfReport(scheduled.reportTemplateId, context, reportData);
              break;
            case 'EXCEL':
              result = await ReportEngine.generateExcelReport(scheduled.reportTemplateId, context, reportData);
              break;
            case 'CSV':
              result = await ReportEngine.generateCsvReport(scheduled.reportTemplateId, context, reportData);
              break;
            default:
              console.warn(`[ReportScheduler] Formato não suportado: ${format}`);
              continue;
          }

          generatedFiles.push(result.filePath);

          // TODO: Enviar por email (implementar serviço de email)
          console.log(`[ReportScheduler] Relatório ${format} gerado: ${result.filePath}`);
          // Aqui poderia integrar com serviço de email para enviar aos recipients
        } catch (error: any) {
          console.error(`[ReportScheduler] Erro ao gerar formato ${format}:`, error);
        }
      }

      // Atualizar execução como sucesso
      const fileSize = generatedFiles.length > 0 && fs.existsSync(generatedFiles[0])
        ? fs.statSync(generatedFiles[0]).size
        : null;

      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          filePath: generatedFiles[0] || null,
          fileSize,
          completedAt: new Date(),
          metadata: {
            formats: formats,
            filesGenerated: generatedFiles.length,
          },
        },
      });

      // Calcular próximo run
      const nextRunAt = calculateNextRun(scheduled.frequency, scheduled.schedule);

      // Atualizar scheduled report
      await prisma.scheduledReport.update({
        where: { id: scheduled.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
        },
      });

      console.log(`[ReportScheduler] Relatório ${scheduled.name} executado com sucesso. Próxima execução: ${nextRunAt.toISOString()}`);
    } catch (error: any) {
      // Atualizar execução como falha
      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message || 'Erro desconhecido',
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  /**
   * Executa manualmente um relatório agendado
   */
  async executeManually(scheduledReportId: string) {
    const scheduled = await prisma.scheduledReport.findUnique({
      where: { id: scheduledReportId },
      include: {
        reportTemplate: {
          include: {
            components: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!scheduled) {
      throw new Error('Relatório agendado não encontrado.');
    }

    await this.executeScheduledReport(scheduled);
  }
}

/**
 * Helper para calcular próximo run
 */
function calculateNextRun(frequency: ReportFrequency, schedule: string): Date {
  const now = new Date();
  const next = new Date(now);

  switch (frequency) {
    case ReportFrequency.DAILY:
      const [hours, minutes] = schedule.split(':').map(Number);
      next.setHours(hours || 9, minutes || 0, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case ReportFrequency.WEEKLY:
      next.setDate(next.getDate() + (7 - next.getDay()));
      next.setHours(9, 0, 0, 0);
      break;

    case ReportFrequency.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(9, 0, 0, 0);
      break;

    case ReportFrequency.QUARTERLY:
      next.setMonth(next.getMonth() + 3);
      next.setDate(1);
      next.setHours(9, 0, 0, 0);
      break;

    case ReportFrequency.YEARLY:
      next.setFullYear(next.getFullYear() + 1);
      next.setMonth(0);
      next.setDate(1);
      next.setHours(9, 0, 0, 0);
      break;

    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}

// Singleton instance
export const reportScheduler = new ReportScheduler();





