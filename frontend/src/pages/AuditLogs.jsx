import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { History, Search, RefreshCw } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showToast } = useAuth();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/reports/audit');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      showToast('Failed to retrieve system audit logs.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(
    (log) =>
      log.user_name.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">System Audit logs</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Immutable record trail tracking security events, customer profile edits, and safety overrides.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-650 hover:text-slate-800 transition-all cursor-pointer shadow-sm flex items-center justify-center"
          title="Refresh Logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-premium">
        <div className="relative w-full">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter audit logs by operator, action, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium overflow-hidden">
        {loading ? (
          <div className="p-16 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            No audit events found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Log ID</th>
                  <th className="px-6 py-4">Triggered By</th>
                  <th className="px-6 py-4">Action Type</th>
                  <th className="px-6 py-4">Audit Details</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 text-sm transition-all">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">#{log.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-350">{log.user_name}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        log.action.includes('DELETE') || log.action.includes('CANCEL')
                          ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-350'
                          : log.action.includes('OVERRIDE') || log.action.includes('APPROVE')
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-750 dark:bg-slate-850 dark:text-slate-300'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 leading-normal max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
