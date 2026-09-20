import { RefectorySector, SectorSummary, TurnstileCountItem } from '../types';

export interface SectorInfo {
  id: RefectorySector;
  name: string;
  shortName: string;
  rangeLabel: string;
  startNumber: number;
  endNumber: number;
  totalTurnstiles: number;
  color: {
    bg: string;
    border: string;
    text: string;
    badge: string;
    accent: string;
  };
  description: string;
}

export const REFECTORY_SECTORS: Record<RefectorySector, SectorInfo> = {
  principal: {
    id: 'principal',
    name: 'Refeitório Principal',
    shortName: 'Principal',
    rangeLabel: 'Catracas 1 a 6',
    startNumber: 1,
    endNumber: 6,
    totalTurnstiles: 6,
    color: {
      bg: 'from-blue-950/40 to-slate-900',
      border: 'border-blue-500/50',
      text: 'text-blue-300',
      badge: 'bg-blue-950 text-blue-300 border-blue-700/60',
      accent: 'text-blue-400',
    },
    description: 'Acesso principal ao salão de refeições (Catracas 01 a 06)',
  },
  bradesco: {
    id: 'bradesco',
    name: 'Refeitório Bradesco',
    shortName: 'Bradesco',
    rangeLabel: 'Catracas 7 a 10',
    startNumber: 7,
    endNumber: 10,
    totalTurnstiles: 4,
    color: {
      bg: 'from-red-950/30 to-slate-900',
      border: 'border-red-500/50',
      text: 'text-red-300',
      badge: 'bg-red-950 text-red-300 border-red-700/60',
      accent: 'text-red-400',
    },
    description: 'Acesso exclusivo ala Bradesco (Catracas 07 a 10)',
  },
  antigo_adm: {
    id: 'antigo_adm',
    name: 'Refeitório Antigo ADM',
    shortName: 'Antigo ADM',
    rangeLabel: 'Catracas 11 a 14',
    startNumber: 11,
    endNumber: 14,
    totalTurnstiles: 4,
    color: {
      bg: 'from-amber-950/30 to-slate-900',
      border: 'border-amber-500/50',
      text: 'text-amber-300',
      badge: 'bg-amber-950 text-amber-300 border-amber-700/60',
      accent: 'text-amber-400',
    },
    description: 'Acesso do pavilhão administrativo antigo (Catracas 11 a 14)',
  },
};

export function getSectorForTurnstile(turnstileInput: number | string): SectorInfo {
  const num = typeof turnstileInput === 'number' 
    ? turnstileInput 
    : parseInt(String(turnstileInput).replace(/\D/g, ''), 10) || 1;

  if (num >= 1 && num <= 6) {
    return REFECTORY_SECTORS.principal;
  }
  if (num >= 7 && num <= 10) {
    return REFECTORY_SECTORS.bradesco;
  }
  return REFECTORY_SECTORS.antigo_adm;
}

export function computeSectorSummaries(items: TurnstileCountItem[]): Record<RefectorySector, SectorSummary> {
  const summaries: Record<RefectorySector, SectorSummary> = {
    principal: {
      sector: 'principal',
      sectorName: REFECTORY_SECTORS.principal.name,
      turnstilesRange: REFECTORY_SECTORS.principal.rangeLabel,
      totalPeople: 0,
      totalInitial: 0,
      totalFinal: 0,
      turnstilesCount: 6,
    },
    bradesco: {
      sector: 'bradesco',
      sectorName: REFECTORY_SECTORS.bradesco.name,
      turnstilesRange: REFECTORY_SECTORS.bradesco.rangeLabel,
      totalPeople: 0,
      totalInitial: 0,
      totalFinal: 0,
      turnstilesCount: 4,
    },
    antigo_adm: {
      sector: 'antigo_adm',
      sectorName: REFECTORY_SECTORS.antigo_adm.name,
      turnstilesRange: REFECTORY_SECTORS.antigo_adm.rangeLabel,
      totalPeople: 0,
      totalInitial: 0,
      totalFinal: 0,
      turnstilesCount: 4,
    },
  };

  items.forEach(item => {
    const secKey = item.sector || getSectorForTurnstile(item.turnstileNumber).id;
    if (summaries[secKey]) {
      if (item.isValid) {
        summaries[secKey].totalPeople += item.netPasses;
      }
      summaries[secKey].totalInitial += item.initialCount;
      summaries[secKey].totalFinal += item.finalCount;
    }
  });

  return summaries;
}
