import { useState, useEffect, useRef, useCallback } from 'react';

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type VoiceRecognitionState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

export interface UseVoiceRecognitionReturn {
  status: VoiceRecognitionState;
  isListening: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
}

export function useVoiceRecognition(
  onResultCallback?: (transcript: string) => void
): UseVoiceRecognitionReturn {
  const [status, setStatus] = useState<VoiceRecognitionState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const intentionallyStoppedRef = useRef<boolean>(false);
  const latestTranscriptRef = useRef<string>('');
  const onResultCallbackRef = useRef(onResultCallback);

  // Keep callback reference updated without triggering re-initialization
  useEffect(() => {
    onResultCallbackRef.current = onResultCallback;
  }, [onResultCallback]);

  // Check Web Speech API availability on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatus('error');
      setError('Voice recognition is not supported in this browser.');
    }
  }, []);

  // Cleanup helper to safely abort previous instance
  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionallyStoppedRef.current = true;
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  const stopListening = useCallback(() => {
    intentionallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    if (status === 'listening') {
      setStatus('idle');
    }
  }, [status]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatus('error');
      setError('Voice recognition is not supported in this browser.');
      return;
    }

    // Rapid click guard: ignore start requests if currently listening or processing
    if (recognitionRef.current && status === 'listening') {
      stopListening();
      return;
    }

    // Safely clean up previous instance before starting fresh session
    cleanupRecognition();

    intentionallyStoppedRef.current = false;
    latestTranscriptRef.current = '';
    setTranscript('');
    setError(null);
    setStatus('idle');

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setStatus('listening');
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        latestTranscriptRef.current = currentTranscript;
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);

        const errCode = event.error;

        if (errCode === 'not-allowed') {
          setError('Microphone permission is required for voice control.');
          setStatus('error');
        } else if (errCode === 'no-speech') {
          setError('No speech detected. Please tap the mic and speak again.');
          setStatus('error');
        } else if (errCode === 'audio-capture') {
          setError('No microphone was found. Ensure a working microphone is connected.');
          setStatus('error');
        } else if (errCode === 'network') {
          setError('Network error occurred during voice recognition.');
          setStatus('error');
        } else if (errCode === 'aborted') {
          // Do NOT display error if recognition was intentionally stopped by user or completed
          if (!intentionallyStoppedRef.current && !latestTranscriptRef.current) {
            setError('Speech recognition was aborted. Tap the mic to try again.');
            setStatus('error');
          }
        } else {
          setError(`Voice recognition error: ${errCode}`);
          setStatus('error');
        }
      };

      recognition.onend = () => {
        const finalSpeech = latestTranscriptRef.current.trim();

        if (finalSpeech) {
          setStatus('processing');
          if (onResultCallbackRef.current) {
            onResultCallbackRef.current(finalSpeech);
          }
          setStatus('success');
        } else if (!intentionallyStoppedRef.current && !error) {
          setStatus('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Failed to start SpeechRecognition:', err);
      setError('Unable to start speech recognition. Please try tapping again.');
      setStatus('error');
    }
  }, [status, stopListening, cleanupRecognition, error]);

  const reset = useCallback(() => {
    cleanupRecognition();
    setTranscript('');
    setError(null);
    setStatus('idle');
    latestTranscriptRef.current = '';
  }, [cleanupRecognition]);

  return {
    status,
    isListening: status === 'listening',
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    reset,
  };
}
