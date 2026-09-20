import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Turnstile, 
  TurnstileRecord, 
  AuditLog, 
  RotationEvent, 
  HourlyFlow, 
  TurnstileStatus,
  PassCategory,
  RecordStatus,
  AuditAction,
  AuditSeverity,
  RefectoryClosingRecord
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_TURNSTILES, 
  INITIAL_RECORDS, 
  INITIAL_HOURLY_FLOW, 
  INITIAL_ROTATION_EVENTS, 
  INITIAL_AUDIT_LOGS,
  INITIAL_REFECTORY_CLOSINGS
} from '../data/initialData';
import { turnstileAudio } from '../utils/audio';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  turnstiles: Turnstile[];
  records: TurnstileRecord[];
  refectoryClosings: RefectoryClosingRecord[];
  auditLogs: AuditLog[];
  rotationEvents: RotationEvent[];
  hourlyFlow: HourlyFlow[];
  isSimulating: boolean;
  soundEnabled: boolean;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  toggleSimulation: () => void;
  toggleSound: () => void;
  updateTurnstileStatus: (id: string, status: TurnstileStatus, reason?: string) => void;
  rotateTurnstile: (turnstileId: string, category?: PassCategory, count?: number) => void;
  addRecord: (record: Omit<TurnstileRecord, 'id' | 'createdAt'>) => TurnstileRecord;
  updateRecordStatus: (id: string, status: RecordStatus, supervisorNotes?: string) => void;
  saveRefectoryClosing: (record: Omit<RefectoryClosingRecord, 'id' | 'createdAt'>) => RefectoryClosingRecord;
  deleteRefectoryClosing: (id: string) => void;
  addAuditLog: (
    action: AuditAction, 
    actionLabel: string, 
    details: string, 
    severity?: AuditSeverity, 
    metadata?: Record<string, unknown>
  ) => void;
  calibrateTurnstile: (turnstileId: string, newMechanical: number, newElectronic: number, justification: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const CATEGORY_LABELS: Record<PassCategory, string> = {
  standard: 'Bilhete Comum / QR',
  student: 'Passe Estudantil',
  free: 'Gratuidade Sênior/PNE',
  employee: 'Crachá Funcional',
  manual: 'Liberação Fiscal'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(INITIAL_USERS[0]); // Default admin/supervisor
  const [turnstiles, setTurnstiles] = useState<Turnstile[]>(() => {
    const saved = localStorage.getItem('giroflow_turnstiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 14) {
          return parsed;
        }
      } catch {}
    }
    return INITIAL_TURNSTILES;
  });
  const [records, setRecords] = useState<TurnstileRecord[]>(() => {
    const saved = localStorage.getItem('giroflow_records');
    return saved ? JSON.parse(saved) : INITIAL_RECORDS;
  });
  const [refectoryClosings, setRefectoryClosings] = useState<RefectoryClosingRecord[]>(() => {
    const saved = localStorage.getItem('giroflow_refectory_closings');
    return saved ? JSON.parse(saved) : INITIAL_REFECTORY_CLOSINGS;
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('giroflow_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });
  const [rotationEvents, setRotationEvents] = useState<RotationEvent[]>(INITIAL_ROTATION_EVENTS);
  const [hourlyFlow, setHourlyFlow] = useState<HourlyFlow[]>(INITIAL_HOURLY_FLOW);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Sync turnstile & records changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('giroflow_turnstiles', JSON.stringify(turnstiles));
    } catch {}
  }, [turnstiles]);

  useEffect(() => {
    try {
      localStorage.setItem('giroflow_records', JSON.stringify(records));
    } catch {}
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem('giroflow_refectory_closings', JSON.stringify(refectoryClosings));
    } catch {}
  }, [refectoryClosings]);

  useEffect(() => {
    try {
      localStorage.setItem('giroflow_audit_logs', JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  const addAuditLog = useCallback((
    action: AuditAction, 
    actionLabel: string, 
    details: string, 
    severity: AuditSeverity = 'info', 
    metadata?: Record<string, unknown>
  ) => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    const newLog: AuditLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp,
      userId: currentUser?.id || 'USR-ANON',
      userName: currentUser?.name || 'Sistema / Não autenticado',
      userRole: currentUser?.role || 'operator',
      action,
      actionLabel,
      severity,
      ipAddress: '192.168.10.' + Math.floor(10 + Math.random() * 80),
      terminalId: currentUser?.role === 'admin' ? 'ADM-WS01' : 'GATE-TERM01',
      details,
      metadata,
    };

    setAuditLogs(prev => [newLog, ...prev]);
  }, [currentUser]);

  const login = useCallback((email: string, pass: string): boolean => {
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (found && pass.length >= 4) {
      setCurrentUser(found);
      addAuditLog(
        'LOGIN_SUCCESS',
        'Login Efetuado',
        `Usuário ${found.name} (${found.roleLabel}) acessou o sistema com sucesso.`,
        'info',
        { email: found.email, employeeId: found.employeeId }
      );
      return true;
    } else {
      addAuditLog(
        'LOGIN_FAILED',
        'Falha de Autenticação',
        `Tentativa inválida de login com o e-mail: ${email}.`,
        'critical',
        { attemptedEmail: email }
      );
      return false;
    }
  }, [users, addAuditLog]);

  const logout = useCallback(() => {
    if (currentUser) {
      addAuditLog(
        'LOGOUT',
        'Logout do Sistema',
        `Usuário ${currentUser.name} encerrou a sessão.`,
        'info'
      );
    }
    setCurrentUser(null);
  }, [currentUser, addAuditLog]);

  const switchUser = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      addAuditLog(
        'LOGIN_SUCCESS',
        'Troca de Sessão Ativa',
        `Sessão alterada para ${user.name} (${user.roleLabel}).`,
        'info',
        { userId: user.id, role: user.role }
      );
    }
  }, [users, addAuditLog]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      turnstileAudio.enabled = next;
      return next;
    });
  }, []);

  const toggleSimulation = useCallback(() => {
    setIsSimulating(prev => {
      const next = !prev;
      addAuditLog(
        'MANUAL_ROTATION_PULSE',
        next ? 'Modo Simulação em Tempo Real Iniciado' : 'Modo Simulação Pausado',
        next ? 'Geração contínua de pulso de fluxo de catracas ativada.' : 'Simulação de fluxo pausada.',
        'info'
      );
      return next;
    });
  }, [addAuditLog]);

  const rotateTurnstile = useCallback((
    turnstileId: string, 
    category: PassCategory = 'standard', 
    count: number = 1
  ) => {
    const cat = turnstiles.find(t => t.id === turnstileId);
    if (!cat || cat.status === 'maintenance' || cat.status === 'locked') {
      turnstileAudio.playWarningBeep();
      return;
    }

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const newMech = cat.currentMechanicalCounter + count;
    const newElec = cat.currentElectronicCounter + count;

    // Play click sound
    turnstileAudio.playRotationClick();

    // Update Turnstiles
    setTurnstiles(prev => prev.map(t => {
      if (t.id === turnstileId) {
        return {
          ...t,
          currentMechanicalCounter: newMech,
          currentElectronicCounter: newElec,
          totalRotationsToday: t.totalRotationsToday + count,
          lastRotationAt: `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${timeStr}`,
        };
      }
      return t;
    }));

    // Add Rotation Event
    const newEvent: RotationEvent = {
      id: `EVT-${Date.now()}-${Math.floor(Math.random()*100)}`,
      turnstileId: cat.id,
      turnstileCode: cat.code,
      turnstileName: cat.name,
      timestamp: timeStr,
      direction: cat.direction === 'exit' ? 'out' : 'in',
      category,
      categoryLabel: CATEGORY_LABELS[category],
      mechanicalCount: newMech,
      electronicCount: newElec,
    };

    setRotationEvents(prev => [newEvent, ...prev.slice(0, 49)]);

    // Update Hourly Flow
    const currentHourStr = `${now.getHours().toString().padStart(2, '0')}:00`;
    setHourlyFlow(prev => {
      const exists = prev.find(h => h.hour === currentHourStr);
      const isExit = cat.direction === 'exit';
      if (exists) {
        return prev.map(h => {
          if (h.hour === currentHourStr) {
            const entries = isExit ? h.entries : h.entries + count;
            const exits = isExit ? h.exits + count : h.exits;
            return {
              ...h,
              entries,
              exits,
              total: entries + exits,
              peakOccupancy: Math.max(h.peakOccupancy, entries - exits + 3000),
            };
          }
          return h;
        });
      } else {
        return [...prev, {
          hour: currentHourStr,
          entries: isExit ? 0 : count,
          exits: isExit ? count : 0,
          total: count,
          peakOccupancy: 3500,
        }];
      }
    });
  }, [turnstiles]);

  // Periodic simulation effect
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const activeTurnstiles = turnstiles.filter(t => t.status === 'active');
      if (activeTurnstiles.length === 0) return;

      const randomCat = activeTurnstiles[Math.floor(Math.random() * activeTurnstiles.length)];
      const categories: PassCategory[] = ['standard', 'standard', 'standard', 'student', 'free', 'employee'];
      const randomCatType = categories[Math.floor(Math.random() * categories.length)];

      rotateTurnstile(randomCat.id, randomCatType, 1);
    }, 2800);

    return () => clearInterval(interval);
  }, [isSimulating, turnstiles, rotateTurnstile]);

  const updateTurnstileStatus = useCallback((id: string, status: TurnstileStatus, reason?: string) => {
    setTurnstiles(prev => prev.map(t => {
      if (t.id === id) {
        const oldStatus = t.status;
        addAuditLog(
          'TURNSTILE_STATUS_CHANGE',
          `Status da Catraca ${t.code} alterado`,
          `Status modificado de ${oldStatus} para ${status}.${reason ? ` Motivo: ${reason}` : ''}`,
          status === 'alarm' || status === 'locked' ? 'critical' : 'warning',
          { turnstileCode: t.code, oldStatus, newStatus: status, reason }
        );
        return { ...t, status };
      }
      return t;
    }));
  }, [addAuditLog]);

  const calibrateTurnstile = useCallback((
    turnstileId: string, 
    newMechanical: number, 
    newElectronic: number, 
    justification: string
  ) => {
    const cat = turnstiles.find(t => t.id === turnstileId);
    if (!cat) return;

    addAuditLog(
      'TURNSTILE_CALIBRATION',
      `Calibração Física de Contadores - ${cat.code}`,
      `Ajuste de odômetro: Mecânico (${cat.currentMechanicalCounter} -> ${newMechanical}), Eletrônico (${cat.currentElectronicCounter} -> ${newElectronic}). Justificativa: ${justification}`,
      'warning',
      {
        turnstileCode: cat.code,
        previousMechanical: cat.currentMechanicalCounter,
        newMechanical,
        previousElectronic: cat.currentElectronicCounter,
        newElectronic,
        justification
      }
    );

    setTurnstiles(prev => prev.map(t => {
      if (t.id === turnstileId) {
        return {
          ...t,
          currentMechanicalCounter: newMechanical,
          currentElectronicCounter: newElectronic,
        };
      }
      return t;
    }));
  }, [turnstiles, addAuditLog]);

  const addRecord = useCallback((recordData: Omit<TurnstileRecord, 'id' | 'createdAt'>): TurnstileRecord => {
    const now = new Date();
    const newId = `REC-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(100 + Math.random()*900)}`;
    
    const newRecord: TurnstileRecord = {
      ...recordData,
      id: newId,
      createdAt: now.toISOString(),
    };

    setRecords(prev => [newRecord, ...prev]);

    // Audit log
    addAuditLog(
      'RECORD_CREATE',
      `Registro de Conta-Giro ${newRecord.id}`,
      `Catraca ${newRecord.turnstileCode} | Turno ${newRecord.shift.toUpperCase()} | Giros Líquidos: ${newRecord.netMechanical} | Divergência: ${newRecord.discrepancy}`,
      newRecord.discrepancy !== 0 ? 'warning' : 'info',
      {
        recordId: newRecord.id,
        turnstileCode: newRecord.turnstileCode,
        netMechanical: newRecord.netMechanical,
        netElectronic: newRecord.netElectronic,
        discrepancy: newRecord.discrepancy,
      }
    );

    if (newRecord.discrepancy !== 0) {
      addAuditLog(
        'DISCREPANCY_FLAG',
        `Alerta de Discrepância de Catraca (${newRecord.discrepancy} giros)`,
        `Divergência detectada no fechamento da ${newRecord.turnstileCode}. Motivo declarado: ${newRecord.discrepancyReason || 'Não informado'}`,
        'warning',
        { recordId: newRecord.id, discrepancy: newRecord.discrepancy }
      );
    }

    return newRecord;
  }, [addAuditLog]);

  const updateRecordStatus = useCallback((id: string, status: RecordStatus, supervisorNotes?: string) => {
    setRecords(prev => prev.map(r => {
      if (r.id === id) {
        const updated: TurnstileRecord = {
          ...r,
          status,
          supervisorId: currentUser?.id,
          supervisorName: currentUser?.name,
          notes: supervisorNotes ? `${r.notes || ''} [Conferência: ${supervisorNotes}]` : r.notes,
        };

        const action: AuditAction = status === 'approved' ? 'RECORD_APPROVE' : status === 'rejected' ? 'RECORD_REJECT' : 'RECORD_UPDATE';
        addAuditLog(
          action,
          `Registro ${id} marcado como ${status.toUpperCase()}`,
          `Ação realizada por ${currentUser?.name || 'Supervisor'}.${supervisorNotes ? ` Parecer: ${supervisorNotes}` : ''}`,
          status === 'rejected' ? 'warning' : 'info',
          { recordId: id, status, supervisorNotes }
        );

        return updated;
      }
      return r;
    }));
  }, [currentUser, addAuditLog]);

  const saveRefectoryClosing = useCallback((closingData: Omit<RefectoryClosingRecord, 'id' | 'createdAt'>): RefectoryClosingRecord => {
    const id = `REF-${closingData.date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const newClosing: RefectoryClosingRecord = {
      ...closingData,
      id,
      createdAt: new Date().toISOString()
    };

    setRefectoryClosings(prev => [newClosing, ...prev]);

    // Atualiza os contadores atuais das catracas para os valores finais informados
    setTurnstiles(prev => prev.map(t => {
      const match = closingData.items.find(item => item.turnstileCode === t.code);
      if (match && match.finalCount >= 0) {
        return {
          ...t,
          currentMechanicalCounter: match.finalCount,
          currentElectronicCounter: match.finalCount,
          lastRotationAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          totalRotationsToday: t.totalRotationsToday + match.netPasses
        };
      }
      return t;
    }));

    // Registra na trilha de auditoria
    addAuditLog(
      'RECORD_CREATE',
      `Fechamento de Conta-Giro do Refeitório (${closingData.mealLabel})`,
      `Registrado lançamento das 14 catracas. Total de ${closingData.totalPeople} pessoas acessaram o refeitório. Responsável: ${closingData.responsibleName}.`,
      'info',
      {
        closingId: id,
        mealType: closingData.mealType,
        totalPeople: closingData.totalPeople,
        activeTurnstiles: closingData.activeTurnstilesCount,
        highestTurnstile: closingData.highestTurnstile
      }
    );

    return newClosing;
  }, [addAuditLog]);

  const deleteRefectoryClosing = useCallback((id: string) => {
    setRefectoryClosings(prev => prev.filter(c => c.id !== id));
    addAuditLog(
      'RECORD_UPDATE',
      'Exclusão de Fechamento de Refeitório',
      `O fechamento de conta-giro ${id} foi removido do histórico por ${currentUser?.name || 'Usuário'}.`,
      'warning',
      { deletedId: id }
    );
  }, [currentUser, addAuditLog]);

  return (
    <AppContext.Provider value={{
      currentUser,
      users,
      turnstiles,
      records,
      refectoryClosings,
      auditLogs,
      rotationEvents,
      hourlyFlow,
      isSimulating,
      soundEnabled,
      login,
      logout,
      switchUser,
      toggleSimulation,
      toggleSound,
      updateTurnstileStatus,
      rotateTurnstile,
      addRecord,
      updateRecordStatus,
      saveRefectoryClosing,
      deleteRefectoryClosing,
      addAuditLog,
      calibrateTurnstile,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
