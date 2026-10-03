import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  Device,
  DeviceState,
  SystemStatus,
  ControlBulbResult,
} from '../types/device';
import type { CommandLog, TargetDevice, TargetAction } from '../types/command';

const DEFAULT_API_BASE_URL = 'https://smart-home-api.devaprakashsaravanan2007.workers.dev';
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  localStorage.getItem('sh_api_override') ||
  DEFAULT_API_BASE_URL
).replace(/\/+$/, '');

function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function fetchHardwareState(): Promise<{ bulb1: boolean; bulb2: boolean } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    let res: Response;
    try {
      res = await fetch(buildApiUrl('/device/state'), { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      return null;
    }

    const payload = await res.json();
    const bulb1 = payload?.bulb1_state ?? payload?.bulb1;
    const bulb2 = payload?.bulb2_state ?? payload?.bulb2;
    if (typeof bulb1 === 'boolean' && typeof bulb2 === 'boolean') {
      return { bulb1, bulb2 };
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch real hardware state:', error);
    return null;
  }
}

// Cache for active session
let localDeviceCache: Device | null = null;
let localLogsCache: CommandLog[] = [];

/**
 * 1. REAL DEVICE STATUS & HEARTBEAT
 * Uses the Worker-reported heartbeat status; API reachability is tracked separately.
 */
export async function getDeviceStatus(): Promise<SystemStatus> {
  const isVoiceReady =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  let backendOk = false;
  let statusAvailable = false;
  let esp8266Online = false;
  let lastSeenTime: string | null = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    let res: Response;
    try {
      res = await fetch(buildApiUrl('/device/status'), { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    backendOk = res.ok;
    if (res.ok) {
      const data = await res.json();
      statusAvailable = typeof data.online === 'boolean';
      esp8266Online = statusAvailable && data.online === true;
      lastSeenTime = data.last_seen ?? data.lastSeen ?? null;
    }
  } catch (error) {
    console.warn('Cloudflare device status request failed:', error);
  }

  return {
    online: esp8266Online,
    lastSeen: lastSeenTime,
    device: 'ESP8266',
    esp8266: statusAvailable ? (esp8266Online ? 'Online' : 'Offline') : 'Device Status Unavailable',
    cloudflare: backendOk ? 'Connected' : 'Error',
    supabase: isSupabaseConfigured ? 'Connected' : 'Error',
    voice: isVoiceReady ? 'Ready' : 'Unsupported',
  };
}

/**
 * Helper to get current authenticated user ID from Supabase
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch (e) {
    return null;
  }
}

/**
 * 2. FIND OR CREATE USER DEVICE
 */
export async function getUserDevice(userId?: string): Promise<Device | null> {
  const authUserId = (await getAuthenticatedUserId()) || userId;
  if (!authUserId) return localDeviceCache;

  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', authUserId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase getUserDevice fetch warning:', error.message || error);
    }

    if (data) {
      localDeviceCache = data;
      return data;
    }

    return await initializeDevice(authUserId);
  } catch (err) {
    console.error('Failed to get user device:', err);
    return localDeviceCache;
  }
}

export async function createDefaultDevice(userId: string): Promise<Device> {
  return initializeDevice(userId);
}

export async function initializeDevice(userId: string): Promise<Device> {
  const authUserId = (await getAuthenticatedUserId()) || userId;
  if (!authUserId || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured for device initialization.');
  }

  const { data: existing, error: lookupError } = await supabase
    .from('devices')
    .select('*')
    .eq('user_id', authUserId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) {
    localDeviceCache = existing;
    return existing;
  }

  const { data, error } = await supabase
    .from('devices')
    .insert([{
      user_id: authUserId,
      device_name: 'Smart Home ESP8266',
      device_type: 'ESP8266',
      thing_id: null,
    }])
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Supabase did not return the created device.');
  localDeviceCache = data;
  return data;
}

export async function getDeviceState(deviceId?: string): Promise<DeviceState | null> {
  const hardwareState = await fetchHardwareState();
  if (!hardwareState) return null;

  const stateDeviceId = deviceId || 'esp8266';
  return {
    id: stateDeviceId,
    device_id: stateDeviceId,
    bulb_state: hardwareState.bulb1,
    light_state: hardwareState.bulb2,
    updated_at: new Date().toISOString(),
  };
}

/**
 * 4. REAL HARDWARE CONTROL SERVICE
 * Sends command POST /device/control to Cloudflare Worker.
 * Persists Supabase state and command history only when an assigned device ID is provided.
 */
export async function controlBulb(
  userId: string,
  deviceId: string | null,
  targetDevice: TargetDevice,
  action: TargetAction,
  commandText?: string
): Promise<ControlBulbResult> {
  const authUserId = (await getAuthenticatedUserId()) || userId;
  const liveStatus = await getDeviceStatus();
  if (liveStatus.esp8266 === 'Device Status Unavailable') {
    return { success: false, message: 'Device Status Unavailable' };
  }
  if (!liveStatus.online) {
    return {
      success: false,
      message: 'ESP8266 is offline. Please power on the device and connect it to Wi-Fi.',
    };
  }

  const targetDeviceId = deviceId || '';

  const currentState = await getDeviceState(targetDeviceId || undefined);
  if (!currentState) {
    return { success: false, message: 'Unable to read the current hardware state.' };
  }

  let newB = currentState.bulb_state;
  let newL = currentState.light_state;

  if (targetDevice === 'bulb') {
    newB = action === 'on';
  } else if (targetDevice === 'light') {
    newL = action === 'on';
  } else if (targetDevice === 'all') {
    newB = action === 'on';
    newL = action === 'on';
  }

  let displayCommand = commandText;
  if (!displayCommand) {
    if (targetDevice === 'bulb') {
      displayCommand = action === 'on' ? 'Turn on the bulb' : 'Turn off the bulb';
    } else if (targetDevice === 'light') {
      displayCommand = action === 'on' ? 'Turn on the light' : 'Turn off the light';
    } else if (targetDevice === 'all') {
      displayCommand = action === 'on' ? 'Turn on both' : 'Turn off both';
    } else {
      displayCommand = 'What is the status?';
    }
  }

  let apiMessage = '';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(buildApiUrl('/device/control'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device: targetDevice, action }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Backend responded with status ${res.status}`);
    }

    const responseText = await res.text();
    if (responseText) {
      let responseData: Record<string, unknown>;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new Error('Worker did not return a command acknowledgement.');
      }
      if (responseData.success === false || responseData.ok === false || responseData.error) {
        throw new Error(String(responseData.error || responseData.message || 'Worker rejected the command.'));
      }
      apiMessage = typeof responseData.message === 'string' ? responseData.message : '';
    }

    const refreshedState = await fetchHardwareState();
    if (!refreshedState) {
      return { success: false, message: 'Unable to refresh the real device state.' };
    }
    newB = refreshedState.bulb1;
    newL = refreshedState.bulb2;

    if (isSupabaseConfigured && targetDeviceId) {
      try {
        const { data: updatedState, error: stateErr } = await supabase
          .from('device_states')
          .update({
            bulb1_state: newB,
            bulb2_state: newL,
            updated_at: new Date().toISOString(),
          })
          .eq('device_id', targetDeviceId)
          .select('device_id')
          .maybeSingle();

        if (stateErr || !updatedState) {
          await supabase.from('device_states').upsert(
            {
              device_id: targetDeviceId,
              bulb1_state: newB,
              bulb2_state: newL,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'device_id' }
          );
        }
      } catch (err) {
        console.error('Error updating device_states in Supabase:', err);
      }
    }

    if (action !== 'status' && targetDeviceId) {
      await saveCommand(authUserId, targetDeviceId, displayCommand, targetDevice, action, 'success');
    }

    return {
      success: true,
      message: apiMessage || 'Hardware command acknowledged.',
      newState: {
        bulb_state: newB,
        light_state: newL,
      },
    };
  } catch (error) {
    console.error('Backend control API error:', error);
    return {
      success: false,
      message: 'Backend Offline',
    };
  }
}

export async function setDeviceState(
  userId: string,
  deviceId: string,
  bulbState: boolean,
  lightState: boolean
): Promise<ControlBulbResult> {
  const action = bulbState && lightState ? 'on' : 'off';
  return controlBulb(userId, deviceId, 'all', action);
}

export async function turnOnBulb(userId: string, deviceId: string): Promise<ControlBulbResult> {
  return controlBulb(userId, deviceId, 'bulb', 'on', 'Turn on the bulb');
}

export async function turnOffBulb(userId: string, deviceId: string): Promise<ControlBulbResult> {
  return controlBulb(userId, deviceId, 'bulb', 'off', 'Turn off the bulb');
}

export async function turnOnLight(userId: string, deviceId: string): Promise<ControlBulbResult> {
  return controlBulb(userId, deviceId, 'light', 'on', 'Turn on the light');
}

export async function turnOffLight(userId: string, deviceId: string): Promise<ControlBulbResult> {
  return controlBulb(userId, deviceId, 'light', 'off', 'Turn off the light');
}

export async function turnAllOn(userId: string, deviceId: string): Promise<ControlBulbResult> {
  return controlBulb(userId, deviceId, 'all', 'on', 'Turn on both');
}

export async function turnAllOff(userId: string, deviceId: string): Promise<ControlBulbResult> {
  return controlBulb(userId, deviceId, 'all', 'off', 'Turn off both');
}

/**
 * 5. SAVE COMMAND HISTORY TO SUPABASE
 */
export async function saveCommand(
  userId: string,
  deviceId: string,
  commandText: string,
  device: TargetDevice,
  action: TargetAction,
  status: string = 'success'
): Promise<CommandLog> {
  const authUserId = (await getAuthenticatedUserId()) || userId;

  const newLog: CommandLog = {
    id: crypto.randomUUID(),
    user_id: authUserId,
    device_id: deviceId,
    command: commandText,
    device,
    action,
    created_at: new Date().toISOString(),
    status,
  };

  localLogsCache.unshift(newLog);

  if (isSupabaseConfigured && authUserId && deviceId) {
    try {
      const commandPayload = {
        user_id: authUserId,
        device_id: deviceId,
        command: commandText,
        device,
        action,
        created_at: newLog.created_at,
      };

      const { data, error } = await supabase
        .from('commands')
        .insert([commandPayload])
        .select()
        .maybeSingle();

      if (error) {
        console.error('Supabase commands insert error:', error.message || error);
      } else if (data) {
        return { ...data, status };
      }
    } catch (err) {
      console.error('Error saving command to Supabase:', err);
    }
  }

  return newLog;
}

/**
 * 6. FETCH REAL COMMAND HISTORY FROM SUPABASE
 */
export async function getCommandHistory(userId?: string): Promise<CommandLog[]> {
  const authUserId = (await getAuthenticatedUserId()) || userId;
  if (!authUserId) return localLogsCache;

  if (!isSupabaseConfigured) {
    return localLogsCache;
  }

  try {
    const { data, error } = await supabase
      .from('commands')
      .select('*')
      .eq('user_id', authUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase getCommandHistory error:', error.message || error);
      return localLogsCache;
    }

    if (data && data.length > 0) {
      localLogsCache = data.map((item: any) => ({
        ...item,
        status: item.status || 'success',
      }));
      return localLogsCache;
    }
  } catch (err) {
    console.error('Error fetching command history:', err);
  }

  return localLogsCache;
}
