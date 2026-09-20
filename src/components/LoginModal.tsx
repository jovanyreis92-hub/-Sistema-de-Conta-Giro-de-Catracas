import React, { useState } from 'react';
import { Shield, Lock, Mail, AlertCircle, X, Check, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { users, login, switchUser } = useApp();
  
  const [email, setEmail] = useState('carlos.mendes@giroflow.com.br');
  const [password, setPassword] = useState('••••••••');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const success = login(email, password);
    if (success) {
      onClose();
    } else {
      setError('Credenciais inválidas. Verifique o e-mail ou utilize um dos perfis rápidos abaixo.');
    }
  };

  const handleQuickLogin = (userId: string) => {
    switchUser(userId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Autenticação Segura GiroFlow</h3>
              <p className="text-[11px] text-slate-400">Controle de acesso baseado em funções (RBAC)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          
          {error && (
            <div className="bg-rose-950/80 border border-rose-700 p-3 rounded-xl text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Direct credentials form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">E-mail Corporativo:</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="usuario@giroflow.com.br"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Senha de Acesso / Token:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-900/30 transition-all text-xs"
            >
              Autenticar e Entrar no Sistema
            </button>
          </form>

          {/* Quick Profile Selection for instantaneous evaluation */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Acesso Rápido por Papel (Demonstração):
              </span>
            </div>

            <div className="space-y-2">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u.id)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors text-left"
                >
                  <div className="flex items-center space-x-2.5">
                    <img 
                      src={u.avatar} 
                      alt={u.name} 
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-cyan-500/40" 
                    />
                    <div>
                      <p className="font-semibold text-slate-200">{u.name}</p>
                      <p className="text-[10px] text-cyan-400">{u.roleLabel}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase">
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
