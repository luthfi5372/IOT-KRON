export type PumpState = 'ON' | 'OFF';

export type WaterQualityStatus = 'NORMAL' | 'DOSING_UP' | 'DOSING_DOWN' | 'MANUAL' | 'CRITICAL';

export interface TelemetryPayload {
  suhu_c: number;
  ph: number;
  tds_ppm: number;
  baterai_persen: number;
  tegangan_v?: number;
  pompa_up: PumpState;
  pompa_down: PumpState;
  status: WaterQualityStatus | string;
  timestamp?: number;
  messageId?: string;
}

export interface TelemetryLogEntry extends TelemetryPayload {
  id: string;
  timestamp: number;
  timeFormatted: string;
}

export interface MqttConfig {
  brokerUrl: string;
  topic: string;
  commandTopic: string;
  clientId: string;
  cleanSession: boolean;
  useSsl: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
