export type TargetDevice = 'bulb' | 'light' | 'all' | 'system';
export type TargetAction = 'on' | 'off' | 'status';

export interface VoiceCommand {
  device: TargetDevice;
  action: TargetAction;
  originalText: string;
}

export interface CommandLog {
  id: string;
  user_id: string;
  device_id: string;
  command: string;
  device: TargetDevice;
  action: TargetAction;
  created_at: string;
  status?: string;
}
