import React from 'react';
import {
  Wrench,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  X,
  Droplets,
  Activity,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { SensorMaintenanceState } from '../types/maintenance';

interface MaintenanceReminderBannerProps {
  maintenance: SensorMaintenanceState;
  onOpenMaintenanceModal: () => void;
  onQuickResetPh: () => void;
  onQuickResetTds: () => void;
  onDismiss: () => void;
  isDark?: boolean;
}

export const MaintenanceReminderBanner: React.FC<MaintenanceReminderBannerProps> = ({
  maintenance,
  onOpenMaintenanceModal,
  onQuickResetPh,
  onQuickResetTds,
  onDismiss,
  isDark = false,
}) => {
  if (maintenance.reminderDismissed) return null;

  const phHours = maintenance.phOperatingSeconds / 3600;
  const isPhDue = phHours >= maintenance.phMaxOperatingHours;
  const isPhWarning = !isPhDue && phHours >= maintenance.phMaxOperatingHours * 0.85;

  const tdsHours = maintenance.tdsOperatingSeconds / 3600;
  const isTdsDue = tdsHours >= maintenance.tdsMaxOperatingHours;
  const isTdsWarning = !isTdsDue && tdsHours >= maintenance.tdsMaxOperatingHours * 0.85;

  // Only show if at least one probe is due or approaching due
  if (!isPhDue && !isTdsDue && !isPhWarning && !isTdsWarning) return null;

  const isCritical = isPhDue || isTdsDue;

  return (
    <div
      role="alert"
      className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 border shadow-xs animate-fade-in ${
        isCritical
          ? isDark
            ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-amber-950/20 to-[#121826]/90 text-rose-100 shadow-rose-950/20'
            : 'border-rose-300 bg-gradient-to-r from-rose-50 via-amber-50/50 to-white text-rose-950 shadow-rose-100/40'
          : isDark
          ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-[#121826]/90 text-amber-100'
          : 'border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50/30 to-white text-amber-950 shadow-amber-100/40'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform duration-300 hover:scale-105 ${
              isCritical
                ? 'bg-rose-500 text-white'
                : 'bg-amber-500 text-white'
            }`}
          >
            <Wrench className="h-5 w-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                {isCritical
                  ? 'Pengingat Waktu Kalibrasi Ulang Sensor Tercapai'
                  : 'Pemberitahuan: Mendekati Jadwal Kalibrasi Sensor'}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isCritical
                    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300'
                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300'
                }`}
              >
                {isCritical ? 'Perlu Rekalibrasi' : 'Jadwal Rutin'}
              </span>
            </div>

            <p className="text-xs mt-0.5 leading-relaxed opacity-90 max-w-3xl">
              {isPhDue && isTdsDue ? (
                <>
                  Probe <strong>pH-4502C</strong> ({phHours.toFixed(1)}j / {maintenance.phMaxOperatingHours}j) dan{' '}
                  <strong>TDS Analog</strong> ({tdsHours.toFixed(1)}j / {maintenance.tdsMaxOperatingHours}j) telah melampaui ambang batas jam operasional kumulatif. Rekalibrasi diperlukan untuk menjamin akurasi telemetri.
                </>
              ) : isPhDue ? (
                <>
                  Probe kaca <strong>pH-4502C</strong> telah aktif beroperasi selama{' '}
                  <span className="font-mono font-bold">{phHours.toFixed(1)} jam</span> (batas kalibrasi berkala:{' '}
                  {maintenance.phMaxOperatingHours} jam). Kalibrasi ulang dengan larutan buffer pH 6.86 &amp; 4.01.
                </>
              ) : isTdsDue ? (
                <>
                  Probe <strong>TDS Analog</strong> telah aktif beroperasi selama{' '}
                  <span className="font-mono font-bold">{tdsHours.toFixed(1)} jam</span> (batas kalibrasi berkala:{' '}
                  {maintenance.tdsMaxOperatingHours} jam). Kalibrasi ulang dengan larutan standar 1413 µS/cm.
                </>
              ) : (
                <>
                  Sensor telemetri mendekati batas jam kerja berkala (pH: {phHours.toFixed(1)}j / {maintenance.phMaxOperatingHours}j, TDS: {tdsHours.toFixed(1)}j / {maintenance.tdsMaxOperatingHours}j). Siapkan buffer larutan standar.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenMaintenanceModal}
            className={`btn-simple flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold cursor-pointer shadow-xs ${
              isCritical
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            <span>Buka Detail &amp; Panduan</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {isPhDue && (
            <button
              onClick={onQuickResetPh}
              className="btn-simple flex items-center gap-1 rounded-xl border border-stone-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium cursor-pointer hover:bg-white"
              title="Reset jam kerja probe pH"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset pH</span>
            </button>
          )}

          {isTdsDue && (
            <button
              onClick={onQuickResetTds}
              className="btn-simple flex items-center gap-1 rounded-xl border border-stone-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium cursor-pointer hover:bg-white"
              title="Reset jam kerja probe TDS"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset TDS</span>
            </button>
          )}

          <button
            onClick={onDismiss}
            className="rounded-full p-1 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Tutup pengingat ini sementara"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
