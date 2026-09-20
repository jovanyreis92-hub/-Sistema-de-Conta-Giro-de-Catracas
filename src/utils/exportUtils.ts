import { TurnstileRecord, AuditLog, TurnstileCountItem, RefectorySector, SectorSummary } from '../types';
import { formatDateTime, formatDate, formatNumber } from './formatters';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface RefectoryExportData {
  id?: string;
  date: string;
  mealType: string;
  mealLabel: string;
  responsibleName: string;
  openedAt?: string;
  closedAt?: string;
  items: TurnstileCountItem[];
  totalPeople: number;
  totalInitial: number;
  totalFinal: number;
  sectorSummaries: Record<RefectorySector, SectorSummary>;
  notes?: string;
}

/**
 * Exporta os dados do Refeitório (14 catracas) para planilha nativa do Microsoft Excel (.xlsx)
 */
export function exportRefectoryToExcel(data: RefectoryExportData, filename?: string) {
  const wb = XLSX.utils.book_new();
  const actualFilename = filename || `planilha-refeitorio-14-catracas-${data.mealType}-${data.date}.xlsx`;

  // ABA 1: 14 Catracas (Planilha Detalhada)
  const rows14: (string | number)[][] = [
    ['SISTEMA GIROFLOW - CONTROLE DE CONTA-GIRO DAS 14 CATRACAS POR REFEITÓRIO'],
    [`Data: ${formatDate(data.date)}`, `Refeição: ${data.mealLabel}`, `Horário: ${data.openedAt || '--:--'} às ${data.closedAt || '--:--'}`],
    [`Responsável: ${data.responsibleName}`, `Total Geral de Pessoas Atendidas: ${data.totalPeople}`, `Status: Validação Aprovada`],
    [],
    [
      'Nº',
      'Código',
      'Nome da Catraca',
      'Refeitório / Setor',
      'Hodômetro Inicial',
      'Hodômetro Final',
      'Pessoas Atendidas (Final - Inicial)',
      'Participação no Fluxo (%)',
      'Status'
    ]
  ];

  data.items.forEach(item => {
    const share = data.totalPeople > 0 ? ((item.netPasses / data.totalPeople) * 100).toFixed(1) + '%' : '0.0%';
    rows14.push([
      item.turnstileNumber,
      item.turnstileCode,
      item.turnstileName,
      item.sectorLabel,
      item.initialCount,
      item.finalCount,
      item.netPasses,
      share,
      item.isValid ? 'Conforme' : 'Alerta: Final < Inicial'
    ]);
  });

  // Linha de Total Geral
  rows14.push([
    '',
    'TOTAL GERAL',
    'TODAS AS 14 CATRACAS',
    'CONSOLIDADO REFEITÓRIO',
    data.totalInitial,
    data.totalFinal,
    data.totalPeople,
    '100.0%',
    'OK'
  ]);

  const ws14 = XLSX.utils.aoa_to_sheet(rows14);
  ws14['!cols'] = [
    { wch: 6 },   // Nº
    { wch: 12 },  // Código
    { wch: 32 },  // Nome da Catraca
    { wch: 28 },  // Refeitório
    { wch: 18 },  // Inicial
    { wch: 18 },  // Final
    { wch: 28 },  // Pessoas Atendidas
    { wch: 18 },  // %
    { wch: 16 }   // Status
  ];
  XLSX.utils.book_append_sheet(wb, ws14, '14 Catracas (Detalhado)');

  // ABA 2: Resumo Consolidado por Refeitório
  const sectorRows: (string | number)[][] = [
    ['RESUMO CONSOLIDADO POR REFEITÓRIO'],
    [`Refeição: ${data.mealLabel} - ${formatDate(data.date)}`],
    [],
    ['Refeitório', 'Faixa de Catracas', 'Qtd Catracas', 'Soma Inicial', 'Soma Final', 'Total de Pessoas', 'Participação (%)']
  ];

  Object.values(data.sectorSummaries).forEach(sec => {
    const share = data.totalPeople > 0 ? ((sec.totalPeople / data.totalPeople) * 100).toFixed(1) + '%' : '0.0%';
    sectorRows.push([
      sec.sectorName,
      sec.turnstilesRange,
      sec.turnstilesCount,
      sec.totalInitial,
      sec.totalFinal,
      sec.totalPeople,
      share
    ]);
  });

  sectorRows.push([
    'TOTAL CONSOLIDADO',
    'Catracas 1 a 14',
    14,
    data.totalInitial,
    data.totalFinal,
    data.totalPeople,
    '100.0%'
  ]);

  if (data.notes) {
    sectorRows.push([]);
    sectorRows.push(['Observações da Operação:', data.notes]);
  }

  const wsSector = XLSX.utils.aoa_to_sheet(sectorRows);
  wsSector['!cols'] = [
    { wch: 28 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSector, 'Resumo por Refeitório');

  // Grava e dispara download
  XLSX.writeFile(wb, actualFilename);
}

/**
 * Exporta o Boletim Oficial das 14 Catracas em Formato PDF estilizado para A4
 */
export function exportRefectoryToPDF(data: RefectoryExportData, filename?: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const actualFilename = filename || `boletim-refeitorio-14-catracas-${data.mealType}-${data.date}.pdf`;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho Oficial
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(56, 189, 248); // sky-400
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('GIROFLOW | SISTEMA DE CONTA-GIRO DE CATRACAS', 14, 12);

  doc.setTextColor(241, 245, 249); // slate-100
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('BOLETIM OFICIAL DE CONFERÊNCIA E FECHAMENTO DO REFEITÓRIO (14 CATRACAS)', 14, 19);

  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFontSize(8);
  doc.text(`Doc ID: ${data.id || 'GF-' + Math.random().toString(36).substring(2, 8).toUpperCase()}`, pageWidth - 14, 12, { align: 'right' });
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 19, { align: 'right' });

  // Bloco de Informações do Turno
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 33, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Data:', 18, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(data.date), 32, 40);

  doc.setFont('helvetica', 'bold');
  doc.text('Refeição:', 75, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(data.mealLabel, 92, 40);

  doc.setFont('helvetica', 'bold');
  doc.text('Horário:', 140, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.openedAt || '--:--'} às ${data.closedAt || '--:--'}`, 155, 40);

  doc.setFont('helvetica', 'bold');
  doc.text('Responsável:', 18, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(data.responsibleName, 42, 48);

  // Cards de Totais em Destaque
  const startY = 60;
  const cardWidth = (pageWidth - 28 - 9) / 4;
  const cards = [
    { label: 'TOTAL DE PESSOAS', value: formatNumber(data.totalPeople), color: [14, 165, 233] }, // sky-500
    { label: 'HODÔMETRO INICIAL', value: formatNumber(data.totalInitial), color: [100, 116, 139] },
    { label: 'HODÔMETRO FINAL', value: formatNumber(data.totalFinal), color: [100, 116, 139] },
    { label: 'CATRACAS MONITORADAS', value: '14 de 14', color: [16, 185, 129] }
  ];

  cards.forEach((card, index) => {
    const x = 14 + index * (cardWidth + 3);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, startY, cardWidth, 16, 1.5, 1.5, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(card.label, x + cardWidth / 2, startY + 5.5, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.value, x + cardWidth / 2, startY + 12, { align: 'center' });
  });

  // Tabela 1: Resumo dos 3 Setores de Refeitório
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('1. RESUMO SUBTOTAIS POR REFEITÓRIO', 14, 84);

  const sectorTableBody = Object.values(data.sectorSummaries).map(sec => {
    const share = data.totalPeople > 0 ? ((sec.totalPeople / data.totalPeople) * 100).toFixed(1) + '%' : '0.0%';
    return [
      sec.sectorName,
      sec.turnstilesRange,
      formatNumber(sec.totalInitial),
      formatNumber(sec.totalFinal),
      formatNumber(sec.totalPeople),
      share
    ];
  });

  // Linha de Total Geral dos Setores
  sectorTableBody.push([
    'TOTAL GERAL CONSOLIDADO',
    '14 Catracas',
    formatNumber(data.totalInitial),
    formatNumber(data.totalFinal),
    formatNumber(data.totalPeople),
    '100.0%'
  ]);

  autoTable(doc, {
    startY: 87,
    head: [['Refeitório', 'Catracas', 'Soma Inicial', 'Soma Final', 'Pessoas Atendidas', 'Part. %']],
    body: sectorTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 50 },
      1: { halign: 'center', cellWidth: 32 },
      2: { halign: 'right', cellWidth: 26 },
      3: { halign: 'right', cellWidth: 26 },
      4: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
      5: { halign: 'center', cellWidth: 20 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2
    },
    didParseCell: (dataCell) => {
      // Destaque para linha final
      if (dataCell.row.index === sectorTableBody.length - 1) {
        dataCell.cell.styles.fontStyle = 'bold';
        dataCell.cell.styles.fillColor = [226, 232, 240];
      }
    }
  });

  // Tabela 2: Detalhamento Individual das 14 Catracas
  const table1FinalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 7 : 130;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('2. QUANTITATIVO INDIVIDUAL DAS 14 CATRACAS', 14, table1FinalY);

  const itemsTableBody = data.items.map(item => {
    const share = data.totalPeople > 0 ? ((item.netPasses / data.totalPeople) * 100).toFixed(1) + '%' : '0.0%';
    return [
      String(item.turnstileNumber).padStart(2, '0'),
      item.turnstileCode,
      item.turnstileName,
      item.sectorLabel,
      formatNumber(item.initialCount),
      formatNumber(item.finalCount),
      formatNumber(item.netPasses),
      share
    ];
  });

  // Linha final de soma
  itemsTableBody.push([
    '',
    'TOTAL',
    'TODAS AS 14 CATRACAS',
    'CONSOLIDADO',
    formatNumber(data.totalInitial),
    formatNumber(data.totalFinal),
    formatNumber(data.totalPeople),
    '100.0%'
  ]);

  autoTable(doc, {
    startY: table1FinalY + 3,
    head: [['Nº', 'Código', 'Catraca', 'Refeitório', 'Inicial', 'Final', 'Pessoas', 'Part. %']],
    body: itemsTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [56, 189, 248],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      2: { halign: 'left', cellWidth: 44 },
      3: { halign: 'left', cellWidth: 38 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
      7: { halign: 'center', cellWidth: 12 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.5
    },
    didParseCell: (dataCell) => {
      if (dataCell.row.index === itemsTableBody.length - 1) {
        dataCell.cell.styles.fontStyle = 'bold';
        dataCell.cell.styles.fillColor = [226, 232, 240];
      }
    }
  });

  // Campos de Assinaturas Oficiais
  const table2FinalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 255;
  const signY = Math.min(table2FinalY, 268);

  const signWidth = (pageWidth - 28 - 16) / 3;
  const signs = [
    { title: 'Operador Responsável', line: data.responsibleName },
    { title: 'Fiscal / Nutricionista', line: 'Conferência de Cardápio/Acesso' },
    { title: 'Auditoria de Segurança', line: 'Auditoria e Controle de Fluxo' }
  ];

  signs.forEach((s, idx) => {
    const x = 14 + idx * (signWidth + 8);
    doc.setDrawColor(100, 116, 139);
    doc.line(x, signY, x + signWidth, signY);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(s.title, x + signWidth / 2, signY + 4, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(s.line, x + signWidth / 2, signY + 7.5, { align: 'center' });
  });

  // Rodapé
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Documento gerado eletronicamente pelo Sistema GiroFlow. Emissão com validade de auditoria interna.', pageWidth / 2, 290, { align: 'center' });

  // Download do arquivo PDF
  doc.save(actualFilename);
}

/**
 * Exporta Registros Gerais para Excel (.xlsx)
 */
export function exportRecordsToExcel(records: TurnstileRecord[], filename = 'relatorio-geral-catracas.xlsx') {
  const wb = XLSX.utils.book_new();

  const headers = [
    'ID Registro',
    'Código Catraca',
    'Nome da Catraca',
    'Data',
    'Turno',
    'Operador Responsável',
    'Supervisor',
    'Mecânico Inicial',
    'Mecânico Final',
    'Giros Mecânicos Líquidos',
    'Eletrônico Inicial',
    'Eletrônico Final',
    'Giros Eletrônicos Líquidos',
    'Bilhetes Comuns',
    'Estudantil',
    'Gratuidade',
    'Funcionários',
    'Liberações Manuais',
    'Total Sistema (Passes)',
    'Discrepância (Giros)',
    'Taxa Discrepância (%)',
    'Motivo Discrepância',
    'Status Aprovação',
    'Abertura',
    'Fechamento',
    'Observações'
  ];

  const rows: (string | number)[][] = [headers];

  records.forEach(r => {
    rows.push([
      r.id,
      r.turnstileCode,
      r.turnstileName,
      r.date,
      r.shift.toUpperCase(),
      r.operatorName,
      r.supervisorName || '',
      r.initialMechanical,
      r.finalMechanical,
      r.netMechanical,
      r.initialElectronic,
      r.finalElectronic,
      r.netElectronic,
      r.breakdown.standardPasses,
      r.breakdown.studentPasses,
      r.breakdown.freePasses,
      r.breakdown.employeePasses,
      r.breakdown.manualReleases,
      r.systemCountTotal,
      r.discrepancy,
      Number(r.discrepancyRate.toFixed(2)),
      r.discrepancyReason || '',
      r.status.toUpperCase(),
      formatDateTime(r.openedAt),
      r.closedAt ? formatDateTime(r.closedAt) : 'Aberto',
      r.notes || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 20 },
    { wch: 14 },
    { wch: 26 },
    { wch: 12 },
    { wch: 12 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 24 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Registros de Catracas');
  XLSX.writeFile(wb, filename);
}

/**
 * Exporta Registros Gerais para PDF (.pdf)
 */
export function exportRecordsToPDF(
  records: TurnstileRecord[], 
  title = 'Relatório Geral de Conta-Giro de Catracas',
  filename = 'relatorio-geral-catracas.pdf'
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(56, 189, 248);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('GIROFLOW | SISTEMA DE CONTA-GIRO DE CATRACAS', 14, 10);

  doc.setTextColor(241, 245, 249);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(title.toUpperCase(), 14, 17);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text(`Total de Registros: ${records.length}  |  Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 14, { align: 'right' });

  // Tabela de Registros
  const body = records.map(r => [
    r.date,
    r.turnstileCode,
    r.turnstileName,
    r.shift.toUpperCase(),
    r.operatorName,
    formatNumber(r.initialMechanical),
    formatNumber(r.finalMechanical),
    formatNumber(r.netMechanical),
    formatNumber(r.systemCountTotal),
    r.discrepancy === 0 ? '0' : (r.discrepancy > 0 ? `+${r.discrepancy}` : String(r.discrepancy)),
    r.status.toUpperCase()
  ]);

  autoTable(doc, {
    startY: 28,
    head: [['Data', 'Código', 'Catraca', 'Turno', 'Operador', 'Inicial', 'Final', 'Giros Mec.', 'Sistema', 'Discrep.', 'Status']],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      2: { halign: 'left', cellWidth: 50 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'left', cellWidth: 38 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
      8: { halign: 'right', cellWidth: 22 },
      9: { halign: 'center', cellWidth: 18 },
      10: { halign: 'center', cellWidth: 20 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.5
    }
  });

  doc.save(filename);
}

export function exportRecordsToCSV(records: TurnstileRecord[], filename = 'relatorio-conta-giro-catracas.csv') {
  const headers = [
    'ID Registro',
    'Código Catraca',
    'Nome da Catraca',
    'Data',
    'Turno',
    'Operador Responsável',
    'Supervisor',
    'Mecânico Inicial',
    'Mecânico Final',
    'Giros Mecânicos Líquidos',
    'Eletrônico Inicial',
    'Eletrônico Final',
    'Giros Eletrônicos Líquidos',
    'Bilhetes Comuns',
    'Estudantil',
    'Gratuidade',
    'Funcionários',
    'Liberações Manuais',
    'Total Sistema (Passes)',
    'Discrepância (Giros)',
    'Taxa Discrepância (%)',
    'Motivo Discrepância',
    'Status Aprovação',
    'Abertura',
    'Fechamento',
    'Observações'
  ];

  const rows = records.map(r => [
    `"${r.id}"`,
    `"${r.turnstileCode}"`,
    `"${r.turnstileName.replace(/"/g, '""')}"`,
    `"${r.date}"`,
    `"${r.shift.toUpperCase()}"`,
    `"${r.operatorName.replace(/"/g, '""')}"`,
    `"${(r.supervisorName || '').replace(/"/g, '""')}"`,
    r.initialMechanical,
    r.finalMechanical,
    r.netMechanical,
    r.initialElectronic,
    r.finalElectronic,
    r.netElectronic,
    r.breakdown.standardPasses,
    r.breakdown.studentPasses,
    r.breakdown.freePasses,
    r.breakdown.employeePasses,
    r.breakdown.manualReleases,
    r.systemCountTotal,
    r.discrepancy,
    `"${r.discrepancyRate.toFixed(2)}%"`,
    `"${(r.discrepancyReason || '').replace(/"/g, '""')}"`,
    `"${r.status.toUpperCase()}"`,
    `"${formatDateTime(r.openedAt)}"`,
    `"${r.closedAt ? formatDateTime(r.closedAt) : 'Aberto'}"`,
    `"${(r.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\r\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportAuditLogsToCSV(logs: AuditLog[], filename = 'logs-auditoria-acesso.csv') {
  const headers = [
    'ID Log',
    'Data e Hora',
    'Usuário',
    'Perfil',
    'Severidade',
    'Ação',
    'Terminal',
    'Endereço IP',
    'Detalhes Técnicos'
  ];

  const rows = logs.map(l => [
    `"${l.id}"`,
    `"${l.timestamp}"`,
    `"${l.userName.replace(/"/g, '""')}"`,
    `"${l.userRole.toUpperCase()}"`,
    `"${l.severity.toUpperCase()}"`,
    `"${l.actionLabel.replace(/"/g, '""')}"`,
    `"${l.terminalId}"`,
    `"${l.ipAddress}"`,
    `"${l.details.replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\r\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportToJSON(data: unknown, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadBlob(jsonContent, filename, 'application/json');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
