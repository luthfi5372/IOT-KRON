import React from 'react';
import { Power, Cpu } from 'lucide-react';
import { PumpState } from '../types/telemetry';

interface RelayControlCardsProps {
  pompaUp: PumpState;
  pompaDown: PumpState;
  ph: number;
  isManualMode: boolean;
  onToggleManualMode: () => void;
  onManualPumpToggle: (pump: 'up' | 'down', targetState: PumpState) => void;
  isDark?: boolean;
}

export const RelayControlCards: React.FC<RelayControlCardsProps> = ({
  pompaUp,
  pompaDown,
  isManualMode,
  onToggleManualMode,
  onManualPumpToggle,
  isDark = false,
}) => {
  const isUpActive = pompaUp === 'ON';
  const isDownActive = pompaDown === 'ON';

  const cardBase = isDark
    ? 'pinterest-card-dark bg-[#131826]/85 border-slate-800/60 p-5 sm:p-6 rounded-3xl backdrop-blur-xl'
    : 'pinterest-card-light bg-white border-stone-200/70 p-5 sm:p-6 rounded-3xl shadow-sm transition-all';

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const divider = isDark ? 'border-slate-800/40' : 'border-slate-100';

  return (
    <div className={cardBase}>
      {/* Header section with Mode selector */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-4 border-b ${divider}`}>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
              isDark
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/25'
                : 'bg-sky-50 text-sky-600 border border-sky-200/70'
            }`}
          >
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xs font-semibold sm:text-sm ${textPrimary}`}>
                Kontrol &amp; Monitoring Relay Dosing
              </h2>
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  isDark
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Interlock Aman
              </span>
            </div>
            <p className={`text-xs ${textSecondary}`}>
              Status pompa dosing otomatis penetral pH perairan kapal
            </p>
          </div>
        </div>

        {/* Soft Mode Selector Pill */}
        <div className="flex items-center gap-2">
          <span className={`text-xs ${textSecondary}`}>Mode:</span>
          <div
            className={`flex items-center rounded-full p-1 text-xs font-medium ${
              isDark ? 'bg-slate-900/90 border border-slate-800' : 'bg-slate-100 border border-slate-200/70'
            }`}
          >
            <button
              onClick={() => isManualMode && onToggleManualMode()}
              className={`rounded-full px-3.5 py-1 transition-all cursor-pointer ${
                !isManualMode
                  ? isDark
                    ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30 shadow-xs'
                    : 'bg-white text-slate-800 font-semibold shadow-xs'
                  : textSecondary
              }`}
            >
              Otomatis (Sensor)
            </button>
            <button
              onClick={() => !isManualMode && onToggleManualMode()}
              className={`rounded-full px-3.5 py-1 transition-all cursor-pointer ${
                isManualMode
                  ? isDark
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 shadow-xs'
                    : 'bg-amber-100 text-amber-900 font-semibold shadow-xs'
                  : textSecondary
              }`}
            >
              Manual Operator
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 2 Relay Pump Cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* RELAY 1: POMPA pH UP */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
            isUpActive
              ? isDark
                ? 'border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-slate-900/60 shadow-xs'
                : 'border-amber-300 bg-amber-50/70 shadow-xs'
              : isDark
              ? 'border-slate-800/60 bg-slate-950/30'
              : 'border-stone-200/70 bg-stone-50/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${textSecondary}`}>
                  Relay #1 · GPIO 18
                </span>
              </div>
              <h3 className={`mt-1 text-sm font-semibold flex items-center gap-1.5 ${textPrimary}`}>
                Pompa Dosing pH Up
                <span className="text-xs font-normal text-amber-600">(Basa / Alkali)</span>
              </h3>
              <p className={`mt-1 text-xs ${textSecondary}`}>
                Pemicu Otomatis: <span className="text-amber-600 font-semibold">pH &lt; 6.50</span> (Injeksi larutan alkali basa)
              </p>
            </div>

            {/* Pill Indicator */}
            <div>
              {isUpActive ? (
                <div className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-100 text-amber-800 px-3 py-1 text-xs font-semibold shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Aktif (Dosing)
                </div>
              ) : (
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    isDark ? 'border border-slate-800 bg-slate-900/80 text-slate-400' : 'border border-stone-200 bg-white text-slate-500'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Standby
                </div>
              )}
            </div>
          </div>

          <div
            className={`mt-3.5 flex items-center justify-between rounded-xl px-3 py-2 text-xs ${
              isDark ? 'bg-slate-900/60 border border-slate-800' : 'bg-white/80 border border-stone-200/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={textSecondary}>Status:</span>
              <span className={isUpActive ? 'text-amber-600 font-semibold' : textSecondary}>
                {isUpActive ? 'Relay Aktif (ON)' : 'Relay Terbuka (OFF)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={textSecondary}>Debit:</span>
              <span className={`font-medium ${textPrimary}`}>60 mL/mnt</span>
            </div>
          </div>

          {/* Manual control actions */}
          {isManualMode ? (
            <div className={`mt-3 pt-2.5 border-t ${divider}`}>
              <button
                onClick={() => onManualPumpToggle('up', isUpActive ? 'OFF' : 'ON')}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  isUpActive
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                {isUpActive ? 'Hentikan Pompa Up' : 'Nyalakan Manual Pompa Up'}
              </button>
            </div>
          ) : (
            <div className={`mt-2 text-[11px] ${textSecondary} flex items-center gap-1.5`}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Diproteksi otomatis oleh algoritma sensor.
            </div>
          )}
        </div>

        {/* RELAY 2: POMPA pH DOWN */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
            isDownActive
              ? isDark
                ? 'border-rose-400/40 bg-gradient-to-br from-rose-500/10 via-slate-900/80 to-slate-900/60 shadow-xs'
                : 'border-rose-300 bg-rose-50/70 shadow-xs'
              : isDark
              ? 'border-slate-800/60 bg-slate-950/30'
              : 'border-stone-200/70 bg-stone-50/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${textSecondary}`}>
                  Relay #2 · GPIO 19
                </span>
              </div>
              <h3 className={`mt-1 text-sm font-semibold flex items-center gap-1.5 ${textPrimary}`}>
                Pompa Dosing pH Down
                <span className="text-xs font-normal text-rose-600">(Asam)</span>
              </h3>
              <p className={`mt-1 text-xs ${textSecondary}`}>
                Pemicu Otomatis: <span className="text-rose-600 font-semibold">pH &gt; 8.50</span> (Injeksi larutan asam encer)
              </p>
            </div>

            {/* Pill Indicator */}
            <div>
              {isDownActive ? (
                <div className="flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-100 text-rose-800 px-3 py-1 text-xs font-semibold shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  Aktif (Dosing)
                </div>
              ) : (
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    isDark ? 'border border-slate-800 bg-slate-900/80 text-slate-400' : 'border border-stone-200 bg-white text-slate-500'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Standby
                </div>
              )}
            </div>
          </div>

          <div
            className={`mt-3.5 flex items-center justify-between rounded-xl px-3 py-2 text-xs ${
              isDark ? 'bg-slate-900/60 border border-slate-800' : 'bg-white/80 border border-stone-200/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={textSecondary}>Status:</span>
              <span className={isDownActive ? 'text-rose-600 font-semibold' : textSecondary}>
                {isDownActive ? 'Relay Aktif (ON)' : 'Relay Terbuka (OFF)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={textSecondary}>Debit:</span>
              <span className={`font-medium ${textPrimary}`}>60 mL/mnt</span>
            </div>
          </div>

          {/* Manual control actions */}
          {isManualMode ? (
            <div className={`mt-3 pt-2.5 border-t ${divider}`}>
              <button
                onClick={() => onManualPumpToggle('down', isDownActive ? 'OFF' : 'ON')}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  isDownActive
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                {isDownActive ? 'Hentikan Pompa Down' : 'Nyalakan Manual Pompa Down'}
              </button>
            </div>
          ) : (
            <div className={`mt-2 text-[11px] ${textSecondary} flex items-center gap-1.5`}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Diproteksi otomatis oleh algoritma sensor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
