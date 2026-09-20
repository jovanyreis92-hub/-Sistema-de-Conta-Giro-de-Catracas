import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCw, 
  Activity, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Zap, 
  ShieldCheck, 
  ArrowUpDown,
  Radio,
  Settings2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatNumber } from '../utils/formatters';
import { Turnstile, PassCategory, RefectorySector } from '../types';
import { getSectorForTurnstile, REFECTORY_SECTORS } from '../utils/sectors';

interface DashboardProps {
  onOpenNewRecord: (turnstileId?: string) => void;
  onOpenCalibrationModal: (turnstile: Turnstile) => void;
}

const DONUT_COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

export const Dashboard: React.FC<DashboardProps> = ({ 
  onOpenNewRecord,
  onOpenCalibrationModal 
}) => {
  const { 
    turnstiles, 
    records, 
    rotationEvents, 
    hourlyFlow, 
    rotateTurnstile, 
    updateTurnstileStatus,
    currentUser 
  } = useApp();

  const [selectedPassType, setSelectedPassType] = useState<PassCategory>('standard');
  const [rotatingTurnstileId, setRotatingTurnstileId] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<'all' | RefectorySector>('all');

  // Consolidated metrics
  const totalRotationsToday = turnstiles.reduce((acc, t) => acc + t.totalRotationsToday, 0);
  const entryRotations = turnstiles
    .filter(t => t.direction === 'entry' || t.direction === 'bidirectional')
    .reduce((acc, t) => acc + t.totalRotationsToday, 0);
  const exitRotations = turnstiles
    .filter(t => t.direction === 'exit')
    .reduce((acc, t) => acc + t.totalRotationsToday, 0);

  // Find most active turnstile
  const mostActiveTurnstile = [...turnstiles].sort((a, b) => b.totalRotationsToday - a.totalRotationsToday)[0];

  // Discrepancy metric from records
  const totalDiscrepantRecords = records.filter(r => r.discrepancy !== 0).length;
  const discrepancyRate = records.length > 0 
    ? ((totalDiscrepantRecords / records.length) * 100).toFixed(1) 
    : '0.0';

  // Calculate estimated current flow rate (passes per minute from last 5 minutes)
  const currentFlowRate = Math.min(95, Math.max(18, Math.floor(rotationEvents.length * 2.8)));

  // Pass distribution data for donut
  const passTypeCounts = records.reduce(
    (acc, r) => {
      acc.standard += r.breakdown.standardPasses;
      acc.student += r.breakdown.studentPasses;
      acc.free += r.breakdown.freePasses;
      acc.employee += r.breakdown.employeePasses;
      acc.manual += r.breakdown.manualReleases;
      return acc;
    },
    { standard: 0, student: 0, free: 0, employee: 0, manual: 0 }
  );

  const pieData = [
    { name: 'Bilhete Comum/QR', value: passTypeCounts.standard || 5930 },
    { name: 'Passe Escolar', value: passTypeCounts.student || 1110 },
    { name: 'Gratuidade (Sênior/PCD)', value: passTypeCounts.free || 850 },
    { name: 'Funcional/Operacional', value: passTypeCounts.employee || 202 },
    { name: 'Liberação Manual Fiscal', value: passTypeCounts.manual || 44 },
  ];

  // Bar chart data: rotations by turnstile
  const barData = turnstiles.map(t => ({
    name: t.code,
    fullName: t.name,
    giros: t.totalRotationsToday,
    direction: t.direction,
    status: t.status
  }));

  const handleManualRotate = (turnstileId: string, count: number = 1) => {
    setRotatingTurnstileId(turnstileId);
    rotateTurnstile(turnstileId, selectedPassType, count);
    setTimeout(() => {
      setRotatingTurnstileId(null);
    }, 400);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: Total Giros Hoje */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Giros Hoje</span>
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
              <RotateCw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold font-mono text-white tracking-tight">
              {formatNumber(totalRotationsToday)}
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/60 pt-2">
              <span className="flex items-center text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                {formatNumber(entryRotations)} Entradas
              </span>
              <span className="flex items-center text-blue-400">
                <ArrowDownLeft className="w-3.5 h-3.5 mr-0.5" />
                {formatNumber(exitRotations)} Saídas
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Taxa de Fluxo Instantânea */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Taxa de Fluxo</span>
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <h3 className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                {currentFlowRate}
              </h3>
              <span className="text-xs text-slate-400">giros / min</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/60 pt-2">
              <span>Ritmo Horário:</span>
              <strong className="text-slate-200 font-mono">~{formatNumber(currentFlowRate * 60)}/h</strong>
            </div>
          </div>
        </div>

        {/* KPI 3: Catraca Mais Movimentada */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Maior Demanda</span>
            <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-800/40 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white tracking-tight truncate">
                {mostActiveTurnstile ? mostActiveTurnstile.code : '--'}
              </h3>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                {mostActiveTurnstile ? formatNumber(mostActiveTurnstile.totalRotationsToday) : 0} giros
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400 border-t border-slate-700/60 pt-2 truncate">
              {mostActiveTurnstile ? mostActiveTurnstile.name : 'Nenhuma'}
            </div>
          </div>
        </div>

        {/* KPI 4: Índice de Precisão do Odômetro */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Precisão Mecânica</span>
            <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/40 text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <h3 className="text-2xl font-bold font-mono text-purple-300 tracking-tight">
                {(100 - parseFloat(discrepancyRate)).toFixed(1)}%
              </h3>
              <span className="text-[11px] text-slate-400">conformidade</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/60 pt-2">
              <span>Discrepâncias:</span>
              <span className={`font-semibold ${totalDiscrepantRecords > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {totalDiscrepantRecords} turno(s) auditado(s)
              </span>
            </div>
          </div>
        </div>

        {/* KPI 5: Lotação Estimada no Terminal */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ocupação Estimada</span>
            <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <h3 className="text-2xl font-bold font-mono text-blue-400 tracking-tight">
                {formatNumber(Math.max(250, entryRotations - exitRotations + 1200))}
              </h3>
              <span className="text-xs text-slate-400">usuários internos</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/60 pt-2">
              <span>Capacidade Máxima:</span>
              <span className="text-slate-300 font-mono">6.000 pax</span>
            </div>
          </div>
        </div>

      </div>

      {/* Simulator Quick Action Toolbar */}
      <div className="bg-slate-850 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800/50 text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Terminal de Teste & Simulação de Giro</h4>
            <p className="text-xs text-slate-400">Escolha o tipo de bilhete e acione os braços mecânicos das catracas abaixo para validar os contadores em tempo real.</p>
          </div>
        </div>

        {/* Pass category selector */}
        <div className="flex items-center space-x-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-medium px-2 hidden sm:inline">Tipo de Passe:</span>
          {(['standard', 'student', 'free', 'employee', 'manual'] as PassCategory[]).map(cat => {
            const labels: Record<PassCategory, string> = {
              standard: 'Comum/QR',
              student: 'Estudantil',
              free: 'Gratuidade',
              employee: 'Crachá',
              manual: 'Fiscal'
            };
            return (
              <button
                key={cat}
                onClick={() => setSelectedPassType(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedPassType === cat
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {labels[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Turnstile Fleet Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-white tracking-tight">Monitoramento Físico de Catracas</h3>
            <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
              {turnstiles.length} Unidades Conectadas
            </span>
          </div>
          <button
            id="dash-new-record-btn"
            onClick={() => onOpenNewRecord()}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-900/20 transition-all"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Registrar Fechamento de Turno</span>
          </button>
        </div>

        {/* Abas de Refeitório */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedSector('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedSector === 'all'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos os Refeitórios (14 Catracas)
          </button>
          <button
            onClick={() => setSelectedSector('principal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedSector === 'principal'
                ? 'bg-blue-950 text-blue-300 border border-blue-700/60'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Refeitório Principal (1 a 6)
          </button>
          <button
            onClick={() => setSelectedSector('bradesco')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedSector === 'bradesco'
                ? 'bg-red-950 text-red-300 border border-red-700/60'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Refeitório Bradesco (7 a 10)
          </button>
          <button
            onClick={() => setSelectedSector('antigo_adm')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedSector === 'antigo_adm'
                ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Refeitório Antigo ADM (11 a 14)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {turnstiles
            .filter(t => selectedSector === 'all' || getSectorForTurnstile(t.code).id === selectedSector)
            .map(turnstile => {
            const isRotating = rotatingTurnstileId === turnstile.id;
            const isMaintenance = turnstile.status === 'maintenance';
            const isLocked = turnstile.status === 'locked';
            const isAlarm = turnstile.status === 'alarm';
            const secInfo = getSectorForTurnstile(turnstile.code);

            return (
              <div 
                key={turnstile.id}
                className={`bg-slate-800/90 border rounded-2xl p-5 shadow-xl transition-all relative overflow-hidden ${
                  isMaintenance 
                    ? 'border-amber-700/50 bg-amber-950/10' 
                    : isLocked
                    ? 'border-rose-800/50 bg-rose-950/10'
                    : isAlarm
                    ? 'border-rose-600 animate-pulse'
                    : 'border-slate-700 hover:border-cyan-500/50'
                }`}
              >
                {/* Top header of turnstile card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400">
                      {/* Tripod rotation visual */}
                      <svg 
                        className={`w-6 h-6 transition-transform duration-300 ${isRotating ? 'rotate-120 text-cyan-300 scale-110' : ''}`} 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="3" fill="currentColor" />
                        <line x1="12" y1="9" x2="12" y2="2" />
                        <line x1="9.5" y1="13.5" x2="3.5" y2="17" />
                        <line x1="14.5" y1="13.5" x2="20.5" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm text-cyan-400">{turnstile.code}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                          turnstile.status === 'active' 
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : turnstile.status === 'maintenance'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                        }`}>
                          {turnstile.status === 'active' ? 'Ativa' : turnstile.status === 'maintenance' ? 'Manutenção' : 'Travada'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${secInfo.color.badge}`}>
                          {secInfo.shortName}
                        </span>
                        <h4 className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                          {turnstile.name}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Direction badge */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      {turnstile.direction === 'entry' ? 'Entrada' : turnstile.direction === 'exit' ? 'Saída' : 'Bidirecional'}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">{turnstile.location}</p>
                  </div>
                </div>

                {/* Mechanical Counter Odometer Dial display */}
                <div className="mt-4 bg-slate-950 rounded-xl p-3 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span className="flex items-center space-x-1 font-semibold text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span>Contador Mecânico (Hodômetro):</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Físico</span>
                  </div>

                  {/* Mechanical Odometer Digit Rolls */}
                  <div className="flex justify-center items-center space-x-1 py-1.5 px-2 bg-slate-900/90 rounded-lg border border-slate-800/80 shadow-inner">
                    {turnstile.currentMechanicalCounter
                      .toString()
                      .padStart(6, '0')
                      .split('')
                      .map((digit, idx) => (
                        <div 
                          key={idx}
                          className="w-8 h-9 bg-slate-950 border border-slate-700 text-cyan-400 rounded flex items-center justify-center font-mono text-lg font-bold shadow-sm relative overflow-hidden"
                        >
                          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-b from-black/60 to-transparent"></div>
                          <span>{digit}</span>
                          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-t from-black/60 to-transparent"></div>
                        </div>
                      ))}
                  </div>

                  {/* Electronic Counter comparison */}
                  <div className="mt-2.5 flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
                    <span className="text-slate-400">Contador Eletrônico:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {formatNumber(turnstile.currentElectronicCounter)}
                    </span>
                  </div>

                  {/* Discrepancy indicator between physical & electronic */}
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Divergência Atual:</span>
                    {turnstile.currentMechanicalCounter === turnstile.currentElectronicCounter ? (
                      <span className="text-emerald-400 font-mono text-[11px] flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        0 giros (100% calibrado)
                      </span>
                    ) : (
                      <span className="text-amber-400 font-mono text-[11px] flex items-center font-bold">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {Math.abs(turnstile.currentMechanicalCounter - turnstile.currentElectronicCounter)} giros de diferença
                      </span>
                    )}
                  </div>
                </div>

                {/* Card footer details & action buttons */}
                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    Hoje: <strong className="text-slate-200 font-mono">{formatNumber(turnstile.totalRotationsToday)}</strong> giros
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center space-x-1.5">
                    
                    {/* Calibrate / Settings button */}
                    <button
                      onClick={() => onOpenCalibrationModal(turnstile)}
                      title="Ajuste e calibração física dos contadores"
                      className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-300 transition-colors"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Status toggle (maintenance/active) */}
                    <button
                      onClick={() => {
                        const newStatus = turnstile.status === 'active' ? 'maintenance' : 'active';
                        updateTurnstileStatus(turnstile.id, newStatus, `Alteração manual por ${currentUser?.name}`);
                      }}
                      title={turnstile.status === 'active' ? 'Colocar em manutenção' : 'Ativar catraca'}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        turnstile.status === 'active'
                          ? 'bg-slate-700 hover:bg-amber-900/60 text-slate-300 hover:text-amber-300'
                          : 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Giro Trigger Button */}
                    <button
                      disabled={isMaintenance || isLocked}
                      onClick={() => handleManualRotate(turnstile.id, 1)}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                        isMaintenance || isLocked
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : isRotating
                          ? 'bg-cyan-400 text-slate-950 scale-95'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white active:scale-95'
                      }`}
                    >
                      <RotateCw className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} />
                      <span>+1 Giro</span>
                    </button>

                    <button
                      disabled={isMaintenance || isLocked}
                      onClick={() => handleManualRotate(turnstile.id, 5)}
                      title="Simular passagem rápida de grupo (+5 giros)"
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isMaintenance || isLocked
                          ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-700/80 hover:bg-slate-600 border-slate-600 text-slate-200'
                      }`}
                    >
                      +5
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Analytics & Real-Time Stream Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hourly Flow Chart (Area Chart) */}
        <div className="lg:col-span-2 bg-slate-850 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-white tracking-tight">Curva de Fluxo de Passageiros por Hora</h4>
              <p className="text-xs text-slate-400">Comparativo dinâmico de Entradas e Saídas ao longo da operação</p>
            </div>
            <div className="flex items-center space-x-3 text-xs font-medium">
              <span className="flex items-center text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-1.5"></span>
                Entradas
              </span>
              <span className="flex items-center text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 mr-1.5"></span>
                Saídas
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155', 
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [formatNumber(Number(value)) + ' passageiros', '']}
                />
                <Area 
                  type="monotone" 
                  dataKey="entries" 
                  name="Entradas"
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorEntries)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="exits" 
                  name="Saídas"
                  stroke="#06b6d4" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorExits)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-Time Live Feed Stream */}
        <div className="bg-slate-850 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <h4 className="text-sm font-bold text-white">Feed de Giros ao Vivo</h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Últimas passagens</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-72 pr-1 no-scrollbar">
            {rotationEvents.slice(0, 12).map((evt, idx) => (
              <div 
                key={evt.id || idx} 
                className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between text-xs hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg ${
                    evt.direction === 'in' 
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' 
                      : 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60'
                  }`}>
                    {evt.direction === 'in' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-slate-200">{evt.turnstileCode}</span>
                      <span className="text-slate-400 text-[11px]">•</span>
                      <span className="text-cyan-300 font-medium text-[11px]">{evt.categoryLabel}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Hodômetro: {formatNumber(evt.mechanicalCount)}</p>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-slate-400">{evt.timestamp}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Secondary Analytics Row: Distribution Donut & Fleet Bar Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pass Breakdown Donut Chart */}
        <div className="bg-slate-850 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h4 className="text-base font-bold text-white tracking-tight mb-1">Distribuição de Acesso por Categoria</h4>
          <p className="text-xs text-slate-400 mb-4">Classificação de passagens validadas pelo sistema de bilhetagem</p>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155', 
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [formatNumber(Number(value)) + ' passes', '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-800 text-xs">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center space-x-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0" 
                  style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                />
                <span className="text-slate-300 truncate text-[11px]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rotations per Turnstile Bar Chart */}
        <div className="bg-slate-850 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h4 className="text-base font-bold text-white tracking-tight mb-1">Carga Operacional por Catraca</h4>
          <p className="text-xs text-slate-400 mb-4">Volume total de giros acumulados por equipamento na data atual</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155', 
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [formatNumber(Number(value)) + ' giros', 'Total Hoje']}
                />
                <Bar 
                  dataKey="giros" 
                  fill="#06b6d4" 
                  radius={[6, 6, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Total consolidado: <strong className="text-cyan-400 font-mono">{formatNumber(totalRotationsToday)}</strong></span>
            <span>Média por catraca: <strong className="text-slate-200 font-mono">{formatNumber(Math.round(totalRotationsToday / (turnstiles.length || 1)))}</strong></span>
          </div>
        </div>

      </div>

    </div>
  );
};
