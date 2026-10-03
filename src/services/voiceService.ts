import type { TargetDevice, TargetAction } from '../types/command';

/**
 * Checks if SpeechSynthesis API is supported by browser.
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Speaks the given text using browser SpeechSynthesis API.
 */
export function speakResponse(text: string, enabled: boolean = true): void {
  if (!enabled || !isSpeechSynthesisSupported() || !text) return;

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Alex'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis playback error:', err);
  }
}

/**
 * Cancels active speech synthesis.
 */
export function cancelSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Generates spoken response text for structured voice commands using Bulb and Light.
 */
export function getVoiceFeedbackText(
  device: TargetDevice,
  action: TargetAction,
  currentState?: { bulb_state: boolean; light_state: boolean },
  isOnline: boolean = true
): string {
  if (action === 'status') {
    if (!isOnline) {
      return 'Your smart home device is currently offline.';
    }
    if (currentState) {
      const bState = currentState.bulb_state ? 'on' : 'off';
      const lState = currentState.light_state ? 'on' : 'off';
      return `The bulb is currently ${bState} and the light is currently ${lState}.`;
    }
    return 'Your smart home device is online.';
  }

  if (device === 'bulb') {
    return action === 'on' ? 'The bulb has been turned on.' : 'The bulb has been turned off.';
  }

  if (device === 'light') {
    return action === 'on' ? 'The light has been turned on.' : 'The light has been turned off.';
  }

  if (device === 'all') {
    return action === 'on'
      ? 'Both the bulb and the light have been turned on.'
      : 'Both the bulb and the light have been turned off.';
  }

  return `Command executed for ${device}.`;
}
