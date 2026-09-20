/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { RefectoryCounterEntry } from './components/RefectoryCounterEntry';
import { Dashboard } from './components/Dashboard';
import { CounterRecords } from './components/CounterRecords';
import { LoginModal } from './components/LoginModal';
import { TurnstileModal } from './components/TurnstileModal';
import { Turnstile } from './types';

function MainLayout() {
  const [activeTab, setActiveTab] = useState<'refectory' | 'dashboard' | 'records'>('refectory');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [calibrationTurnstile, setCalibrationTurnstile] = useState<Turnstile | null>(null);
  const [preselectedTurnstileId, setPreselectedTurnstileId] = useState<string | undefined>(undefined);

  const handleOpenNewRecord = (turnstileId?: string) => {
    setPreselectedTurnstileId(turnstileId);
    setActiveTab('records');
  };

  const handleOpenCalibration = (turnstile: Turnstile) => {
    setCalibrationTurnstile(turnstile);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Top Application Header & Navigation Bar */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <AnimatePresence mode="wait">
          {activeTab === 'refectory' && (
            <motion.div
              key="refectory"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <RefectoryCounterEntry />
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Dashboard 
                onOpenNewRecord={handleOpenNewRecord}
                onOpenCalibrationModal={handleOpenCalibration}
              />
            </motion.div>
          )}

          {activeTab === 'records' && (
            <motion.div
              key="records"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CounterRecords initialTurnstileId={preselectedTurnstileId} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="no-print bg-slate-950 border-t border-slate-800/80 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">GiroFlow</span>
            <span>•</span>
            <span>Sistema Integrado de Controle de Conta-Giro & Catracas</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Terminal Central - Concessionária de Transporte</span>
            <span>•</span>
            <span className="text-emerald-500 font-mono">Conexão Segura TLS 1.3</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />

      <TurnstileModal 
        turnstile={calibrationTurnstile}
        isOpen={!!calibrationTurnstile}
        onClose={() => setCalibrationTurnstile(null)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
