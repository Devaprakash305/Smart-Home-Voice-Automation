import React from 'react';
import { Lightbulb, CheckCircle2, Mic } from 'lucide-react';
import type { CommandLog } from '../types';

interface ActivityItemProps {
  log: CommandLog;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ log }) => {
  const isOff = log.action === 'off';
  const isStatus = log.action === 'status';

  const getDeviceLabel = (dev: string) => {
    switch (dev) {
      case 'bulb':
        return 'Bulb';
      case 'light':
        return 'Light';
      case 'all':
        return 'Bulb + Light';
      case 'system':
        return 'System Status';
      default:
        return dev || 'Device';
    }
  };

  const getActionBadge = (action: string) => {
    if (action === 'on') {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Turned ON</span>;
    }
    if (action === 'off') {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">Turned OFF</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">Checked</span>;
  };

  const formattedDate = new Date(log.created_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="p-4 rounded-xl glass-panel border border-slate-800/80 hover:border-slate-700/80 transition-all flex items-center justify-between">
      <div className="flex items-center space-x-3.5">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isStatus
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : isOff
              ? 'bg-slate-800 text-slate-400 border border-slate-700/60'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {isStatus ? <Mic className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />}
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-semibold text-slate-100">{getDeviceLabel(log.device)}</h4>
            {getActionBadge(log.action)}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">"{log.command}"</p>
        </div>
      </div>

      <div className="text-right shrink-0 ml-4">
        <div className="flex items-center justify-end space-x-1 text-xs text-slate-400">
          <span>{formattedDate}</span>
        </div>
        <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-emerald-400 mt-0.5">
          <CheckCircle2 className="w-3 h-3" />
          <span>Success</span>
        </span>
      </div>
    </div>
  );
};
