import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Server, Cpu, ShieldCheck } from 'lucide-react';
import { StatusCard } from '../components/StatusCard';
import { getDeviceStatus } from '../services/deviceService';
import type { SystemStatus } from '../types/device';

export const StatusPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>({
    online: false,
    lastSeen: null,
    device: 'ESP8266',
    esp8266: 'Checking...',
    cloudflare: 'Checking...',
    supabase: 'Connected',
    voice: 'Ready',
  });
  const [loading, setLoading] = useState<boolean>(false);

  const refreshTelemetry = async () => {
    setLoading(true);
    const telemetry = await getDeviceStatus();
    setStatus(telemetry);
    setLoading(false);
  };

  useEffect(() => {
    refreshTelemetry();
    const interval = window.setInterval(refreshTelemetry, 5000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 mb-1">
            <Activity className="w-5 h-5" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">System Status</h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time telemetry for the ESP8266, Cloudflare Worker API, Supabase, and device states.
          </p>
        </div>

        <button
          onClick={refreshTelemetry}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-2 transition-all w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      <StatusCard status={status} deviceName="Smart Home ESP8266" />

      <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 space-y-4">
        <div className="flex items-center space-x-2 text-cyan-400">
          <Server className="w-5 h-5" />
          <h3 className="font-bold text-base text-slate-100">Hardware Signal Flow</h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          The ESP8266 polls the backend every 3 seconds at the device state endpoint. The Cloudflare Worker updates the ESP8266 heartbeat timestamp whenever a valid state request is received, and the React app reads the live status through the status endpoint without relying on a hardcoded fallback.
        </p>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300 space-y-2">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
            <span>ESP8266 Poll</span>
            <span className="text-emerald-400">GET /device/state</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
            <span>Heartbeat</span>
            <span className="text-cyan-400">GET /device/status</span>
          </div>
          <div>
            <span className="text-slate-400">Status Example:</span>
            <pre className="text-cyan-300 mt-1 bg-slate-950 p-2 rounded-lg text-[11px] overflow-x-auto">
{JSON.stringify({ online: status.online, last_seen: status.lastSeen, device: status.device }, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            {status.online
              ? 'ESP8266 is connected and reporting a valid heartbeat.'
              : 'ESP8266 is offline or not reporting a fresh heartbeat yet.'}
          </span>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 space-y-3">
        <div className="flex items-center space-x-2 text-indigo-400">
          <Cpu className="w-5 h-5" />
          <h3 className="font-bold text-base text-slate-100">Hardware Layout</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Microcontroller</span>
            <span className="font-semibold text-slate-200">ESP8266</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Relay 1</span>
            <span className="font-semibold text-slate-200">Bulb • GPIO5</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Relay 2</span>
            <span className="font-semibold text-slate-200">Light • GPIO4</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Database</span>
            <span className="font-semibold text-slate-200">Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
};
