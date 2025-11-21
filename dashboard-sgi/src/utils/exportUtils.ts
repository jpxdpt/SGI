/**
 * Utilitários para exportação de dados
 */

import * as XLSX from 'xlsx';

/**
 * Exporta dados para CSV
 */
export const exportToCsv = <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers?: Record<keyof T, string>,
) => {
  if (data.length === 0) {
    throw new Error('Não existem dados para exportar.');
  }

  // Obter todas as chaves dos objetos
  const keys = Object.keys(data[0]) as Array<keyof T>;

  // Criar cabeçalho do CSV
  const headerRow = keys
    .map((key) => {
      const header = headers?.[key] || String(key);
      return `"${header.replace(/"/g, '""')}"`;
    })
    .join(',');

  // Criar linhas de dados
  const dataRows = data.map((row) =>
    keys
      .map((key) => {
        const value = row[key];
        if (value === null || value === undefined) {
          return '""';
        }
        // Converter para string e escapar aspas
        const stringValue = String(value).replace(/"/g, '""');
        // Se contém vírgula, quebra de linha ou aspas, envolver em aspas
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue}"`;
        }
        return stringValue;
      })
      .join(','),
  );

  // Combinar cabeçalho e dados
  const csvContent = [headerRow, ...dataRows].join('\n');

  // Adicionar BOM para UTF-8 (ajuda Excel a reconhecer corretamente)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Criar link de download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exporta dados para Excel (.xlsx) com formatação
 */
export interface ExcelExportOptions<T> {
  filename: string;
  sheetName?: string;
  headers?: Record<keyof T, string>;
  columnWidths?: Partial<Record<keyof T, number>>;
  title?: string;
  dateColumns?: Array<keyof T>;
  numberColumns?: Array<keyof T>;
}

export const exportToExcel = <T extends Record<string, unknown>>(
  data: T[],
  options: ExcelExportOptions<T>,
) => {
  if (data.length === 0) {
    throw new Error('Não existem dados para exportar.');
  }

  const { filename, sheetName = 'Dados', headers, columnWidths, title, dateColumns = [], numberColumns = [] } = options;

  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Obter chaves dos objetos
  const keys = Object.keys(data[0]) as Array<keyof T>;

  // Preparar dados com cabeçalhos
  const worksheetData: unknown[][] = [];

  // Adicionar título se fornecido
  if (title) {
    worksheetData.push([title]);
    worksheetData.push([]); // Linha vazia
  }

  // Adicionar cabeçalhos
  const headerRow = keys.map((key) => headers?.[key] || String(key));
  worksheetData.push(headerRow);

  // Adicionar dados
  data.forEach((row) => {
    const dataRow = keys.map((key) => {
      let value = row[key];
      
      // Formatar datas
      if (dateColumns.includes(key) && value) {
        try {
          const date = new Date(value as string);
          value = date.toLocaleDateString('pt-PT');
        } catch {
          // Manter valor original se não conseguir converter
        }
      }
      
      // Formatar números
      if (numberColumns.includes(key) && value !== null && value !== undefined) {
        const num = Number(value);
        if (!isNaN(num)) {
          value = num;
        }
      }
      
      return value;
    });
    worksheetData.push(dataRow);
  });

  // Criar worksheet
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Definir larguras das colunas
  if (columnWidths) {
    const wscols = keys.map((key) => ({ wch: columnWidths[key] || 15 }));
    ws['!cols'] = wscols;
  }

  // Formatar cabeçalho (se houver título, cabeçalho está na linha 3, senão linha 1)
  const headerRowIndex = title ? 2 : 0;
  const headerRange = XLSX.utils.encode_range({ s: { r: headerRowIndex, c: 0 }, e: { r: headerRowIndex, c: keys.length - 1 } });
  
  // Aplicar estilo ao cabeçalho (fundo, negrito)
  if (!ws['!merges']) ws['!merges'] = [];
  
  // Adicionar células do cabeçalho com estilo
  keys.forEach((_, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: colIndex });
    if (!ws[cellAddress]) return;
    
    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4F46E5' } }, // Cor de fundo roxa
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  });

  // Mesclar célula do título se existir
  if (title) {
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: keys.length - 1 } });
    const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[titleCell]) {
      ws[titleCell].s = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  }

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Gerar arquivo e fazer download
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Formata data para CSV
 */
export const formatDateForCsv = (dateString: string | undefined): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT');
  } catch {
    return dateString;
  }
};

