import React, { useState, useMemo } from 'react';
import { 
  Users, 
  RotateCw, 
  Save, 
  Printer, 
  FileSpreadsheet, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  History, 
  Sparkles, 
  Utensils, 
  TrendingUp, 
  Award, 
  ArrowRight,
  Eye,
  X,
  Building,
  Building2,
  Check,
  Camera,
  Layers,
  HelpCircle,
  Image as ImageIcon,
  Download,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MealType, RefectoryClosingRecord, RefectorySector, TurnstileCountItem } from '../types';
import { formatNumber, formatDate, formatDateTime } from '../utils/formatters';
import { 
  getSectorForTurnstile, 
  computeSectorSummaries, 
  REFECTORY_SECTORS, 
  SectorInfo 
} from '../utils/sectors';
import { exportRefectoryToExcel, exportRefectoryToPDF } from '../utils/exportUtils';
import { CameraOdometerModal } from './CameraOdometerModal';

interface LocalTurnstileRow {
  number: number;
  code: string;
  name: string;
  initial: string;
  final: string;
  photoUrl?: string;
  ocrConfidence?: 'high' | 'medium' | 'low' | 'manual_review';
}

export const RefectoryCounterEntry: React.FC = () => {
  const { 
    turnstiles, 
    currentUser, 
    refectoryClosings, 
    saveRefectoryClosing, 
    deleteRefectoryClosing 
  } = useApp();

  // Informações da Refeição / Turno
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [mealType, setMealType] = useState<MealType>('almoco');
  const [openedAt, setOpenedAt] = useState<string>('11:00');
  const [closedAt, setClosedAt] = useState<string>('14:30');
  const [notes, setNotes] = useState<string>('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Filtro de Visualização por Refeitório
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<'all' | RefectorySector>('all');

  // Modal de Câmera do Celular para Leitura do Hodômetro
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraTargetTurnstile, setCameraTargetTurnstile] = useState<TurnstileCountItem | null>(null);
  const [cameraTargetField, setCameraTargetField] = useState<'initial' | 'final'>('final');

  // Preview de foto capturada
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  // Modal de Histórico e Impressão
  const [selectedHistoricalClosing, setSelectedHistoricalClosing] = useState<RefectoryClosingRecord | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Inicialização das 14 Catracas distribuídas pelos 3 refeitórios
  const [rows, setRows] = useState<LocalTurnstileRow[]>(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const num = i + 1;
      const code = `CAT-${String(num).padStart(2, '0')}`;
      const found = turnstiles.find(t => t.code === code);
      const current = found ? found.currentMechanicalCounter : (10000 + num * 1200);
      const sec = getSectorForTurnstile(num);
      return {
        number: num,
        code,
        name: `Catraca ${String(num).padStart(2, '0')} - ${sec.shortName}`,
        initial: String(current),
        final: String(current + 120 + (num * 10)),
      };
    });
  });

  // Atualização dos inputs manuais
  const handleInputChange = (index: number, field: 'initial' | 'final', value: string) => {
    const sanitized = value.replace(/\D/g, '');
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: sanitized };
      return next;
    });
  };

  // Aplica leitura obtida pela câmera do celular
  const handleApplyCameraReading = (
    turnstileNumber: number, 
    field: 'initial' | 'final', 
    value: number, 
    photoBase64?: string
  ) => {
    setRows(prev => {
      return prev.map(r => {
        if (r.number === turnstileNumber) {
          return {
            ...r,
            [field]: String(value),
            photoUrl: photoBase64 || r.photoUrl,
            ocrConfidence: 'high'
          };
        }
        return r;
      });
    });

    const fieldLabel = field === 'initial' ? 'Hodômetro Inicial' : 'Hodômetro Final';
    setSaveSuccessMessage(`Câmera: ${fieldLabel} da Catraca ${String(turnstileNumber).padStart(2, '0')} atualizado para ${value.toLocaleString('pt-BR')}!`);
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Dispara a câmera para uma catraca específica
  const handleOpenCamera = (item: TurnstileCountItem, field: 'initial' | 'final') => {
    setCameraTargetTurnstile(item);
    setCameraTargetField(field);
    setCameraModalOpen(true);
  };

  // Cálculo individual de cada catraca com setor associado
  const calculatedItems: TurnstileCountItem[] = useMemo(() => {
    return rows.map(r => {
      const initNum = r.initial === '' ? 0 : parseInt(r.initial, 10);
      const finalNum = r.final === '' ? 0 : parseInt(r.final, 10);
      const isValid = finalNum >= initNum;
      const netPasses = isValid ? (finalNum - initNum) : 0;
      const sectorInfo = getSectorForTurnstile(r.number);

      return {
        turnstileNumber: r.number,
        turnstileCode: r.code,
        turnstileName: r.name,
        sector: sectorInfo.id,
        sectorLabel: sectorInfo.name,
        initialCount: initNum,
        finalCount: finalNum,
        netPasses,
        isValid,
        capturedPhoto: r.photoUrl,
        ocrConfidence: r.ocrConfidence,
      };
    });
  }, [rows]);

  // SOMA TOTAL DAS 14 CATRACAS (A QUANTIDADE REAL DE PESSOAS NO REFEITÓRIO)
  const totalPeopleInRefectory = useMemo(() => {
    return calculatedItems.reduce((acc, item) => acc + (item.isValid ? item.netPasses : 0), 0);
  }, [calculatedItems]);

  const totalInitialSum = useMemo(() => {
    return calculatedItems.reduce((acc, item) => acc + item.initialCount, 0);
  }, [calculatedItems]);

  const totalFinalSum = useMemo(() => {
    return calculatedItems.reduce((acc, item) => acc + item.finalCount, 0);
  }, [calculatedItems]);

  // Subtotais por Refeitório em tempo real
  const sectorSummaries = useMemo(() => {
    return computeSectorSummaries(calculatedItems);
  }, [calculatedItems]);

  const invalidRowsCount = useMemo(() => {
    return calculatedItems.filter(item => !item.isValid).length;
  }, [calculatedItems]);

  const activeTurnstilesCount = useMemo(() => {
    return calculatedItems.filter(item => item.netPasses > 0).length;
  }, [calculatedItems]);

  const highestTurnstile = useMemo(() => {
    if (calculatedItems.length === 0) return null;
    return [...calculatedItems].sort((a, b) => b.netPasses - a.netPasses)[0];
  }, [calculatedItems]);

  const averagePerTurnstile = useMemo(() => {
    return activeTurnstilesCount > 0 ? (totalPeopleInRefectory / activeTurnstilesCount).toFixed(1) : '0';
  }, [totalPeopleInRefectory, activeTurnstilesCount]);

  // Labels de Refeição
  const mealLabels: Record<MealType, string> = {
    cafe: 'Café da Manhã',
    almoco: 'Almoço',
    jantar: 'Jantar',
    ceia: 'Ceia / Noturno',
    geral: 'Geral / Evento',
  };

  // Ação: Puxar Leituras da Última Refeição como Inicial
  const handleLoadPreviousAsInitial = () => {
    if (refectoryClosings.length === 0) {
      alert('Nenhum fechamento anterior foi encontrado no histórico.');
      return;
    }
    const last = refectoryClosings[0];
    setRows(prev => {
      return prev.map(r => {
        const match = last.items.find(item => item.turnstileCode === r.code);
        if (match) {
          return {
            ...r,
            initial: String(match.finalCount),
            final: String(match.finalCount + 100),
          };
        }
        return r;
      });
    });
    setSaveSuccessMessage('Leituras finais da refeição anterior carregadas como inicial com sucesso!');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Ação: Preencher Exemplo do Almoço
  const handleFillExampleData = () => {
    const examples = [
      // Refeitório Principal: 1 a 6
      { init: 13300, final: 13480 },
      { init: 14750, final: 14945 },
      { init: 16200, final: 16420 },
      { init: 17650, final: 17855 },
      { init: 19100, final: 19290 },
      { init: 20550, final: 20725 },
      // Refeitório Bradesco: 7 a 10
      { init: 22000, final: 22160 },
      { init: 23450, final: 23605 },
      { init: 24900, final: 25095 },
      { init: 26350, final: 26550 },
      // Refeitório Antigo ADM: 11 a 14
      { init: 27800, final: 27940 },
      { init: 29250, final: 29415 },
      { init: 30700, final: 30880 },
      { init: 32150, final: 32345 },
    ];

    setRows(prev => {
      return prev.map((r, i) => {
        const ex = examples[i] || { init: 10000, final: 10100 };
        return {
          ...r,
          initial: String(ex.init),
          final: String(ex.final),
        };
      });
    });
    setSaveSuccessMessage('Dados de exemplo das 14 catracas nos 3 refeitórios preenchidos!');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Ação: Limpar todos os campos
  const handleClearAll = () => {
    if (window.confirm('Deseja realmente limpar todos os quantitativos iniciais e finais das 14 catracas?')) {
      setRows(prev => prev.map(r => ({ ...r, initial: '0', final: '0', photoUrl: undefined })));
    }
  };

  // Ação: Salvar Fechamento Oficial do Refeitório
  const handleSaveClosing = () => {
    if (invalidRowsCount > 0) {
      alert(`Atenção: Existem ${invalidRowsCount} catracas onde o quantitativo final é menor que o inicial. Corrija-as antes de salvar.`);
      return;
    }

    if (totalPeopleInRefectory === 0) {
      if (!window.confirm('O total de pessoas calculado é 0. Deseja registrar este fechamento com fluxo zerado?')) {
        return;
      }
    }

    const itemsToSave: TurnstileCountItem[] = calculatedItems.map(item => ({
      turnstileNumber: item.turnstileNumber,
      turnstileCode: item.turnstileCode,
      turnstileName: item.turnstileName,
      sector: item.sector,
      sectorLabel: item.sectorLabel,
      initialCount: item.initialCount,
      finalCount: item.finalCount,
      netPasses: item.netPasses,
      isValid: item.isValid,
      capturedPhoto: item.capturedPhoto,
      ocrConfidence: item.ocrConfidence,
    }));

    const record = saveRefectoryClosing({
      date,
      mealType,
      mealLabel: mealLabels[mealType],
      responsibleName: currentUser?.name || 'Operador Responsável',
      openedAt,
      closedAt,
      items: itemsToSave,
      totalPeople: totalPeopleInRefectory,
      totalInitial: totalInitialSum,
      totalFinal: totalFinalSum,
      sectorSummaries,
      activeTurnstilesCount,
      highestTurnstile: highestTurnstile ? {
        code: highestTurnstile.turnstileCode,
        name: highestTurnstile.turnstileName,
        count: highestTurnstile.netPasses
      } : undefined,
      notes: notes.trim() || undefined,
    });

    setSelectedHistoricalClosing(record);
    setSaveSuccessMessage(`Fechamento salvo com sucesso! Registradas ${formatNumber(totalPeopleInRefectory)} pessoas atendidas no refeitório.`);
    setTimeout(() => setSaveSuccessMessage(null), 5000);
  };

  // Exportar para Planilha Oficial do Excel (.xlsx)
  const handleExportExcel = (historicalRecord?: RefectoryClosingRecord | null) => {
    const dataToExport = historicalRecord ? {
      id: historicalRecord.id,
      date: historicalRecord.date,
      mealType: historicalRecord.mealType,
      mealLabel: historicalRecord.mealLabel,
      responsibleName: historicalRecord.responsibleName,
      openedAt: historicalRecord.openedAt,
      closedAt: historicalRecord.closedAt,
      items: historicalRecord.items,
      totalPeople: historicalRecord.totalPeople,
      totalInitial: historicalRecord.totalInitial,
      totalFinal: historicalRecord.totalFinal,
      sectorSummaries: historicalRecord.sectorSummaries,
      notes: historicalRecord.notes,
    } : {
      date,
      mealType,
      mealLabel: mealLabels[mealType],
      responsibleName: currentUser?.name || 'Operador Responsável',
      openedAt,
      closedAt,
      items: calculatedItems,
      totalPeople: totalPeopleInRefectory,
      totalInitial: totalInitialSum,
      totalFinal: totalFinalSum,
      sectorSummaries,
      notes,
    };

    exportRefectoryToExcel(dataToExport);
    setSaveSuccessMessage(`Planilha Excel (.xlsx) gerada com sucesso para ${dataToExport.totalPeople} pessoas!`);
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Exportar para Boletim Oficial em PDF (.pdf)
  const handleExportPDF = (historicalRecord?: RefectoryClosingRecord | null) => {
    const dataToExport = historicalRecord ? {
      id: historicalRecord.id,
      date: historicalRecord.date,
      mealType: historicalRecord.mealType,
      mealLabel: historicalRecord.mealLabel,
      responsibleName: historicalRecord.responsibleName,
      openedAt: historicalRecord.openedAt,
      closedAt: historicalRecord.closedAt,
      items: historicalRecord.items,
      totalPeople: historicalRecord.totalPeople,
      totalInitial: historicalRecord.totalInitial,
      totalFinal: historicalRecord.totalFinal,
      sectorSummaries: historicalRecord.sectorSummaries,
      notes: historicalRecord.notes,
    } : {
      date,
      mealType,
      mealLabel: mealLabels[mealType],
      responsibleName: currentUser?.name || 'Operador Responsável',
      openedAt,
      closedAt,
      items: calculatedItems,
      totalPeople: totalPeopleInRefectory,
      totalInitial: totalInitialSum,
      totalFinal: totalFinalSum,
      sectorSummaries,
      notes,
    };

    exportRefectoryToPDF(dataToExport);
    setSaveSuccessMessage(`Documento PDF A4 oficial gerado com sucesso!`);
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Filtragem de linhas exibidas na tabela
  const displayedItems = useMemo(() => {
    if (selectedSectorFilter === 'all') {
      return calculatedItems;
    }
    return calculatedItems.filter(i => i.sector === selectedSectorFilter);
  }, [calculatedItems, selectedSectorFilter]);

  return (
    <div className="space-y-6 pb-16">

      {/* Alerta de Sucesso Flutuante */}
      {saveSuccessMessage && (
        <div className="bg-emerald-950/90 border border-emerald-500/80 text-emerald-200 px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-xs sm:text-sm font-semibold">{saveSuccessMessage}</span>
          </div>
          <button onClick={() => setSaveSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* CARD CONSOLIDADO COMPACTO: QUANTIDADE REAL DE PESSOAS NO REFEITÓRIO */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-cyan-500/50 rounded-2xl p-4 sm:p-5 shadow-xl shadow-cyan-950/30">
        
        {/* Glow de fundo sutil */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80">
          
          {/* Lado Esquerdo: Identificação compacta */}
          <div className="flex items-center space-x-2.5">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 uppercase tracking-wider">
              <Utensils className="w-3.5 h-3.5 text-cyan-400" />
              <span>Refeitório Central</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Total consolidado ({activeTurnstilesCount} catracas)
            </span>
          </div>

          {/* Lado Direito: QUANTIDADE REAL DE PESSOAS (Compacto e Alinhado) */}
          <div className="flex items-center justify-between sm:justify-end space-x-3 bg-slate-950/90 border border-cyan-500/60 rounded-xl px-4 py-2 shadow-inner">
            <div className="flex items-center space-x-1.5 text-cyan-400">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Total de Pessoas:</span>
            </div>

            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-sm">
                {formatNumber(totalPeopleInRefectory)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                refeições
              </span>
            </div>

            {invalidRowsCount > 0 && (
              <div className="flex items-center space-x-1 text-xs text-rose-400 font-bold animate-pulse pl-2.5 border-l border-slate-800">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden md:inline">{invalidRowsCount} erro(s)</span>
              </div>
            )}
          </div>

        </div>

        {/* ============================================================ */}
        {/* CARDS DOS 3 REFEITÓRIOS SEPARADOS (SUBTOTAIS EM TEMPO REAL)   */}
        {/* ============================================================ */}
        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Card: Refeitório Principal (Catracas 1 a 6) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-blue-950/50 via-slate-900 to-slate-950 border border-blue-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-bold text-white">Refeitório Principal</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-700/60">
                Catracas 1 a 6
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl sm:text-2xl font-black font-mono text-blue-300">
                  {formatNumber(sectorSummaries.principal.totalPeople)}
                </span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">pessoas</span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded">
                {totalPeopleInRefectory > 0 ? ((sectorSummaries.principal.totalPeople / totalPeopleInRefectory) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>

            <div className="mt-2.5 pt-2 border-t border-blue-900/40 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Inicial: <strong className="text-slate-200">{formatNumber(sectorSummaries.principal.totalInitial)}</strong></span>
              <span>Final: <strong className="text-slate-200">{formatNumber(sectorSummaries.principal.totalFinal)}</strong></span>
            </div>
          </div>

          {/* Card: Refeitório Bradesco (Catracas 7 a 10) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-950 border border-red-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-bold text-white">Refeitório Bradesco</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-700/60">
                Catracas 7 a 10
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl sm:text-2xl font-black font-mono text-red-300">
                  {formatNumber(sectorSummaries.bradesco.totalPeople)}
                </span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">pessoas</span>
              </div>
              <span className="text-xs font-mono font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded">
                {totalPeopleInRefectory > 0 ? ((sectorSummaries.bradesco.totalPeople / totalPeopleInRefectory) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>

            <div className="mt-2.5 pt-2 border-t border-red-900/40 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Inicial: <strong className="text-slate-200">{formatNumber(sectorSummaries.bradesco.totalInitial)}</strong></span>
              <span>Final: <strong className="text-slate-200">{formatNumber(sectorSummaries.bradesco.totalFinal)}</strong></span>
            </div>
          </div>

          {/* Card: Refeitório Antigo ADM (Catracas 11 a 14) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-bold text-white">Refeitório Antigo ADM</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700/60">
                Catracas 11 a 14
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                  {formatNumber(sectorSummaries.antigo_adm.totalPeople)}
                </span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">pessoas</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded">
                {totalPeopleInRefectory > 0 ? ((sectorSummaries.antigo_adm.totalPeople / totalPeopleInRefectory) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>

            <div className="mt-2.5 pt-2 border-t border-amber-900/40 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Inicial: <strong className="text-slate-200">{formatNumber(sectorSummaries.antigo_adm.totalInitial)}</strong></span>
              <span>Final: <strong className="text-slate-200">{formatNumber(sectorSummaries.antigo_adm.totalFinal)}</strong></span>
            </div>
          </div>

        </div>

      </div>

      {/* ============================================================ */}
      {/* BARRA DE CONFIGURAÇÃO DO TURNO & AÇÕES DE CÂMERA/LANÇAMENTO   */}
      {/* ============================================================ */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Dados da Refeição & Ferramentas de Lançamento</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Fotografe com o smartphone ou digite o hodômetro de cada catraca
            </p>
          </div>

          {/* Botões de Ações Rápidas */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Botão de Câmera Sequencial - Iniciais */}
            <button
              id="btn-camera-sequence-initial"
              onClick={() => {
                // Abre a câmera na 1ª Catraca para registrar os quantitativos iniciais
                handleOpenCamera(calculatedItems[0], 'initial');
              }}
              title="Abre a câmera na 1ª Catraca para registrar os quantitativos iniciais e avança automaticamente para as próximas catracas (01 a 14)"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white shadow-md shadow-blue-900/40 transition-all active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Câmera: Iniciais (01➔14)</span>
            </button>

            {/* Botão de Câmera Sequencial - Finais */}
            <button
              id="btn-camera-sequence-final"
              onClick={() => {
                // Abre a câmera na 1ª Catraca para registrar os quantitativos finais
                handleOpenCamera(calculatedItems[0], 'final');
              }}
              title="Abre a câmera na 1ª Catraca para registrar os quantitativos finais e avança automaticamente para as próximas catracas (01 a 14)"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/40 transition-all active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Câmera: Finais (01➔14)</span>
            </button>

            <button
              id="btn-load-previous"
              onClick={handleLoadPreviousAsInitial}
              title="Puxa os quantitativos finais da refeição anterior como valores iniciais"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-all"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Puxar Leitura Anterior</span>
            </button>

            <button
              id="btn-fill-example"
              onClick={handleFillExampleData}
              title="Preenche as 14 catracas nos 3 refeitórios com valores realistas"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exemplo Almoço</span>
            </button>

            <button
              id="btn-clear-fields"
              onClick={handleClearAll}
              title="Zera todos os campos"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>

            <button
              id="btn-view-history"
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Histórico ({refectoryClosings.length})</span>
            </button>

          </div>
        </div>

        {/* Inputs de Controle da Refeição */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Data da Refeição:</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Tipo de Refeição:</label>
            <select
              value={mealType}
              onChange={e => setMealType(e.target.value as MealType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="cafe">Café da Manhã (06h - 08h30)</option>
              <option value="almoco">Almoço (11h - 14h30)</option>
              <option value="jantar">Jantar (17h30 - 20h30)</option>
              <option value="ceia">Ceia / Turno Noturno (23h - 01h)</option>
              <option value="geral">Geral / Evento Especial</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Horário Início e Término:</label>
            <div className="flex items-center space-x-1">
              <input
                type="time"
                value={openedAt}
                onChange={e => setOpenedAt(e.target.value)}
                className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-slate-500">às</span>
              <input
                type="time"
                value={closedAt}
                onChange={e => setClosedAt(e.target.value)}
                className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Responsável pela Medição:</label>
            <input
              type="text"
              readOnly
              value={currentUser?.name ? `${currentUser.name} (${currentUser.roleLabel})` : 'Operador Responsável'}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-medium cursor-not-allowed"
            />
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* SELETOR DE ABAS / FILTRO DE REFEITÓRIO                       */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
          
          <button
            id="tab-sector-all"
            onClick={() => setSelectedSectorFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              selectedSectorFilter === 'all'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/70 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Todas as 14 Catracas</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              14
            </span>
          </button>

          <button
            id="tab-sector-principal"
            onClick={() => setSelectedSectorFilter('principal')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              selectedSectorFilter === 'principal'
                ? 'bg-blue-950 text-blue-300 border border-blue-600/70 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Refeitório Principal (Catracas 1 a 6)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-900/80 text-blue-200 font-mono">
              6 Catracas
            </span>
          </button>

          <button
            id="tab-sector-bradesco"
            onClick={() => setSelectedSectorFilter('bradesco')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              selectedSectorFilter === 'bradesco'
                ? 'bg-red-950 text-red-300 border border-red-600/70 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-red-400" />
            <span>Refeitório Bradesco (Catracas 7 a 10)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-900/80 text-red-200 font-mono">
              4 Catracas
            </span>
          </button>

          <button
            id="tab-sector-antigo-adm"
            onClick={() => setSelectedSectorFilter('antigo_adm')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              selectedSectorFilter === 'antigo_adm'
                ? 'bg-amber-950 text-amber-300 border border-amber-600/70 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Utensils className="w-3.5 h-3.5 text-amber-400" />
            <span>Refeitório Antigo ADM (Catracas 11 a 14)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-900/80 text-amber-200 font-mono">
              4 Catracas
            </span>
          </button>

        </div>

        <div className="text-xs text-slate-400 flex items-center space-x-2">
          <span className="flex items-center space-x-1">
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dica: Clique no ícone da câmera ao lado de cada campo para escanear</span>
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TABELA PRINCIPAL DE LANÇAMENTO COM CÂMERA DO CELULAR         */}
      {/* ============================================================ */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Cabeçalho da Tabela */}
        <div className="p-4 sm:px-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950/60">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>
                {selectedSectorFilter === 'all' 
                  ? 'Lançamento das 14 Catracas Separadas por Refeitório'
                  : `Lançamento - ${REFECTORY_SECTORS[selectedSectorFilter].name} (${REFECTORY_SECTORS[selectedSectorFilter].rangeLabel})`
                }
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Utilize os botões de câmera para leitura automática ou digite os valores do hodômetro mecânico
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Total exibido:</span>
            <span className="px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 font-mono text-[11px] border border-cyan-800/80">
              {displayedItems.length} Catracas
            </span>
          </div>
        </div>

        {/* Tabela de Lançamento */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Nº</th>
                <th className="py-3.5 px-4 min-w-[140px]">Catraca</th>
                <th className="py-3.5 px-4 min-w-[130px]">Refeitório</th>
                <th className="py-3.5 px-4 min-w-[170px]">
                  <div className="flex items-center justify-between gap-1">
                    <div>
                      Quantitativo Inicial <span className="text-cyan-400 font-mono">(Início)</span>
                    </div>
                    <button
                      type="button"
                      id="btn-header-cam-initial"
                      onClick={() => handleOpenCamera(calculatedItems[0], 'initial')}
                      title="Abrir câmera na 1ª Catraca para registrar os iniciais em sequência (01 a 14)"
                      className="px-1.5 py-0.5 rounded bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 text-blue-300 hover:text-white transition-all text-[10px] flex items-center gap-1 font-mono font-bold"
                    >
                      <Camera className="w-3 h-3 text-cyan-400" />
                      <span>01➔14</span>
                    </button>
                  </div>
                </th>
                <th className="py-3.5 px-4 min-w-[170px]">
                  <div className="flex items-center justify-between gap-1">
                    <div>
                      Quantitativo Final <span className="text-emerald-400 font-mono">(Término)</span>
                    </div>
                    <button
                      type="button"
                      id="btn-header-cam-final"
                      onClick={() => handleOpenCamera(calculatedItems[0], 'final')}
                      title="Abrir câmera na 1ª Catraca para registrar os finais em sequência (01 a 14)"
                      className="px-1.5 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 hover:text-white transition-all text-[10px] flex items-center gap-1 font-mono font-bold"
                    >
                      <Camera className="w-3 h-3 text-emerald-400" />
                      <span>01➔14</span>
                    </button>
                  </div>
                </th>
                <th className="py-3.5 px-4 min-w-[160px] text-right">
                  Pessoas que Passaram <span className="text-slate-400 font-mono">(Final - Inicial)</span>
                </th>
                <th className="py-3.5 px-4 min-w-[120px]">Distribuição</th>
                <th className="py-3.5 px-4 w-24 text-center">Câmera / Foto</th>
                <th className="py-3.5 px-4 w-14 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {displayedItems.map((item) => {
                const idx = item.turnstileNumber - 1;
                const percent = totalPeopleInRefectory > 0 ? ((item.netPasses / totalPeopleInRefectory) * 100) : 0;
                const isHighest = highestTurnstile && highestTurnstile.turnstileNumber === item.turnstileNumber && item.netPasses > 0;
                const sectorInfo = getSectorForTurnstile(item.turnstileNumber);

                return (
                  <tr 
                    key={item.turnstileCode} 
                    className={`transition-colors ${!item.isValid ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'hover:bg-slate-800/40'}`}
                  >
                    {/* Número da Catraca */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                      {String(item.turnstileNumber).padStart(2, '0')}
                    </td>

                    {/* Identificação */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                          isHighest 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' 
                            : 'bg-slate-800 text-cyan-300 border border-slate-700'
                        }`}>
                          {item.turnstileNumber}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-100">{item.turnstileName}</span>
                            {isHighest && (
                              <span title="Catraca com maior movimento na refeição" className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 text-[10px] font-bold border border-amber-800">
                                PICO
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{item.turnstileCode}</span>
                        </div>
                      </div>
                    </td>

                    {/* Badge do Refeitório */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sectorInfo.color.badge}`}>
                        {sectorInfo.shortName}
                      </span>
                    </td>

                    {/* Input: Quantitativo Inicial com Botão de Câmera */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 max-w-[170px]">
                        <input
                          id={`cat-init-${item.turnstileNumber}`}
                          type="text"
                          inputMode="numeric"
                          value={rows[idx]?.initial || ''}
                          onChange={e => handleInputChange(idx, 'initial', e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const nextInput = document.getElementById(`cat-init-${item.turnstileNumber + 1}`);
                              if (nextInput) (nextInput as HTMLInputElement).focus();
                            }
                          }}
                          placeholder="0"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 font-mono text-sm text-slate-100 font-semibold focus:outline-none focus:border-cyan-500 text-right transition-colors"
                        />
                        <button
                          id={`btn-camera-init-${item.turnstileNumber}`}
                          type="button"
                          onClick={() => handleOpenCamera(item, 'initial')}
                          title={`Fotografar hodômetro inicial da ${item.turnstileCode} com câmera do celular`}
                          className="p-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 text-blue-300 hover:text-white transition-all active:scale-95 flex-shrink-0"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Input: Quantitativo Final com Botão de Câmera */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 max-w-[170px]">
                        <input
                          id={`cat-final-${item.turnstileNumber}`}
                          type="text"
                          inputMode="numeric"
                          value={rows[idx]?.final || ''}
                          onChange={e => handleInputChange(idx, 'final', e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const nextInput = document.getElementById(`cat-final-${item.turnstileNumber + 1}`);
                              if (nextInput) (nextInput as HTMLInputElement).focus();
                            }
                          }}
                          placeholder="0"
                          className={`w-full bg-slate-950 border rounded-xl px-3 py-1.5 font-mono text-sm text-slate-100 font-semibold focus:outline-none text-right transition-colors ${
                            !item.isValid 
                              ? 'border-rose-600 focus:border-rose-500 text-rose-300' 
                              : 'border-slate-800 focus:border-emerald-500'
                          }`}
                        />
                        <button
                          id={`btn-camera-final-${item.turnstileNumber}`}
                          type="button"
                          onClick={() => handleOpenCamera(item, 'final')}
                          title={`Fotografar hodômetro final da ${item.turnstileCode} com câmera do celular`}
                          className="p-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 hover:text-white transition-all active:scale-95 flex-shrink-0"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* CÁLCULO AUTOMÁTICO: Pessoas que passaram por cada catraca */}
                    <td className="py-3 px-4 text-right">
                      {item.isValid ? (
                        <div className="flex flex-col items-end">
                          <span className="text-base font-black font-mono text-emerald-400">
                            +{formatNumber(item.netPasses)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.netPasses === 1 ? 'pessoa' : 'pessoas'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end text-rose-400 font-bold">
                          <span className="flex items-center space-x-1 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Erro no cálculo</span>
                          </span>
                          <span className="text-[10px] font-normal text-rose-300">
                            Final menor que inicial
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Barra de Distribuição Percentual */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{percent.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${isHighest ? 'bg-amber-400' : 'bg-cyan-500'}`} 
                            style={{ width: `${Math.min(100, percent * 3.5)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Câmera / Foto Anexada */}
                    <td className="py-3 px-4 text-center">
                      {item.capturedPhoto ? (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto({ url: item.capturedPhoto!, title: `${item.turnstileCode} - Foto do Hodômetro` })}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-[10px] font-mono transition-colors"
                          title="Clique para visualizar a foto capturada"
                        >
                          <ImageIcon className="w-3 h-3 text-cyan-400" />
                          <span>Ver Foto</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenCamera(item, 'final')}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] transition-colors"
                          title="Fotografar hodômetro com a câmera"
                        >
                          <Camera className="w-3 h-3 text-slate-400" />
                          <span>Tirar Foto</span>
                        </button>
                      )}
                    </td>

                    {/* Status de Validação */}
                    <td className="py-3 px-4 text-center">
                      {item.isValid ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800" title="Cálculo válido">
                          <Check className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800" title="Valor final menor que inicial">
                          <AlertTriangle className="w-3 h-3" />
                        </span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>

            {/* LINHA FINAL: SOMA TOTAL DAS CATRACAS */}
            <tfoot className="bg-slate-950 border-t-2 border-cyan-500 text-xs">
              <tr className="font-bold">
                <td colSpan={3} className="py-4 px-4 text-white uppercase tracking-wider text-xs sm:text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                    <span>
                      {selectedSectorFilter === 'all'
                        ? 'TOTAL GERAL (14 CATRACAS DOS 3 REFEITÓRIOS)'
                        : `SUBTOTAL - ${REFECTORY_SECTORS[selectedSectorFilter].name.toUpperCase()}`
                      }
                    </span>
                  </div>
                </td>
                
                {/* Soma Inicial */}
                <td className="py-4 px-4 font-mono text-sm text-slate-300 font-bold">
                  {formatNumber(selectedSectorFilter === 'all' 
                    ? totalInitialSum 
                    : sectorSummaries[selectedSectorFilter].totalInitial
                  )}
                </td>

                {/* Soma Final */}
                <td className="py-4 px-4 font-mono text-sm text-slate-300 font-bold">
                  {formatNumber(selectedSectorFilter === 'all' 
                    ? totalFinalSum 
                    : sectorSummaries[selectedSectorFilter].totalFinal
                  )}
                </td>

                {/* SOMA FINAL: QUANTIDADE REAL DE PESSOAS */}
                <td className="py-4 px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-lg sm:text-xl font-black font-mono text-cyan-400">
                      {formatNumber(selectedSectorFilter === 'all' 
                        ? totalPeopleInRefectory 
                        : sectorSummaries[selectedSectorFilter].totalPeople
                      )}
                    </span>
                    <span className="text-[10px] text-cyan-300 uppercase font-semibold">
                      Total de Pessoas
                    </span>
                  </div>
                </td>

                <td colSpan={3} className="py-4 px-4 text-center text-slate-400 font-mono text-[11px]">
                  {selectedSectorFilter === 'all' ? '100% dos Acessos Gerais' : `${REFECTORY_SECTORS[selectedSectorFilter].rangeLabel}`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Rodapé da Tabela com Observações e Ações Finais */}
        <div className="p-4 sm:p-6 bg-slate-950/80 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex-1 max-w-xl">
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Observações da Refeição (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Turno com pico no Refeitório Principal, conferência visual confirmada..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Botões de Ação Principal: Salvar, Imprimir e Exportar */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            <button
              id="btn-export-excel-refectory"
              onClick={() => handleExportExcel(null)}
              title="Baixar planilha formatada com 14 catracas e resumo de setores para Microsoft Excel (.xlsx)"
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-600/60 transition-all shadow-md active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <button
              id="btn-export-pdf-refectory"
              onClick={() => handleExportPDF(null)}
              title="Baixar Boletim Oficial das 14 catracas formatado para impressão em A4 (.pdf)"
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-600/60 transition-all shadow-md active:scale-95"
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Exportar PDF (.pdf)</span>
            </button>

            <button
              id="btn-print-closing"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Visualizar A4</span>
            </button>

            <button
              id="btn-save-refectory-closing"
              onClick={handleSaveClosing}
              disabled={invalidRowsCount > 0}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                invalidRowsCount > 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/40'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>Salvar Fechamento Oficial</span>
            </button>

          </div>

        </div>

      </div>

      {/* ============================================================ */}
      {/* MODAL DE CÂMERA DO CELULAR PARA LEITURA DO HODÔMETRO         */}
      {/* ============================================================ */}
      {cameraModalOpen && cameraTargetTurnstile && (
        <CameraOdometerModal
          isOpen={cameraModalOpen}
          onClose={() => {
            setCameraModalOpen(false);
            setCameraTargetTurnstile(null);
          }}
          turnstile={cameraTargetTurnstile}
          targetField={cameraTargetField}
          onApplyReading={handleApplyCameraReading}
          allTurnstiles={calculatedItems}
          onSelectTurnstile={(nextItem) => setCameraTargetTurnstile(nextItem)}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL DE PREVIEW DA FOTO CAPTURADA                          */}
      {/* ============================================================ */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>{previewPhoto.title}</span>
              </h3>
              <button 
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 flex items-center justify-center bg-black rounded-xl my-2">
              <img 
                src={previewPhoto.url} 
                alt="Hodômetro capturado" 
                className="max-h-[60vh] max-w-full object-contain rounded-lg"
              />
            </div>
            <p className="text-xs text-slate-400 text-center">
              Foto capturada via câmera do celular para auditoria do conta-giro.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DE HISTÓRICO DE FECHAMENTOS                            */}
      {/* ============================================================ */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-6">
            
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Histórico de Fechamentos do Refeitório</h3>
                  <p className="text-[11px] text-slate-400">Consultas de registros anteriores das 14 catracas</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {refectoryClosings.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nenhum fechamento salvo anteriormente.
                </div>
              ) : (
                refectoryClosings.map(closing => (
                  <div 
                    key={closing.id}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm">{closing.mealLabel}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {formatDate(closing.date)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {closing.openedAt} às {closing.closedAt}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Responsável: <strong className="text-slate-200">{closing.responsibleName}</strong>
                        </p>
                      </div>

                      {/* Total em destaque */}
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className="text-xl font-black font-mono text-cyan-400">
                            {formatNumber(closing.totalPeople)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">pessoas no refeitório</span>
                        </div>

                        <button
                          onClick={() => handleExportExcel(closing)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-colors"
                          title="Exportar Fechamento para Excel (.xlsx)"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleExportPDF(closing)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-cyan-950 text-slate-300 hover:text-cyan-400 border border-slate-700 transition-colors"
                          title="Exportar Boletim em PDF (.pdf)"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedHistoricalClosing(closing);
                            setShowPrintModal(true);
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
                          title="Visualizar Comprovante das 14 Catracas"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Deseja excluir o fechamento ${closing.mealLabel} de ${formatDate(closing.date)}?`)) {
                              deleteRefectoryClosing(closing.id);
                            }
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Excluir Registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Resumo por Refeitório se disponível */}
                    {closing.sectorSummaries && (
                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-mono">
                        <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-800/40 text-center">
                          <span className="text-blue-300 block text-[10px] font-sans">Principal (1 a 6)</span>
                          <span className="text-white font-bold">{formatNumber(closing.sectorSummaries.principal?.totalPeople || 0)}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-red-950/40 border border-red-800/40 text-center">
                          <span className="text-red-300 block text-[10px] font-sans">Bradesco (7 a 10)</span>
                          <span className="text-white font-bold">{formatNumber(closing.sectorSummaries.bradesco?.totalPeople || 0)}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-center">
                          <span className="text-amber-300 block text-[10px] font-sans">Antigo ADM (11 a 14)</span>
                          <span className="text-white font-bold">{formatNumber(closing.sectorSummaries.antigo_adm?.totalPeople || 0)}</span>
                        </div>
                      </div>
                    )}

                    {/* Resumo compacto das 14 catracas */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-7 gap-1.5 text-[10px] font-mono">
                      {closing.items.map(item => (
                        <div key={item.turnstileCode} className="bg-slate-900 p-1.5 rounded-lg border border-slate-800/80 text-center">
                          <span className="text-slate-400 block font-sans">{item.turnstileCode}</span>
                          <span className="text-emerald-400 font-bold block mt-0.5">+{item.netPasses}</span>
                        </div>
                      ))}
                    </div>

                    {closing.notes && (
                      <p className="text-[11px] text-slate-400 mt-2 italic bg-slate-900/60 p-2 rounded-lg">
                        Obs: {closing.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DE COMPROVANTE OFICIAL A4 (SEPARADO POR REFEITÓRIO)    */}
      {/* ============================================================ */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 print-page">
            
            {/* Barra superior de controle (oculta na impressão) */}
            <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-100">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-800">Comprovante de Fechamento por Refeitório (A4)</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleExportExcel(selectedHistoricalClosing)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow transition-all"
                  title="Exportar planilha Excel formatada (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Baixar Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExportPDF(selectedHistoricalClosing)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-cyan-300 border border-slate-700 shadow transition-all"
                  title="Gerar e baixar PDF oficial A4 (.pdf)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Baixar PDF (.pdf)</span>
                </button>
                <button
                  onClick={() => window.print()}
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

            {/* Documento A4 */}
            <div className="p-8 sm:p-10 space-y-5 text-slate-800 font-sans text-xs">
              
              {/* Cabeçalho */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xl">
                      G
                    </div>
                    <div>
                      <h1 className="text-lg font-black tracking-tight text-slate-900">REFEITÓRIO CENTRAL</h1>
                      <p className="text-[10px] text-slate-600 uppercase font-semibold">Boletim Diário das 14 Catracas por Setor de Refeitório</p>
                    </div>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-600 space-y-0.5">
                  <p><strong>Data da Refeição:</strong> {formatDate(selectedHistoricalClosing ? selectedHistoricalClosing.date : date)}</p>
                  <p><strong>Refeição:</strong> {selectedHistoricalClosing ? selectedHistoricalClosing.mealLabel : mealLabels[mealType]}</p>
                  <p><strong>Horário:</strong> {selectedHistoricalClosing ? `${selectedHistoricalClosing.openedAt} às ${selectedHistoricalClosing.closedAt}` : `${openedAt} às ${closedAt}`}</p>
                  <p><strong>Emissão:</strong> {formatDateTime(new Date().toISOString())}</p>
                </div>
              </div>

              {/* Destaque do Total do Refeitório */}
              <div className="bg-slate-100 border-2 border-slate-900 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Resultado Consolidado</span>
                  <h3 className="text-base font-bold text-slate-900">Quantidade Real de Pessoas no Refeitório</h3>
                  <p className="text-[11px] text-slate-600">Soma das 14 catracas nos 3 refeitórios (Principal, Bradesco e Antigo ADM)</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black font-mono text-slate-900">
                    {formatNumber(selectedHistoricalClosing ? selectedHistoricalClosing.totalPeople : totalPeopleInRefectory)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 block">pessoas atendidas</span>
                </div>
              </div>

              {/* Tabela Resumo dos 3 Refeitórios */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Resumo Consolidado por Refeitório
                </h4>
                <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300">Refeitório</th>
                      <th className="p-2 border-r border-slate-300">Catracas</th>
                      <th className="p-2 border-r border-slate-300 text-right">Inicial Acumulado</th>
                      <th className="p-2 border-r border-slate-300 text-right">Final Acumulado</th>
                      <th className="p-2 border-r border-slate-300 text-right font-bold">Total de Pessoas</th>
                      <th className="p-2 text-right w-24">Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['principal', 'bradesco', 'antigo_adm'] as RefectorySector[]).map((secKey) => {
                      const secInfo = REFECTORY_SECTORS[secKey];
                      const curSec = selectedHistoricalClosing?.sectorSummaries 
                        ? selectedHistoricalClosing.sectorSummaries[secKey] 
                        : sectorSummaries[secKey];
                      const total = selectedHistoricalClosing ? selectedHistoricalClosing.totalPeople : totalPeopleInRefectory;
                      const share = total > 0 ? (((curSec?.totalPeople || 0) / total) * 100).toFixed(1) : '0.0';

                      return (
                        <tr key={secKey} className="border-b border-slate-200">
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-800">{secInfo.name}</td>
                          <td className="p-2 border-r border-slate-200 font-mono">{secInfo.rangeLabel}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">{formatNumber(curSec?.totalInitial || 0)}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">{formatNumber(curSec?.totalFinal || 0)}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900">+{formatNumber(curSec?.totalPeople || 0)}</td>
                          <td className="p-2 text-right font-mono">{share}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tabela das 14 Catracas Individualizadas */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Detalhamento das 14 Catracas de Acesso
                </h4>

                <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-1.5 border-r border-slate-300 w-8 text-center">Nº</th>
                      <th className="p-1.5 border-r border-slate-300">Catraca / Refeitório</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Quantitativo Inicial</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Quantitativo Final</th>
                      <th className="p-1.5 border-r border-slate-300 text-right font-bold">Pessoas (Final - Inicial)</th>
                      <th className="p-1.5 text-right w-20">Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedHistoricalClosing ? selectedHistoricalClosing.items : calculatedItems).map((item, idx) => {
                      const total = selectedHistoricalClosing ? selectedHistoricalClosing.totalPeople : totalPeopleInRefectory;
                      const share = total > 0 ? ((item.netPasses / total) * 100).toFixed(1) : '0.0';
                      const sec = getSectorForTurnstile(item.turnstileNumber);

                      return (
                        <tr key={item.turnstileCode} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-1.5 border-r border-slate-200 text-center font-mono font-semibold">{item.turnstileNumber}</td>
                          <td className="p-1.5 border-r border-slate-200 font-bold text-slate-800">
                            {item.turnstileName} ({item.turnstileCode}) — <span className="text-[9px] font-normal text-slate-600">{sec.shortName}</span>
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono">{formatNumber(item.initialCount)}</td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono">{formatNumber(item.finalCount)}</td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-bold text-slate-900">+{formatNumber(item.netPasses)}</td>
                          <td className="p-1.5 text-right font-mono">{share}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 border-t-2 border-slate-900 font-bold text-slate-900">
                      <td colSpan={2} className="p-2 text-left uppercase">SOMA TOTAL (14 CATRACAS)</td>
                      <td className="p-2 text-right font-mono">
                        {formatNumber(selectedHistoricalClosing ? selectedHistoricalClosing.totalInitial : totalInitialSum)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatNumber(selectedHistoricalClosing ? selectedHistoricalClosing.totalFinal : totalFinalSum)}
                      </td>
                      <td className="p-2 text-right font-mono text-sm">
                        {formatNumber(selectedHistoricalClosing ? selectedHistoricalClosing.totalPeople : totalPeopleInRefectory)}
                      </td>
                      <td className="p-2 text-right font-mono">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Campo de Assinaturas */}
              <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-[10px]">
                <div>
                  <div className="border-t border-slate-500 pt-1 font-bold text-slate-800">
                    {selectedHistoricalClosing ? selectedHistoricalClosing.responsibleName : (currentUser?.name || 'Operador Responsável')}
                  </div>
                  <p className="text-slate-500">Responsável pela Leitura das Catracas</p>
                </div>

                <div>
                  <div className="border-t border-slate-500 pt-1 font-bold text-slate-800">
                    Nutricionista / Gestão de Refeições
                  </div>
                  <p className="text-slate-500">Validação do Fluxo do Refeitório</p>
                </div>

                <div>
                  <div className="border-t border-slate-500 pt-1 font-bold text-slate-800">
                    Auditoria e Controle Operacional
                  </div>
                  <p className="text-slate-500">Conformidade e Aprovação</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
