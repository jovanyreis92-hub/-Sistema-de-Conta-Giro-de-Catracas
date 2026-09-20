export type UserRole = 'admin' | 'supervisor' | 'operator' | 'auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  avatar: string;
  employeeId: string;
  department: string;
  activeShift?: string;
  lastLogin: string;
}

export type TurnstileDirection = 'entry' | 'exit' | 'bidirectional';
export type TurnstileStatus = 'active' | 'maintenance' | 'locked' | 'alarm';

export interface Turnstile {
  id: string;
  code: string;
  name: string;
  location: string;
  direction: TurnstileDirection;
  status: TurnstileStatus;
  currentMechanicalCounter: number;
  currentElectronicCounter: number;
  lastRotationAt: string;
  model: string;
  totalRotationsToday: number;
  capacityPerHour: number;
  refectorySector?: RefectorySector;
  refectorySectorLabel?: string;
}

export type ShiftType = 'manha' | 'tarde' | 'noite' | 'madrugada';

export interface PassBreakdown {
  standardPasses: number;    // Bilhete Comum / QR / Cartão
  studentPasses: number;     // Passe Estudantil
  freePasses: number;        // Gratuidade (Idoso / PCD)
  employeePasses: number;    // Crachá Funcional / Operacional
  manualReleases: number;    // Liberação Manual por Botão do Fiscal
}

export type RecordStatus = 'open' | 'pending_review' | 'approved' | 'rejected';

export interface TurnstileRecord {
  id: string;
  turnstileId: string;
  turnstileName: string;
  turnstileCode: string;
  operatorId: string;
  operatorName: string;
  supervisorId?: string;
  supervisorName?: string;
  shift: ShiftType;
  date: string;              // YYYY-MM-DD
  openedAt: string;          // ISO
  closedAt?: string;         // ISO
  initialMechanical: number;
  finalMechanical: number;
  initialElectronic: number;
  finalElectronic: number;
  netMechanical: number;     // finalMechanical - initialMechanical
  netElectronic: number;     // finalElectronic - initialElectronic
  breakdown: PassBreakdown;
  systemCountTotal: number;  // sum of breakdown
  discrepancy: number;       // netMechanical - systemCountTotal
  discrepancyRate: number;   // % divergence
  discrepancyReason?: string;
  status: RecordStatus;
  notes?: string;
  createdAt: string;
}

export type PassCategory = 'standard' | 'student' | 'free' | 'employee' | 'manual';

export interface RotationEvent {
  id: string;
  turnstileId: string;
  turnstileCode: string;
  turnstileName: string;
  timestamp: string;
  direction: 'in' | 'out';
  category: PassCategory;
  categoryLabel: string;
  mechanicalCount: number;
  electronicCount: number;
}

export type AuditAction = 
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'RECORD_CREATE'
  | 'RECORD_UPDATE'
  | 'RECORD_APPROVE'
  | 'RECORD_REJECT'
  | 'DISCREPANCY_FLAG'
  | 'TURNSTILE_STATUS_CHANGE'
  | 'TURNSTILE_CALIBRATION'
  | 'REPORT_EXPORT'
  | 'MANUAL_ROTATION_PULSE';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  actionLabel: string;
  severity: AuditSeverity;
  ipAddress: string;
  terminalId: string;
  details: string;
  metadata?: Record<string, unknown>;
}

export interface HourlyFlow {
  hour: string;
  entries: number;
  exits: number;
  total: number;
  peakOccupancy: number;
}

export type MealType = 'cafe' | 'almoco' | 'jantar' | 'ceia' | 'geral';

export type RefectorySector = 'principal' | 'bradesco' | 'antigo_adm';

export interface SectorSummary {
  sector: RefectorySector;
  sectorName: string;
  turnstilesRange: string;
  totalPeople: number;
  totalInitial: number;
  totalFinal: number;
  turnstilesCount: number;
}

export interface TurnstileCountItem {
  turnstileNumber: number; // 1 a 14
  turnstileCode: string;   // CAT-01 a CAT-14
  turnstileName: string;   // Nome da Catraca
  sector: RefectorySector; // principal (1-6), bradesco (7-10), antigo_adm (11-14)
  sectorLabel: string;
  initialCount: number;    // Quantitativo Inicial
  finalCount: number;      // Quantitativo Final
  netPasses: number;       // finalCount - initialCount (Pessoas que passaram)
  isValid: boolean;        // finalCount >= initialCount
  notes?: string;
  capturedPhoto?: string;  // Foto capturada pela câmera do celular
  ocrConfidence?: 'high' | 'medium' | 'low' | 'manual_review';
}

export interface RefectoryClosingRecord {
  id: string;
  date: string;            // YYYY-MM-DD
  mealType: MealType;
  mealLabel: string;
  responsibleName: string;
  openedAt?: string;
  closedAt?: string;
  items: TurnstileCountItem[]; // Array com as 14 catracas
  totalPeople: number;     // Soma de todas as 14 catracas (Quantidade real de pessoas no refeitório)
  totalInitial: number;    // Soma dos valores iniciais
  totalFinal: number;      // Soma dos valores finais
  sectorSummaries: Record<RefectorySector, SectorSummary>; // Totais por Refeitório (Principal, Bradesco, Antigo ADM)
  activeTurnstilesCount: number; // Quantas catracas registraram fluxo (> 0)
  highestTurnstile?: { code: string; name: string; count: number };
  createdAt: string;
  notes?: string;
}
