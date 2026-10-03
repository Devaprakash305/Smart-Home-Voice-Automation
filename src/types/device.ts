export interface UserProfile {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  device_name: string;
  device_type: string;
  thing_id: string | null;
  created_at: string;
}

export interface DeviceState {
  id: string;
  device_id: string;
  bulb_state: boolean;
  light_state: boolean;
  updated_at: string;
}

export interface SystemStatus {
  online: boolean;
  lastSeen: string | null;
  device: string;
  esp8266: 'Online' | 'Offline' | 'Device Status Unavailable' | 'Checking...';
  cloudflare: 'Connected' | 'Error' | 'Checking...';
  supabase: 'Connected' | 'Error';
  voice: 'Ready' | 'Unsupported';
  internet?: boolean;
  backend?: 'Connected' | 'Error';
}

export interface ControlBulbResult {
  success: boolean;
  message: string;
  newState?: {
    bulb_state: boolean;
    light_state: boolean;
  };
}
