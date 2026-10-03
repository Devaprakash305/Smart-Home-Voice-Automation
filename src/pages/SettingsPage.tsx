import React, { useState } from 'react';
import { Settings, User, Sun, Moon, Volume2, VolumeX, LogOut, Key, Save, Check, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import type { ToastMessage } from '../components/Toast';

interface SettingsPageProps {
  onShowToast: (toast: ToastMessage) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onShowToast }) => {
  const { profile, user, signOut } = useAuth();
  const { theme, toggleTheme, voiceResponseEnabled, toggleVoiceResponse } = useTheme();

  const [apiUrl, setApiUrl] = useState<string>(
    import.meta.env.VITE_API_BASE_URL || localStorage.getItem('sh_api_override') || ''
  );
  const [savedApi, setSavedApi] = useState<boolean>(false);

  const displayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User Profile';
  const displayEmail = profile?.email || user?.email || 'Not logged in';

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sh_api_override', apiUrl);
    setSavedApi(true);
    setTimeout(() => setSavedApi(false), 2000);
    onShowToast({
      id: `toast-${Date.now()}`,
      type: 'success',
      title: 'API Endpoint Saved',
      description: apiUrl ? `Backend target set to ${apiUrl}` : 'Backend target cleared. Use the configured environment value.',
    });
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800/80">
        <div className="flex items-center space-x-3 text-cyan-400 mb-1">
          <Settings className="w-6 h-6" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Settings</h1>
        </div>
        <p className="text-xs text-slate-400">
          Profile information, theme appearance, voice response, and backend API integration
        </p>
      </div>

      {/* User Profile */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 space-y-4">
        <div className="flex items-center space-x-2 text-slate-200 border-b border-slate-800 pb-3">
          <User className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-base">User Profile</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Full Name</label>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 font-semibold text-slate-200">
              {displayName}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Email Address</label>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs text-slate-200 truncate">
              {displayEmail}
            </div>
          </div>
        </div>
      </div>

      {/* Appearance & Voice Settings */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/60 text-amber-400">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Appearance Theme</h4>
              <p className="text-xs text-slate-400">
                Currently using <span className="font-semibold text-cyan-300 capitalize">{theme}</span> mode
              </p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all border border-slate-700/60"
          >
            Switch to {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/60 text-emerald-400">
              {voiceResponseEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-rose-400" />}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Spoken Voice Feedback</h4>
              <p className="text-xs text-slate-400">
                Speak audio responses using browser SpeechSynthesis
              </p>
            </div>
          </div>

          <button
            onClick={toggleVoiceResponse}
            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all border ${
              voiceResponseEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            {voiceResponseEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Backend Integration */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 space-y-4">
        <div className="flex items-center space-x-2 text-slate-200 border-b border-slate-800 pb-3">
          <Key className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-base">Backend Integration</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400">Device Name</div>
            <div className="mt-1 font-semibold text-slate-100">Smart Home ESP8266</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400">Backend</div>
            <div className="mt-1 font-semibold text-emerald-300">Connected</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400">Bulb</div>
            <div className="mt-1 font-semibold text-slate-100">Bulb</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400">Light</div>
            <div className="mt-1 font-semibold text-slate-100">Light</div>
          </div>
        </div>

        <form onSubmit={handleSaveApiUrl} className="space-y-3 pt-2">
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              API Base URL (Leave empty to use the environment configuration)
            </label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://your-worker.workers.dev"
              className="w-full bg-slate-900/80 border border-slate-800 focus:border-cyan-500 rounded-xl py-2.5 px-4 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-2 transition-all shadow-md active:scale-95"
          >
            {savedApi ? <Check className="w-4 h-4 text-slate-950" /> : <Save className="w-4 h-4" />}
            <span>{savedApi ? 'Saved!' : 'Save API Base URL'}</span>
          </button>
        </form>
      </div>

      {/* Application Meta Info & Logout */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-400">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Application Version</h4>
            <p className="text-xs text-slate-400 font-mono">v1.0.0 (Capstone Release)</p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center space-x-2 transition-all active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};
