import { prisma } from '../prisma';
// @ts-ignore - jspdf pode ter problemas de tipos no Node.js
import { jsPDF } from 'jspdf';
// @ts-ignore - jspdf-autotable não tem tipos completos
import autoTableModule from 'jspdf-autotable';

// Extrair a função autoTable corretamente
const autoTable = (autoTableModule as any).default || (autoTableModule as any).autoTable || autoTableModule;
import * as XLSX from 'xlsx';
// ChartJS será importado dinamicamente apenas quando necessário
import type { ReportType, ReportComponentType, ReportStatus } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const REPORTS_DIR = process.env.REPORTS_DIR || path.join(process.cwd(), 'reports');

// Garantir que o diretório existe
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

export interface ReportData {
  internalAudits?: any[];
  externalAudits?: any[];
  actions?: any[];
  occurrences?: any[];
  sectors?: any[];
  summary?: any;
  [key: string]: any;
}

export interface ReportContext {
  tenantId: string;
  userId: string;
  filters?: any;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface ComponentConfig {
  type: ReportComponentType;
  title?: string;
  configuration: any;
  dataSource?: any;
  style?: any;
}

/**
 * Motor de geração de relatórios avançados
 */
export class ReportEngine {
  /**
   * Gera um relatório PDF a partir de um template
   */
  static async generatePdfReport(
    templateId: string,
    context: ReportContext,
    data: ReportData,
  ): Promise<{ filePath: string; fileName: string }> {
    try {
      const template = await prisma.reportTemplate.findUnique({
        where: { id: templateId },
        include: {
          components: {
            orderBy: { order: 'asc' },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!template) {
        throw new Error('Template não encontrado.');
      }

      if (template.tenantId !== context.tenantId && !template.isPublic) {
        throw new Error('Template não tem permissão para acesso.');
      }

      // Verificar se há componentes
      if (!template.components || template.components.length === 0) {
        throw new Error('Template não tem componentes configurados.');
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });
      
      // autoTable será usado diretamente como função
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;

      // ===== CAPA =====
      doc.setFillColor(79, 70, 229); // Brand color
      doc.rect(0, 0, pageWidth, 80, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(template.name, pageWidth / 2, 35, { align: 'center' });

      if (template.description) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(template.description, pageWidth / 2, 50, { align: 'center' });
      }

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      yPos = 120;

      const now = new Date();
      doc.text(`Gerado em: ${now.toLocaleString('pt-PT')}`, margin, yPos);
      yPos += 12;
      doc.text(`Gerado por: ${template.creator.name}`, margin, yPos);
      yPos += 12;
      doc.text(`Tipo: ${template.reportType}`, margin, yPos);

      // ===== COMPONENTES =====
      doc.addPage();
      yPos = margin;

      for (const component of template.components) {
        yPos = await this.renderComponent(
          doc,
          component,
          data,
          margin,
          yPos,
          contentWidth,
          pageHeight,
          context,
        );

        // Verificar se precisa de nova página
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = margin;
        }
      }

      // Guardar ficheiro
      const fileName = `report-${templateId}-${Date.now()}.pdf`;
      const filePath = path.join(REPORTS_DIR, context.tenantId, fileName);

      // Criar diretório do tenant se não existir
      const tenantDir = path.join(REPORTS_DIR, context.tenantId);
      if (!fs.existsSync(tenantDir)) {
        fs.mkdirSync(tenantDir, { recursive: true });
      }

      // No Node.js, jsPDF usa output() para obter o buffer
      // Tentar múltiplos formatos até encontrar um que funcione
      let pdfBuffer: Buffer | null = null;
      
      try {
        // Primeiro, tentar 'arraybuffer' (melhor para Node.js)
        const pdfArrayBuffer = doc.output('arraybuffer');
        if (pdfArrayBuffer && pdfArrayBuffer instanceof ArrayBuffer) {
          pdfBuffer = Buffer.from(pdfArrayBuffer);
        }
      } catch (e1: any) {
        console.warn('[ReportEngine] arraybuffer falhou, tentando uint8array:', e1.message);
      }
      
      if (!pdfBuffer) {
        try {
          // Segundo, tentar 'uint8array' (usar arraybuffer e converter)
          const pdfArrayBuffer = doc.output('arraybuffer') as ArrayBuffer;
          if (pdfArrayBuffer) {
            pdfBuffer = Buffer.from(pdfArrayBuffer);
          }
        } catch (e2: any) {
          console.warn('[ReportEngine] uint8array falhou, tentando blob:', e2.message);
        }
      }
      
      if (!pdfBuffer) {
        try {
          // Terceiro, tentar 'blob' e converter
          const pdfBlob = doc.output('blob');
          if (pdfBlob && pdfBlob instanceof Uint8Array) {
            pdfBuffer = Buffer.from(pdfBlob);
          }
        } catch (e3: any) {
          console.warn('[ReportEngine] blob falhou, tentando base64:', e3.message);
        }
      }
      
      if (!pdfBuffer) {
        // Último recurso: base64
        const pdfBase64 = doc.output('datauristring');
        if (pdfBase64 && pdfBase64.startsWith('data:application/pdf;base64,')) {
          const base64Data = pdfBase64.split(',')[1];
          pdfBuffer = Buffer.from(base64Data, 'base64');
        }
      }
      
      if (!pdfBuffer) {
        throw new Error('Erro ao gerar PDF: não foi possível obter o buffer do documento');
      }
      
      fs.writeFileSync(filePath, pdfBuffer);

      return { filePath, fileName };
    } catch (error: any) {
      console.error('[ReportEngine] Erro ao gerar PDF:', error);
      console.error('[ReportEngine] Error name:', error?.name);
      console.error('[ReportEngine] Error message:', error?.message);
      console.error('[ReportEngine] Stack:', error?.stack);
      if (error?.cause) {
        console.error('[ReportEngine] Error cause:', error.cause);
      }
      const errorMessage = error?.message || 'Erro desconhecido';
      const fullError = new Error(`Erro ao gerar PDF: ${errorMessage}`);
      (fullError as any).originalError = error;
      throw fullError;
    }
  }

  /**
   * Renderiza um componente do relatório
   */
  private static async renderComponent(
    doc: jsPDF,
    component: any,
    data: ReportData,
    margin: number,
    yPos: number,
    contentWidth: number,
    pageHeight: number,
    context: ReportContext,
  ): Promise<number> {
    let currentY = yPos;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título do componente
    if (component.title) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text(component.title, margin, currentY);
      currentY += 20;
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(1);
      doc.line(margin, currentY - 10, pageWidth - margin, currentY - 10);
      currentY += 10;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const config = component.configuration as any;

    switch (component.componentType) {
      case 'KPI':
        currentY = this.renderKPI(doc, config, data, margin, currentY, contentWidth);
        break;

      case 'TABLE':
        currentY = this.renderTable(doc, config, data, margin, currentY, contentWidth, pageHeight);
        break;

      case 'CHART_BAR':
      case 'CHART_LINE':
      case 'CHART_PIE':
      case 'CHART_AREA':
        currentY = await this.renderChart(doc, config, component.componentType, data, margin, currentY, contentWidth, pageHeight, context);
        break;

      case 'TEXT':
        currentY = this.renderText(doc, config, margin, currentY, contentWidth, pageHeight);
        break;

      default:
        currentY += 20;
    }

    return currentY + 30; // Espaçamento após componente
  }

  /**
   * Renderiza KPI
   */
  private static renderKPI(
    doc: jsPDF,
    config: any,
    data: ReportData,
    margin: number,
    yPos: number,
    width: number,
  ): number {
    const kpis = config.kpis || [];
    
    if (kpis.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Nenhum KPI configurado', margin, yPos);
      return yPos + 20;
    }

    const cols = Math.min(kpis.length, 3); // Máximo 3 colunas
    const colWidth = (width - (cols - 1) * 10) / cols; // Espaçamento entre colunas
    let xPos = margin;
    let currentRowY = yPos;

    kpis.forEach((kpi: any, index: number) => {
      // Nova linha a cada 3 KPIs
      if (index > 0 && index % cols === 0) {
        xPos = margin;
        currentRowY += 70;
      }

      // Calcular valor
      const value = this.calculateKPI(kpi, data);
      const label = kpi.label || this.getMetricLabel(kpi.metric) || kpi.metric;

      // Box do KPI com fundo colorido
      doc.setFillColor(245, 247, 250);
      doc.rect(xPos, currentRowY - 50, colWidth - 10, 65, 'F');
      
      // Borda
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(xPos, currentRowY - 50, colWidth - 10, 65);

      // Label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const labelLines = doc.splitTextToSize(label, colWidth - 20);
      doc.text(labelLines, xPos + 5, currentRowY - 35, { maxWidth: colWidth - 20 });

      // Valor grande
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      const valueStr = String(value);
      doc.text(valueStr, xPos + 5, currentRowY - 10, { maxWidth: colWidth - 20 });

      // Unidade (se houver)
      if (kpi.aggregation === 'avg') {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('média', xPos + 5, currentRowY + 5);
      }

      xPos += colWidth + 10;
    });

    return currentRowY + 30;
  }

  /**
   * Obtém label amigável para métricas
   */
  private static getMetricLabel(metric: string): string {
    const labels: Record<string, string> = {
      internalAudits: 'Auditorias Internas',
      externalAudits: 'Auditorias Externas',
      actions: 'Ações',
      occurrences: 'Ocorrências',
    };
    return labels[metric] || metric;
  }

  /**
   * Calcula valor de KPI
   */
  private static calculateKPI(kpi: any, data: ReportData): number | string {
    try {
      const { metric, field, aggregation } = kpi || {};

      if (!metric || !aggregation) {
        return '-';
      }

      switch (aggregation) {
      case 'count':
        const dataset = this.getDatasetByMetric(metric, data);
        return dataset?.length || 0;

      case 'sum':
        const dataset2 = this.getDatasetByMetric(metric, data);
        if (!dataset2 || !field) return 0;
        return dataset2.reduce((sum: number, item: any) => sum + (Number(item[field]) || 0), 0);

      case 'avg':
        const dataset3 = this.getDatasetByMetric(metric, data);
        if (!dataset3 || !field || dataset3.length === 0) return 0;
        const sum = dataset3.reduce((s: number, item: any) => s + (Number(item[field]) || 0), 0);
        return (sum / dataset3.length).toFixed(2);

      default:
        return '-';
      }
    } catch (error: any) {
      console.error('[ReportEngine] Erro ao calcular KPI:', error);
      return '-';
    }
  }

  /**
   * Obtém dataset por métrica
   */
  private static getDatasetByMetric(metric: string, data: ReportData): any[] {
    switch (metric) {
      case 'internalAudits':
        return data.internalAudits || [];
      case 'externalAudits':
        return data.externalAudits || [];
      case 'actions':
        return data.actions || [];
      case 'occurrences':
        return data.occurrences || [];
      default:
        return [];
    }
  }

  /**
   * Renderiza tabela
   */
  private static renderTable(
    doc: jsPDF,
    config: any,
    data: ReportData,
    margin: number,
    yPos: number,
    width: number,
    pageHeight: number,
  ): number {
    try {
      console.log('[ReportEngine] Renderizando tabela:', { config: JSON.stringify(config).substring(0, 200) });
      
      const { dataset, columns } = config || {};

      if (!dataset) {
        console.warn('[ReportEngine] Dataset não definido');
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Dataset não configurado', margin, yPos);
        return yPos + 30;
      }

      if (!columns || !Array.isArray(columns) || columns.length === 0) {
        console.warn('[ReportEngine] Colunas não configuradas:', columns);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Colunas não configuradas', margin, yPos);
        return yPos + 30;
      }

      const datasetData = this.getDatasetByMetric(dataset, data) || [];
      console.log('[ReportEngine] Dados do dataset:', { count: datasetData.length, sample: datasetData[0] });

      if (datasetData.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Sem dados disponíveis', margin, yPos);
        return yPos + 30;
      }

      // Preparar dados da tabela
      const tableData = datasetData.map((item: any) =>
        columns.map((col: any) => {
          const value = item[col.field];
          if (value === null || value === undefined) {
            return '-';
          }
          if (value instanceof Date) {
            return value.toLocaleDateString('pt-PT');
          }
          if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            // String de data ISO
            return new Date(value).toLocaleDateString('pt-PT');
          }
          return String(value);
        }),
      );

      const headers = columns.map((col: any) => {
        const header = col.label || col.field || '-';
        return header;
      });

      console.log('[ReportEngine] Tabela preparada:', { 
        headers, 
        rows: tableData.length, 
        firstRow: tableData[0] 
      });

      // Verificar se há dados
      if (tableData.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Sem dados disponíveis para esta tabela', margin, yPos);
        return yPos + 30;
      }

      // Renderizar tabela com autoTable
      try {
        console.log('[ReportEngine] Chamando autoTable:', { 
          headers, 
          rows: tableData.length,
          startY: yPos,
          margin,
          isFunction: typeof autoTable === 'function'
        });
        
        if (typeof autoTable !== 'function') {
          throw new Error('autoTable não é uma função. Tipo: ' + typeof autoTable);
        }
        
        autoTable(doc, {
          head: [headers],
          body: tableData.slice(0, 100), // Limitar a 100 linhas
          startY: yPos,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 9,
            cellPadding: 4,
            overflow: 'linebreak',
            cellWidth: 'auto',
          },
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'left',
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [50, 50, 50],
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250],
          },
          columnStyles: {
            0: { cellWidth: 'auto' },
          },
          tableWidth: 'wrap',
          theme: 'striped',
        });

        // autoTable guarda o finalY em doc.lastAutoTable.finalY
        const finalY = (doc as any).lastAutoTable?.finalY ?? (doc as any).lastAutoTable?.finalY;
        console.log('[ReportEngine] Tabela renderizada:', { 
          finalY, 
          lastAutoTable: (doc as any).lastAutoTable,
          yPos 
        });
        
        // Se não houver finalY, usar uma estimativa baseada no número de linhas
        if (!finalY || finalY === yPos) {
          const estimatedHeight = tableData.length * 20 + 40; // ~20pt por linha + cabeçalho
          const estimatedY = yPos + Math.min(estimatedHeight, pageHeight - yPos - 40);
          console.log('[ReportEngine] Usando Y estimado:', estimatedY);
          return estimatedY + 10;
        }
        
        return finalY + 10;
      } catch (autoTableError: any) {
        console.error('[ReportEngine] Erro no autoTable:', autoTableError);
        console.error('[ReportEngine] Stack:', autoTableError.stack);
        // Fallback: renderizar como texto simples
        doc.setFontSize(9);
        doc.text(headers.join(' | '), margin, yPos);
        let currentY = yPos + 15;
        tableData.slice(0, 10).forEach((row: any[]) => {
          doc.text(row.join(' | '), margin, currentY);
          currentY += 12;
        });
        return currentY + 10;
      }
    } catch (error: any) {
      console.error('[ReportEngine] Erro ao renderizar tabela:', error);
      console.error('[ReportEngine] Stack:', error.stack);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Erro ao renderizar tabela', margin, yPos);
      return yPos + 30;
    }
  }

  /**
   * Renderiza gráfico real no PDF usando Chart.js
   */
  private static async renderChart(
    doc: jsPDF,
    config: any,
    chartType: string,
    data: ReportData,
    margin: number,
    yPos: number,
    width: number,
    pageHeight: number,
    context: ReportContext,
  ): Promise<number> {
    try {
      const { dataset, xField, yField } = config || {};
      const datasetData = this.getDatasetByMetric(dataset, data) || [];

      if (!datasetData || datasetData.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Sem dados disponíveis para o gráfico', margin, yPos);
        return yPos + 30;
      }

      // Preparar dados do gráfico
      const chartData = this.prepareChartData(chartType, datasetData, xField, yField);

      if (!chartData || chartData.labels.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Não foi possível preparar dados do gráfico', margin, yPos);
        return yPos + 30;
      }

      // Importar Chart.js dinamicamente (lazy load)
      let ChartJSNodeCanvas: any;
      try {
        const chartjsModule = await import('chartjs-node-canvas');
        ChartJSNodeCanvas = chartjsModule.ChartJSNodeCanvas;
      } catch (importError: any) {
        console.error('[ReportEngine] Erro ao importar chartjs-node-canvas:', importError);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Erro ao carregar biblioteca de gráficos', margin, yPos);
        return yPos + 30;
      }

      // Configurar Chart.js
      const chartWidth = Math.min(Math.floor(width), 600);
      const chartHeight = 200;
      const chartJSNodeCanvas = new ChartJSNodeCanvas({
        width: chartWidth,
        height: chartHeight,
        backgroundColour: 'white',
      });

      // Configuração do gráfico
      let chartJsType: 'bar' | 'line' | 'pie' | 'doughnut' = 'bar';
      if (chartType === 'CHART_PIE') {
        chartJsType = 'pie';
      } else if (chartType === 'CHART_LINE' || chartType === 'CHART_AREA') {
        chartJsType = 'line';
      } else if (chartType === 'CHART_BAR') {
        chartJsType = 'bar';
      }

      const chartConfig: any = {
        type: chartJsType,
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: chartData.label || 'Valor',
              data: chartData.values,
              backgroundColor: [
                'rgba(79, 70, 229, 0.8)',
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(139, 92, 246, 0.8)',
              ],
              borderColor: [
                'rgba(79, 70, 229, 1)',
                'rgba(59, 130, 246, 1)',
                'rgba(16, 185, 129, 1)',
                'rgba(245, 158, 11, 1)',
                'rgba(239, 68, 68, 1)',
                'rgba(139, 92, 246, 1)',
              ],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            title: {
              display: config.title ? true : false,
              text: config.title || '',
            },
          },
        },
      };

      // Gerar imagem do gráfico
      const imageBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfig);
      const imageBase64 = imageBuffer.toString('base64');
      const imageDataUrl = `data:image/png;base64,${imageBase64}`;

      // Adicionar ao PDF
      doc.addImage(imageDataUrl, 'PNG', margin, yPos, width, chartHeight);

      return yPos + chartHeight + 20;
    } catch (error: any) {
      console.error('[ReportEngine] Erro ao renderizar gráfico:', error);
      // Fallback: mostrar mensagem de erro
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Erro ao gerar gráfico', margin, yPos);
      return yPos + 30;
    }
  }

  /**
   * Prepara dados para o gráfico
   */
  private static prepareChartData(
    chartType: string,
    datasetData: any[],
    xField?: string,
    yField?: string,
  ): { labels: string[]; values: number[]; label: string } {
    if (chartType === 'CHART_PIE') {
      // Para gráfico de pizza, agrupa por xField e conta
      const grouped: Record<string, number> = {};
      datasetData.forEach((item: any) => {
        const key = xField ? String(item[xField] || 'N/A') : 'Total';
        grouped[key] = (grouped[key] || 0) + 1;
      });

      return {
        labels: Object.keys(grouped),
        values: Object.values(grouped),
        label: 'Quantidade',
      };
    } else if (chartType === 'CHART_BAR' || chartType === 'CHART_LINE') {
      // Para barras/linhas, agrupa por xField e soma/agrega yField
      const grouped: Record<string, number> = {};
      datasetData.forEach((item: any) => {
        const key = xField ? String(item[xField] || 'N/A') : 'Item';
        const value = yField ? Number(item[yField] || 0) : 1;
        grouped[key] = (grouped[key] || 0) + value;
      });

      return {
        labels: Object.keys(grouped),
        values: Object.values(grouped),
        label: yField || 'Quantidade',
      };
    } else {
      // CHART_AREA similar a line
      return this.prepareChartData('CHART_LINE', datasetData, xField, yField);
    }
  }

  /**
   * Renderiza texto
   */
  private static renderText(
    doc: jsPDF,
    config: any,
    margin: number,
    yPos: number,
    width: number,
    pageHeight: number,
  ): number {
    const { content } = config;
    if (!content) return yPos;

    const lines = doc.splitTextToSize(content, width);
    doc.text(lines, margin, yPos);

    return yPos + lines.length * 12;
  }

  /**
   * Gera relatório Excel com gráficos
   */
  static async generateExcelReport(
    templateId: string,
    context: ReportContext,
    data: ReportData,
  ): Promise<{ filePath: string; fileName: string }> {
    const template = await prisma.reportTemplate.findUnique({
      where: { id: templateId },
      include: {
        components: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template || template.tenantId !== context.tenantId) {
      throw new Error('Template não encontrado ou não tem permissão.');
    }

    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];

    // Título
    wsData.push([template.name]);
    if (template.description) {
      wsData.push([template.description]);
    }
    wsData.push([]);
    wsData.push([`Gerado em: ${new Date().toLocaleString('pt-PT')}`]);
    wsData.push([]);

    // Renderizar componentes
    for (const component of template.components) {
      if (component.title) {
        wsData.push([component.title]);
        wsData.push([]);
      }

      const config = component.configuration as any;

      switch (component.componentType) {
        case 'KPI':
          const kpis = config.kpis || [];
          wsData.push(['Métrica', 'Valor']);
          kpis.forEach((kpi: any) => {
            const value = this.calculateKPI(kpi, data);
            wsData.push([kpi.label || kpi.metric, value]);
          });
          wsData.push([]);
          break;

        case 'TABLE':
          const { dataset, columns } = config;
          const datasetData = this.getDatasetByMetric(dataset, data) || [];
          if (columns && datasetData.length > 0) {
            wsData.push(columns.map((col: any) => col.label || col.field));
            datasetData.forEach((item: any) => {
              wsData.push(columns.map((col: any) => item[col.field] || '-'));
            });
          }
          wsData.push([]);
          break;

        case 'TEXT':
          if (config.content) {
            wsData.push([config.content]);
            wsData.push([]);
          }
          break;

        case 'CHART_BAR':
        case 'CHART_LINE':
        case 'CHART_PIE':
        case 'CHART_AREA':
          // Para Excel, incluímos os dados para que o utilizador possa criar o gráfico manualmente
          const { dataset: chartDataset, xField: chartXField, yField: chartYField } = config;
          const chartDatasetData = this.getDatasetByMetric(chartDataset, data) || [];
          if (chartDatasetData.length > 0) {
            wsData.push(['Dados do Gráfico']);
            if (chartXField && chartYField) {
              wsData.push([chartXField, chartYField]);
              chartDatasetData.forEach((item: any) => {
                wsData.push([item[chartXField] || '-', item[chartYField] || 0]);
              });
            } else if (chartXField) {
              // Agrupa por xField
              const grouped: Record<string, number> = {};
              chartDatasetData.forEach((item: any) => {
                const key = String(item[chartXField] || 'N/A');
                grouped[key] = (grouped[key] || 0) + 1;
              });
              wsData.push(['Categoria', 'Valor']);
              Object.entries(grouped).forEach(([key, value]) => {
                wsData.push([key, value]);
              });
            }
            wsData.push([]);
          }
          break;
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

    // Guardar ficheiro
    const fileName = `report-${templateId}-${Date.now()}.xlsx`;
    const filePath = path.join(REPORTS_DIR, context.tenantId, fileName);

    const tenantDir = path.join(REPORTS_DIR, context.tenantId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    XLSX.writeFile(wb, filePath);

    return { filePath, fileName };
  }

  /**
   * Gera relatório CSV
   */
  static async generateCsvReport(
    templateId: string,
    context: ReportContext,
    data: ReportData,
  ): Promise<{ filePath: string; fileName: string }> {
    // Similar ao Excel mas formato CSV simples
    const template = await prisma.reportTemplate.findUnique({
      where: { id: templateId },
      include: {
        components: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template || template.tenantId !== context.tenantId) {
      throw new Error('Template não encontrado ou não tem permissão.');
    }

    let csvContent = `${template.name}\n`;
    if (template.description) {
      csvContent += `${template.description}\n`;
    }
    csvContent += `\nGerado em: ${new Date().toLocaleString('pt-PT')}\n\n`;

    // Renderizar componentes para CSV
    for (const component of template.components) {
      if (component.title) {
        csvContent += `\n## ${component.title}\n`;
      }

      const config = component.configuration as any;

      switch (component.componentType) {
        case 'KPI':
          const kpis = config.kpis || [];
          if (kpis.length > 0) {
            csvContent += 'Métrica,Valor\n';
            kpis.forEach((kpi: any) => {
              const value = this.calculateKPI(kpi, data);
              const label = kpi.label || this.getMetricLabel(kpi.metric) || kpi.metric;
              csvContent += `"${label.replace(/"/g, '""')}","${value}"\n`;
            });
          }
          csvContent += '\n';
          break;

        case 'TABLE':
          const { dataset, columns } = config;
          const datasetData = this.getDatasetByMetric(dataset, data) || [];

          if (columns && columns.length > 0 && datasetData.length > 0) {
            csvContent += columns.map((col: any) => `"${(col.label || col.field || '-').replace(/"/g, '""')}"`).join(',') + '\n';
            datasetData.forEach((item: any) => {
              csvContent +=
                columns
                  .map((col: any) => {
                    const value = item[col.field];
                    if (value instanceof Date) {
                      return `"${value.toLocaleDateString('pt-PT')}"`;
                    }
                    return `"${String(value || '-').replace(/"/g, '""')}"`;
                  })
                  .join(',') + '\n';
            });
          }
          csvContent += '\n';
          break;

        case 'TEXT':
          if (config.content) {
            csvContent += `"${String(config.content).replace(/"/g, '""')}"\n\n`;
          }
          break;

        case 'CHART_BAR':
        case 'CHART_LINE':
        case 'CHART_PIE':
        case 'CHART_AREA':
          // Para CSV, incluímos os dados tabulares
          const { dataset: csvChartDataset, xField: csvXField, yField: csvYField } = config;
          const csvChartDatasetData = this.getDatasetByMetric(csvChartDataset, data) || [];
          if (csvChartDatasetData.length > 0) {
            csvContent += 'Dados do Gráfico\n';
            if (csvXField && csvYField) {
              csvContent += `"${csvXField}","${csvYField}"\n`;
              csvChartDatasetData.forEach((item: any) => {
                const xValue = item[csvXField];
                const yValue = item[csvYField];
                csvContent += `"${String(xValue || '-').replace(/"/g, '""')}","${yValue || 0}"\n`;
              });
            } else if (csvXField) {
              // Agrupa por xField
              const grouped: Record<string, number> = {};
              csvChartDatasetData.forEach((item: any) => {
                const key = String(item[csvXField] || 'N/A');
                grouped[key] = (grouped[key] || 0) + 1;
              });
              csvContent += '"Categoria","Valor"\n';
              Object.entries(grouped).forEach(([key, value]) => {
                csvContent += `"${key.replace(/"/g, '""')}","${value}"\n`;
              });
            }
            csvContent += '\n';
          }
          break;
      }
    }

    const fileName = `report-${templateId}-${Date.now()}.csv`;
    const filePath = path.join(REPORTS_DIR, context.tenantId, fileName);

    const tenantDir = path.join(REPORTS_DIR, context.tenantId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    fs.writeFileSync(filePath, csvContent, 'utf-8');

    return { filePath, fileName };
  }
}



