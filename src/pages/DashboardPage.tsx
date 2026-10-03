import React, { useState, useEffect, useCallback } from 'react';
import { Power, Cloud, Cpu, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BulbCard } from '../components/BulbCard';
import { VoiceControl } from '../components/VoiceControl';
import type { ToastMessage } from '../components/Toast';
import {
  getUserDevice,
  createDefaultDevice,
  getDeviceState,
  controlBulb,
  getDeviceStatus,
  subscribeToDeviceState,
} from '../services/deviceService';
import type { Device, DeviceState, VoiceCommand, SystemStatus } from '../types';

interface DashboardPageProps {
  onShowToast: (toast: ToastMessage) => void;
  onNavigateTab?: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onShowToast }) => {
  const { profile, user } = useAuth();

  const [device, setDevice] = useState<Device | null>(null);
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<SystemStatus>({
    online: false,
    lastSeen: null,
    device: 'ESP8266',
    esp8266: 'Checking...',
    cloudflare: 'Checking...',
    supabase: 'Connected',
    voice: 'Ready',
    bulbState: false,
    lightState: false,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOperating, setIsOperating] = useState<boolean>(false);
  const [noDeviceError, setNoDeviceError] = useState<boolean>(false);

  // Time based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Poll real backend status every 3-5 seconds
  const fetchStatus = useCallback(async () => {
    const status = await getDeviceStatus();
    setDeviceStatus(status);
  }, []);

  // Synchronize initial system health & device state from Supabase / Backend
  const loadDeviceData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    let userDev = await getUserDevice(user.id);

    if (!userDev) {
      setNoDeviceError(true);
      setIsLoading(false);
      return;
    }

    setNoDeviceError(false);
    setDevice(userDev);

    const [states, status] = await Promise.all([
      getDeviceState(userDev.id),
      getDeviceStatus(),
    ]);

    setDeviceState(states);
    setDeviceStatus(status);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadDeviceData();
  }, [loadDeviceData]);

  // Periodic heartbeat polling every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Subscribe to Supabase Realtime changes for device_states
  useEffect(() => {
    if (!device?.id) return;
    const unsubscribe = subscribeToDeviceState(device.id, (newState) => {
      setDeviceState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, [device?.id]);

  // Handle manual setup trigger if no device exists
  const handleProvisionDevice = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const newDev = await createDefaultDevice(user.id);
      setDevice(newDev);
      setNoDeviceError(false);
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'success',
        title: 'Device Connected!',
        description: 'Smart Home ESP8266 device initialized.',
      });
      await loadDeviceData();
    } catch (err) {
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'error',
        title: 'Setup Failed',
        description: 'Unable to initialize smart device.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle single device (bulb or light)
  const handleToggleDevice = async (bulbId: 'bulb' | 'light', targetState: boolean) => {
    if (!user || !device || !deviceState) return;

    setIsOperating(true);
    const action = targetState ? 'on' : 'off';
    const targetName = bulbId === 'bulb' ? 'Bulb' : 'Light';

    const result = await controlBulb(user.id, device.id, bulbId, action);

    if (result.success && result.newState) {
      setDeviceState((current) => {
        const nextState: DeviceState = current
          ? {
              ...current,
              bulb_state: bulbId === 'bulb' ? result.newState!.bulb_state : current.bulb_state,
              light_state: bulbId === 'light' ? result.newState!.light_state : current.light_state,
              updated_at: new Date().toISOString(),
            }
          : {
              id: `${device.id}-state`,
              device_id: device.id,
              bulb_state: bulbId === 'bulb' ? result.newState!.bulb_state : false,
              light_state: bulbId === 'light' ? result.newState!.light_state : false,
              updated_at: new Date().toISOString(),
            };

        return nextState;
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
    if (!user || !device) return;

    setIsOperating(true);
    const action = targetState ? 'on' : 'off';
    const result = await controlBulb(user.id, device.id, 'all', action);

    if (result.success && result.newState) {
      setDeviceState((current) => {
        const nextState: DeviceState = current
          ? {
              ...current,
              bulb_state: result.newState!.bulb_state,
              light_state: result.newState!.light_state,
              updated_at: new Date().toISOString(),
            }
          : {
              id: `${device.id}-state`,
              device_id: device.id,
              bulb_state: result.newState!.bulb_state,
              light_state: result.newState!.light_state,
              updated_at: new Date().toISOString(),
            };

        return nextState;
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
  const handleCommandParsed = async (command: VoiceCommand) => {
    if (!user || !device) return;

    if (command.action === 'status') {
      const statusMessage = `ESP8266 is ${deviceStatus.online ? 'Online' : 'Offline'}. Bulb is ${
        deviceState?.bulb_state ? 'ON' : 'OFF'
      } and Light is ${deviceState?.light_state ? 'ON' : 'OFF'}.`;
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'info',
        title: 'System Status',
        description: statusMessage,
      });
      return;
    }

    setIsOperating(true);
    const result = await controlBulb(
      user.id,
      device.id,
      command.device,
      command.action,
      command.originalText
    );

    if (result.success && result.newState) {
      setDeviceState((current) => {
        const nextState: DeviceState = current
          ? {
              ...current,
              bulb_state: command.device === 'bulb' ? result.newState!.bulb_state : current.bulb_state,
              light_state: command.device === 'light' ? result.newState!.light_state : current.light_state,
              updated_at: new Date().toISOString(),
            }
          : {
              id: `${device.id}-state`,
              device_id: device.id,
              bulb_state: command.device === 'bulb' ? result.newState!.bulb_state : false,
              light_state: command.device === 'light' ? result.newState!.light_state : false,
              updated_at: new Date().toISOString(),
            };

        return nextState;
      });
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'success',
        title: `Voice Command Executed`,
        description: `Target: ${command.device.toUpperCase()} → ${command.action.toUpperCase()}`,
      });
    } else {
      onShowToast({
        id: `toast-${Date.now()}`,
        type: 'error',
        title: 'Voice Command Failed',
        description: result.message || 'Unable to connect to smart home backend.',
      });
    }

    setIsOperating(false);
  };

  if (noDeviceError) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="p-8 glass-panel rounded-3xl border border-slate-800">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-slate-100">No smart device connected yet.</h2>
          <p className="text-sm text-slate-400 mt-2 mb-6">
            You don't have a 2-channel ESP8266 device assigned to your profile yet. Click below to provision your smart home hardware controller.
          </p>
          <button
            onClick={handleProvisionDevice}
            disabled={isLoading}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all"
          >
            {isLoading ? 'Provisioning Device...' : 'Connect Smart Home Device'}
          </button>
        </div>
      </div>
    );
  }

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
                {deviceStatus.online ? '🟢 Device Online' : '🔴 Device Offline'}
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
              disabled={isOperating || isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Power className="w-3.5 h-3.5 text-emerald-400" />
              <span>Turn All On</span>
            </button>
            <button
              onClick={() => handleToggleAll(false)}
              disabled={isOperating || isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold text-xs flex items-center space-x-1.5 transition-all active:scale-95"
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
            isOn={Boolean(deviceState?.bulb_state)}
            onToggle={handleToggleDevice}
            isLoading={isOperating}
            accentColor="amber"
          />

          <BulbCard
            bulbId="light"
            title="Light"
            subtitle="Relay 2 • GPIO4 • ESP8266"
            isOn={Boolean(deviceState?.light_state)}
            onToggle={handleToggleDevice}
            isLoading={isOperating}
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
      />
    </div>
  );
};
