import React from 'react';
import { LayoutDashboard, Mic, History, Activity, Settings } from 'lucide-react';

interface BottomNavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onTriggerVoice?: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onSelectTab,
  onTriggerVoice,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass-panel border-t border-slate-800/80 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center w-16 h-full transition-all ${
            currentTab === 'dashboard' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => onSelectTab('activity')}
          className={`flex flex-col items-center justify-center w-16 h-full transition-all ${
            currentTab === 'activity' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Activity</span>
        </button>

        {/* Central Voice Shortcut Mic Button */}
        <div className="relative -top-4">
          <button
            onClick={() => {
              onSelectTab('dashboard');
              if (onTriggerVoice) onTriggerVoice();
            }}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-white shadow-xl shadow-cyan-500/30 ring-4 ring-slate-900 active:scale-95 transition-transform"
            aria-label="Voice Command"
          >
            <Mic className="w-6 h-6 animate-pulse" />
          </button>
        </div>

        <button
          onClick={() => onSelectTab('status')}
          className={`flex flex-col items-center justify-center w-16 h-full transition-all ${
            currentTab === 'status' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Status</span>
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center justify-center w-16 h-full transition-all ${
            currentTab === 'settings' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Settings</span>
        </button>
      </div>
    </nav>
  );
};
