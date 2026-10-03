import React, { useState, useEffect } from 'react';
import { History, Search, Filter, RefreshCw, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ActivityItem } from '../components/ActivityItem';
import { getCommandHistory } from '../services/deviceService';
import type { CommandLog } from '../types';

export const ActivityPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<CommandLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    const data = await getCommandHistory(user.id);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  const filteredLogs = logs.filter((log) => {
    const matchesDevice = filterDevice === 'all' || log.device === filterDevice;
    const matchesSearch =
      log.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.device.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDevice && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 mb-1">
            <History className="w-5 h-5" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Command History</h1>
          </div>
          <p className="text-xs text-slate-400">
            Realtime audit log of voice & manual appliance control commands
          </p>
        </div>

        <button
          onClick={loadHistory}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-2 transition-all w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands (e.g. bulb, turn on)..."
            className="w-full bg-slate-900/80 border border-slate-800 focus:border-cyan-500 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
          />
        </div>

        {/* Filter dropdown pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {['all', 'bulb', 'light', 'system'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterDevice(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                filterDevice === f
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'
              }`}
            >
              {f === 'all' ? 'All Channels' : f === 'bulb' ? 'Bulb' : f === 'light' ? 'Light' : 'System'}
            </button>
          ))}
        </div>
      </div>

      {/* Log Entries List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-20 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No matching command history found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery || filterDevice !== 'all'
              ? 'Try changing your search term or channel filter.'
              : 'Speak or tap a command on the dashboard to log activity.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <ActivityItem key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
};
