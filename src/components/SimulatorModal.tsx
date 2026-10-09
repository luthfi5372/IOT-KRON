import React, { useState } from 'react';
import { X, Play, Square, Send, Copy, Check, Info, Flame, Droplet, Sparkles, Sliders } from 'lucide-react';
import { SimMode } from '../services/simulatorService';
import { TelemetryPayload } from '../types/telemetry';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSimulating: boolean;
  simMode: SimMode;
  onToggleSim: () => void;
  onChangeSimMode: (mode: SimMode) => void;
  latestPayload: TelemetryPayload;
  onInjectCustomPayload: (payload: TelemetryPayload) => void;
  canPublishMqtt: boolean;
  isDark?: boolean;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  isSimulating,
  simMode,
  onToggleSim,
  onChangeSimMode,
  latestPayload,
  onInjectCustomPayload,
  canPublishMqtt,
  isDark = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [customTemp, setCustomTemp] = useState(28.4);
  const [customPh, setCustomPh] = useState(6.2);
  const [customTds, setCustomTds] = useState(480);
  const [customBattery, setCustomBattery] = useState(85);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(latestPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyCustom = () => {
    const isAcid = customPh < 6.5;
    const isBase = customPh > 8.5;
    const roundedBat = Math.max(0, Math.min(100, Math.round(customBattery)));
    const roundedVolt = Number((10.0 + (roundedBat / 100) * 2.6).toFixed(2));

    const payload: TelemetryPayload = {
      suhu_c: Number(customTemp.toFixed(1)),
      ph: Number(customPh.toFixed(2)),
      tds_ppm: Math.round(customTds),
      baterai_persen: roundedBat,
      tegangan_v: roundedVolt,
      pompa_up: isAcid ? 'ON' : 'OFF',
      pompa_down: isBase ? 'ON' : 'OFF',
      status: isAcid ? 'DOSING_UP' : isBase ? 'DOSING_DOWN' : 'NORMAL',
      timestamp: Date.now(),
    };

    onInjectCustomPayload(payload);
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
      <div
        className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? 'border-slate-700/60 bg-[#121826]/95 text-slate-100'
            : 'border-stone-200 bg-white text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            isDark ? 'border-slate-800/60 bg-slate-950/40' : 'border-stone-100 bg-stone-50/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className={`text-sm font-semibold tracking-tight ${textPrimary}`}>
                Simulator Virtual ESP32-S3
              </h2>
              <p className={`text-xs ${textSecondary}`}>
                Uji coba skenario telemetri tanpa memerlukan kapal fisik di lapangan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-full p-1.5 transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-stone-100 hover:text-slate-800'
            }`}
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          {/* Quick Simulation Master Switch */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/8 p-4">
            <div>
              <span className="text-xs font-semibold text-white block">Engine Simulator Interval Otomatis (2 Detik)</span>
              <p className="text-xs text-slate-300/90 mt-0.5 font-normal">
                Mengirimkan paket telemetri baru setiap 2 detik sesuai kontrak JSON data kapal.
              </p>
            </div>
            <button
              onClick={onToggleSim}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all cursor-pointer ${
                isSimulating
                  ? 'bg-rose-500/20 border border-rose-500/30 text-rose-200 hover:bg-rose-500/30'
                  : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/30'
              }`}
            >
              {isSimulating ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  <span>Hentikan Simulator</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Jalankan Simulator</span>
                </>
              )}
            </button>
          </div>

          {/* Skenario Preset Pengujian Batas Ambang */}
          <div>
            <h3 className="text-xs font-medium text-slate-400 mb-3">
              Skenario Cepat Pengujian Ambang Batas
            </h3>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                onClick={() => {
                  onChangeSimMode('normal');
                  onInjectCustomPayload({
                    suhu_c: 28.2,
                    ph: 7.25,
                    tds_ppm: 420,
                    baterai_persen: 85,
                    tegangan_v: 12.21,
                    pompa_up: 'OFF',
                    pompa_down: 'OFF',
                    status: 'NORMAL',
                    timestamp: Date.now(),
                  });
                }}
                className={`flex flex-col text-left rounded-2xl border p-3.5 transition-all cursor-pointer ${
                  simMode === 'normal'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                    : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-emerald-300 text-xs">1. Kondisi Netral / Normal</span>
                  <span className="text-[11px] text-emerald-300 font-medium tabular-nums">pH 7.25</span>
                </div>
                <span className="mt-1 text-xs text-slate-400 font-normal">
                  Kedua pompa STANDBY, parameter kualitas air stabil.
                </span>
              </button>

              <button
                onClick={() => {
                  onChangeSimMode('acidic');
                  onInjectCustomPayload({
                    suhu_c: 27.8,
                    ph: 5.95,
                    tds_ppm: 540,
                    baterai_persen: 78,
                    tegangan_v: 12.03,
                    pompa_up: 'ON',
                    pompa_down: 'OFF',
                    status: 'DOSING_UP',
                    timestamp: Date.now(),
                  });
                }}
                className={`flex flex-col text-left rounded-2xl border p-3.5 transition-all cursor-pointer ${
                  simMode === 'acidic'
                    ? 'border-amber-500/40 bg-amber-500/10 text-white'
                    : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-amber-300 text-xs">2. Kondisi Asam (pH &lt; 6.5)</span>
                  <span className="text-[11px] text-amber-300 font-medium tabular-nums">pH 5.95</span>
                </div>
                <span className="mt-1 text-xs text-slate-400 font-normal">
                  Memicu Pompa 1 (pH Up) AKTIF dan banner peringatan peach/amber.
                </span>
              </button>

              <button
                onClick={() => {
                  onChangeSimMode('alkaline');
                  onInjectCustomPayload({
                    suhu_c: 29.1,
                    ph: 8.95,
                    tds_ppm: 610,
                    baterai_persen: 74,
                    tegangan_v: 11.92,
                    pompa_up: 'OFF',
                    pompa_down: 'ON',
                    status: 'DOSING_DOWN',
                    timestamp: Date.now(),
                  });
                }}
                className={`flex flex-col text-left rounded-2xl border p-3.5 transition-all cursor-pointer ${
                  simMode === 'alkaline'
                    ? 'border-rose-500/40 bg-rose-500/10 text-white'
                    : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-rose-300 text-xs">3. Kondisi Basa (pH &gt; 8.5)</span>
                  <span className="text-[11px] text-rose-300 font-medium tabular-nums">pH 8.95</span>
                </div>
                <span className="mt-1 text-xs text-slate-400 font-normal">
                  Memicu Pompa 2 (pH Down) AKTIF dan banner peringatan rose/coral.
                </span>
              </button>

              <button
                onClick={() => {
                  onChangeSimMode('low_battery');
                  onInjectCustomPayload({
                    suhu_c: 28.5,
                    ph: 7.10,
                    tds_ppm: 440,
                    baterai_persen: 14,
                    tegangan_v: 10.36,
                    pompa_up: 'OFF',
                    pompa_down: 'OFF',
                    status: 'NORMAL',
                    timestamp: Date.now(),
                  });
                }}
                className={`flex flex-col text-left rounded-2xl border p-3.5 transition-all cursor-pointer ${
                  simMode === 'low_battery'
                    ? 'border-rose-500/40 bg-rose-500/10 text-white'
                    : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-rose-300 text-xs">4. Baterai Kritis (&lt;20%)</span>
                  <span className="text-[11px] text-rose-300 font-medium tabular-nums">14% (10.36V)</span>
                </div>
                <span className="mt-1 text-xs text-slate-400 font-normal">
                  Uji visual warning baterai lemah pada kartu dan banner alarm.
                </span>
              </button>

              <button
                onClick={() => onChangeSimMode('dynamic')}
                className={`flex flex-col text-left rounded-2xl border p-3.5 transition-all cursor-pointer sm:col-span-2 ${
                  simMode === 'dynamic'
                    ? 'border-sky-500/40 bg-sky-500/10 text-white'
                    : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sky-300 text-xs">5. Fluktuasi Gelombang Maritim</span>
                  <span className="text-[11px] text-sky-300 font-medium">Realistis</span>
                </div>
                <span className="mt-1 text-xs text-slate-400 font-normal">
                  Drifting kontinu natural meniru kondisi sensor lapangan perairan asli.
                </span>
              </button>
            </div>
          </div>

          {/* Manual Telemetry Injection Slider */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                Injeksi Nilai Manual Spesifik
              </span>
              <button
                onClick={handleApplyCustom}
                className="flex items-center gap-1.5 rounded-full bg-sky-500/20 border border-sky-500/30 px-3.5 py-1 text-xs font-medium text-sky-200 hover:bg-sky-500/30 transition-colors cursor-pointer"
              >
                <Send className="h-3 w-3" />
                <span>Kirim Nilai</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Suhu Air: <span className="text-sky-300 font-medium tabular-nums">{customTemp} °C</span>
                </label>
                <input
                  type="range"
                  min="18"
                  max="38"
                  step="0.1"
                  value={customTemp}
                  onChange={(e) => setCustomTemp(parseFloat(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  pH Air: <span className="text-emerald-300 font-medium tabular-nums">{customPh}</span>
                </label>
                <input
                  type="range"
                  min="4.0"
                  max="11.0"
                  step="0.05"
                  value={customPh}
                  onChange={(e) => setCustomPh(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  TDS: <span className="text-indigo-300 font-medium tabular-nums">{customTds} ppm</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="1200"
                  step="10"
                  value={customTds}
                  onChange={(e) => setCustomTds(parseInt(e.target.value))}
                  className="w-full accent-indigo-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Baterai: <span className="text-emerald-300 font-medium tabular-nums">{customBattery}%</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={customBattery}
                  onChange={(e) => setCustomBattery(parseInt(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Raw JSON Contract Inspector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">
                Kontrak Data JSON
              </span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Tersalin' : 'Salin JSON'}</span>
              </button>
            </div>
            <pre className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 font-mono text-xs text-sky-300/90 overflow-x-auto">
              {JSON.stringify(
                {
                  suhu_c: latestPayload.suhu_c,
                  ph: latestPayload.ph,
                  tds_ppm: latestPayload.tds_ppm,
                  baterai_persen: latestPayload.baterai_persen,
                  tegangan_v: latestPayload.tegangan_v,
                  pompa_up: latestPayload.pompa_up,
                  pompa_down: latestPayload.pompa_down,
                  status: latestPayload.status,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/60 bg-slate-950/40 px-6 py-3 text-xs text-slate-400">
          <span>{canPublishMqtt ? '✅ Siap dipublish ke broker EMQX' : '📡 Mode lokal simulator'}</span>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 px-4 py-1.5 text-xs text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
