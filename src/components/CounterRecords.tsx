import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RotateCw, 
  X, 
  ChevronRight, 
  Check, 
  Ban, 
  Eye,
  FileCheck,
  Building,
  User,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TurnstileRecord, ShiftType, RecordStatus, Turnstile } from '../types';
import { formatNumber, formatDate, formatDateTime } from '../utils/formatters';

interface CounterRecordsProps {
  initialTurnstileId?: string;
}

export const CounterRecords: React.FC<CounterRecordsProps> = ({ initialTurnstileId }) => {
  const { 
    records, 
    turnstiles, 
    currentUser, 
    addRecord, 
    updateRecordStatus 
  } = useApp();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TurnstileRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTurnstile, setFilterTurnstile] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false);

  // Form State
  const [selectedCatId, setSelectedCatId] = useState<string>(initialTurnstileId || turnstiles[0]?.id || '');
  const [shift, setShift] = useState<ShiftType>('manha');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  
  // Mechanical counters
  const [initialMech, setInitialMech] = useState<number>(0);
  const [finalMech, setFinalMech] = useState<number>(0);
  
  // Electronic counters
  const [initialElec, setInitialElec] = useState<number>(0);
  const [finalElec, setFinalElec] = useState<number>(0);

  // Breakdown passes
  const [standardPasses, setStandardPasses] = useState<number>(0);
  const [studentPasses, setStudentPasses] = useState<number>(0);
  const [freePasses, setFreePasses] = useState<number>(0);
  const [employeePasses, setEmployeePasses] = useState<number>(0);
  const [manualReleases, setManualReleases] = useState<number>(0);

  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // When opening form, preset readings based on selected turnstile
  const openNewRecordModal = (catId?: string) => {
    const targetCat = turnstiles.find(t => t.id === (catId || selectedCatId)) || turnstiles[0];
    if (targetCat) {
      setSelectedCatId(targetCat.id);
      // Sensible initial reading defaults:
      const current = targetCat.currentMechanicalCounter;
      setInitialMech(Math.max(0, current - 850));
      setFinalMech(current);
      setInitialElec(Math.max(0, current - 850));
      setFinalElec(current);

      // Default breakdown roughly summing to difference
      const diff = 850;
      setStandardPasses(Math.floor(diff * 0.72));
      setStudentPasses(Math.floor(diff * 0.15));
      setFreePasses(Math.floor(diff * 0.08));
      setEmployeePasses(Math.floor(diff * 0.04));
      setManualReleases(diff - Math.floor(diff * 0.72) - Math.floor(diff * 0.15) - Math.floor(diff * 0.08) - Math.floor(diff * 0.04));
    }
    setDiscrepancyReason('');
    setNotes('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Calculations for active form
  const calcNetMechanical = Math.max(0, finalMech - initialMech);
  const calcNetElectronic = Math.max(0, finalElec - initialElec);
  const calcTotalPasses = standardPasses + studentPasses + freePasses + employeePasses + manualReleases;
  const calcDiscrepancy = calcNetMechanical - calcTotalPasses;
  const calcDiscrepancyRate = calcNetMechanical > 0 
    ? ((Math.abs(calcDiscrepancy) / calcNetMechanical) * 100) 
    : 0;

  const handleCatracaChange = (catId: string) => {
    setSelectedCatId(catId);
    const cat = turnstiles.find(t => t.id === catId);
    if (cat) {
      const current = cat.currentMechanicalCounter;
      setInitialMech(Math.max(0, current - 600));
      setFinalMech(current);
      setInitialElec(Math.max(0, current - 600));
      setFinalElec(current);
      setStandardPasses(450);
      setStudentPasses(90);
      setFreePasses(40);
      setEmployeePasses(15);
      setManualReleases(5);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (finalMech < initialMech) {
      setFormError('A leitura mecânica final não pode ser menor que a inicial.');
      return;
    }

    if (finalElec < initialElec) {
      setFormError('A leitura eletrônica final não pode ser menor que a inicial.');
      return;
    }

    if (calcDiscrepancy !== 0 && !discrepancyReason.trim()) {
      setFormError('Divergência detectada entre contador mecânico e bilhetagem! É obrigatório informar a justificativa técnica.');
      return;
    }

    const cat = turnstiles.find(t => t.id === selectedCatId);
    if (!cat) return;

    const newRec = addRecord({
      turnstileId: cat.id,
      turnstileName: cat.name,
      turnstileCode: cat.code,
      operatorId: currentUser?.id || 'USR-03',
      operatorName: currentUser?.name || 'Operador em Turno',
      shift,
      date,
      openedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      closedAt: new Date().toISOString(),
      initialMechanical: initialMech,
      finalMechanical: finalMech,
      initialElectronic: initialElec,
      finalElectronic: finalElec,
      netMechanical: calcNetMechanical,
      netElectronic: calcNetElectronic,
      breakdown: {
        standardPasses,
        studentPasses,
        freePasses,
        employeePasses,
        manualReleases,
      },
      systemCountTotal: calcTotalPasses,
      discrepancy: calcDiscrepancy,
      discrepancyRate: calcDiscrepancyRate,
      discrepancyReason: calcDiscrepancy !== 0 ? discrepancyReason : undefined,
      status: calcDiscrepancy === 0 ? 'approved' : 'pending_review',
      notes,
    });

    setIsFormOpen(false);
    setSelectedRecord(newRec);
  };

  // Filtered records
  const filteredRecords = records.filter(r => {
    if (filterTurnstile !== 'all' && r.turnstileId !== filterTurnstile) return false;
    if (filterShift !== 'all' && r.shift !== filterShift) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (onlyDiscrepancies && r.discrepancy === 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.turnstileCode.toLowerCase().includes(q) ||
        r.turnstileName.toLowerCase().includes(q) ||
        r.operatorName.toLowerCase().includes(q) ||
        (r.discrepancyReason && r.discrepancyReason.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & New Record Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-850 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Registro de Conta-Giro & Conferência de Turno</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Lançamento de hodômetros mecânicos, contadores eletrônicos e validação cruzada com bilhetagem
          </p>
        </div>

        <button
          id="records-btn-create"
          onClick={() => openNewRecordModal()}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Fechamento de Turno</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-850 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID, catraca, operador ou motivo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Turnstile */}
          <select
            value={filterTurnstile}
            onChange={e => setFilterTurnstile(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas as Catracas</option>
            {turnstiles.map(t => (
              <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
            ))}
          </select>

          {/* Filter Shift */}
          <select
            value={filterShift}
            onChange={e => setFilterShift(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Turnos</option>
            <option value="manha">Manhã</option>
            <option value="tarde">Tarde</option>
            <option value="noite">Noite</option>
            <option value="madrugada">Madrugada</option>
          </select>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Status</option>
            <option value="approved">Aprovados</option>
            <option value="pending_review">Em Auditoria</option>
            <option value="rejected">Rejeitados</option>
          </select>

          {/* Toggle only discrepancies */}
          <button
            onClick={() => setOnlyDiscrepancies(!onlyDiscrepancies)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border transition-all ${
              onlyDiscrepancies
                ? 'bg-amber-950/80 border-amber-600/80 text-amber-300 font-semibold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Apenas Divergências</span>
          </button>
        </div>

      </div>

      {/* Records Table */}
      <div className="bg-slate-850 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Registro / Data</th>
                <th className="py-3 px-4">Catraca</th>
                <th className="py-3 px-4">Turno</th>
                <th className="py-3 px-4">Operador</th>
                <th className="py-3 px-4 text-right">Hodômetro Físico</th>
                <th className="py-3 px-4 text-right">Eletrônico</th>
                <th className="py-3 px-4 text-right">Bilhetagem</th>
                <th className="py-3 px-4 text-center">Divergência</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Nenhum registro de conta-giro encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(rec => {
                  const hasDiscrepancy = rec.discrepancy !== 0;

                  return (
                    <tr 
                      key={rec.id} 
                      className="hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-200">{rec.id}</span>
                        <p className="text-[11px] text-slate-400">{formatDate(rec.date)}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-cyan-400">{rec.turnstileCode}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{rec.turnstileName}</p>
                      </td>

                      <td className="py-3.5 px-4 uppercase font-semibold text-[10px] text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {rec.shift}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-slate-200 font-medium">{rec.operatorName}</span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="font-bold text-slate-100">{formatNumber(rec.netMechanical)}</span>
                        <p className="text-[10px] text-slate-500">
                          {rec.initialMechanical} → {rec.finalMechanical}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {formatNumber(rec.netElectronic)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-cyan-400">
                        {formatNumber(rec.systemCountTotal)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {hasDiscrepancy ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-700/80 text-amber-300" title={rec.discrepancyReason}>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {rec.discrepancy > 0 ? `+${rec.discrepancy}` : rec.discrepancy} ({rec.discrepancyRate.toFixed(1)}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            0 (Perfeito)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          rec.status === 'approved'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                            : rec.status === 'pending_review'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                        }`}>
                          {rec.status === 'approved' ? 'Aprovado' : rec.status === 'pending_review' ? 'Em Análise' : 'Rejeitado'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
                            title="Ver Memória de Cálculo e Detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Approval shortcut for supervisors/admins */}
                          {(currentUser?.role === 'admin' || currentUser?.role === 'supervisor') && rec.status === 'pending_review' && (
                            <>
                              <button
                                onClick={() => updateRecordStatus(rec.id, 'approved', 'Auditado e liberado pelo supervisor')}
                                className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-400 transition-colors"
                                title="Aprovar e Liberar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => updateRecordStatus(rec.id, 'rejected', 'Recusado para recontagem física')}
                                className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-400 transition-colors"
                                title="Rejeitar para Recontagem"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Turnstile Record Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800/60 text-cyan-400">
                  <RotateCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Lançamento de Conta-Giro de Catraca</h3>
                  <p className="text-xs text-slate-400">Fechamento de turno com verificação de odômetro e bilhetagem</p>
                </div>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
              
              {formError && (
                <div className="bg-rose-950/80 border border-rose-700 p-3 rounded-xl text-rose-300 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Turnstile, Date & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Catraca:</label>
                  <select
                    value={selectedCatId}
                    onChange={e => handleCatracaChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    {turnstiles.map(t => (
                      <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Turno de Operação:</label>
                  <select
                    value={shift}
                    onChange={e => setShift(e.target.value as ShiftType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="manha">Manhã (06h - 14h)</option>
                    <option value="tarde">Tarde (14h - 22h)</option>
                    <option value="noite">Noite (22h - 06h)</option>
                    <option value="madrugada">Reforço Especial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Data da Leitura:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Physical Mechanical Readings */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span>1. Contador Mecânico Físico (Hodômetro nos Braços)</span>
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">
                    Líquido: {formatNumber(calcNetMechanical)} giros
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Leitura Inicial (Abertura):</label>
                    <input
                      type="number"
                      value={initialMech}
                      onChange={e => setInitialMech(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Leitura Final (Fechamento):</label>
                    <input
                      type="number"
                      value={finalMech}
                      onChange={e => setFinalMech(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Electronic Counters */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span>2. Contador Eletrônico da Placa CPU da Catraca</span>
                  </span>
                  <span className="font-mono text-blue-400 font-bold">
                    Líquido: {formatNumber(calcNetElectronic)} giros
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Eletrônico Inicial:</label>
                    <input
                      type="number"
                      value={initialElec}
                      onChange={e => setInitialElec(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Eletrônico Final:</label>
                    <input
                      type="number"
                      value={finalElec}
                      onChange={e => setFinalElec(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Ticket Breakdown from System */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">3. Detalhamento por Categoria de Bilhete</span>
                  <span className="font-mono text-slate-300">
                    Total Bilhetagem: <strong className="text-white font-bold">{formatNumber(calcTotalPasses)}</strong> passes
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Comum / QR:</label>
                    <input
                      type="number"
                      value={standardPasses}
                      onChange={e => setStandardPasses(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Estudantil:</label>
                    <input
                      type="number"
                      value={studentPasses}
                      onChange={e => setStudentPasses(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Gratuidade:</label>
                    <input
                      type="number"
                      value={freePasses}
                      onChange={e => setFreePasses(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Crachá / Func:</label>
                    <input
                      type="number"
                      value={employeePasses}
                      onChange={e => setEmployeePasses(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Liberação Fiscal:</label>
                    <input
                      type="number"
                      value={manualReleases}
                      onChange={e => setManualReleases(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Automatic Discrepancy Calculation Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                calcDiscrepancy === 0
                  ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-700 text-amber-300'
              }`}>
                <div className="flex items-center space-x-2">
                  {calcDiscrepancy === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-sm">
                      {calcDiscrepancy === 0
                        ? 'Conferência Perfeita (Zero Divergência)'
                        : `Divergência Detectada: ${calcDiscrepancy > 0 ? `+${calcDiscrepancy}` : calcDiscrepancy} giros (${calcDiscrepancyRate.toFixed(2)}%)`}
                    </p>
                    <p className="text-[11px] opacity-80">
                      {calcDiscrepancy === 0
                        ? 'O contador mecânico coincide exatamente com os passes computados.'
                        : 'A quantidade de giros físicos nos braços difere dos bilhetes emitidos no sistema.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mandatory Discrepancy Reason if discrepancy > 0 */}
              {calcDiscrepancy !== 0 && (
                <div className="bg-amber-950/20 p-3 rounded-xl border border-amber-800/80">
                  <label className="block text-amber-300 font-bold mb-1">
                    * Justificativa Técnica Obrigatória da Divergência:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Descreva o motivo (ex: passagem dupla acidental com carrinho de bebê, giro falso por empurrão, falha de leitor ótico...)"
                    value={discrepancyReason}
                    onChange={e => setDiscrepancyReason(e.target.value)}
                    className="w-full bg-slate-950 border border-amber-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Observações Gerais:</label>
                <input
                  type="text"
                  placeholder="Informações adicionais do turno ou ocorrências operacionais..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-900/30"
                >
                  Salvar Fechamento de Conta-Giro
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Detail Record Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Memória de Cálculo de Conta-Giro: {selectedRecord.id}</h3>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              
              {/* Header metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">Catraca:</span>
                  <p className="font-mono font-bold text-cyan-400 mt-0.5">{selectedRecord.turnstileCode}</p>
                </div>
                <div>
                  <span className="text-slate-400">Turno / Data:</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{selectedRecord.shift.toUpperCase()} - {formatDate(selectedRecord.date)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Operador:</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{selectedRecord.operatorName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <p className={`font-bold mt-0.5 ${selectedRecord.status === 'approved' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedRecord.status.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Comparative Counters Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-2.5">Métrica de Contagem</th>
                      <th className="p-2.5 text-right">Inicial</th>
                      <th className="p-2.5 text-right">Final</th>
                      <th className="p-2.5 text-right font-bold text-white">Giros Líquidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td className="p-2.5 text-slate-300 font-medium">Contador Mecânico (Físico)</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">{formatNumber(selectedRecord.initialMechanical)}</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">{formatNumber(selectedRecord.finalMechanical)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-cyan-400">{formatNumber(selectedRecord.netMechanical)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-300 font-medium">Contador Eletrônico (Sensor)</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">{formatNumber(selectedRecord.initialElectronic)}</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">{formatNumber(selectedRecord.finalElectronic)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-400">{formatNumber(selectedRecord.netElectronic)}</td>
                    </tr>
                    <tr className="bg-slate-950/60">
                      <td className="p-2.5 text-slate-300 font-medium">Total Passes Bilhetagem</td>
                      <td colSpan={2} className="p-2.5 text-center text-slate-400">Soma das categorias abaixo</td>
                      <td className="p-2.5 text-right font-mono font-bold text-white">{formatNumber(selectedRecord.systemCountTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Passes breakdown */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h5 className="font-semibold text-slate-300 mb-2">Composição dos Passes do Turno:</h5>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Comum/QR</span>
                    <p className="font-mono font-bold text-slate-200 mt-1">{formatNumber(selectedRecord.breakdown.standardPasses)}</p>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Estudantil</span>
                    <p className="font-mono font-bold text-slate-200 mt-1">{formatNumber(selectedRecord.breakdown.studentPasses)}</p>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Gratuidade</span>
                    <p className="font-mono font-bold text-slate-200 mt-1">{formatNumber(selectedRecord.breakdown.freePasses)}</p>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Crachás</span>
                    <p className="font-mono font-bold text-slate-200 mt-1">{formatNumber(selectedRecord.breakdown.employeePasses)}</p>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Lib. Fiscal</span>
                    <p className="font-mono font-bold text-slate-200 mt-1">{formatNumber(selectedRecord.breakdown.manualReleases)}</p>
                  </div>
                </div>
              </div>

              {/* Discrepancy box */}
              <div className={`p-4 rounded-xl border ${
                selectedRecord.discrepancy === 0
                  ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/70 border-amber-700 text-amber-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-sm">
                      Divergência: {selectedRecord.discrepancy === 0 ? '0 giros (Equilíbrio Contábil 100%)' : `${selectedRecord.discrepancy} giros (${selectedRecord.discrepancyRate.toFixed(2)}%)`}
                    </h5>
                    {selectedRecord.discrepancyReason && (
                      <p className="mt-1 text-slate-200 text-xs">
                        <strong>Motivo registrado:</strong> {selectedRecord.discrepancyReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedRecord.notes && (
                <div className="text-slate-400 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <strong>Observações:</strong> {selectedRecord.notes}
                </div>
              )}

              {/* Supervisor Actions */}
              {(currentUser?.role === 'admin' || currentUser?.role === 'supervisor') && (
                <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                  <span className="text-slate-400 text-xs">Ações de Supervisão:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        updateRecordStatus(selectedRecord.id, 'rejected', 'Recusado para conferência de hodômetro');
                        setSelectedRecord(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-800 hover:bg-rose-900 text-rose-300 font-semibold"
                    >
                      Rejeitar Registro
                    </button>
                    <button
                      onClick={() => {
                        updateRecordStatus(selectedRecord.id, 'approved', 'Auditado e homologado');
                        setSelectedRecord(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                    >
                      Homologar / Aprovar
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
