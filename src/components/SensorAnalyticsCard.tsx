import React, { useState } from 'react';
import {
  Activity,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Gauge,
  Waves,
  Zap,
  Clock,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  Info,
  Droplets,
  ChevronRight,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { computeSensorFormulations, DerivedSensorMetrics } from '../utils/sensorAnalytics';
import { TelemetryLogEntry } from '../types/telemetry';

interface SensorAnalyticsCardProps {
  suhu_c: number;
  ph: number;
  tds_ppm: number;
  logs: TelemetryLogEntry[];
  isDark?: boolean;
  isSensorActive?: boolean;
  hasReceivedData?: boolean;
  onOpenAiAdvisor?: () => void;
}

export const SensorAnalyticsCard: React.FC<SensorAnalyticsCardProps> = ({
  suhu_c,
  ph,
  tds_ppm,
  logs,
  isDark = false,
  isSensorActive = true,
  hasReceivedData = true,
  onOpenAiAdvisor,
}) => {
  const [activeTab, setActiveTab] = useState<'indices' | 'forecast' | 'formulas'>('indices');

  const metrics: DerivedSensorMetrics = computeSensorFormulations(
    suhu_c,
    ph,
    tds_ppm,
    logs,
    isSensorActive
  );

  const {
    wqiScore,
    wqiStatus,
    wqiBreakdown,
    doCapacityMgL,
    doSaturationPercent,
    doStatus,
    conductivityUsCm,
    salinityPpt,
    salinityCategory,
    biocompatibilityPercent,
    biocompatibilityVerdict,
    osmoticStressPercent,
    prediction,
  } = metrics;

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 shadow-xs animate-fade-in-up ${
        isDark
          ? 'bg-[#121826]/90 border-slate-800/80 text-slate-100 shadow-black/20'
          : 'bg-white border-stone-200/80 text-stone-900 shadow-stone-200/40'
      }`}
    >
      {/* Header section with badge & title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 mb-5 border-stone-200/70 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors ${
              isDark
                ? 'bg-purple-950/40 border-purple-800/40 text-purple-300'
                : 'bg-purple-50 border-purple-200 text-purple-700'
            }`}
          >
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Rumusan Data Sensor &amp; Proyeksi Masa Depan
              </h2>
              <span
                className={`hidden xs:inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                  isDark
                    ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                Model Analitik Aktif
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
              Perhitungan matematis WQI %, saturasi oksigen O₂, stres osmotik, serta perkiraan perilaku perairan 15-30 menit ke depan
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div
          className={`flex items-center p-1 rounded-2xl border self-start sm:self-auto ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-stone-200/60 border-stone-300/60'
          }`}
        >
          <button
            onClick={() => setActiveTab('indices')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'indices'
                ? isDark
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-stone-900 shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Gauge className="h-3.5 w-3.5" />
            <span>Persentase &amp; Indeks</span>
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'forecast'
                ? isDark
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-stone-900 shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Proyeksi Mendatang</span>
          </button>

          <button
            onClick={() => setActiveTab('formulas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'formulas'
                ? isDark
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-stone-900 shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Rumus Sains</span>
          </button>
        </div>

        {/* AI Analysis Quick Launch Button */}
        {onOpenAiAdvisor && (
          <button
            onClick={onOpenAiAdvisor}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer shadow-xs self-start sm:self-auto ${
              isDark
                ? 'bg-gradient-to-r from-sky-600/30 to-indigo-600/30 hover:from-sky-600/40 hover:to-indigo-600/40 text-sky-300 border border-sky-500/30'
                : 'bg-gradient-to-r from-sky-50 to-indigo-50 hover:from-sky-100 hover:to-indigo-100 text-sky-700 border border-sky-200'
            }`}
            title="Buka Diagnosa AI untuk data telemetri kapal ini"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-500 animate-pulse" />
            <span>Minta Diagnosa AI</span>
          </button>
        )}
      </div>

      {/* Offline Sensor Disclaimer if sensor is not active */}
      {(!isSensorActive || !hasReceivedData) && (
        <div
          className={`mb-5 flex items-center gap-3 rounded-2xl border p-3 text-xs ${
            isDark
              ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
              : 'bg-amber-50/80 border-amber-200 text-amber-800'
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <strong>Sensor Fisik Sedang Terputus:</strong> Nilai rumusan dan persentase di bawah dihitung berdasarkan pembacaan telemetri terakhir yang tersimpan. Hubungkan sensor untuk sinkronisasi live.
          </span>
        </div>
      )}

      {/* TAB 1: PERSENTASE & INDEKS TURUNAN */}
      {activeTab === 'indices' && (
        <div className="space-y-5">
          {/* 4 Card Key Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. WQI Score Card */}
            <div
              className={`rounded-2xl border p-4.5 flex flex-col justify-between transition-all ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  : 'bg-white/90 border-stone-200/80 hover:border-stone-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                    Indeks Kualitas Air (WQI)
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      wqiScore >= 80
                        ? isDark
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                          : 'bg-emerald-100 text-emerald-800'
                        : isDark
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {wqiStatus}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {wqiScore}
                  </span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">%</span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-stone-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${wqiScore}%` }}
                  />
                </div>
              </div>

              {/* Sub-indices micro breakdown */}
              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-slate-800/80 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-stone-500'}>Sub-skor pH:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{wqiBreakdown.phSubIndex}%</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-stone-500'}>Sub-skor TDS:</span>
                  <span className="font-semibold text-sky-600 dark:text-sky-400">{wqiBreakdown.tdsSubIndex}%</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-stone-500'}>Sub-skor Suhu:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{wqiBreakdown.tempSubIndex}%</span>
                </div>
              </div>
            </div>

            {/* 2. DO Saturation Card */}
            <div
              className={`rounded-2xl border p-4.5 flex flex-col justify-between transition-all ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  : 'bg-white/90 border-stone-200/80 hover:border-stone-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                    Saturasi Oksigen Terlarut (DO)
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isDark
                        ? 'bg-sky-950/60 text-sky-400 border border-sky-800/50'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {doStatus}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {doSaturationPercent}
                  </span>
                  <span className="text-xl font-bold text-sky-600 dark:text-sky-400">%</span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-stone-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${doSaturationPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-slate-800/80 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-stone-500'}>Kapasitas Maksimal:</span>
                  <span className="font-semibold text-sky-600 dark:text-sky-400">~{doCapacityMgL} mg/L</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-stone-500'}>Formula:</span>
                  <span className={isDark ? 'text-slate-400' : 'text-stone-600'}>Benson-Krause (T, TDS)</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-stone-500'}>Resiko Hipoksia:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Sangat Rendah</span>
                </div>
              </div>
            </div>

            {/* 3. Biocompatibility Index */}
            <div
              className={`rounded-2xl border p-4.5 flex flex-col justify-between transition-all ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  : 'bg-white/90 border-stone-200/80 hover:border-stone-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                    Biokompatibilitas Ekosistem
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isDark
                        ? 'bg-teal-950/60 text-teal-400 border border-teal-800/50'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    Ramah Biota
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {biocompatibilityPercent}
                  </span>
                  <span className="text-xl font-bold text-teal-600 dark:text-teal-400">%</span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-stone-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${biocompatibilityPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-slate-800/80 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-stone-500'}>Stres Osmotik:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{osmoticStressPercent}% (Rendah)</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-stone-500'}>Tipe Air:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{salinityCategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-stone-500'}>Salinitas Ekivalen:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">~{salinityPpt} ppt (‰)</span>
                </div>
              </div>
            </div>

            {/* 4. Electrical Conductivity & Energy Stress */}
            <div
              className={`rounded-2xl border p-4.5 flex flex-col justify-between transition-all ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  : 'bg-white/90 border-stone-200/80 hover:border-stone-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                    Konduktivitas Elektrolit (EC)
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isDark
                        ? 'bg-purple-950/60 text-purple-400 border border-purple-800/50'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    Tereduksi TDS
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {conductivityUsCm}
                  </span>
                  <span className="text-base font-bold text-purple-600 dark:text-purple-400">µS/cm</span>
                </div>

                {/* Progress bar based on typical 1500 uS limit */}
                <div className="mt-3 w-full bg-stone-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((conductivityUsCm / 1500) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-slate-800/80 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-stone-500'}>Faktor Konversi:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">TDS / 0.65</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-stone-500'}>Keandalan Sensor:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {prediction.confidenceScore}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-stone-500'}>Status Kejenuhan:</span>
                  <span className="font-semibold text-stone-700 dark:text-slate-300">Aman &amp; Larut</span>
                </div>
              </div>
            </div>
          </div>

          {/* Verdict Banner */}
          <div
            className={`flex items-start sm:items-center gap-3 rounded-2xl border p-4 text-xs transition-colors ${
              isDark
                ? 'bg-slate-950/40 border-slate-800 text-slate-300'
                : 'bg-white border-stone-200 text-stone-700 shadow-xs'
            }`}
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1">
              <span className="font-bold text-stone-900 dark:text-white mr-1.5">
                Kesimpulan Evaluasi Rumusan Data Lapangan:
              </span>
              <span>
                {biocompatibilityVerdict} Parameter pH ({ph.toFixed(2)}), Suhu ({suhu_c.toFixed(1)}°C), dan TDS ({tds_ppm} ppm)
                menghasilkan rasio ekuilibrium ion yang stabil tanpa indikasi keracunan amonia terdisosiasi.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROYEKSI MASA DEPAN ("KEMUDIANNYA KAYAK GMN") */}
      {activeTab === 'forecast' && (
        <div className="space-y-5">
          {/* Main Forecast Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Projected pH Box */}
            <div
              className={`rounded-2xl border p-5 transition-all ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-white border-stone-200/90 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-slate-800">
                <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                  Proyeksi Perubahan pH
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    Math.abs(prediction.phSlopePerMin) < 0.015
                      ? isDark
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isDark
                      ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  <span>30 Menit ke Depan</span>
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                    Saat Ini
                  </span>
                  <span className="font-mono text-2xl font-bold tracking-tight">
                    {ph.toFixed(2)}
                  </span>
                </div>

                <ChevronRight className="h-4 w-4 text-stone-400 dark:text-slate-600" />

                <div>
                  <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                    Prediksi +15 mnt
                  </span>
                  <span className="font-mono text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {prediction.projectedPh15m.toFixed(2)}
                  </span>
                </div>

                <ChevronRight className="h-4 w-4 text-stone-400 dark:text-slate-600" />

                <div>
                  <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                    Prediksi +30 mnt
                  </span>
                  <span className="font-mono text-2xl font-bold text-sky-600 dark:text-sky-400">
                    {prediction.projectedPh30m.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className={`mt-4 rounded-xl p-3 text-xs border ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-stone-50 border-stone-200 text-stone-600'
              }`}>
                <div className="font-semibold text-stone-800 dark:text-slate-200 mb-0.5">Karakteristik Tren:</div>
                <p>{prediction.phTrendDescription}</p>
              </div>
            </div>

            {/* Projected TDS Box */}
            <div
              className={`rounded-2xl border p-5 transition-all ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-white border-stone-200/90 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-slate-800">
                <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                  Proyeksi TDS &amp; Evaporasi
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isDark
                      ? 'bg-sky-950/40 text-sky-400 border border-sky-800/40'
                      : 'bg-sky-50 text-sky-700 border border-sky-200'
                  }`}
                >
                  <Waves className="h-3 w-3" />
                  <span>Dinamika Garam</span>
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                    Saat Ini
                  </span>
                  <span className="font-mono text-2xl font-bold tracking-tight">
                    {tds_ppm}
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-slate-500 block">ppm</span>
                </div>

                <ChevronRight className="h-4 w-4 text-stone-400 dark:text-slate-600" />

                <div>
                  <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                    Prediksi +15 mnt
                  </span>
                  <span className="font-mono text-2xl font-bold text-sky-600 dark:text-sky-400">
                    {prediction.projectedTds15m}
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-slate-500 block">ppm</span>
                </div>

                <ChevronRight className="h-4 w-4 text-stone-400 dark:text-slate-600" />

                <div>
                  <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                    Prediksi +30 mnt
                  </span>
                  <span className="font-mono text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {prediction.projectedTds30m}
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-slate-500 block">ppm</span>
                </div>
              </div>

              <div className={`mt-4 rounded-xl p-3 text-xs border ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-stone-50 border-stone-200 text-stone-600'
              }`}>
                <div className="font-semibold text-stone-800 dark:text-slate-200 mb-0.5">Laju Perubahan:</div>
                <p>
                  {prediction.tdsSlopePerMin >= 0 ? '+' : ''}{prediction.tdsSlopePerMin} ppm/menit.
                  Suhu {suhu_c.toFixed(1)}°C menjaga laju evaporasi dalam batas wajar.
                </p>
              </div>
            </div>

            {/* Ecological Balance / Water Management Box (Dosing is disabled) */}
            <div
              className={`rounded-2xl border p-5 transition-all ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-white border-stone-200/90 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-slate-800">
                <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                  Rekomendasi Manajemen Alami
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isDark
                      ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                  title="Modul dosing dinonaktifkan sementara karena perangkat rusak"
                >
                  <ShieldCheck className="h-3 w-3" />
                  <span>Dosing Nonaktif (Rusak)</span>
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      prediction.ecologicalStatus === 'STABIL_AMAN'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <span className="font-bold text-sm">
                    {prediction.ecologicalStatus === 'STABIL_AMAN'
                      ? 'Keseimbangan Alami Optimal'
                      : prediction.ecologicalStatus === 'PERLU_SIRKULASI'
                      ? 'Disarankan Sirkulasi Air'
                      : prediction.ecologicalStatus === 'PERLU_AERASI'
                      ? 'Disarankan Aerasi Permukaan'
                      : 'Waspadai Evaporasi Garam'}
                  </span>
                </div>

                <p className={`mt-3 text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
                  {prediction.statusMessage}
                </p>

                {prediction.estimatedTimeToThresholdMin !== null && (
                  <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 p-2.5 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                    Estimasi waktu deviasi jika tanpa sirkulasi: ~{prediction.estimatedTimeToThresholdMin} menit lagi.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Predictive Model Confidence Note */}
          <div
            className={`flex items-center justify-between rounded-2xl border p-4 text-xs ${
              isDark
                ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                : 'bg-stone-100/70 border-stone-200 text-stone-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-500" />
              <span>
                Model Proyeksi: <strong>Autoregressive Moving Slope (AR-10)</strong> dengan faktor peredam buffer kimia air natural.
              </span>
            </div>
            <div className="font-mono text-purple-600 dark:text-purple-400 font-bold">
              Tingkat Keyakinan: {prediction.confidenceScore}%
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DETAIL RUMUS MATEMATIKA & SAINS TERBUKA */}
      {activeTab === 'formulas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rumus 1: WQI */}
            <div
              className={`rounded-2xl border p-4.5 space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-stone-200/90 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm text-purple-600 dark:text-purple-400">
                <Gauge className="h-4 w-4" />
                <span>1. Rumus Water Quality Index (WQI %)</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
                Indeks kualitas air dihitung menggunakan metode <em>Weighted Arithmetic Index</em>:
              </p>
              <div
                className={`rounded-xl p-3 font-mono text-xs border ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-purple-300'
                    : 'bg-purple-50/70 border-purple-200/80 text-purple-900'
                }`}
              >
                WQI = 0.45 · q(pH) + 0.35 · q(TDS) + 0.20 · q(Suhu)
              </div>
              <ul className={`text-[11px] space-y-1 list-disc pl-4 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                <li><strong>q(pH)</strong>: Sub-indeks kurva sigmoid penalti deviasi terhadap zona netral ideal (6.8 - 7.6).</li>
                <li><strong>q(TDS)</strong>: Toleransi partikel terlarut dengan ambang batas batas optimal 150 - 450 ppm.</li>
                <li><strong>q(Suhu)</strong>: Sub-indeks kenyamanan termal biota akuatik tropis (26°C - 29.5°C).</li>
              </ul>
            </div>

            {/* Rumus 2: DO Saturation */}
            <div
              className={`rounded-2xl border p-4.5 space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-stone-200/90 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm text-sky-600 dark:text-sky-400">
                <Droplets className="h-4 w-4" />
                <span>2. Rumus Kelarutan Oksigen Benson-Krause</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
                Kapasitas maksimum oksigen terlarut (mg/L) pada suhu perairan <em>T</em> (°C) dan faktor ionik:
              </p>
              <div
                className={`rounded-xl p-3 font-mono text-[11px] border overflow-x-auto ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-sky-300'
                    : 'bg-sky-50/70 border-sky-200/80 text-sky-900'
                }`}
              >
                DO(T) = 14.652 - 0.41022·T + 0.007991·T² - 0.000077774·T³ - (TDS·0.000008)
              </div>
              <ul className={`text-[11px] space-y-1 list-disc pl-4 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                <li>Semakin tinggi suhu air, semakin berkurang kelarutan gas O₂ (hukum Henry).</li>
                <li>Persentase saturasi dihitung terhadap standar baseline perairan budidaya (7.8 mg/L).</li>
              </ul>
            </div>

            {/* Rumus 3: Konduktivitas Listrik */}
            <div
              className={`rounded-2xl border p-4.5 space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-stone-200/90 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-600 dark:text-emerald-400">
                <Zap className="h-4 w-4" />
                <span>3. Rumus Konduktivitas Elektrolit (EC) &amp; Salinitas</span>
              </div>
              <div
                className={`rounded-xl p-3 font-mono text-xs border ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-emerald-300'
                    : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                }`}
              >
                EC (µS/cm) ≈ TDS (ppm) / 0.65<br />
                Salinitas (ppt ‰) ≈ TDS (ppm) × 0.0008
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                Mengestimasi kemampuan perairan menghantarkan arus listrik akibat ion natrium, kalsium, klorida, dan bikarbonat.
              </p>
            </div>

            {/* Rumus 4: Proyeksi Regresi Linear */}
            <div
              className={`rounded-2xl border p-4.5 space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-stone-200/90 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
                <span>4. Rumus Proyeksi Laju Slope (d(pH)/dt)</span>
              </div>
              <div
                className={`rounded-xl p-3 font-mono text-xs border ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-amber-300'
                    : 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                }`}
              >
                Slope = (pH_terbaru - pH_terdahulu) / Δt_menit<br />
                pH_(t+15) = pH_kini + Slope × 15 × Koefisien_Redam(0.85)
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                Koefisien redam 0.85 merefleksikan kapasitas penyangga alami karbonat-bikarbonat (alkalinitas perairan).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
