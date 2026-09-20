import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle,
  RotateCw,
  X,
  Building,
  Shield,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportRecordsToCSV, exportToJSON, exportRecordsToExcel, exportRecordsToPDF } from '../utils/exportUtils';
import { formatNumber, formatDate, formatDateTime } from '../utils/formatters';
import { TurnstileRecord } from '../types';

export const ReportsExport: React.FC = () => {
  const { records, turnstiles, currentUser, addAuditLog } = useApp();

  // Filters
  const [periodPreset, setPeriodPreset] = useState<'today' | '7days' | 'month' | 'custom'>('7days');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedTurnstile, setSelectedTurnstile] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [filterDiscrepancyOnly, setFilterDiscrepancyOnly] = useState<boolean>(false);

  // Print Preview Modal
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const handlePeriodChange = (preset: 'today' | '7days' | 'month' | 'custom') => {
    setPeriodPreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setEndDate(todayStr);

    if (preset === 'today') {
      setStartDate(todayStr);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(d.toISOString().split('T')[0]);
    }
  };

  // Filter records
  const filteredRecords = records.filter(r => {
    if (r.date < startDate || r.date > endDate) return false;
    if (selectedTurnstile !== 'all' && r.turnstileId !== selectedTurnstile) return false;
    if (selectedShift !== 'all' && r.shift !== selectedShift) return false;
    if (filterDiscrepancyOnly && r.discrepancy === 0) return false;
    return true;
  });

  // Calculate Consolidated Aggregates
  const totalNetRotations = filteredRecords.reduce((sum, r) => sum + r.netMechanical, 0);
  const totalStandardPasses = filteredRecords.reduce((sum, r) => sum + r.breakdown.standardPasses, 0);
  const totalStudentPasses = filteredRecords.reduce((sum, r) => sum + r.breakdown.studentPasses, 0);
  const totalFreePasses = filteredRecords.reduce((sum, r) => sum + r.breakdown.freePasses, 0);
  const totalManualReleases = filteredRecords.reduce((sum, r) => sum + r.breakdown.manualReleases, 0);
  const totalDiscrepantCount = filteredRecords.filter(r => r.discrepancy !== 0).length;
  const netDiscrepancyTurns = filteredRecords.reduce((sum, r) => sum + Math.abs(r.discrepancy), 0);

  // Financial approximation (e.g. standard ticket R$ 5,00, student R$ 2,50)
  const estimatedRevenue = (totalStandardPasses * 5.00) + (totalStudentPasses * 2.50);

  const handleExportCSV = () => {
    exportRecordsToCSV(filteredRecords, `relatorio-giroflow-${startDate}-a-${endDate}.csv`);
    addAuditLog(
      'REPORT_EXPORT',
      'Exportação de Relatório CSV',
      `Exportado relatório com ${filteredRecords.length} registros no formato CSV por ${currentUser?.name || 'Usuário'}.`,
      'info',
      { totalRecords: filteredRecords.length, startDate, endDate }
    );
  };

  const handleExportExcel = () => {
    exportRecordsToExcel(filteredRecords, `relatorio-catracas-${startDate}-a-${endDate}.xlsx`);
    addAuditLog(
      'REPORT_EXPORT',
      'Exportação de Planilha Excel (.xlsx)',
      `Exportada planilha nativa do Excel com ${filteredRecords.length} registros formatados por ${currentUser?.name || 'Usuário'}.`,
      'info',
      { totalRecords: filteredRecords.length, startDate, endDate }
    );
  };

  const handleExportPDF = () => {
    exportRecordsToPDF(
      filteredRecords,
      `Relatório de Conta-Giro de Catracas (${formatDate(startDate)} a ${formatDate(endDate)})`,
      `relatorio-catracas-${startDate}-a-${endDate}.pdf`
    );
    addAuditLog(
      'REPORT_EXPORT',
      'Exportação de Documento PDF (.pdf)',
      `Exportado documento PDF oficial A4 com ${filteredRecords.length} registros de catracas por ${currentUser?.name || 'Usuário'}.`,
      'info',
      { totalRecords: filteredRecords.length, startDate, endDate }
    );
  };

  const handleExportJSON = () => {
    exportToJSON(filteredRecords, `relatorio-giroflow-${startDate}-a-${endDate}.json`);
    addAuditLog(
      'REPORT_EXPORT',
      'Exportação de Dados JSON',
      `Exportados ${filteredRecords.length} registros estruturados em JSON.`,
      'info'
    );
  };

  const handleTriggerPrint = () => {
    addAuditLog(
      'REPORT_EXPORT',
      'Emissão de Relatório Gerencial Impresso',
      `Visualização e impressão de relatório oficial A4 com ${filteredRecords.length} registros.`,
      'info'
    );
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-850 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Exportação de Relatórios & Análise de Fluxo</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Geração de dados tabulados, consolidados contábeis e demonstrativo para fiscalização
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="reports-btn-excel"
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-md shadow-emerald-900/30 transition-all active:scale-95"
            title="Exportar planilha nativa para Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          <button
            id="reports-btn-pdf"
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-700 hover:bg-cyan-600 text-white shadow-md shadow-cyan-900/30 transition-all active:scale-95"
            title="Exportar relatório formatado em PDF A4 (.pdf)"
          >
            <FileText className="w-4 h-4" />
            <span>Exportar PDF (.pdf)</span>
          </button>

          <button
            id="reports-btn-csv"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Exportar arquivo de texto separado por ponto e vírgula (.csv)"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>

          <button
            id="reports-btn-json"
            onClick={handleExportJSON}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Exportar registros brutos em formato JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>JSON</span>
          </button>

          <button
            id="reports-btn-print"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-all shadow"
            title="Visualizar documento gerencial formatado para impressão A4"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Visualizar A4</span>
          </button>
        </div>
      </div>

      {/* Filter Parameters */}
      <div className="bg-slate-850 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span>Filtros de Período & Escopo de Catracas</span>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">Período Rápido:</span>
          {(['today', '7days', 'month', 'custom'] as const).map(preset => {
            const labels = {
              today: 'Hoje',
              '7days': 'Últimos 7 Dias',
              month: 'Mês Atual',
              custom: 'Personalizado'
            };
            return (
              <button
                key={preset}
                onClick={() => handlePeriodChange(preset)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  periodPreset === preset
                    ? 'bg-cyan-950 border border-cyan-700 text-cyan-300'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>

        {/* Date Inputs & Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Data Inicial:</label>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Data Final:</label>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Catraca:</label>
            <select
              value={selectedTurnstile}
              onChange={e => setSelectedTurnstile(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todas as Catracas</option>
              {turnstiles.map(t => (
                <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Turno:</label>
            <select
              value={selectedShift}
              onChange={e => setSelectedShift(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todos os Turnos</option>
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
              <option value="noite">Noite</option>
              <option value="madrugada">Madrugada</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilterDiscrepancyOnly(!filterDiscrepancyOnly)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                filterDiscrepancyOnly
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Apenas Divergências</span>
            </button>
          </div>
        </div>
      </div>

      {/* Period Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total de Giros Líquidos</span>
          <h3 className="text-2xl font-bold font-mono text-cyan-400 mt-2">
            {formatNumber(totalNetRotations)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Registrados fisicamente pelos hodômetros</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Receita Tarifária Estimada</span>
          <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedRevenue)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Pagantes Comuns + Estudantes (50%)</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Gratuidades & Isenções</span>
          <h3 className="text-2xl font-bold font-mono text-blue-400 mt-2">
            {formatNumber(totalFreePasses)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Sênior + PCD ({((totalFreePasses / (totalNetRotations || 1)) * 100).toFixed(1)}% do fluxo)</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Turnos com Divergência</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <h3 className={`text-2xl font-bold font-mono ${totalDiscrepantCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {totalDiscrepantCount}
            </h3>
            <span className="text-xs text-slate-400 font-mono">({netDiscrepancyTurns} giros discrepantes)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Submetidos a auditoria fiscal</p>
        </div>

      </div>

      {/* Filtered Data Preview Table */}
      <div className="bg-slate-850 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-bold text-white">
            Pré-Visualização dos Dados Consolidados ({filteredRecords.length} turnos)
          </h4>
          <span className="text-xs text-slate-400">
            Período: {formatDate(startDate)} até {formatDate(endDate)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Data / Turno</th>
                <th className="py-3 px-4">Catraca</th>
                <th className="py-3 px-4">Operador</th>
                <th className="py-3 px-4 text-right">Hodômetro Físico</th>
                <th className="py-3 px-4 text-right">Eletrônico</th>
                <th className="py-3 px-4 text-right">Comum</th>
                <th className="py-3 px-4 text-right">Estudante</th>
                <th className="py-3 px-4 text-right">Gratuidade</th>
                <th className="py-3 px-4 text-center">Divergência</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    Nenhum registro encontrado para este intervalo de datas.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-sans">
                      <span className="font-semibold text-slate-200">{formatDate(r.date)}</span>
                      <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">{r.shift}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-cyan-400">{r.turnstileCode}</td>
                    <td className="py-3 px-4 font-sans text-slate-300">{r.operatorName}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-100">{formatNumber(r.netMechanical)}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{formatNumber(r.netElectronic)}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{formatNumber(r.breakdown.standardPasses)}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{formatNumber(r.breakdown.studentPasses)}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{formatNumber(r.breakdown.freePasses)}</td>
                    <td className="py-3 px-4 text-center font-sans">
                      {r.discrepancy === 0 ? (
                        <span className="text-emerald-400 text-[11px]">0</span>
                      ) : (
                        <span className="text-amber-400 font-bold text-[11px]">
                          {r.discrepancy > 0 ? `+${r.discrepancy}` : r.discrepancy}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        r.status === 'approved' ? 'text-emerald-400 bg-emerald-950/80' : 'text-amber-400 bg-amber-950/80'
                      }`}>
                        {r.status === 'approved' ? 'Aprovado' : 'Em Análise'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official A4 Print / PDF Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 print-page">
            
            {/* Modal Controls (Hidden in print) */}
            <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-100">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-800">Visualização de Impressão Oficial (A4)</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow transition-all"
                  title="Exportar planilha nativa Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Baixar Excel (.xlsx)</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-cyan-300 border border-slate-700 shadow transition-all"
                  title="Gerar e baixar PDF (.pdf)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Baixar PDF (.pdf)</span>
                </button>

                <button
                  onClick={handleTriggerPrint}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white shadow transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir A4</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 sm:p-10 space-y-6 text-slate-800 font-sans text-xs">
              
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                      G
                    </div>
                    <div>
                      <h1 className="text-lg font-black tracking-tight text-slate-900">GIROFLOW SISTEMAS</h1>
                      <p className="text-[10px] text-slate-600 uppercase font-semibold">Relatório Gerencial de Conta-Giro & Auditoria de Catracas</p>
                    </div>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-600 space-y-0.5">
                  <p><strong>Emissão:</strong> {formatDateTime(new Date().toISOString())}</p>
                  <p><strong>Responsável:</strong> {currentUser?.name} ({currentUser?.roleLabel})</p>
                  <p><strong>Terminal:</strong> EST-CENTRAL-01</p>
                </div>
              </div>

              {/* Period & Scope Info */}
              <div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-slate-500">Intervalo Analisado:</span>
                  <strong className="text-slate-900 ml-1.5">{formatDate(startDate)} até {formatDate(endDate)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Catracas Filtradas:</span>
                  <strong className="text-slate-900 ml-1.5">
                    {selectedTurnstile === 'all' ? 'Todas as Unidades (01 a 06)' : selectedTurnstile.toUpperCase()}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Total de Turnos:</span>
                  <strong className="text-slate-900 ml-1.5">{filteredRecords.length} turnos</strong>
                </div>
              </div>

              {/* KPI Summary Blocks */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="border border-slate-300 p-3 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Giros Físicos Totais</span>
                  <p className="text-lg font-black font-mono text-slate-900 mt-1">{formatNumber(totalNetRotations)}</p>
                </div>
                <div className="border border-slate-300 p-3 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Passes Pagantes</span>
                  <p className="text-lg font-black font-mono text-slate-900 mt-1">{formatNumber(totalStandardPasses + totalStudentPasses)}</p>
                </div>
                <div className="border border-slate-300 p-3 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Gratuidades / Isenções</span>
                  <p className="text-lg font-black font-mono text-slate-900 mt-1">{formatNumber(totalFreePasses)}</p>
                </div>
                <div className="border border-slate-300 p-3 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Divergências Físicas</span>
                  <p className="text-lg font-black font-mono text-slate-900 mt-1">{netDiscrepancyTurns} giros</p>
                </div>
              </div>

              {/* Tabular Details */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Demonstrativo por Fechamento de Turno
                </h4>
                <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-700 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300">ID / Data</th>
                      <th className="p-2 border-r border-slate-300">Catraca</th>
                      <th className="p-2 border-r border-slate-300">Turno</th>
                      <th className="p-2 border-r border-slate-300">Operador</th>
                      <th className="p-2 border-r border-slate-300 text-right">Hodômetro Líquido</th>
                      <th className="p-2 border-r border-slate-300 text-right">Eletrônico</th>
                      <th className="p-2 border-r border-slate-300 text-right">Passes Sistema</th>
                      <th className="p-2 border-r border-slate-300 text-center">Divergência</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2 border-r border-slate-200 font-mono font-semibold">{r.id} ({formatDate(r.date)})</td>
                        <td className="p-2 border-r border-slate-200 font-bold">{r.turnstileCode}</td>
                        <td className="p-2 border-r border-slate-200 uppercase">{r.shift}</td>
                        <td className="p-2 border-r border-slate-200">{r.operatorName}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-bold">{formatNumber(r.netMechanical)}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono">{formatNumber(r.netElectronic)}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono">{formatNumber(r.systemCountTotal)}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">
                          {r.discrepancy === 0 ? '0' : r.discrepancy > 0 ? `+${r.discrepancy}` : r.discrepancy}
                        </td>
                        <td className="p-2 text-center uppercase font-semibold text-[9px]">
                          {r.status === 'approved' ? 'Homologado' : 'Auditado'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures Area */}
              <div className="pt-10 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-[10px]">
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                    Operador / Fiscal de Pista
                  </div>
                  <p className="text-slate-500">Conferência Física do Hodômetro</p>
                </div>

                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                    Supervisor de Estação
                  </div>
                  <p className="text-slate-500">Validação e Homologação de Turno</p>
                </div>

                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                    Auditoria de Receita & Tráfego
                  </div>
                  <p className="text-slate-500">Certificação Contábil</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
