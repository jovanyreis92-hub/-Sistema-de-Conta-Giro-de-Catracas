import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Activity, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  User as UserIcon, 
  UserPlus,
  Users as UsersIcon,
  LogOut, 
  ChevronDown, 
  Layers, 
  FileText, 
  ListCheck, 
  Clock,
  Utensils
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  activeTab: 'refectory' | 'dashboard' | 'records';
  setActiveTab: (tab: 'refectory' | 'dashboard' | 'records') => void;
  onOpenLoginModal: (mode?: 'login' | 'register' | 'manage') => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab,
  onOpenLoginModal 
}) => {
  const { 
    currentUser, 
    users, 
    switchUser, 
    logout, 
    isSimulating, 
    toggleSimulation, 
    soundEnabled, 
    toggleSound,
    turnstiles
  } = useApp();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(new Intl.DateTimeFormat('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(now));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeTurnstilesCount = turnstiles.filter(t => t.status === 'active').length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      {/* Top Banner / Operation Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Operational ID */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {/* Tripod Turnstile Icon representation */}
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <line x1="12" y1="9" x2="12" y2="3" />
                <line x1="9.5" y1="13.5" x2="4.5" y2="16.5" />
                <line x1="14.5" y1="13.5" x2="19.5" y2="16.5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">Giro<span className="text-cyan-400">Flow</span></span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 uppercase tracking-wider">
                  Conta-Giro v2.4
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Controle de Fluxo & Auditoria de Catracas</p>
            </div>
          </div>

          {/* Central Live Clock & System Status */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{currentTime}</span>
            </div>

            <div className="flex items-center space-x-2 text-xs bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300">
                <strong className="text-emerald-400 font-semibold">{activeTurnstilesCount}</strong>/{turnstiles.length} Catracas Ativas
              </span>
            </div>
          </div>

          {/* Controls: Audio, Simulation & User */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Sound toggle */}
            <button
              id="header-toggle-sound-btn"
              onClick={toggleSound}
              title={soundEnabled ? 'Som mecânico de giro ativado' : 'Som mecânico desativado'}
              className={`p-2 rounded-lg text-sm border transition-colors ${
                soundEnabled 
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Live Simulation Pulse */}
            <button
              id="header-toggle-simulation-btn"
              onClick={toggleSimulation}
              title="Simula fluxo contínuo de passageiros em tempo real"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isSimulating
                  ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300 shadow-sm shadow-emerald-900/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Simulador Ativo</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Simular Fluxo</span>
                </>
              )}
            </button>

            {/* User Session Menu */}
            {currentUser ? (
              <div className="relative">
                <button
                  id="header-user-menu-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 rounded-lg p-1.5 sm:px-3 sm:py-1.5 text-xs text-left transition-all"
                >
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-cyan-500/40"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="font-medium text-slate-200 leading-tight">{currentUser.name}</p>
                    <p className="text-[10px] text-cyan-400">{currentUser.roleLabel}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown for user switch and logout */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-850 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 text-xs">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="font-semibold text-slate-200">{currentUser.name}</p>
                      <p className="text-slate-400 text-[11px]">{currentUser.email}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Matrícula: <strong className="text-slate-300 font-mono">{currentUser.employeeId}</strong></span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">{currentUser.role.toUpperCase()}</span>
                      </div>
                    </div>

                    {/* User Management Actions */}
                    <div className="py-1.5 border-b border-slate-800 space-y-1">
                      <button
                        id="header-btn-register-user"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenLoginModal('register');
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-emerald-400 hover:bg-emerald-950/40 transition-colors text-left font-medium"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Cadastrar Novo Login</span>
                      </button>

                      <button
                        id="header-btn-manage-users"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenLoginModal('manage');
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-left"
                      >
                        <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>Gerenciar Logins ({users.length})</span>
                      </button>
                    </div>

                    {/* Quick profile switch if multiple registered */}
                    {users.length > 1 && (
                      <div className="py-2">
                        <p className="px-3 text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
                          Alternar Usuário:
                        </p>
                        <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
                          {users.map(u => (
                            <button
                              key={u.id}
                              onClick={() => {
                                switchUser(u.id);
                                setShowUserMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                                currentUser.id === u.id 
                                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/40' 
                                  : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <div className="truncate mr-2">
                                <p className="font-medium truncate">{u.name}</p>
                                <p className="text-[10px] text-slate-400">{u.roleLabel}</p>
                              </div>
                              {currentUser.id === u.id && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0"></span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-800 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Encerrar Sessão</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <button
                  id="header-register-direct-btn"
                  onClick={() => onOpenLoginModal('register')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
                  title="Cadastrar novo usuário / login no sistema"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Cadastrar Login</span>
                </button>

                {users.length > 0 && (
                  <button
                    id="header-login-btn"
                    onClick={() => onOpenLoginModal('login')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 shadow-sm transition-all"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Entrar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60">
        <nav className="flex space-x-1 sm:space-x-4 py-2 overflow-x-auto no-scrollbar">
          <button
            id="nav-tab-refectory"
            onClick={() => setActiveTab('refectory')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'refectory'
                ? 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 border border-cyan-500/70 shadow-md shadow-cyan-950/60 ring-1 ring-cyan-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Utensils className="w-4 h-4 text-cyan-400" />
            <span>Lançamento 14 Catracas (Refeitório)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-900/80 text-cyan-200 border border-cyan-700/50">
              14 Catracas
            </span>
          </button>

          <button
            id="nav-tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shadow-sm shadow-cyan-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Monitor das Catracas</span>
          </button>

          <button
            id="nav-tab-records"
            onClick={() => setActiveTab('records')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'records'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shadow-sm shadow-cyan-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ListCheck className="w-4 h-4 text-cyan-400" />
            <span>Registro de Conta-Giro</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
