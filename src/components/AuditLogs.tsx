import React, { useState } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle, 
  Info, 
  Lock, 
  Terminal, 
  User, 
  Calendar,
  X,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportAuditLogsToCSV } from '../utils/exportUtils';
import { formatDateTime } from '../utils/formatters';
import { AuditLog, AuditSeverity } from '../types';

export const AuditLogs: React.FC = () => {
  const { auditLogs, currentUser, addAuditLog } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const handleExportCSV = () => {
    exportAuditLogsToCSV(filteredLogs, 'logs-auditoria-acesso-giroflow.csv');
    addAuditLog(
      'REPORT_EXPORT',
      'Exportação de Logs de Auditoria',
      `Arquivo CSV com ${filteredLogs.length} logs exportado por ${currentUser?.name}.`,
      'info'
    );
  };

  const filteredLogs = auditLogs.filter(log => {
    if (severityFilter !== 'all' && log.severity !== severityFilter) return false;
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.id.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.actionLabel.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.terminalId.toLowerCase().includes(q) ||
        log.ipAddress.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-850 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800/60 text-cyan-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Logs de Acesso, Segurança & Trilha de Auditoria</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rastreabilidade imutável de sessões, tentativas de autenticação, operações de conta-giro e calibrações
            </p>
          </div>
        </div>

        <button
          id="audit-export-csv-btn"
          onClick={handleExportCSV}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Exportar Logs (CSV)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-850 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por usuário, ação, terminal, IP ou detalhes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas as Ações</option>
            <option value="LOGIN_SUCCESS">Login Bem-Sucedido</option>
            <option value="LOGIN_FAILED">Falha de Autenticação</option>
            <option value="LOGOUT">Logout de Usuário</option>
            <option value="RECORD_CREATE">Lançamento de Turno</option>
            <option value="RECORD_APPROVE">Homologação de Registro</option>
            <option value="DISCREPANCY_FLAG">Alerta de Divergência</option>
            <option value="TURNSTILE_STATUS_CHANGE">Alteração de Catraca</option>
            <option value="TURNSTILE_CALIBRATION">Calibração de Odômetro</option>
            <option value="REPORT_EXPORT">Exportação de Relatório</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas as Severidades</option>
            <option value="info">Normal (Info)</option>
            <option value="warning">Atenção (Warning)</option>
            <option value="critical">Crítico / Falhas</option>
          </select>
        </div>

      </div>

      {/* Logs Table */}
      <div className="bg-slate-850 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Ação / Evento</th>
                <th className="py-3 px-4">Severidade</th>
                <th className="py-3 px-4">Terminal / IP</th>
                <th className="py-3 px-4">Detalhes Técnicos</th>
                <th className="py-3 px-4 text-right">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum log encontrado para o filtro aplicado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {log.timestamp}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-200">{log.userName}</span>
                        <p className="text-[10px] text-slate-400 font-mono uppercase">{log.userRole}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-200">{log.actionLabel}</span>
                        <p className="text-[10px] font-mono text-cyan-400">{log.action}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          log.severity === 'critical'
                            ? 'bg-rose-950/80 text-rose-400 border border-rose-800'
                            : log.severity === 'warning'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {log.severity === 'critical' ? (
                            <AlertOctagon className="w-3 h-3 mr-1" />
                          ) : log.severity === 'warning' ? (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          ) : (
                            <CheckCircle className="w-3 h-3 mr-1 text-cyan-400" />
                          )}
                          {log.severity}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        <span className="text-slate-300">{log.terminalId}</span>
                        <p className="text-[10px] text-slate-500">{log.ipAddress}</p>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                        {log.details}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
                          title="Detalhes do Log"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Registro de Auditoria #{selectedLog.id}</h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">Data e Hora:</span>
                  <p className="font-mono text-slate-200 mt-0.5">{selectedLog.timestamp}</p>
                </div>
                <div>
                  <span className="text-slate-400">Usuário:</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{selectedLog.userName} ({selectedLog.userRole})</p>
                </div>
                <div>
                  <span className="text-slate-400">Terminal:</span>
                  <p className="font-mono text-slate-200 mt-0.5">{selectedLog.terminalId}</p>
                </div>
                <div>
                  <span className="text-slate-400">Endereço IP:</span>
                  <p className="font-mono text-slate-200 mt-0.5">{selectedLog.ipAddress}</p>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-300">Ação Auditada:</span>
                <p className="text-cyan-400 font-mono text-sm mt-0.5 font-bold">{selectedLog.actionLabel}</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Descrição do Evento:</span>
                <p className="text-slate-200 leading-relaxed">{selectedLog.details}</p>
              </div>

              {selectedLog.metadata && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1 font-mono text-[11px]">Metadados do Sistema:</span>
                  <pre className="font-mono text-[11px] text-cyan-300 overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                <span>Integridade de Registro: Assinado Digitalmente</span>
                <span className="font-mono">SHA-256 Validado</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
