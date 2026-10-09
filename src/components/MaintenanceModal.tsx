import React, { useState } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  X,
  Droplets,
  Activity,
  Thermometer,
  Info,
  Calendar,
  FastForward,
  Settings2,
  Check,
} from 'lucide-react';
import { SensorMaintenanceState } from '../types/maintenance';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  maintenance: SensorMaintenanceState;
  onResetPhCalibration: () => void;
  onResetTdsCalibration: () => void;
  onSetPhMaxHours: (hours: number) => void;
  onSetTdsMaxHours: (hours: number) => void;
  onSimulateAdvanceTime: (hours: number) => void;
  isDark?: boolean;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  maintenance,
  onResetPhCalibration,
  onResetTdsCalibration,
  onSetPhMaxHours,
  onSetTdsMaxHours,
  onSimulateAdvanceTime,
  isDark = false,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'guide' | 'settings'>('status');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  // Format hours and minutes from total seconds
  const formatHoursMins = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return `${hours} jam ${mins} mnt`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculations
  const phOperatingHours = maintenance.phOperatingSeconds / 3600;
  const phPercent = Math.min(150, Math.round((phOperatingHours / maintenance.phMaxOperatingHours) * 100));
  const isPhDue = phOperatingHours >= maintenance.phMaxOperatingHours;
  const isPhWarning = !isPhDue && phOperatingHours >= maintenance.phMaxOperatingHours * 0.85;

  const tdsOperatingHours = maintenance.tdsOperatingSeconds / 3600;
  const tdsPercent = Math.min(150, Math.round((tdsOperatingHours / maintenance.tdsMaxOperatingHours) * 100));
  const isTdsDue = tdsOperatingHours >= maintenance.tdsMaxOperatingHours;
  const isTdsWarning = !isTdsDue && tdsOperatingHours >= maintenance.tdsMaxOperatingHours * 0.85;

  const handleResetPh = () => {
    onResetPhCalibration();
    setSuccessToast('Probe pH-4502C berhasil ditandai selesai kalibrasi! Jam kerja di-reset ke 0.');
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleResetTds = () => {
    onResetTdsCalibration();
    setSuccessToast('Probe TDS Analog berhasil ditandai selesai kalibrasi! Jam kerja di-reset ke 0.');
    setTimeout(() => setSuccessToast(null), 3500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-3xl p-6 shadow-2xl border transition-all max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-[#111622] border-slate-800 text-slate-100' : 'bg-white border-stone-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-200/60 dark:border-slate-800/60 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-xs ${
                isDark ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'
              }`}
            >
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  Pelacakan Jam Operasional &amp; Kalibrasi Sensor
                </h3>
                {(isPhDue || isTdsDue) && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
                    <AlertTriangle className="h-3 w-3" />
                    Perlu Kalibrasi
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                Pemantauan jam kerja kumulatif sensor USV NUSA-01 &amp; pengingat jadwal kalibrasi berkala
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-5 border-b border-stone-200/60 dark:border-slate-800/60 pb-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`btn-simple flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === 'status'
                ? isDark
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Status Jam Operasi</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`btn-simple flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === 'guide'
                ? isDark
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-sky-100 text-sky-800 border border-sky-200'
                : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            <span>Panduan Kalibrasi Buffer</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`btn-simple flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === 'settings'
                ? isDark
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Pengaturan Interval &amp; Uji</span>
          </button>
        </div>

        {/* TAB 1: STATUS JAM KERJA PROBE */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            {/* 1. pH Probe Status Card */}
            <div
              className={`rounded-2xl p-4 border transition-all ${
                isPhDue
                  ? isDark
                    ? 'border-rose-500/50 bg-rose-950/20 shadow-xs'
                    : 'border-rose-300 bg-rose-50/60 shadow-xs'
                  : isPhWarning
                  ? isDark
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : 'border-amber-300 bg-amber-50/60'
                  : isDark
                  ? 'border-slate-800 bg-slate-900/60'
                  : 'border-stone-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isPhDue
                        ? 'bg-rose-500 text-white'
                        : isDark
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    <Droplets className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Probe Kaca pH (Sensor pH-4502C)</h4>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400">
                      Rekomendasi kalibrasi rutin: tiap {maintenance.phMaxOperatingHours} jam operasi aktif
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    isPhDue
                      ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 animate-pulse'
                      : isPhWarning
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                      : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                  }`}
                >
                  {isPhDue ? 'Waktunya Kalibrasi Ulang (Overdue)' : isPhWarning ? 'Mendekati Batas (Siapkan Buffer)' : 'Kalibrasi Prima'}
                </span>
              </div>

              {/* Progress Bar & Metrics */}
              <div className="space-y-1.5 mb-3.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-stone-700 dark:text-slate-300">
                    Jam Operasi Kumulatif: <span className="font-mono">{formatHoursMins(maintenance.phOperatingSeconds)}</span>
                  </span>
                  <span className="font-mono font-bold text-stone-600 dark:text-slate-400">
                    {phPercent}% dari {maintenance.phMaxOperatingHours} jam
                  </span>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isPhDue ? 'bg-rose-500' : isPhWarning ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, phPercent)}%` }}
                  />
                </div>
              </div>

              {/* Calibration Metadata & Action Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200/60 dark:border-slate-800/60 text-xs">
                <div className="flex items-center gap-1.5 text-stone-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Terakhir Dikalibrasi: {formatDate(maintenance.lastPhCalibrationDate)}</span>
                  <span className="hidden sm:inline">· Total: {maintenance.phCalibrationCount}x</span>
                </div>

                <button
                  onClick={handleResetPh}
                  className="btn-simple flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs cursor-pointer"
                  title="Tandai probe telah dikalibrasi dengan buffer pH dan reset jam operasi ke 0"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Tandai Sudah Dikalibrasi (Reset)</span>
                </button>
              </div>
            </div>

            {/* 2. TDS Probe Status Card */}
            <div
              className={`rounded-2xl p-4 border transition-all ${
                isTdsDue
                  ? isDark
                    ? 'border-rose-500/50 bg-rose-950/20 shadow-xs'
                    : 'border-rose-300 bg-rose-50/60 shadow-xs'
                  : isTdsWarning
                  ? isDark
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : 'border-amber-300 bg-amber-50/60'
                  : isDark
                  ? 'border-slate-800 bg-slate-900/60'
                  : 'border-stone-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isTdsDue
                        ? 'bg-rose-500 text-white'
                        : isDark
                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Probe Sensor TDS Analog</h4>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400">
                      Rekomendasi kalibrasi berkala: tiap {maintenance.tdsMaxOperatingHours} jam operasi aktif
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    isTdsDue
                      ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 animate-pulse'
                      : isTdsWarning
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                      : 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700'
                  }`}
                >
                  {isTdsDue ? 'Waktunya Kalibrasi Ulang (Overdue)' : isTdsWarning ? 'Mendekati Batas' : 'Kalibrasi Prima'}
                </span>
              </div>

              {/* Progress Bar & Metrics */}
              <div className="space-y-1.5 mb-3.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-stone-700 dark:text-slate-300">
                    Jam Operasi Kumulatif: <span className="font-mono">{formatHoursMins(maintenance.tdsOperatingSeconds)}</span>
                  </span>
                  <span className="font-mono font-bold text-stone-600 dark:text-slate-400">
                    {tdsPercent}% dari {maintenance.tdsMaxOperatingHours} jam
                  </span>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isTdsDue ? 'bg-rose-500' : isTdsWarning ? 'bg-amber-500' : 'bg-sky-500'
                    }`}
                    style={{ width: `${Math.min(100, tdsPercent)}%` }}
                  />
                </div>
              </div>

              {/* Calibration Metadata & Action Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200/60 dark:border-slate-800/60 text-xs">
                <div className="flex items-center gap-1.5 text-stone-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Terakhir Dikalibrasi: {formatDate(maintenance.lastTdsCalibrationDate)}</span>
                  <span className="hidden sm:inline">· Total: {maintenance.tdsCalibrationCount}x</span>
                </div>

                <button
                  onClick={handleResetTds}
                  className="btn-simple flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs cursor-pointer"
                  title="Tandai probe telah dikalibrasi dengan larutan standar TDS dan reset jam operasi ke 0"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Tandai Sudah Dikalibrasi (Reset)</span>
                </button>
              </div>
            </div>

            {/* 3. Sensor Suhu Info (DS18B20) */}
            <div className="rounded-2xl p-3.5 border border-stone-200/70 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Thermometer className="h-4 w-4 text-orange-500" />
                <div>
                  <span className="font-semibold">Sensor Suhu Air Digital DS18B20</span>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
                    Protokol 1-Wire terkalibrasi pabrik ±0.5°C (-10°C s/d +85°C). Bebas perawatan kalibrasi rutin.
                  </p>
                </div>
              </div>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-[10px]">
                Bebas Kalibrasi
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: PANDUAN KALIBRASI BUFFER */}
        {activeTab === 'guide' && (
          <div className="space-y-4 text-xs">
            <div className="rounded-2xl p-4 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60">
              <h4 className="font-bold text-sky-900 dark:text-sky-200 mb-2 flex items-center gap-1.5">
                <Droplets className="h-4 w-4 text-sky-500" />
                Prosedur Kalibrasi 2 Titik Probe pH-4502C:
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-stone-600 dark:text-slate-300 leading-relaxed">
                <li>Bilas probe kaca dengan air aquades (deionisasi) dan keringkan perlahan dengan tisu halus.</li>
                <li>
                  Celupkan probe ke larutan buffer standar <strong>pH 6.86 (Netral)</strong> pada suhu ~25°C. Putar potensiometer offset hingga nilai terbaca tepat 6.86 pH.
                </li>
                <li>
                  Bilas kembali dengan aquades, lalu celupkan ke buffer <strong>pH 4.01 (Asam)</strong> atau <strong>pH 9.18 (Basa)</strong>. Sesuaikan potensiometer gain/kemiringan.
                </li>
                <li>Setelah selesai, tekan tombol <strong>"Tandai Sudah Dikalibrasi"</strong> untuk mereset pencatat waktu operasional.</li>
              </ol>
            </div>

            <div className="rounded-2xl p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60">
              <h4 className="font-bold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-amber-500" />
                Prosedur Kalibrasi Probe TDS Analog:
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-stone-600 dark:text-slate-300 leading-relaxed">
                <li>Bersihkan elektroda TDS dengan air murni untuk membersihkan kerak atau lumut biofouling.</li>
                <li>Celupkan ke larutan standar konduktivitas <strong>1413 µS/cm</strong> (ekuivalen ~707 ppm TDS).</li>
                <li>Pastikan kompensasi suhu aktif (sensor DS18B20 terendam bersamaan) pada ~25°C.</li>
                <li>Sesuaikan nilai faktor konversi K pada firmware ESP32 jika terdapat deviasi &gt;5%.</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 3: PENGATURAN INTERVAL & UJI SIMULASI */}
        {activeTab === 'settings' && (
          <div className="space-y-4 text-xs">
            <div className="rounded-2xl p-4 border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/40 space-y-3">
              <h4 className="font-bold">Konfigurasi Batas Waktu Kalibrasi (Operating Hours Threshold)</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 mb-1">
                    Batas Jam Kerja Probe pH:
                  </label>
                  <select
                    value={maintenance.phMaxOperatingHours}
                    onChange={(e) => onSetPhMaxHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value={2}>2 Jam (Mode Demonstrasi Singkat)</option>
                    <option value={24}>24 Jam (Uji Lapangan 1 Hari)</option>
                    <option value={50}>50 Jam (Standar Rekomendasi Pabrik)</option>
                    <option value={100}>100 Jam (Operasi Jangka Panjang)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 mb-1">
                    Batas Jam Kerja Probe TDS:
                  </label>
                  <select
                    value={maintenance.tdsMaxOperatingHours}
                    onChange={(e) => onSetTdsMaxHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value={4}>4 Jam (Mode Demonstrasi Singkat)</option>
                    <option value={48}>48 Jam (Uji Lapangan 2 Hari)</option>
                    <option value={100}>100 Jam (Standar Rekomendasi Pabrik)</option>
                    <option value={200}>200 Jam (Operasi Jangka Panjang)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Simulation Quick Buttons */}
            <div className="rounded-2xl p-4 border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/40">
              <h4 className="font-bold mb-1 flex items-center gap-1.5">
                <FastForward className="h-4 w-4 text-indigo-500" />
                Uji Cepat Notifikasi Pengingat (Simulasi Jam Kerja)
              </h4>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 mb-3">
                Tambahkan jam kerja kumulatif instan untuk menguji tampilan pengingat banner &amp; notifikasi peringatan kalibrasi di UI:
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onSimulateAdvanceTime(5)}
                  className="btn-simple rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold cursor-pointer hover:bg-stone-50 dark:hover:bg-slate-700"
                >
                  +5 Jam Operasi
                </button>
                <button
                  onClick={() => onSimulateAdvanceTime(25)}
                  className="btn-simple rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold cursor-pointer hover:bg-stone-50 dark:hover:bg-slate-700"
                >
                  +25 Jam Operasi
                </button>
                <button
                  onClick={() => onSimulateAdvanceTime(50)}
                  className="btn-simple rounded-xl border border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-3 py-1.5 text-xs font-semibold cursor-pointer hover:bg-rose-100"
                >
                  +50 Jam (Picu Overdue Pengingat)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-stone-200/60 dark:border-slate-800/60 pt-4">
          <span className="text-[11px] text-stone-400 dark:text-slate-500">
            Pencatatan jam kerja otomatis bertambah saat sensor telemetri aktif
          </span>
          <button
            onClick={onClose}
            className="btn-simple rounded-xl bg-stone-900 dark:bg-slate-800 hover:bg-stone-800 dark:hover:bg-slate-700 text-white px-4 py-2 text-xs font-semibold shadow-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
