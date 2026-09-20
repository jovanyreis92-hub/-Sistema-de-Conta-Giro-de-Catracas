import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Mail, 
  AlertCircle, 
  X, 
  Check, 
  UserPlus, 
  Trash2, 
  Users, 
  Key, 
  BadgeCheck, 
  Briefcase, 
  Clock, 
  User as UserIcon, 
  Eye, 
  EyeOff,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'manage';
}

export const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose,
  initialMode = 'login' 
}) => {
  const { 
    users, 
    currentUser, 
    login, 
    switchUser, 
    registerUser, 
    deleteUser, 
    clearPreviousUsers 
  } = useApp();
  
  const [mode, setMode] = useState<'login' | 'register' | 'manage'>(initialMode);
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('admin');
  const [regEmployeeId, setRegEmployeeId] = useState('');
  const [regDepartment, setRegDepartment] = useState('Fiscalização de Acesso & Refeitório');
  const [regShift, setRegShift] = useState('Geral (Comercial)');
  const [regPurgePrevious, setRegPurgePrevious] = useState(true);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Clear confirmation
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Sync mode on open
  useEffect(() => {
    if (isOpen) {
      setLoginError(null);
      setRegError(null);
      setRegSuccess(null);
      setConfirmClearAll(false);
      
      // If there are no users, go straight to register
      if (users.length === 0) {
        setMode('register');
      } else {
        setMode(initialMode);
        // Pre-fill with first user's email if empty
        if (!loginEmail && users.length > 0) {
          setLoginEmail(users[0].email);
        }
      }
    }
  }, [isOpen, initialMode, users.length]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail) {
      setLoginError('Informe o e-mail corporativo para prosseguir.');
      return;
    }

    const success = login(loginEmail, loginPassword);
    if (success) {
      onClose();
    } else {
      setLoginError('Credenciais inválidas. Verifique o e-mail e senha digitados.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!cleanName || cleanName.length < 3) {
      setRegError('Por favor, informe o nome completo do usuário (mínimo 3 caracteres).');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setRegError('Por favor, informe um endereço de e-mail corporativo válido.');
      return;
    }

    // Check if email is already taken
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      setRegError(`O e-mail "${cleanEmail}" já está cadastrado no sistema.`);
      return;
    }

    if (regPassword.length < 4) {
      setRegError('A senha de acesso deve possuir pelo menos 4 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('A confirmação de senha não coincide com a senha digitada.');
      return;
    }

    // If user chose to purge previous users
    if (regPurgePrevious && users.length > 0) {
      clearPreviousUsers();
    }

    // Register new user
    const newUser = registerUser({
      name: cleanName,
      email: cleanEmail,
      password: regPassword,
      role: regRole,
      employeeId: regEmployeeId.trim() || `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
      department: regDepartment.trim() || 'Operações de Acesso / Refeitório',
      activeShift: regShift.trim() || 'Geral',
    });

    setRegSuccess(`Novo login "${newUser.name}" cadastrado com sucesso!`);
    
    // Clean up fields
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleQuickLogin = (userId: string) => {
    switchUser(userId);
    onClose();
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Tem certeza que deseja remover o login "${userName}"?`)) {
      deleteUser(userId);
    }
  };

  const handleClearAllUsers = () => {
    clearPreviousUsers();
    setConfirmClearAll(false);
    setMode('register');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl border ${
              mode === 'register' 
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-400'
                : mode === 'manage'
                ? 'bg-amber-950/80 border-amber-700 text-amber-400'
                : 'bg-cyan-950 border-cyan-800 text-cyan-400'
            }`}>
              {mode === 'register' ? (
                <UserPlus className="w-5 h-5" />
              ) : mode === 'manage' ? (
                <Users className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>
                  {mode === 'register' ? 'Cadastrar Novo Login' : mode === 'manage' ? 'Gerenciar Logins Cadastrados' : 'Autenticação no Sistema'}
                </span>
                {users.length === 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Primeiro Acesso
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">GiroFlow • Gestão de Controle de Catracas & Refeitório</p>
            </div>
          </div>
          <button 
            id="btn-close-login-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-3 pt-2 flex-shrink-0">
          <button
            id="tab-login-mode"
            type="button"
            onClick={() => { setMode('login'); setLoginError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center justify-center space-x-1.5 ${
              mode === 'login'
                ? 'border-cyan-500 text-cyan-300 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Entrar (Login)</span>
          </button>

          <button
            id="tab-register-mode"
            type="button"
            onClick={() => { setMode('register'); setRegError(null); setRegSuccess(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center justify-center space-x-1.5 ${
              mode === 'register'
                ? 'border-emerald-500 text-emerald-300 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo Cadastro</span>
            <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold">
              + Novo
            </span>
          </button>

          <button
            id="tab-manage-mode"
            type="button"
            onClick={() => { setMode('manage'); setConfirmClearAll(false); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center justify-center space-x-1.5 ${
              mode === 'manage'
                ? 'border-amber-500 text-amber-300 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Gerenciar ({users.length})</span>
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          
          {/* TAB 1: ENTRAR (LOGIN) */}
          {mode === 'login' && (
            <div className="space-y-4">
              {users.length === 0 ? (
                <div className="bg-amber-950/60 border border-amber-700/80 p-4 rounded-xl text-amber-200 space-y-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <p className="font-bold text-sm">Nenhum login cadastrado no sistema</p>
                  </div>
                  <p className="text-[11px] text-amber-300/90">
                    Os logins anteriores foram removidos. Crie o seu novo usuário para começar a utilizar o sistema com as permissões desejadas.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="w-full mt-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center space-x-1.5 text-xs shadow-md transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Cadastrar Primeiro Login Agora</span>
                  </button>
                </div>
              ) : (
                <>
                  {loginError && (
                    <div className="bg-rose-950/80 border border-rose-700 p-3 rounded-xl text-rose-300 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">E-mail Corporativo de Acesso:</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="input-login-email"
                          type="email"
                          value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          placeholder="seu.email@empresa.com.br"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Senha de Acesso:</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="input-login-password"
                          type={showLoginPassword ? 'text' : 'password'}
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          placeholder="Digite sua senha..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      id="btn-submit-login"
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-900/30 transition-all text-xs flex items-center justify-center space-x-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Autenticar e Entrar no Sistema</span>
                    </button>
                  </form>

                  {/* Quick access with registered logins */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Logins Cadastrados Disponíveis ({users.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setMode('register')}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center space-x-1 font-semibold"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ Novo Cadastro</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {users.map(u => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-850 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => handleQuickLogin(u.id)}
                            className="flex-1 flex items-center space-x-2.5 text-left"
                          >
                            <img 
                              src={u.avatar} 
                              alt={u.name} 
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-cyan-500/40" 
                            />
                            <div>
                              <p className="font-semibold text-slate-200 leading-tight">{u.name}</p>
                              <p className="text-[10px] text-cyan-400">{u.roleLabel} • {u.email}</p>
                            </div>
                          </button>
                          <div className="flex items-center space-x-2">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase">
                              {u.role}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-950/40 transition-colors"
                              title="Remover este login"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: CADASTRAR NOVO LOGIN */}
          {mode === 'register' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-xl text-emerald-300 flex items-start space-x-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="text-[11px] leading-relaxed">
                  <p className="font-bold text-emerald-200">Cadastre seu Login de Acesso</p>
                  <p className="text-emerald-300/80">
                    Defina suas credenciais corporativas e o nível de acesso (administrador, supervisor, operador ou auditor).
                  </p>
                </div>
              </div>

              {regError && (
                <div className="bg-rose-950/80 border border-rose-700 p-3 rounded-xl text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="bg-emerald-950/80 border border-emerald-600 p-3 rounded-xl text-emerald-200 flex items-center space-x-2 font-medium">
                  <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>{regSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                {/* Nome Completo */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nome Completo do Usuário <span className="text-rose-400">*</span>:
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-reg-name"
                      type="text"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      required
                      placeholder="Ex: Jovany Reis"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    E-mail Corporativo / Login <span className="text-rose-400">*</span>:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-reg-email"
                      type="email"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      required
                      placeholder="Ex: jovany.reis@empresa.com.br"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Senha e Confirmar Senha */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Senha de Acesso <span className="text-rose-400">*</span>:
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        required
                        placeholder="Mínimo 4 dígitos..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Confirmar Senha <span className="text-rose-400">*</span>:
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-reg-confirm-password"
                        type={showRegPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={e => setRegConfirmPassword(e.target.value)}
                        required
                        placeholder="Repita a senha..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Função / Papel no Sistema (RBAC) */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nível de Acesso / Papel no Sistema:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { role: 'admin' as UserRole, label: 'Administrador', desc: 'Acesso pleno, calibragem & gestão' },
                      { role: 'supervisor' as UserRole, label: 'Supervisor', desc: 'Aprovação & conferência fiscal' },
                      { role: 'operator' as UserRole, label: 'Operador', desc: 'Leitura de odômetro & conta-giro' },
                      { role: 'auditor' as UserRole, label: 'Auditor', desc: 'Relatórios fiscais & auditoria' },
                    ].map(item => (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => setRegRole(item.role)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          regRole === item.role
                            ? 'bg-emerald-950/70 border-emerald-500 text-white ring-1 ring-emerald-500'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{item.label}</span>
                          {regRole === item.role && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matrícula, Departamento & Turno */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Matrícula / ID:</label>
                    <input
                      type="text"
                      value={regEmployeeId}
                      onChange={e => setRegEmployeeId(e.target.value)}
                      placeholder="Ex: MAT-1045"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Departamento:</label>
                    <input
                      type="text"
                      value={regDepartment}
                      onChange={e => setRegDepartment(e.target.value)}
                      placeholder="Ex: Refeitório Central"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Turno:</label>
                    <select
                      value={regShift}
                      onChange={e => setRegShift(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Geral (Comercial)">Geral (Comercial)</option>
                      <option value="Manhã (06h - 14h)">Manhã (06h - 14h)</option>
                      <option value="Tarde (14h - 22h)">Tarde (14h - 22h)</option>
                      <option value="Noite / Ceia (22h - 06h)">Noite / Ceia (22h - 06h)</option>
                    </select>
                  </div>
                </div>

                {/* Opção para remover os anteriores automaticamente ao cadastrar */}
                {users.length > 0 && (
                  <div className="pt-2 border-t border-slate-800">
                    <label className="flex items-start space-x-2 cursor-pointer select-none bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 hover:border-slate-750 transition-colors">
                      <input
                        type="checkbox"
                        checked={regPurgePrevious}
                        onChange={e => setRegPurgePrevious(e.target.checked)}
                        className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <div className="text-[11px]">
                        <span className="font-semibold text-slate-200">
                          Remover logins anteriores e manter este novo login como principal
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Limpa os {users.length} usuários anteriores cadastrados, garantindo que apenas os novos logins fiquem registrados no sistema.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <button
                  id="btn-submit-register"
                  type="submit"
                  className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-900/30 transition-all text-xs flex items-center justify-center space-x-1.5"
                >
                  <BadgeCheck className="w-4 h-4" />
                  <span>Concluir Cadastro e Acessar Sistema</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: GERENCIAR LOGINS E REMOVER ANTERIORES */}
          {mode === 'manage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-200">Logins Ativos no Sistema</h4>
                  <p className="text-[10px] text-slate-400">
                    Total: {users.length} {users.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}
                  </p>
                </div>
                
                {users.length > 0 && (
                  <div>
                    {!confirmClearAll ? (
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 border border-rose-700/80 text-rose-300 hover:bg-rose-900/80 hover:text-white transition-all text-[11px] font-semibold flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover Todos os Anteriores</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-1.5 bg-rose-950 border border-rose-600 p-1 rounded-lg">
                        <span className="text-[10px] text-rose-200 font-bold px-1">Confirma?</span>
                        <button
                          type="button"
                          onClick={handleClearAllUsers}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded shadow"
                        >
                          Sim, limpar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearAll(false)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {users.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 p-6 space-y-3">
                  <Users className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-300 text-sm">Nenhum login cadastrado no momento</p>
                  <p className="text-slate-500 text-[11px]">
                    Todos os cadastros anteriores foram removidos. Cadastre novos usuários para habilitar o acesso.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center space-x-1.5 shadow-md"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Cadastrar Novo Login</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {users.map(u => {
                    const isCurrent = currentUser?.id === u.id;
                    return (
                      <div
                        key={u.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-cyan-950/40 border-cyan-700/80 ring-1 ring-cyan-500/40'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img 
                              src={u.avatar} 
                              alt={u.name} 
                              className="w-9 h-9 rounded-full object-cover ring-2 ring-cyan-500/30" 
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-200 text-xs">{u.name}</span>
                                {isCurrent && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                                    Sessão Atual
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">{u.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => handleQuickLogin(u.id)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 text-[11px] font-semibold transition-colors"
                              >
                                Usar Login
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                              title={`Excluir login de ${u.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* User Metadata */}
                        <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                          <div>
                            <span className="text-slate-500">Função:</span>{' '}
                            <span className="text-cyan-300 font-semibold">{u.roleLabel}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Matrícula:</span>{' '}
                            <span className="text-slate-300 font-mono">{u.employeeId}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Turno:</span>{' '}
                            <span className="text-slate-300">{u.activeShift || 'Geral'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action to create new login from manage tab */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold flex items-center justify-center space-x-1.5 text-xs transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cadastrar Outro Login</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
