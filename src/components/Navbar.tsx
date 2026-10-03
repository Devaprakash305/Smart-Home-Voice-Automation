import React from 'react';
import { Cpu, Sun, Moon, LogOut, Settings, Wifi } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  deviceStatus: 'Online' | 'Offline' | 'Device Status Unavailable' | 'Checking...';
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, deviceStatus }) => {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getInitials = (name?: string) => {
    if (!name) return 'SH';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isOnline = deviceStatus === 'Online';
  const statusClass = isOnline
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
    : deviceStatus === 'Device Status Unavailable' || deviceStatus === 'Checking...'
      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20';

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/60 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Smart Home
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Voice IoT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">2-Channel ESP8266 Control</p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'dashboard'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('activity')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'activity'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Activity Log
          </button>
          <button
            onClick={() => onSelectTab('status')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'status'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            System Status
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'settings'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Right Status Badges & Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Hardware Connection Indicator */}
          <div
            onClick={() => onSelectTab('status')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all ${statusClass}`}
            title={`ESP8266 ${deviceStatus}`}
          >
            <Wifi className={`w-3.5 h-3.5 ${isOnline ? 'animate-pulse text-emerald-400' : 'text-rose-400'}`} />
            <span className="hidden sm:inline font-semibold">
              {deviceStatus === 'Online'
                ? '🟢 Device Online'
                : deviceStatus === 'Offline'
                  ? '🔴 Device Offline'
                  : deviceStatus}
            </span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* User Profile Avatar */}
          <div
            onClick={() => onSelectTab('settings')}
            className="flex items-center space-x-2 cursor-pointer p-1 rounded-lg hover:bg-slate-800/50 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
              {getInitials(profile?.name)}
            </div>
            <span className="text-xs font-medium text-slate-200 hidden lg:inline max-w-[120px] truncate">
              {profile?.name || 'User'}
            </span>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => onSelectTab('settings')}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors md:hidden"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          <button
            onClick={() => signOut()}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Log Out"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
