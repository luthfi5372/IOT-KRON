import React, { useState } from 'react';
import { X, Server, Code, Copy, Check, RefreshCw, CheckCircle, Wifi } from 'lucide-react';
import { MqttConfig } from '../types/telemetry';

interface MqttSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MqttConfig;
  onSaveConfig: (newConfig: MqttConfig) => void;
  onReconnect: () => void;
}

export const MqttSettingsModal: React.FC<MqttSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onReconnect,
}) => {
  const [tab, setTab] = useState<'config' | 'firmware'>('config');
  const [brokerUrl, setBrokerUrl] = useState(config.brokerUrl);
  const [topic, setTopic] = useState(config.topic);
  const [commandTopic, setCommandTopic] = useState(config.commandTopic);
  const [clientId, setClientId] = useState(config.clientId);
  const [codeCopied, setCodeCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...config,
      brokerUrl,
      topic,
      commandTopic,
      clientId,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  const handleResetDefaults = () => {
    setBrokerUrl('wss://broker.emqx.io:8084/mqtt');
    setTopic('kapal/telemetri');
    setCommandTopic('kapal/kontrol');
    setClientId(`kapal_esp32_dash_${Math.random().toString(16).substring(2, 8)}`);
  };

  const esp32ArduinoCode = `/*
 * FIRMWARE TELEMETRI KAPAL ESP32-S3 (Arduino IDE)
 * Sensor: DS18B20 (OneWire), pH-4502C (Analog), TDS (Analog)
 * Aktuator: Relay 1 (Pompa pH Up GPIO 18), Relay 2 (Pompa pH Down GPIO 19)
 * Broker: broker.emqx.io (Port 1883 TCP / WebSockets 8084)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const char* ssid = "WIFI_KAPAL_SSID";
const char* password = "WIFI_PASSWORD";
const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;
const char* mqtt_topic_telemetri = "kapal/telemetri";
const char* mqtt_topic_kontrol = "kapal/kontrol";

#define PIN_ONEWIRE_DS18B20 4
#define PIN_PH_ANALOG 5
#define PIN_TDS_ANALOG 6
#define PIN_BATTERY_ADC 1
#define PIN_RELAY_POMPA_UP 18
#define PIN_RELAY_POMPA_DOWN 19

OneWire oneWire(PIN_ONEWIRE_DS18B20);
DallasTemperature sensors(&oneWire);
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastPublish = 0;

void callback(char* topic, byte* payload, unsigned int length) {
  // Parsing kendali manual dari dashboard operator
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);
  const char* cmd = doc["command"];
  const char* state = doc["state"];
  
  if (strcmp(cmd, "pompa_up") == 0) {
    digitalWrite(PIN_RELAY_POMPA_UP, strcmp(state, "ON") == 0 ? LOW : HIGH);
  } else if (strcmp(cmd, "pompa_down") == 0) {
    digitalWrite(PIN_RELAY_POMPA_DOWN, strcmp(state, "ON") == 0 ? LOW : HIGH);
  }
}

void reconnect() {
  while (!client.connected()) {
    String clientId = "ESP32S3_Kapal_" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      client.subscribe(mqtt_topic_kontrol);
    } else {
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELAY_POMPA_UP, OUTPUT);
  pinMode(PIN_RELAY_POMPA_DOWN, OUTPUT);
  // Matikan relay saat startup (Active LOW umum untuk relay optocoupler)
  digitalWrite(PIN_RELAY_POMPA_UP, HIGH);
  digitalWrite(PIN_RELAY_POMPA_DOWN, HIGH);

  sensors.begin();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastPublish > 2000) { // Transmisi setiap 2 detik
    lastPublish = now;

    // 1. Baca DS18B20
    sensors.requestTemperatures();
    float suhu_c = sensors.getTempCByIndex(0);
    if (suhu_c < -50 || suhu_c > 85) suhu_c = 28.4;

    // 2. Baca Analog pH-4502C
    int rawPh = analogRead(PIN_PH_ANALOG);
    float voltagePh = rawPh * (3.3 / 4095.0);
    float ph = 7.0 + ((2.5 - voltagePh) / 0.18); // Kalibrasi probe kaca
    ph = constrain(ph, 0.0, 14.0);

    // 3. Baca Analog TDS
    int rawTds = analogRead(PIN_TDS_ANALOG);
    float voltageTds = rawTds * (3.3 / 4095.0);
    float tds_ppm = (133.42 * voltageTds * voltageTds * voltageTds - 255.86 * voltageTds * voltageTds + 857.39 * voltageTds) * 0.5;
    if (tds_ppm < 0) tds_ppm = 0;

    // 4. Baca Tegangan & Persentase Baterai (Voltage Divider rasio R1=100k, R2=22k -> faktor ~5.54)
    int rawBat = analogRead(PIN_BATTERY_ADC);
    float tegangan_v = rawBat * (3.3 / 4095.0) * 5.54;
    int baterai_persen = map(constrain((int)(tegangan_v * 100), 1000, 1260), 1000, 1260, 0, 100);

    // 5. Logika Ambang Batas Aktuator Relai
    const char* pompa_up = "OFF";
    const char* pompa_down = "OFF";
    const char* status = "NORMAL";

    if (ph < 6.5) {
      digitalWrite(PIN_RELAY_POMPA_UP, LOW);   // AKTIF (Active-LOW)
      digitalWrite(PIN_RELAY_POMPA_DOWN, HIGH); // STANDBY
      pompa_up = "ON";
      status = "DOSING_UP";
    } else if (ph > 8.5) {
      digitalWrite(PIN_RELAY_POMPA_UP, HIGH);  // STANDBY
      digitalWrite(PIN_RELAY_POMPA_DOWN, LOW);  // AKTIF (Active-LOW)
      pompa_down = "ON";
      status = "DOSING_DOWN";
    } else {
      digitalWrite(PIN_RELAY_POMPA_UP, HIGH);
      digitalWrite(PIN_RELAY_POMPA_DOWN, HIGH);
    }

    // 6. Serialize JSON Payload Kontrak Data
    StaticJsonDocument<384> doc;
    doc["suhu_c"] = serialized(String(suhu_c, 1));
    doc["ph"] = serialized(String(ph, 2));
    doc["tds_ppm"] = (int)tds_ppm;
    doc["baterai_persen"] = baterai_persen;
    doc["tegangan_v"] = serialized(String(tegangan_v, 2));
    doc["pompa_up"] = pompa_up;
    doc["pompa_down"] = pompa_down;
    doc["status"] = status;

    char buffer[384];
    serializeJson(doc, buffer);
    client.publish(mqtt_topic_telemetri, buffer);
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(esp32ArduinoCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700/60 bg-[#121826]/95 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 border border-sky-500/25">
              <Server className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white">Konfigurasi MQTT &amp; Firmware</h2>
              <p className="text-xs text-slate-400 font-normal">
                Hubungkan dashboard ke broker atau sesuaikan firmware mikrokontroler
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800/60 bg-slate-950/30 px-6">
          <button
            onClick={() => setTab('config')}
            className={`border-b-2 py-3 px-4 text-xs font-medium transition-colors cursor-pointer ${
              tab === 'config'
                ? 'border-sky-400 text-sky-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Koneksi Broker MQTT
          </button>
          <button
            onClick={() => setTab('firmware')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-4 text-xs font-medium transition-colors cursor-pointer ${
              tab === 'firmware'
                ? 'border-sky-400 text-sky-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>Kode Arduino ESP32-S3</span>
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {tab === 'config' ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  WebSocket Secure Broker URL
                </label>
                <input
                  type="text"
                  value={brokerUrl}
                  onChange={(e) => setBrokerUrl(e.target.value)}
                  placeholder="wss://broker.emqx.io:8084/mqtt"
                  className="w-full rounded-full border border-slate-700/80 bg-slate-950/70 px-4 py-2 font-mono text-xs text-sky-300 focus:border-sky-500/50 focus:outline-none"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Broker publik terstandar: <span className="font-mono text-slate-300">wss://broker.emqx.io:8084/mqtt</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Topik Telemetri (Subscribe)
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="kapal/telemetri"
                    className="w-full rounded-full border border-slate-700/80 bg-slate-950/70 px-4 py-2 font-mono text-xs text-slate-200 focus:border-sky-500/50 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Topik Kontrol Manual (Publish)
                  </label>
                  <input
                    type="text"
                    value={commandTopic}
                    onChange={(e) => setCommandTopic(e.target.value)}
                    placeholder="kapal/kontrol"
                    className="w-full rounded-full border border-slate-700/80 bg-slate-950/70 px-4 py-2 font-mono text-xs text-slate-200 focus:border-sky-500/50 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Client ID Klien Web
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-full border border-slate-700/80 bg-slate-950/70 px-4 py-2 font-mono text-xs text-slate-300 focus:border-sky-500/50 focus:outline-none"
                  required
                />
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-3.5 text-xs text-slate-400 space-y-1">
                <span className="font-semibold text-slate-200 block">Informasi Protokol:</span>
                <p>• Menggunakan MQTT.js v5 via WebSocket Secure (WSS).</p>
                <p>• Jika broker EMQX publik sedang padat, Anda dapat menggunakan broker pribadi seperti HiveMQ Cloud atau Mosquitto WSS.</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="rounded-full border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Reset Standar EMQX
                  </button>
                  <button
                    type="button"
                    onClick={onReconnect}
                    className="flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Hubungkan Ulang</span>
                  </button>
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-full bg-sky-500/20 border border-sky-500/30 px-4 py-2 text-xs font-medium text-sky-200 hover:bg-sky-500/30 transition-all cursor-pointer"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Tersimpan!</span>
                    </>
                  ) : (
                    <span>Simpan &amp; Terapkan</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-300">
                  Kode siap salin untuk mikrokontroler ESP32-S3:
                </p>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {codeCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{codeCopied ? 'Tersalin ke Clipboard' : 'Salin Semua Kode'}</span>
                </button>
              </div>

              <pre className="max-h-96 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-[11px] leading-relaxed text-emerald-300">
                {esp32ArduinoCode}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
