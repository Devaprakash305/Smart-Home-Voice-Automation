import React, { useState } from 'react';
import { Mic, MicOff, Sparkles, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { speakResponse, getVoiceFeedbackText } from '../services/voiceService';
import { parseVoiceCommand } from '../utils/commandParser';
import type { VoiceCommand } from '../types/command';
import { useTheme } from '../contexts/ThemeContext';

interface VoiceControlProps {
  onCommandParsed: (command: VoiceCommand) => void;
  currentState?: { bulb_state: boolean; light_state: boolean };
  isExecuting?: boolean;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({
  onCommandParsed,
  currentState,
  isExecuting = false,
}) => {
  const { voiceResponseEnabled } = useTheme();
  const [lastExecutedResponse, setLastExecutedResponse] = useState<string | null>(null);

  const handleSpeechResult = (spokenTranscript: string) => {
    if (!spokenTranscript.trim()) return;

    const parsed = parseVoiceCommand(spokenTranscript);

    if (parsed) {
      // Execute command
      onCommandParsed(parsed);

      // Generate spoken feedback
      const feedbackText = getVoiceFeedbackText(parsed.device, parsed.action, currentState);
      setLastExecutedResponse(feedbackText);
      speakResponse(feedbackText, voiceResponseEnabled);
    } else {
      const fallbackText = "Sorry, I didn't understand that command.";
      setLastExecutedResponse(fallbackText);
      speakResponse(fallbackText, voiceResponseEnabled);
    }
  };

  const {
    status,
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    reset,
  } = useVoiceRecognition(handleSpeechResult);

  const exampleCommands = [
    'Turn on the bulb',
    'Turn off the bulb',
    'Turn on the light',
    'Turn off the light',
    'Turn on both',
    'Turn off both',
    'What is the status?',
  ];

  const handlePresetCommand = (cmdText: string) => {
    reset();
    handleSpeechResult(cmdText);
  };

  const getMicLabel = () => {
    if (status === 'listening') return 'Listening...';
    if (status === 'processing') return 'Processing...';
    return 'Tap to Speak';
  };

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 glass-panel border border-slate-800/80 shadow-2xl">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Title */}
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent">
            Voice Assistant Control
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md">
          Tap the microphone button and speak a command to control your 2-channel smart home system.
        </p>

        {/* Browser Unsupported Warning Banner */}
        {!isSupported && (
          <div className="mt-6 w-full max-w-md p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center space-x-3 text-left">
            <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
            <p>Voice recognition is not supported in this browser.</p>
          </div>
        )}

        {/* Microphone Button Container */}
        {isSupported && (
          <div className="my-8 relative flex items-center justify-center">
            {/* Listening Wave Animations */}
            {isListening && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-emerald-500/20 animate-wave-ring" />
                <div className="absolute w-44 h-44 rounded-full bg-cyan-500/10 animate-wave-ring delay-150" />
              </>
            )}

            <button
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              disabled={isExecuting || status === 'processing'}
              aria-label={isListening ? 'Stop Listening' : 'Start Voice Control'}
              className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 ${
                isListening
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 animate-mic-pulse scale-105 shadow-emerald-500/50'
                  : status === 'processing'
                  ? 'bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white shadow-cyan-500/30'
                  : 'bg-gradient-to-tr from-cyan-500 via-emerald-500 to-teal-600 text-white hover:brightness-110 shadow-cyan-500/30'
              }`}
            >
              {status === 'processing' ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : isListening ? (
                <Mic className="w-10 h-10 animate-pulse" />
              ) : (
                <MicOff className="w-10 h-10 opacity-90" />
              )}
              <span className="text-[11px] font-bold mt-1 tracking-tight">
                {getMicLabel()}
              </span>
            </button>
          </div>
        )}

        {/* Transcript / Status Machine Display */}
        <div className="w-full max-w-lg min-h-[56px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {isListening && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full p-3 rounded-2xl bg-slate-900/80 border border-emerald-500/40 text-emerald-300 text-sm font-medium flex items-center justify-center space-x-2"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <p className="truncate max-w-xs sm:max-w-md">
                  {transcript ? `"${transcript}"` : 'Listening for your voice command...'}
                </p>
              </motion.div>
            )}

            {status === 'processing' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full p-3 rounded-2xl bg-slate-900/80 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm font-medium flex items-center justify-center space-x-2"
              >
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Processing speech command...</span>
              </motion.div>
            )}

            {(status === 'success' || (!isListening && transcript)) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-200 text-xs sm:text-sm font-medium space-y-1"
              >
                {transcript && (
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-slate-400">Recognized:</span>
                    <span className="text-cyan-300 font-semibold">"{transcript}"</span>
                  </div>
                )}
                {lastExecutedResponse && (
                  <p className="text-emerald-400 text-xs font-semibold">{lastExecutedResponse}</p>
                )}
              </motion.div>
            )}

            {status === 'error' && error && !isListening && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-center space-x-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Voice Command Chips */}
        <div className="mt-6 w-full pt-4 border-t border-slate-800/60">
          <div className="flex items-center justify-center space-x-1 text-xs text-slate-400 mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Supported Voice Commands (Tap to test):</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleCommands.map((cmd) => (
              <button
                key={cmd}
                onClick={() => handlePresetCommand(cmd)}
                disabled={isExecuting || status === 'listening'}
                className="px-3 py-1.5 rounded-full bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 hover:text-cyan-300 border border-slate-700/60 text-xs font-medium transition-all active:scale-95"
              >
                "{cmd}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
