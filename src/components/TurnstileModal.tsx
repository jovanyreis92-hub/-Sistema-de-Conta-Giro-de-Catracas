import React, { useState, useEffect } from 'react';
import { Settings2, AlertTriangle, X, Check, RotateCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Turnstile } from '../types';

interface TurnstileModalProps {
  turnstile: Turnstile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TurnstileModal: React.FC<TurnstileModalProps> = ({ 
  turnstile, 
  isOpen, 
  onClose 
}) => {
  const { calibrateTurnstile } = useApp();

  const [mechReading, setMechReading] = useState<number>(0);
  const [elecReading, setElecReading] = useState<number>(0);
  const [justification, setJustification] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (turnstile) {
      setMechReading(turnstile.currentMechanicalCounter);
      setElecReading(turnstile.currentElectronicCounter);
      setJustification('');
      setError(null);
    }
  }, [turnstile]);

  if (!isOpen || !turnstile) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!justification.trim()) {
      setError('É obrigatório descrever a justificativa técnica para o ajuste ou calibração de contadores.');
      return;
    }

    calibrateTurnstile(turnstile.id, mechReading, elecReading, justification);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-950 border border-amber-800 text-amber-400">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Calibração Técnica: {turnstile.code}</h3>
              <p className="text-[11px] text-slate-400">{turnstile.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {error && (
            <div className="bg-rose-950/80 border border-rose-700 p-3 rounded-xl text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            Atenção: A calibração manual de hodômetros gera registro imediato na trilha de auditoria e conformidade fiscal.
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Novo Contador Mecânico (Hodômetro nos Braços):
            </label>
            <input
              type="number"
              value={mechReading}
              onChange={e => setMechReading(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Novo Contador Eletrônico (Sensor CPU):
            </label>
            <input
              type="number"
              value={elecReading}
              onChange={e => setElecReading(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-amber-300 font-bold mb-1">
              * Justificativa Técnica da Calibração:
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Troca preventiva de engrenagem mecânica do tripé, reset de ciclo de 1.000.000 de giros, substituição de placa CPU..."
              value={justification}
              onChange={e => setJustification(e.target.value)}
              className="w-full bg-slate-950 border border-amber-800/80 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-md shadow-amber-900/30"
            >
              Salvar Calibração
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
