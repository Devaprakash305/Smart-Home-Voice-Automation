import React from 'react';
import { Lightbulb, Power, Zap, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface BulbCardProps {
  bulbId: 'bulb' | 'light';
  title: string;
  subtitle: string;
  isOn: boolean;
  onToggle: (bulbId: 'bulb' | 'light', targetState: boolean) => void;
  isLoading?: boolean;
  lastUpdated?: string;
  accentColor?: 'amber' | 'cyan';
}

export const BulbCard: React.FC<BulbCardProps> = ({
  bulbId,
  title,
  subtitle,
  isOn,
  onToggle,
  isLoading = false,
  lastUpdated,
  accentColor = 'amber',
}) => {
  const isAmber = accentColor === 'amber';

  const cardGlowClass = isOn
    ? isAmber
      ? 'glow-amber border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-slate-900/80'
      : 'glow-cyan border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-slate-900/80'
    : 'border-slate-800/80 bg-slate-900/40 opacity-90 hover:opacity-100';

  const iconGlowClass = isOn
    ? isAmber
      ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/50'
      : 'bg-gradient-to-tr from-cyan-500 to-sky-400 text-slate-950 shadow-lg shadow-cyan-500/50'
    : 'bg-slate-800 text-slate-400 border border-slate-700/60';

  const badgeClass = isOn
    ? isAmber
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
    : 'bg-slate-800/80 text-slate-400 border-slate-700/50';

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={`relative overflow-hidden rounded-2xl p-6 glass-panel border transition-all duration-300 ${cardGlowClass}`}
    >
      {/* Background ambient glow */}
      {isOn && (
        <div
          className={`absolute -right-8 -top-8 w-36 h-36 rounded-full blur-3xl opacity-30 pointer-events-none ${
            isAmber ? 'bg-amber-400' : 'bg-cyan-400'
          }`}
        />
      )}

      {/* Header section with Icon & Toggle switch */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center space-x-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${iconGlowClass}`}
          >
            <Lightbulb className={`w-7 h-7 ${isOn ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-lg text-slate-100 tracking-tight">{title}</h3>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeClass}`}
              >
                {isOn ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Interactive Toggle Switch */}
        <button
          onClick={() => !isLoading && onToggle(bulbId, !isOn)}
          disabled={isLoading}
          aria-label={`Toggle ${title}`}
          aria-checked={isOn}
          role="switch"
          className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            isOn
              ? isAmber
                ? 'bg-amber-500'
                : 'bg-cyan-500'
              : 'bg-slate-700/80'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out flex items-center justify-center ${
              isOn ? 'translate-x-6' : 'translate-x-0'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${isOn ? (isAmber ? 'text-amber-600' : 'text-cyan-600') : 'text-slate-400'}`} />
          </span>
        </button>
      </div>

      {/* Info & Manual Control Action Button */}
      <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between relative z-10">
        <div className="flex items-center text-[11px] text-slate-400 space-x-1">
          <Clock className="w-3.5 h-3.5 opacity-70" />
          <span>{lastUpdated ? `Updated ${lastUpdated}` : 'Realtime hardware state'}</span>
        </div>

        <button
          onClick={() => !isLoading && onToggle(bulbId, !isOn)}
          disabled={isLoading}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow-md active:scale-95 ${
            isOn
              ? 'bg-slate-800/80 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30'
              : isAmber
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold hover:brightness-110 shadow-amber-500/20'
              : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-bold hover:brightness-110 shadow-cyan-500/20'
          }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              <span>{isOn ? `Turn OFF ${title}` : `Turn ON ${title}`}</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
