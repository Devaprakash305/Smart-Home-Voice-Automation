import type { VoiceCommand, TargetAction } from '../types/command';

/**
 * Normalizes speech text by converting to lowercase, stripping punctuation,
 * and collapsing extra spaces.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Converts speech input into a structured VoiceCommand object:
 * { device: "bulb" | "light" | "all" | "system", action: "on" | "off" | "status", originalText }
 * Returns null if the command is unrecognized.
 */
export function parseVoiceCommand(speechText: string): VoiceCommand | null {
  const normalized = normalizeText(speechText);
  if (!normalized) return null;

  // 1. Status query intent
  const statusPhrases = [
    'what is the status of the device',
    'what is the status of the lights',
    'what is the status',
    'whats the status',
    'check status',
    'status report',
    'device status',
    'system status',
    'how are the devices',
    'is the device online',
    'status'
  ];

  if (statusPhrases.some((phrase) => normalized.includes(phrase))) {
    return {
      device: 'system',
      action: 'status',
      originalText: speechText,
    };
  }

  // 2. Action determination (ON vs OFF)
  let action: TargetAction | null = null;
  const offKeywords = ['turn off', 'switch off', 'power off', 'disable', 'deactivate', 'off'];
  const onKeywords = ['turn on', 'switch on', 'power on', 'enable', 'activate', 'on'];

  if (offKeywords.some((kw) => normalized.includes(kw))) {
    action = 'off';
  } else if (onKeywords.some((kw) => normalized.includes(kw))) {
    action = 'on';
  }

  if (!action) {
    return null;
  }

  // 3. Target Device determination

  // BOTH / ALL
  const allKeywords = [
    'both',
    'all',
    'everything',
    'both of them',
    'all of them',
    'both devices',
    'all lights'
  ];

  if (allKeywords.some((kw) => normalized.includes(kw))) {
    return {
      device: 'all',
      action,
      originalText: speechText,
    };
  }

  // BULB (Relay 1)
  const bulbKeywords = [
    'the bulb',
    'bulb',
    'relay 1',
    'relay one',
    'gpio5',
    'channel 1'
  ];

  // LIGHT (Relay 2)
  const lightKeywords = [
    'the light',
    'light',
    'relay 2',
    'relay two',
    'gpio4',
    'channel 2'
  ];

  const hasBulb = bulbKeywords.some((kw) => normalized.includes(kw));
  const hasLight = lightKeywords.some((kw) => normalized.includes(kw));

  if (hasBulb && !hasLight) {
    return {
      device: 'bulb',
      action,
      originalText: speechText,
    };
  }

  if (hasLight && !hasBulb) {
    return {
      device: 'light',
      action,
      originalText: speechText,
    };
  }

  // Fallback if neither explicitly specified
  if (normalized.includes('device') || normalized.includes('appliance')) {
    return {
      device: 'all',
      action,
      originalText: speechText,
    };
  }

  return null;
}
