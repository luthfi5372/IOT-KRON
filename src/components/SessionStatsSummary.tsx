import React from 'react';
import {
  Timer,
  Clock,
  Thermometer,
  Droplets,
  Activity,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Wifi,
  WifiOff,
} from 'lucide-react';

export interface SessionStatsSummaryProps {
  avgSuhu: number | null;
  avgPh: number | null;
  avgTds: number | null;
  minSuhu?: number | null;
  maxSuhu?: number | null;
  minPh?: number | null;
  maxPh?: number | null;
  minTds?: number | null;
  maxTds?: number | null;
  currentSuhu: number;
  currentPh: number;
  currentTds: number;
  sampleCount: number;
  activeSeconds: number;
  isConnected: boolean;
  isSensorActive?: boolean;
  isDark?: boolean;
  sessionStartTime?: number;
  onResetSession?: () => void;
}

export const SessionStatsSummary: React.FC<SessionStatsSummaryProps> = ({
  avgSuhu,
  avgPh,
  avgTds,
  minSuhu,
  maxSuhu,
  minPh,
  maxPh,
  minTds,
  maxTds,
  currentSuhu,
  currentPh,
  currentTds,
  sampleCount,
  activeSeconds,
  isConnected,
  isSensorActive = true,
  isDark = false,
  sessionStartTime,
  onResetSession,
}) => {
  // Format active duration into HH:MM:SS
  const formatDuration = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // Format start time
  const formattedStartTime = sessionStartTime
    ? new Date(sessionStartTime).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  // Helper for delta calculation
  const getDeltaBadge = (current: number, avg: number | null, unit: string = '', decimals: number = 2) => {
    if (avg === null || isNaN(avg) || sampleCount === 0) {
      return (
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Mengumpulkan data...
        </span>
      );
    }
    const diff = current - avg;
    if (Math.abs(diff) < 0.05) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <Minus className="h-3 w-3 stroke-[2.5]" />
          <span>Sesuai rata-rata</span>
        </span>
      );
    }
    if (diff > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          <TrendingUp className="h-3 w-3 stroke-[2.5]" />
          <span>+{diff.toFixed(decimals)} {unit} dari rata-rata</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400">
        <TrendingDown className="h-3 w-3 stroke-[2.5]" />
        <span>{diff.toFixed(decimals)} {unit} dari rata-rata</span>
      </span>
    );
  };

  // Water quality status based on average pH
  const getPhStatus = (ph: number | null) => {
    if (ph === null) return { text: 'Belum ada data', color: 'text-slate-500' };
    if (ph >= 6.5 && ph <= 8.5) return { text: 'Optimal (Baku Mutu)', color: 'text-emerald-500' };
    if (ph < 6.5) return { text: 'Cenderung Asam', color: 'text-amber-500' };
    return { text: 'Cenderung Basa', color: 'text-purple-500' };
  };

  // TDS category based on average TDS
  const getTdsStatus = (tds: number | null) => {
    if (tds === null) return { text: 'Belum ada data', color: 'text-slate-500' };
    if (tds < 150) return { text: 'Air Rendah Mineral', color: 'text-sky-500' };
    if (tds <= 500) return { text: 'Air Ideal / Tawar', color: 'text-emerald-500' };
    if (tds <= 1000) return { text: 'Ambang Batas Minum', color: 'text-amber-500' };
    return { text: 'Air Payau / Bergaram', color: 'text-rose-500' };
  };

  const phStatus = getPhStatus(avgPh);
  const tdsStatus = getTdsStatus(avgTds);

  return (
    <div
      className={`rounded-2xl transition-all duration-300 p-4 sm:p-5 border shadow-xs animate-fade-in-up ${
        isDark
          ? 'bg-[#121826]/90 border-slate-800/80 text-slate-100 shadow-black/20'
          : 'bg-white border-stone-200/80 text-stone-800 shadow-stone-200/40'
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-stone-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl shadow-xs transition-transform duration-300 hover:scale-105 ${
              isDark
                ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400'
                : 'bg-indigo-50 border border-indigo-200/80 text-indigo-600'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight">
                Ringkasan Statistik Sesi Berjalan
              </h3>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/50">
                Live Aggregation
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-slate-400">
              Rata-rata kumulatif parameter air dari {sampleCount} pembacaan sejak {formattedStartTime}
            </p>
          </div>
        </div>

        {/* Right Action: Reset Sesi Button & Connection Indicator */}
        <div className="flex items-center gap-2">
          {onResetSession && (
            <button
              onClick={onResetSession}
              title="Reset akumulasi statistik rata-rata untuk memulai sesi pengukuran baru"
              className={`btn-simple flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer border ${
                isDark
                  ? 'border-slate-700/70 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 hover:text-stone-900 shadow-2xs'
              }`}
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Sesi</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Durasi Koneksi Aktif */}
        <div
          className={`hover-lift relative overflow-hidden rounded-xl p-3.5 border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              : 'bg-stone-50/70 border-stone-200/80 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-stone-500 dark:text-slate-400 flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-emerald-500" />
              Durasi Koneksi Aktif
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                isConnected && isSensorActive
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected && isSensorActive
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`}
              />
              {isConnected && isSensorActive ? 'Aktif' : 'Terjeda'}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatDuration(activeSeconds)}
            </span>
            <span className="text-xs text-stone-500 dark:text-slate-400 font-mono">
              detik ({activeSeconds}s)
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400 pt-1 border-t border-stone-200/50 dark:border-slate-800/50">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Mulai: {formattedStartTime}
            </span>
            <span className="font-medium text-stone-600 dark:text-slate-300">
              {sampleCount} paket data
            </span>
          </div>
        </div>

        {/* 2. Rata-rata Suhu Air */}
        <div
          className={`hover-lift relative overflow-hidden rounded-xl p-3.5 border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              : 'bg-stone-50/70 border-stone-200/80 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-stone-500 dark:text-slate-400 flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 text-amber-500" />
              Rata-rata Suhu
            </span>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              DS18B20
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
              {avgSuhu !== null ? avgSuhu.toFixed(2) : '--.--'}
            </span>
            <span className="text-xs font-semibold text-stone-500 dark:text-slate-400">
              °C
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-200/50 dark:border-slate-800/50">
            <div>
              {getDeltaBadge(currentSuhu, avgSuhu, '°C', 1)}
            </div>
            <div className="text-[10px] text-stone-400 dark:text-slate-500 font-mono">
              {minSuhu !== undefined && minSuhu !== null && maxSuhu !== undefined && maxSuhu !== null
                ? `${minSuhu.toFixed(1)}° - ${maxSuhu.toFixed(1)}°`
                : ''}
            </div>
          </div>
        </div>

        {/* 3. Rata-rata pH Air */}
        <div
          className={`hover-lift relative overflow-hidden rounded-xl p-3.5 border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              : 'bg-stone-50/70 border-stone-200/80 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-stone-500 dark:text-slate-400 flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-cyan-500" />
              Rata-rata pH
            </span>
            <span className={`text-[10px] font-semibold ${phStatus.color}`}>
              {phStatus.text}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-cyan-600 dark:text-cyan-400">
              {avgPh !== null ? avgPh.toFixed(2) : '--.--'}
            </span>
            <span className="text-xs font-semibold text-stone-500 dark:text-slate-400">
              pH
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-200/50 dark:border-slate-800/50">
            <div>
              {getDeltaBadge(currentPh, avgPh, 'pH', 2)}
            </div>
            <div className="text-[10px] text-stone-400 dark:text-slate-500 font-mono">
              {minPh !== undefined && minPh !== null && maxPh !== undefined && maxPh !== null
                ? `${minPh.toFixed(2)} - ${maxPh.toFixed(2)}`
                : ''}
            </div>
          </div>
        </div>

        {/* 4. Rata-rata TDS Air */}
        <div
          className={`hover-lift relative overflow-hidden rounded-xl p-3.5 border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              : 'bg-stone-50/70 border-stone-200/80 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-stone-500 dark:text-slate-400 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              Rata-rata TDS
            </span>
            <span className={`text-[10px] font-semibold ${tdsStatus.color}`}>
              {tdsStatus.text}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400">
              {avgTds !== null ? Math.round(avgTds) : '---'}
            </span>
            <span className="text-xs font-semibold text-stone-500 dark:text-slate-400">
              ppm
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-200/50 dark:border-slate-800/50">
            <div>
              {getDeltaBadge(currentTds, avgTds, 'ppm', 0)}
            </div>
            <div className="text-[10px] text-stone-400 dark:text-slate-500 font-mono">
              {minTds !== undefined && minTds !== null && maxTds !== undefined && maxTds !== null
                ? `${Math.round(minTds)} - ${Math.round(maxTds)}`
                : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Quick Insight */}
      <div className="mt-3 pt-3 border-t border-stone-200/50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>
            {avgPh !== null && avgPh >= 6.5 && avgPh <= 8.5
              ? 'Kondisi air stabil: pH rata-rata dalam batas ambang baku mutu lingkungan perairan.'
              : 'Perhatian: Ada indikasi deviasi nilai pH di luar batas baku mutu (6.5 - 8.5).'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-stone-500 dark:text-slate-500 font-mono">
          <span>Suhu Terkini: {currentSuhu.toFixed(1)}°C</span>
          <span>·</span>
          <span>pH Terkini: {currentPh.toFixed(2)}</span>
          <span>·</span>
          <span>TDS Terkini: {Math.round(currentTds)} ppm</span>
        </div>
      </div>
    </div>
  );
};
