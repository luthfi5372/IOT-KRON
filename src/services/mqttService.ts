import mqtt, { MqttClient } from 'mqtt';
import { MqttConfig, TelemetryPayload, ConnectionStatus } from '../types/telemetry';

export class MqttService {
  private client: MqttClient | null = null;
  private config: MqttConfig;
  private onMessageCallback?: (payload: Partial<TelemetryPayload>) => void;
  private onStatusChangeCallback?: (status: ConnectionStatus, message?: string) => void;
  private lastStatus: ConnectionStatus = 'disconnected';
  private reconnectTimer: any = null;

  constructor(config: MqttConfig) {
    this.config = config;
  }

  public updateConfig(newConfig: MqttConfig) {
    const needReconnect =
      this.config.brokerUrl !== newConfig.brokerUrl ||
      this.config.topic !== newConfig.topic ||
      this.config.clientId !== newConfig.clientId;

    this.config = newConfig;

    if (needReconnect && this.client) {
      this.disconnect();
      this.connect();
    }
  }

  public setCallbacks(
    onMessage: (payload: Partial<TelemetryPayload>) => void,
    onStatusChange: (status: ConnectionStatus, message?: string) => void
  ) {
    this.onMessageCallback = onMessage;
    this.onStatusChangeCallback = onStatusChange;
  }

  /**
   * Resynchronize MQTT connection: cleans previous session, generates fresh client ID,
   * reconnects, and broadcasts a telemetry request probe.
   */
  public resync(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Refresh client ID to prevent stale broker state
    this.config.clientId = `kapal_web_${Date.now()}_${Math.random().toString(16).substring(2, 6)}`;
    this.disconnect();
    this.notifyStatus('connecting', 'Menyinkronkan ulang dengan broker MQTT...');

    this.reconnectTimer = setTimeout(() => {
      this.connect();

      // Probe inquiry to USV or listening hardware
      setTimeout(() => {
        if (this.client && this.client.connected) {
          const syncProbe = {
            command: 'sync',
            action: 'req_telemetry',
            timestamp: Date.now(),
          };
          this.publish(this.config.commandTopic || 'kapal/kontrol', syncProbe);
          this.publish('kapal/telemetri/req', syncProbe);
        }
      }, 600);
    }, 300);
  }

  public connect() {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        // ignore
      }
      this.client = null;
    }

    this.notifyStatus('connecting', 'Menghubungkan ke broker MQTT...');

    try {
      const clientId =
        this.config.clientId || `vessel_dashboard_${Math.random().toString(16).substring(2, 8)}`;

      const client = mqtt.connect(this.config.brokerUrl, {
        clientId,
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 8000,
        keepalive: 60,
      });

      this.client = client;

      client.on('connect', () => {
        this.notifyStatus('connected', `Terhubung ke broker MQTT (${this.config.brokerUrl})`);

        // Subscribes broadly to primary topics & wildcards so all vessel data streams sync
        const topicsToSubscribe = [
          this.config.topic,
          `${this.config.topic}/#`,
          'kapal/#',
          'kapal/telemetri',
          'kapal/telemetri/#',
          'kapal/telemetri/data',
          'kapal/sensor/#',
          'kapal/data/#',
          'kapal/kontrol',
          'telemetri/#',
          'sensor/#',
          'vessel/#',
          'usv/#',
        ];

        client.subscribe(topicsToSubscribe, (err) => {
          if (err) {
            console.error('MQTT subscribe error:', err);
          } else {
            console.log('[MQTT] Berhasil subscribe topik telemetri kapal:', topicsToSubscribe);
          }
        });
      });

      client.on('message', (topic, message) => {
        try {
          const raw = message.toString();
          console.log(`[MQTT INCOMING] Topik: ${topic}, Isi: ${raw}`);

          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            // Not pure JSON; could be raw text or delimited numbers
            parsed = { rawText: raw };
          }

          // Unwrap nested objects if sensor published under data/payload/values
          if (parsed && typeof parsed === 'object') {
            if (parsed.data && typeof parsed.data === 'object') parsed = { ...parsed, ...parsed.data };
            if (parsed.payload && typeof parsed.payload === 'object') parsed = { ...parsed, ...parsed.payload };
            if (parsed.telemetry && typeof parsed.telemetry === 'object') parsed = { ...parsed, ...parsed.telemetry };
            if (parsed.values && typeof parsed.values === 'object') parsed = { ...parsed, ...parsed.values };
          }

          const partial: Partial<TelemetryPayload> = {
            timestamp: Date.now(),
          };

          // Check if payload is single number or comma-separated string (e.g. "28.4, 7.24, 460")
          if (parsed.rawText && typeof parsed.rawText === 'string') {
            const trimmed = parsed.rawText.trim();
            const parts = trimmed.split(/[,;\s]+/).map(Number);
            if (parts.length >= 3 && !parts.some(isNaN)) {
              partial.suhu_c = Number(parts[0].toFixed(1));
              partial.ph = Number(parts[1].toFixed(2));
              partial.tds_ppm = Math.round(parts[2]);
              if (parts.length >= 4 && !isNaN(parts[3])) {
                partial.baterai_persen = Math.max(0, Math.min(100, Math.round(parts[3])));
              }
            } else if (!isNaN(Number(trimmed))) {
              // Single numeric payload matching topic name
              const num = Number(trimmed);
              const lowerTopic = topic.toLowerCase();
              if (lowerTopic.includes('suhu') || lowerTopic.includes('temp')) {
                partial.suhu_c = Number(num.toFixed(1));
              } else if (lowerTopic.includes('ph')) {
                partial.ph = Number(num.toFixed(2));
              } else if (lowerTopic.includes('tds') || lowerTopic.includes('ppm') || lowerTopic.includes('ec')) {
                partial.tds_ppm = Math.round(num);
              } else if (lowerTopic.includes('bat') || lowerTopic.includes('volt')) {
                partial.baterai_persen = Math.max(0, Math.min(100, Math.round(num)));
              }
            }
          }

          // Case-insensitive key lookup helper
          const findKeyVal = (obj: any, keys: string[]) => {
            if (!obj || typeof obj !== 'object') return undefined;
            for (const k of keys) {
              if (obj[k] !== undefined) return obj[k];
              const upper = k.toUpperCase();
              const lower = k.toLowerCase();
              for (const prop of Object.keys(obj)) {
                if (prop.toLowerCase() === lower || prop.toUpperCase() === upper) {
                  return obj[prop];
                }
              }
            }
            return undefined;
          };

          // 1. Suhu / Temperature
          const rawTemp = findKeyVal(parsed, ['suhu_c', 'suhu', 'temp', 'temperature', 't', 'celcius']);
          if (rawTemp !== undefined && !isNaN(Number(rawTemp))) {
            partial.suhu_c = Number(Number(rawTemp).toFixed(1));
          }

          // 2. pH
          const rawPh = findKeyVal(parsed, ['ph', 'pH', 'ph_val', 'ph_value', 'keasaman']);
          if (rawPh !== undefined && !isNaN(Number(rawPh))) {
            partial.ph = Number(Number(rawPh).toFixed(2));
          }

          // 3. TDS / Salinitas / ppm
          const rawTds = findKeyVal(parsed, ['tds_ppm', 'tds', 'ppm', 'salinitas', 'ec', 'tds_val']);
          if (rawTds !== undefined && !isNaN(Number(rawTds))) {
            partial.tds_ppm = Math.round(Number(rawTds));
          }

          // 4. Baterai / Catu Daya
          const rawBat = findKeyVal(parsed, ['baterai_persen', 'baterai', 'battery', 'bat', 'soc', 'batt']);
          if (rawBat !== undefined && !isNaN(Number(rawBat))) {
            partial.baterai_persen = Math.max(0, Math.min(100, Math.round(Number(rawBat))));
          }

          // 5. Tegangan
          const rawVolt = findKeyVal(parsed, ['tegangan_v', 'tegangan', 'voltage', 'volt', 'v']);
          if (rawVolt !== undefined && !isNaN(Number(rawVolt))) {
            partial.tegangan_v = Number(Number(rawVolt).toFixed(2));
          }

          // 6. Pompa UP & DOWN & General Pompa
          const rawPompaUp = findKeyVal(parsed, ['pompa_up', 'pompa1', 'relay1']);
          if (rawPompaUp !== undefined) {
            const val = String(rawPompaUp).toUpperCase();
            partial.pompa_up = (val === 'ON' || val === 'AKTIF' || val === 'TRUE' || val === '1') ? 'ON' : 'OFF';
          }

          const rawPompaDown = findKeyVal(parsed, ['pompa_down', 'pompa2', 'relay2']);
          if (rawPompaDown !== undefined) {
            const val = String(rawPompaDown).toUpperCase();
            partial.pompa_down = (val === 'ON' || val === 'AKTIF' || val === 'TRUE' || val === '1') ? 'ON' : 'OFF';
          }

          const generalPompa = findKeyVal(parsed, ['pompa', 'relay']);
          if (generalPompa !== undefined) {
            const val = String(generalPompa).toUpperCase();
            const isOn = (val === 'ON' || val === 'AKTIF' || val === 'TRUE' || val === '1');
            partial.pompa_up = isOn ? 'ON' : 'OFF';
          }

          // 7. Status
          if (parsed.status) {
            partial.status = String(parsed.status);
          }

          // Deliver if at least one meaningful field is parsed
          const hasData =
            partial.suhu_c !== undefined ||
            partial.ph !== undefined ||
            partial.tds_ppm !== undefined ||
            partial.baterai_persen !== undefined ||
            partial.pompa_up !== undefined ||
            partial.pompa_down !== undefined ||
            partial.tegangan_v !== undefined;

          if (hasData) {
            this.onMessageCallback?.(partial);
          }
        } catch (err) {
          console.warn('Gagal memproses pesan MQTT:', err);
        }
      });

      client.on('error', (err) => {
        this.notifyStatus('error', err.message || 'Kesalahan koneksi MQTT');
      });

      client.on('close', () => {
        if (this.lastStatus !== 'error') {
          this.notifyStatus('disconnected', 'Koneksi MQTT terputus');
        }
      });

      client.on('offline', () => {
        this.notifyStatus('disconnected', 'Broker offline');
      });

      client.on('reconnect', () => {
        this.notifyStatus('connecting', 'Mencoba menghubungkan kembali ke broker...');
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kesalahan inisialisasi MQTT';
      this.notifyStatus('error', msg);
    }
  }

  public disconnect() {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        // ignore
      }
      this.client = null;
    }
    this.notifyStatus('disconnected', 'Koneksi dihentikan');
  }

  public publish(topic: string, message: object | string): boolean {
    if (!this.client || !this.client.connected) {
      return false;
    }
    const payloadStr = typeof message === 'string' ? message : JSON.stringify(message);
    this.client.publish(topic, payloadStr);
    return true;
  }

  /**
   * Publishes a realistic test packet to verify live round-trip synchronization
   */
  public publishTestTelemetry(): boolean {
    const testPayload = {
      suhu_c: Number((27.5 + Math.random() * 2.5).toFixed(1)),
      ph: Number((7.1 + Math.random() * 0.5).toFixed(2)),
      tds_ppm: Math.round(410 + Math.random() * 80),
      baterai_persen: 87,
      tegangan_v: 12.28,
      status: 'NORMAL',
      timestamp: Date.now(),
    };
    return this.publish(this.config.topic || 'kapal/telemetri', testPayload);
  }

  public isConnected(): boolean {
    return !!(this.client && this.client.connected);
  }

  private notifyStatus(status: ConnectionStatus, message?: string) {
    this.lastStatus = status;
    this.onStatusChangeCallback?.(status, message);
  }
}
