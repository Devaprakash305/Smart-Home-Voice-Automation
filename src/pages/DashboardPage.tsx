import React, { useState, useEffect, useCallback } from 'react';
import { Power, Cloud, Cpu, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BulbCard } from '../components/BulbCard';
import { VoiceControl } from '../components/VoiceControl';
import { getVoiceFeedbackText } from '../services/voiceService';
import type { ToastMessage } from '../components/Toast';
import {
  getDeviceState,
  controlBulb,
  getDeviceStatus,
} from '../services/deviceService';
import type { DeviceState, VoiceCommand, SystemStatus } from '../types';

interface DashboardPageProps {
  onShowToast: (toast: ToastMessage) => void;
  onNavigateTab?: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onShowToast }) => {
  const { profile, user } = useAuth();

  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<SystemStatus>({
    online: false,
    lastSeen: null,
    device: 'ESP8266',
    esp8266: 'Checking...',
    cloudflare: 'Checking...',
    supabase: 'Connected',
    voice: 'Ready',
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOperating, setIsOperating] = useState<boolean>(false);
  // Time based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Poll the authoritative heartbeat and the live relay states every five seconds.
  const fetchStatus = useCallback(async () => {
    const [status, liveState] = await Promise.all([
      getDeviceStatus(),
      getDeviceState(),
    ]);
    setDeviceStatus(status);
    setDeviceState(liveState);
    setIsLoading(false);
  }, []);

  // Device presence comes from the hardware heartbeat, not a Supabase assignment.
  const loadDeviceData = useCallback(async () => {
    setIsLoading(true);
    await fetchStatus();
  }, [fetchStatus]);

  // Keep the dashboard synchronized with the real hardware every five seconds.
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Toggle single device (bulb or light)
  const handleToggleDevice = async (bulbId: 'bulb' | 'light', targetState: boolean) => {
    if (!user) return;
    if (!deviceStatus.online) {
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'error',
        title: 'Device Unavailable',
        description: deviceStatus.esp8266 === 'Device Status Unavailable'
          ? 'Device Status Unavailable'
          : deviceStatus.esp8266 === 'Checking...'
            ? 'Checking device status...'
            : 'ESP8266 is offline. Please power on the device and connect it to Wi-Fi.',
      });
      return;
    }

    setIsOperating(true);
    const action = targetState ? 'on' : 'off';
    const targetName = bulbId === 'bulb' ? 'Bulb' : 'Light';

    const result = await controlBulb(user.id, null, bulbId, action);

    if (result.success && result.newState) {
      const newState = result.newState;
      const updatedAt = new Date().toISOString();
      setDeviceState((current) => {
        return {
          id: current?.id ?? 'esp8266',
          device_id: current?.device_id ?? 'esp8266',
          ...newState,
          updated_at: updatedAt,
        };
      });
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'success',
        title: `${targetName} turned ${action.toUpperCase()}`,
        description: `ESP8266 updated Relay ${bulbId === 'bulb' ? '1 (GPIO5)' : '2 (GPIO4)'}.`,
      });
    } else {
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'error',
        title: `${targetName} Control Failed`,
        description: result.message || 'Unable to connect to smart home backend.',
      });
    }

    setIsOperating(false);
  };

  // Quick Action: Turn All On / Turn All Off
  const handleToggleAll = async (targetState: boolean) => {
    if (!user) return;
    if (!deviceStatus.online) {
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'error',
        title: 'Device Unavailable',
        description: deviceStatus.esp8266 === 'Device Status Unavailable'
          ? 'Device Status Unavailable'
          : deviceStatus.esp8266 === 'Checking...'
            ? 'Checking device status...'
            : 'ESP8266 is offline. Please power on the device and connect it to Wi-Fi.',
      });
      return;
    }

    setIsOperating(true);
    const action = targetState ? 'on' : 'off';
    const result = await controlBulb(user.id, null, 'all', action);

    if (result.success && result.newState) {
      const newState = result.newState;
      const updatedAt = new Date().toISOString();
      setDeviceState((current) => {
        return {
          id: current?.id ?? 'esp8266',
          device_id: current?.device_id ?? 'esp8266',
          ...newState,
          updated_at: updatedAt,
        };
      });
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'success',
        title: `All Appliances turned ${action.toUpperCase()}`,
        description: `ESP8266 toggled both relays.`,
      });
    } else {
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'error',
        title: 'Master Control Failed',
        description: result.message || 'Unable to connect to smart home backend.',
      });
    }

    setIsOperating(false);
  };

  // Handle voice command execution from parser
  const handleCommandParsed = async (command: VoiceCommand): Promise<string> => {
    if (!user) return 'Smart home account is unavailable.';

    if (command.action === 'status') {
      const statusMessage = deviceStatus.esp8266 === 'Device Status Unavailable'
        ? 'Device Status Unavailable. Current bulb and light states could not be read.'
        : !deviceState
          ? `ESP8266 is ${deviceStatus.online ? 'Online' : 'Offline'}. Current bulb and light states could not be read.`
          : `ESP8266 is ${deviceStatus.online ? 'Online' : 'Offline'}. Bulb is ${deviceState.bulb_state ? 'ON' : 'OFF'} and Light is ${deviceState.light_state ? 'ON' : 'OFF'}.`;
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'info',
        title: 'System Status',
        description: statusMessage,
      });
      return statusMessage;
    }

    if (!deviceStatus.online) {
      const message = deviceStatus.esp8266 === 'Device Status Unavailable'
        ? 'Device Status Unavailable'
        : deviceStatus.esp8266 === 'Checking...'
          ? 'Checking device status...'
          : 'ESP8266 is offline. Please power on the device and connect it to Wi-Fi.';
      onShowToast({ id: `toast-${Date.now()}`, type: 'error', title: 'Device Unavailable', description: message });
      return message;
    }

    setIsOperating(true);
    const result = await controlBulb(
      user.id,
      null,
      command.device,
      command.action,
      command.originalText
    );

    if (result.success && result.newState) {
      const newState = result.newState;
      const updatedAt = new Date().toISOString();
      setDeviceState((current) => {
        return {
          id: current?.id ?? 'esp8266',
          device_id: current?.device_id ?? 'esp8266',
          ...newState,
          updated_at: updatedAt,
        };
      });
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'success',
        title: `Voice Command Executed`,
        description: `Target: ${command.device.toUpperCase()} → ${command.action.toUpperCase()}`,
      });
      setIsOperating(false);
      return getVoiceFeedbackText(command.device, command.action, {
        bulb_state: result.newState.bulb_state,
        light_state: result.newState.light_state,
      });
    } else {
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'error',
        title: 'Voice Command Failed',
        description: result.message || 'Unable to connect to smart home backend.',
      });
      setIsOperating(false);
      return result.message || 'Unable to complete the hardware command.';
    }
  };

  return (
    <div className="space-y-8 pb-24 md:pb-12">
      {/* Welcome Banner & Connection Telemetry Bar */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Production IoT Dashboard
              </span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
              {getGreeting()}, {profile?.name || 'User'}
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-medium">
              Real-time Hardware Control System
            </p>
          </div>

          {/* Connection Indicators */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80">
            {/* ESP8266 Hardware Status */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs font-medium">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-300">ESP8266:</span>
              <span className={deviceStatus.online ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {deviceStatus.esp8266 === 'Device Status Unavailable'
                  ? 'Device Status Unavailable'
                  : deviceStatus.esp8266 === 'Checking...'
                    ? 'Checking...'
                    : deviceStatus.online ? '🟢 Device Online' : '🔴 Device Offline'}
              </span>
            </div>

            {/* Cloudflare Worker API */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs font-medium">
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-300">API:</span>
              <span className={deviceStatus.cloudflare === 'Connected' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {deviceStatus.cloudflare}
              </span>
            </div>

            {/* Refresh Sync Button */}
            <button
              onClick={loadDeviceData}
              disabled={isLoading}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh status & state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {(!deviceStatus.online || !deviceState) && (
        <p role="status" className={`text-xs ${deviceStatus.online ? 'text-amber-300' : 'text-rose-300'}`}>
          {!deviceState && deviceStatus.online
            ? 'Device state unavailable. Waiting for a live response from the hardware backend.'
            : deviceStatus.esp8266 === 'Device Status Unavailable'
              ? 'Device Status Unavailable'
              : deviceStatus.esp8266 === 'Checking...'
                ? 'Checking device status...'
                : 'ESP8266 is offline. Please power on the device and connect it to Wi-Fi.'}
        </p>
      )}

      {/* Main Appliance Cards Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Smart Appliances</h2>
            <p className="text-xs text-slate-400">Physical ESP8266 2-Channel Relays</p>
          </div>

          {/* Quick All On / All Off Master Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleToggleAll(true)}
              disabled={isOperating || isLoading || !deviceStatus.online}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center space-x-1.5 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Power className="w-3.5 h-3.5 text-emerald-400" />
              <span>Turn All On</span>
            </button>
            <button
              onClick={() => handleToggleAll(false)}
              disabled={isOperating || isLoading || !deviceStatus.online}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold text-xs flex items-center space-x-1.5 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Power className="w-3.5 h-3.5 text-rose-400" />
              <span>Turn All Off</span>
            </button>
          </div>
        </div>

        {/* 2 Appliance Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BulbCard
            bulbId="bulb"
            title="Bulb"
            subtitle="Relay 1 • GPIO5 • ESP8266"
            isOn={deviceState?.bulb_state}
            onToggle={handleToggleDevice}
            isLoading={isOperating}
            controlsEnabled={deviceStatus.online}
            accentColor="amber"
          />

          <BulbCard
            bulbId="light"
            title="Light"
            subtitle="Relay 2 • GPIO4 • ESP8266"
            isOn={deviceState?.light_state}
            onToggle={handleToggleDevice}
            isLoading={isOperating}
            controlsEnabled={deviceStatus.online}
            accentColor="cyan"
          />
        </div>
      </div>

      {/* Voice Control Hero Section */}
      <VoiceControl
        onCommandParsed={handleCommandParsed}
        currentState={
          deviceState
            ? { bulb_state: deviceState.bulb_state, light_state: deviceState.light_state }
            : undefined
        }
        isExecuting={isOperating}
        deviceStatus={deviceStatus.esp8266}
      />
    </div>
  );
};
