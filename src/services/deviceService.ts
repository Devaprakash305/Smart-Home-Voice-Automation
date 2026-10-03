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
    const res = await fetch(buildApiUrl('/device/state'), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const payload = await res.json();
    if (payload && typeof payload === 'object') {
      return {
        bulb1: Boolean(payload.bulb1),
        bulb2: Boolean(payload.bulb2),
      };
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
let localStateCache: DeviceState = {
  id: '00000000-0000-4000-8000-000000000001',
  device_id: '00000000-0000-4000-8000-000000000002',
  bulb_state: false,
  light_state: false,
  updated_at: new Date().toISOString(),
};

/**
 * 1. REAL DEVICE STATUS & HEARTBEAT
 * Queries the Cloudflare Worker backend GET /device/status endpoint.
 * Evaluates heartbeat: ESP8266 is ONLINE if lastSeen is within 10 seconds.
 */
export async function getDeviceStatus(): Promise<SystemStatus> {
  const isVoiceReady =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  let backendOk = false;
  let esp8266Online = false;
  let lastSeenTime: string | null = null;
  let bulbState = localStateCache.bulb_state;
  let lightState = localStateCache.light_state;

  const hardwareState = await fetchHardwareState();

  if (hardwareState) {
    backendOk = true;
    bulbState = Boolean(hardwareState.bulb1);
    lightState = Boolean(hardwareState.bulb2);
    localStateCache = {
      ...localStateCache,
      bulb_state: bulbState,
      light_state: lightState,
      updated_at: new Date().toISOString(),
    };

    lastSeenTime = new Date().toISOString();
    esp8266Online = true;
  }

  return {
    online: esp8266Online,
    lastSeen: lastSeenTime,
    device: 'ESP8266',
    esp8266: esp8266Online ? 'Online' : 'Offline',
    cloudflare: backendOk ? 'Connected' : 'Error',
    supabase: isSupabaseConfigured ? 'Connected' : 'Error',
    voice: isVoiceReady ? 'Ready' : 'Unsupported',
    bulbState,
    lightState,
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
    if (!localDeviceCache) {
      localDeviceCache = {
        id: '00000000-0000-4000-8000-000000000002',
        user_id: authUserId,
        device_name: 'Smart Home ESP8266',
        device_type: 'ESP8266',
        thing_id: null,
        created_at: new Date().toISOString(),
      };
    }
    return localDeviceCache;
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
  if (!authUserId) throw new Error('Unauthenticated user cannot create device');

  if (!isSupabaseConfigured) {
    localDeviceCache = {
      id: crypto.randomUUID(),
      user_id: authUserId,
      device_name: 'Smart Home ESP8266',
      device_type: 'ESP8266',
      thing_id: null,
      created_at: new Date().toISOString(),
    };
    return localDeviceCache;
  }

  try {
    const { data: existing } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', authUserId)
      .maybeSingle();

    if (existing) {
      localDeviceCache = existing;
      return existing;
    }

    const newDevicePayload = {
      user_id: authUserId,
      device_name: 'Smart Home ESP8266',
      device_type: 'ESP8266',
      thing_id: null,
    };

    const { data, error } = await supabase
      .from('devices')
      .insert([newDevicePayload])
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase device insertion error:', error.message || error);
      const { data: retry } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', authUserId)
        .maybeSingle();

      if (retry) {
        localDeviceCache = retry;
        return retry;
      }
    }

    if (data) {
      localDeviceCache = data;
      await initializeDeviceState(data.id);
      return data;
    }
  } catch (err) {
    console.error('Device initialization exception:', err);
  }

  if (!localDeviceCache) {
    localDeviceCache = {
      id: crypto.randomUUID(),
      user_id: authUserId,
      device_name: 'Smart Home ESP8266',
      device_type: 'ESP8266',
      thing_id: null,
      created_at: new Date().toISOString(),
    };
  }
  return localDeviceCache;
}

/**
 * 3. REAL DEVICE STATE FROM SUPABASE & BACKEND
 */
export async function getDeviceState(deviceId: string): Promise<DeviceState> {
  const hardwareState = await fetchHardwareState();

  if (hardwareState) {
    const normalizedState: DeviceState = {
      id: deviceId || localStateCache.id,
      device_id: deviceId || localStateCache.device_id,
      bulb_state: Boolean(hardwareState.bulb1),
      light_state: Boolean(hardwareState.bulb2),
      updated_at: new Date().toISOString(),
    };

    localStateCache = normalizedState;
    return normalizedState;
  }

  if (!deviceId) return localStateCache;

  if (!isSupabaseConfigured) {
    return localStateCache;
  }

  try {
    const { data, error } = await supabase
      .from('device_states')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase getDeviceState warning:', error.message || error);
    }

    if (data) {
      const normalizedState: DeviceState = {
        id: data.id,
        device_id: data.device_id,
        bulb_state: data.bulb_state !== undefined ? Boolean(data.bulb_state) : Boolean(data.bulb1_state),
        light_state: data.light_state !== undefined ? Boolean(data.light_state) : Boolean(data.bulb2_state),
        updated_at: data.updated_at || new Date().toISOString(),
      };
      localStateCache = normalizedState;
      return normalizedState;
    }

    return await initializeDeviceState(deviceId);
  } catch (err) {
    console.error('Error fetching device state:', err);
    return localStateCache;
  }
}

export async function initializeDeviceState(deviceId: string): Promise<DeviceState> {
  if (!isSupabaseConfigured || !deviceId) return localStateCache;

  try {
    const { data: existing } = await supabase
      .from('device_states')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (existing) {
      const normalizedState: DeviceState = {
        id: existing.id,
        device_id: existing.device_id,
        bulb_state: existing.bulb_state !== undefined ? Boolean(existing.bulb_state) : Boolean(existing.bulb1_state),
        light_state: existing.light_state !== undefined ? Boolean(existing.light_state) : Boolean(existing.bulb2_state),
        updated_at: existing.updated_at || new Date().toISOString(),
      };
      localStateCache = normalizedState;
      return normalizedState;
    }

    const newStatePayload = {
      device_id: deviceId,
      bulb1_state: false,
      bulb2_state: false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('device_states')
      .insert([newStatePayload])
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase initializeDeviceState error:', error.message || error);
    }

    if (data) {
      const normalizedState: DeviceState = {
        id: data.id,
        device_id: data.device_id,
        bulb_state: false,
        light_state: false,
        updated_at: data.updated_at || new Date().toISOString(),
      };
      localStateCache = normalizedState;
      return normalizedState;
    }
  } catch (err) {
    console.error('Device state initialization exception:', err);
  }

  return localStateCache;
}

/**
 * 4. REAL HARDWARE CONTROL SERVICE
 * Sends command POST /device/control to Cloudflare Worker.
 * Updates Supabase device_states and inserts row in commands table.
 */
export async function controlBulb(
  userId: string,
  deviceId: string,
  targetDevice: TargetDevice,
  action: TargetAction,
  commandText?: string
): Promise<ControlBulbResult> {
  const authUserId = (await getAuthenticatedUserId()) || userId;
  let targetDeviceId = deviceId;

  if (!targetDeviceId || targetDeviceId === '00000000-0000-4000-8000-000000000002') {
    const userDev = await getUserDevice(authUserId);
    if (userDev) {
      targetDeviceId = userDev.id;
    }
  }

  const currentState = await getDeviceState(targetDeviceId);
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

    const refreshedState = await fetchHardwareState();
    if (refreshedState) {
      newB = Boolean(refreshedState.bulb1);
      newL = Boolean(refreshedState.bulb2);
    }

    localStateCache = {
      ...currentState,
      bulb_state: newB,
      light_state: newL,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && targetDeviceId) {
      try {
        const { error: stateErr } = await supabase
          .from('device_states')
          .update({
            bulb1_state: newB,
            bulb2_state: newL,
            bulb_state: newB,
            light_state: newL,
            updated_at: new Date().toISOString(),
          })
          .eq('device_id', targetDeviceId);

        if (stateErr) {
          await supabase.from('device_states').upsert(
            {
              device_id: targetDeviceId,
              bulb1_state: newB,
              bulb2_state: newL,
              bulb_state: newB,
              light_state: newL,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'device_id' }
          );
        }
      } catch (err) {
        console.error('Error updating device_states in Supabase:', err);
      }
    }

    if (action !== 'status') {
      await saveCommand(authUserId, targetDeviceId, displayCommand, targetDevice, action, 'success');
    }

    return {
      success: true,
      message: 'Hardware command executed.',
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

/**
 * Realtime listener subscription for device_states table changes.
 */
export function subscribeToDeviceState(
  deviceId: string,
  onStateChange: (newState: DeviceState) => void
) {
  if (!isSupabaseConfigured || !deviceId) return () => {};

  const channel = supabase
    .channel(`device_state_${deviceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'device_states',
        filter: `device_id=eq.${deviceId}`,
      },
      (payload) => {
        if (payload.new) {
          const data = payload.new as any;
          const normalizedState: DeviceState = {
            id: data.id,
            device_id: data.device_id,
            bulb_state: data.bulb_state !== undefined ? Boolean(data.bulb_state) : Boolean(data.bulb1_state),
            light_state: data.light_state !== undefined ? Boolean(data.light_state) : Boolean(data.bulb2_state),
            updated_at: data.updated_at || new Date().toISOString(),
          };
          localStateCache = normalizedState;
          onStateChange(normalizedState);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
