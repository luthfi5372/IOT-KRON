import React, { useState, useMemo } from 'react';
import {
  Thermometer,
  Droplets,
  Activity,
  Battery,
  AlertTriangle,
  CheckCircle2,
  Clock,
  WifiOff,
  Wrench,
  Cpu,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import { TelemetryLogEntry } from '../types/telemetry';

export type SensorHealthStatus = 'Operational' | 'Reading Stabilizing' | 'Disconnected' | 'Fault';

export interface SensorDiagnosticItem {
  id: string;
  name: string;
  hardwareModel: string;
  interfaceBus: string;
  status: SensorHealthStatus;
  statusLabel: string;
  statusColor: 'emerald' | 'amber' | 'rose' | 'slate';
  currentReading: string;
  signalIntegrity: number; // 0 - 100%
  diagnosticsDetail: string;
  lastUpdated: string;
  isCalibrationDue?: boolean;
}

interface SensorDiagnosticsSectionProps {
  suhu_c: number;
  ph: number;
  tds_ppm: number;
  baterai_persen: number;
  tegangan_v?: number;
  isSensorActive: boolean;
  hasReceivedData: boolean;
  lastMessageAge: number | null;
  logs?: TelemetryLogEntry[];
  isPhCalibrationDue?: boolean;
  isTdsCalibrationDue?: boolean;
  phOperatingHours?: number;
  tdsOperatingHours?: number;
  onOpenMaintenance?: () => void;
  onReconnect?: () => void;
  isDark?: boolean;
}

export const SensorDiagnosticsSection: React.FC<SensorDiagnosticsSectionProps> = ({
  suhu_c,
  ph,
  tds_ppm,
  baterai_persen,
  tegangan_v,
  isSensorActive,
  hasReceivedData,
  lastMessageAge,
  logs = [],
  isPhCalibrationDue = false,
  isTdsCalibrationDue = false,
  phOperatingHours = 0,
  tdsOperatingHours = 0,
  onOpenMaintenance,
  onReconnect,
  isDark = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Determine individual statuses dynamically based on real-time data flow
  const diagnostics = useMemo((): SensorDiagnosticItem[] => {
    const isOnline = isSensorActive && hasReceivedData;
    const isNewConnection = logs.length > 0 && logs.length < 5;

    // 1. Suhu (DS18B20 1-Wire Digital)
    let tempStatus: SensorHealthStatus = 'Operational';
    let tempColor: 'emerald' | 'amber' | 'rose' = 'emerald';
    let tempDetail = 'Sinyal digital stabil, bus CRC valid tanpa frame drop.';

    if (!isOnline || suhu_c <= -50 || suhu_c >= 85) {
      tempStatus = 'Disconnected';
      tempColor = 'rose';
      tempDetail = 'Tidak ada pulsa respon pada bus 1-Wire. Kabel longgar atau sensor offline.';
    } else if (isNewConnection) {
      tempStatus = 'Reading Stabilizing';
      tempColor = 'amber';
      tempDetail = 'Menstabilkan kompensasi termal chip pasca inisialisasi.';
    }

    // 2. pH Probe (pH-4502C Analog Glass Electrode)
    let phStatus: SensorHealthStatus = 'Operational';
    let phColor: 'emerald' | 'amber' | 'rose' = 'emerald';
    let phDetail = 'Elektroda kaca dalam ekuilibrium larutan optimal.';

    if (!isOnline || ph < 1.0 || ph > 13.9) {
      phStatus = 'Disconnected';
      phColor = 'rose';
      phDetail = 'Tegangan impedansi ADC nol / terputus. Periksa BNC connector.';
    } else if (isNewConnection || (logs.length >= 2 && Math.abs(logs[logs.length - 1].ph - logs[logs.length - 2].ph) > 0.25)) {
      phStatus = 'Reading Stabilizing';
      phColor = 'amber';
      phDetail = 'Ekuilibrium potensial elektroda sedang beradaptasi dengan larutan sampel.';
    }

    // 3. TDS Probe (Analog TDS Conductivity Meter)
    let tdsStatus: SensorHealthStatus = 'Operational';
    let tdsColor: 'emerald' | 'amber' | 'rose' = 'emerald';
    let tdsDetail = 'Konduktansi ionik stabil terkompensasi suhu.';

    if (!isOnline || tds_ppm < 0) {
      tdsStatus = 'Disconnected';
      tdsColor = 'rose';
      tdsDetail = 'Sinyal analog TDS di luar jangkauan (probe terbuka / offline).';
    } else if (isNewConnection || (logs.length >= 2 && Math.abs(logs[logs.length - 1].tds_ppm - logs[logs.length - 2].tds_ppm) > 35)) {
      tdsStatus = 'Reading Stabilizing';
      tdsColor = 'amber';
      tdsDetail = 'Stabilisasi polarisasi probe pada media perairan konduktif.';
    }

    // 4. Power ADC & System Telemetry (ESP32-S3 ADC)
    let batStatus: SensorHealthStatus = 'Operational';
    let batColor: 'emerald' | 'amber' | 'rose' = 'emerald';
    let batDetail = 'Regulasi rel tegangan internal normal & stabil.';

    if (!isOnline) {
      batStatus = 'Disconnected';
      batColor = 'rose';
      batDetail = 'Telemetri paket data catu daya tidak diterima.';
    } else if (baterai_persen < 15) {
      batStatus = 'Reading Stabilizing';
      batColor = 'amber';
      batDetail = 'Kapasitas baterai menipis, disarankan pengisian segera.';
    }

    return [
      {
        id: 'ds18b20',
        name: 'Sensor Suhu Air',
        hardwareModel: 'Dallas DS18B20',
        interfaceBus: '1-Wire Bus (GPIO4)',
        status: tempStatus,
        statusLabel: tempStatus,
        statusColor: tempColor,
        currentReading: isOnline ? `${suhu_c.toFixed(1)} °C` : '--',
        signalIntegrity: isOnline ? 99.4 : 0,
        diagnosticsDetail: tempDetail,
        lastUpdated: isOnline ? `${lastMessageAge ?? 0}s lalu` : 'Terputus',
      },
      {
        id: 'ph4502c',
        name: 'Probe Derajat Keasaman',
        hardwareModel: 'pH-4502C Glass Probe',
        interfaceBus: 'Analog ADC1 (GPIO36)',
        status: phStatus,
        statusLabel: phStatus,
        statusColor: phColor,
        currentReading: isOnline ? `${ph.toFixed(2)} pH` : '--',
        signalIntegrity: isOnline ? (isPhCalibrationDue ? 88.5 : 98.7) : 0,
        diagnosticsDetail: phDetail,
        lastUpdated: isOnline ? `${lastMessageAge ?? 0}s lalu` : 'Terputus',
        isCalibrationDue: isPhCalibrationDue,
      },
      {
        id: 'tds_meter',
        name: 'Sensor Padatan Terlarut',
        hardwareModel: 'Analog TDS Meter',
        interfaceBus: 'Analog ADC1 (GPIO39)',
        status: tdsStatus,
        statusLabel: tdsStatus,
        statusColor: tdsColor,
        currentReading: isOnline ? `${Math.round(tds_ppm)} ppm` : '--',
        signalIntegrity: isOnline ? (isTdsCalibrationDue ? 89.0 : 99.1) : 0,
        diagnosticsDetail: tdsDetail,
        lastUpdated: isOnline ? `${lastMessageAge ?? 0}s lalu` : 'Terputus',
        isCalibrationDue: isTdsCalibrationDue,
      },
      {
        id: 'esp32_pwr',
        name: 'Catu Daya & ADC Kapal',
        hardwareModel: 'ESP32-S3 VBAT ADC',
        interfaceBus: 'Internal Divider (GPIO35)',
        status: batStatus,
        statusLabel: batStatus,
        statusColor: batColor,
        currentReading: isOnline ? `${Math.round(baterai_persen)}% (${tegangan_v ? tegangan_v.toFixed(2) : (10.0 + (baterai_persen / 100) * 2.6).toFixed(2)}V)` : '--',
        signalIntegrity: isOnline ? 100 : 0,
        diagnosticsDetail: batDetail,
        lastUpdated: isOnline ? `${lastMessageAge ?? 0}s lalu` : 'Terputus',
      },
      {
        id: 'dosing_pump',
        name: 'Aktuator Pompa Dosing',
        hardwareModel: 'Driver Dual Peristaltic',
        interfaceBus: 'Relay Opto (GPIO26/27)',
        status: 'Fault',
        statusLabel: 'Disabled (Hardware Fault)',
        statusColor: 'slate',
        currentReading: 'Nonaktif',
        signalIntegrity: 0,
        diagnosticsDetail: 'Kerusakan mekanis terdeteksi pada motor peristaltik. Sirkuit pengaman diaktifkan.',
        lastUpdated: 'Terkunci',
      },
    ];
  }, [
    isSensorActive,
    hasReceivedData,
    suhu_c,
    ph,
    tds_ppm,
    baterai_persen,
    tegangan_v,
    lastMessageAge,
    logs,
    isPhCalibrationDue,
    isTdsCalibrationDue,
  ]);

  // Overall sensor summary count
  const operationalCount = diagnostics.filter((d) => d.status === 'Operational').length;
  const stabilizingCount = diagnostics.filter((d) => d.status === 'Reading Stabilizing').length;
  const disconnectedCount = diagnostics.filter((d) => d.status === 'Disconnected').length;

  const cardContainer = isDark
    ? 'border border-slate-800/80 bg-[#121826]/90 backdrop-blur-xl rounded-2xl shadow-xs'
    : 'border border-stone-200/80 bg-white/95 backdrop-blur-md rounded-2xl shadow-xs';

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <section aria-label="Diagnostik Sensor Fisik" className={`${cardContainer} p-5 transition-all duration-300`}>
      {/* Header with Title and Global Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-stone-200/70 dark:border-slate-800/70">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 ${
              isDark ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-sky-50 text-sky-600 border border-sky-100'
            }`}
          >
            <Activity className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-semibold tracking-tight ${textPrimary}`}>
                Diagnostik Sensor &amp; Perangkat Keras
              </h2>
              <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
              <span className={`text-xs ${textSecondary}`}>
                Integritas Sinyal Telemetri
              </span>
            </div>
            <p className={`text-xs ${textSecondary}`}>
              Status operasional individual sensor probe kapal secara real-time
            </p>
          </div>
        </div>

        {/* Global Summary Badge & Expand Button */}
        <div className="flex items-center gap-2">
          {/* Status summary pills */}
          <div className="flex items-center gap-2 text-xs">
            {isSensorActive && operationalCount >= 3 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50">
                <span className="h-2 w-2 rounded-full bg-emerald-500 live-sensor-glow" />
                <span>{operationalCount}/4 Sensor Aktif</span>
              </span>
            ) : stabilizingCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{stabilizingCount} Menstabilkan</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                <span>Sensor Terputus</span>
              </span>
            )}

            {isPhCalibrationDue || isTdsCalibrationDue ? (
              <button
                onClick={onOpenMaintenance}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 cursor-pointer hover:bg-amber-100"
                title="Buka panduan rekalibrasi sensor"
              >
                <Wrench className="h-3 w-3" />
                <span>Perlu Kalibrasi</span>
              </button>
            ) : null}
          </div>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className={`btn-simple p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white border-slate-800' : 'text-slate-500 hover:text-slate-900 border-stone-200'
            }`}
            title={isExpanded ? 'Sembunyikan detail diagnostik' : 'Buka detail diagnostik'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Grid of Individual Sensor Diagnostics */}
      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5 animate-fade-in">
          {diagnostics.map((sensor) => {
            // Determine small color-coded indicator dot & badge style
            let dotColorClass = 'bg-emerald-500';
            let dotPulseClass = 'animate-pulse';
            let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';

            if (sensor.status === 'Reading Stabilizing') {
              dotColorClass = 'bg-amber-400';
              dotPulseClass = 'animate-ping';
              badgeBg = 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
            } else if (sensor.status === 'Disconnected') {
              dotColorClass = 'bg-rose-500';
              dotPulseClass = 'animate-pulse';
              badgeBg = 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
            } else if (sensor.status === 'Fault') {
              dotColorClass = 'bg-slate-400 dark:bg-slate-500';
              dotPulseClass = '';
              badgeBg = 'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
            }

            const itemBg = isDark
              ? 'bg-[#161d2e]/80 border-slate-800/90 hover:border-slate-700'
              : 'bg-[#faf9f6] border-stone-200/80 hover:border-stone-300';

            return (
              <div
                key={sensor.id}
                className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 ${itemBg}`}
              >
                <div>
                  {/* Top: Name & Interface */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <h3 className={`text-xs font-semibold ${textPrimary}`}>
                        {sensor.name}
                      </h3>
                      <p className={`text-[10px] ${textSecondary}`}>
                        {sensor.hardwareModel}
                      </p>
                    </div>

                    {/* Sensor Icon */}
                    <div className="shrink-0">
                      {sensor.id === 'ds18b20' && <Thermometer className="h-3.5 w-3.5 text-orange-500" />}
                      {sensor.id === 'ph4502c' && <Droplets className="h-3.5 w-3.5 text-emerald-500" />}
                      {sensor.id === 'tds_meter' && <Activity className="h-3.5 w-3.5 text-sky-500" />}
                      {sensor.id === 'esp32_pwr' && <Battery className="h-3.5 w-3.5 text-indigo-500" />}
                      {sensor.id === 'dosing_pump' && <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                  </div>

                  {/* Status Indicator Pill with color-coded dot */}
                  <div className="mt-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${badgeBg}`}
                      title={sensor.diagnosticsDetail}
                    >
                      <span className="relative flex h-2 w-2">
                        {sensor.status !== 'Fault' && (
                          <span
                            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColorClass} ${dotPulseClass}`}
                          />
                        )}
                        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColorClass}`} />
                      </span>
                      <span>{sensor.statusLabel}</span>
                    </span>
                  </div>

                  {/* Current Reading & Interface Line */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className={textSecondary}>Nilai Terbaca:</span>
                      <span className={`font-semibold tabular-nums ${textPrimary}`}>
                        {sensor.currentReading}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className={textSecondary}>Jalur I/O:</span>
                      <span className={`font-mono text-[10px] ${textSecondary}`}>
                        {sensor.interfaceBus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom diagnostics explanation */}
                <div className="mt-3 pt-2 border-t border-stone-200/50 dark:border-slate-800/60">
                  <p className={`text-[10px] leading-relaxed line-clamp-2 ${textSecondary}`} title={sensor.diagnosticsDetail}>
                    {sensor.diagnosticsDetail}
                  </p>

                  {/* Probe calibration warning if due */}
                  {sensor.isCalibrationDue && onOpenMaintenance && (
                    <button
                      onClick={onOpenMaintenance}
                      className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      <Wrench className="h-2.5 w-2.5" />
                      <span>Kalibrasi ulang disarankan &rarr;</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
