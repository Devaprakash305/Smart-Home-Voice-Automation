import React from 'react';
import { Cpu, Cloud, Database, Mic, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { SystemStatus } from '../types/device';

interface StatusCardProps {
  status: SystemStatus;
  deviceName?: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  status,
  deviceName = 'Smart Home ESP8266',
}) => {
  const formattedLastSeen = status.lastSeen
    ? new Date(status.lastSeen).toLocaleString()
    : 'Never / No Ping';

  const items = [
    {
      id: 'esp8266',
      title: 'ESP8266 NodeMCU',
      subtitle: `Heartbeat Interval: 3s`,
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      online: status.online,
      statusText: status.esp8266,
      colorClass: status.online ? 'text-emerald-400' : status.esp8266 === 'Offline' ? 'text-rose-400' : 'text-amber-400',
    },
    {
      id: 'cloudflare',
      title: 'Cloudflare Worker API',
      subtitle: 'REST Endpoint Proxy',
      icon: <Cloud className="w-5 h-5 text-cyan-400" />,
      online: status.cloudflare === 'Connected',
      statusText: status.cloudflare,
      colorClass: status.cloudflare === 'Connected' ? 'text-emerald-400' : 'text-rose-400',
    },
    {
      id: 'supabase',
      title: 'Supabase Database',
      subtitle: 'Realtime Persistence & Auth',
      icon: <Database className="w-5 h-5 text-indigo-400" />,
      online: status.supabase === 'Connected',
      statusText: status.supabase,
      colorClass: status.supabase === 'Connected' ? 'text-emerald-400' : 'text-amber-400',
    },
    {
      id: 'voice',
      title: 'Voice Control',
      subtitle: 'Browser Web Speech API',
      icon: <Mic className="w-5 h-5 text-amber-400" />,
      online: status.voice ?? true,
      statusText: status.voice ?? true ? 'Ready' : 'Unsupported',
      colorClass: status.voice ?? true ? 'text-emerald-400' : 'text-rose-400',
    },
  ];

  return (
    <div className="rounded-2xl p-6 glass-panel border border-slate-800/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-bold text-lg text-slate-100">{deviceName}</h3>
          <p className="text-xs text-slate-400">Real Hardware Connection & System Status</p>
        </div>

        <div className="flex items-center space-x-3">
          {status.online ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>🟢 Device Online</span>
            </div>
          ) : status.esp8266 === 'Device Status Unavailable' || status.esp8266 === 'Checking...' ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <XCircle className="w-4 h-4 text-amber-400" />
              <span>{status.esp8266}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>🔴 Device Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Last Seen Information Banner */}
      <div className="mb-6 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Last ESP8266 Heartbeat:</span>
        </div>
        <span className="font-mono text-cyan-300 font-semibold">{formattedLastSeen}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
                {item.icon}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">{item.title}</h4>
                <p className="text-[11px] text-slate-400">{item.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold">
              <span className={item.colorClass}>● {item.statusText}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
