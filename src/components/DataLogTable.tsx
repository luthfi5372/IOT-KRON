import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Download,
  Trash2,
  Filter,
  Search,
  HardDrive,
  Clock,
  Cloud,
  CloudUpload,
  Check,
  FileDown,
  FileText,
  Table,
  ChevronDown,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { TelemetryLogEntry, TelemetryPayload } from '../types/telemetry';
import { User as FirebaseUser } from 'firebase/auth';
import {
  exportReportCsv,
  exportReportPdf,
  SessionStatsData,
  formatDuration,
} from '../utils/reportExporter';

interface DataLogTableProps {
  logs: TelemetryLogEntry[];
  onClearLogs: () => void;
  currentUser?: FirebaseUser | null;
  onSaveLogsToCloud?: () => void;
  isSavingCloud?: boolean;
  cloudSyncSuccess?: boolean;
  isDark?: boolean;
  sessionStats?: {
    count: number;
    sumSuhu: number;
    sumPh: number;
    sumTds: number;
    minSuhu?: number | null;
    maxSuhu?: number | null;
    minPh?: number | null;
    maxPh?: number | null;
    minTds?: number | null;
    maxTds?: number | null;
  };
  activeConnectionSeconds?: number;
  sessionStartTime?: number;
  currentTelemetry?: TelemetryPayload;
}

export const DataLogTable: React.FC<DataLogTableProps> = ({
  logs,
  onClearLogs,
  currentUser,
  onSaveLogsToCloud,
  isSavingCloud,
  cloudSyncSuccess,
  isDark = false,
  sessionStats,
  activeConnectionSeconds = 0,
  sessionStartTime,
  currentTelemetry,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Download Report Modal & Dropdown state
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [exportNotification, setExportNotification] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Handle escape key to close modals
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsReportModalOpen(false);
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesStatus =
        filterStatus === 'ALL'
          ? true
          : filterStatus === 'ACID'
          ? log.ph < 6.5
          : filterStatus === 'BASE'
          ? log.ph > 8.5
          : filterStatus === 'HIGH_TDS'
          ? log.tds_ppm > 500
          : filterStatus === 'NORMAL'
          ? log.ph >= 6.5 && log.ph <= 8.5 && log.tds_ppm <= 500
          : true;

      const matchesSearch =
        searchQuery === ''
          ? true
          : log.timeFormatted.includes(searchQuery) ||
            log.ph.toString().includes(searchQuery) ||
            log.suhu_c.toString().includes(searchQuery) ||
            log.tds_ppm.toString().includes(searchQuery) ||
            log.status.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [logs, filterStatus, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Unified Session Statistics Data for Export
  const effectiveSessionStats: SessionStatsData = useMemo(() => {
    if (sessionStats && sessionStats.count > 0) {
      return {
        count: sessionStats.count,
        sumSuhu: sessionStats.sumSuhu,
        sumPh: sessionStats.sumPh,
        sumTds: sessionStats.sumTds,
        minSuhu: sessionStats.minSuhu,
        maxSuhu: sessionStats.maxSuhu,
        minPh: sessionStats.minPh,
        maxPh: sessionStats.maxPh,
        minTds: sessionStats.minTds,
        maxTds: sessionStats.maxTds,
        activeSeconds: activeConnectionSeconds,
        sessionStartTime: sessionStartTime,
        latestSuhu: currentTelemetry?.suhu_c ?? logs[0]?.suhu_c,
        latestPh: currentTelemetry?.ph ?? logs[0]?.ph,
        latestTds: currentTelemetry?.tds_ppm ?? logs[0]?.tds_ppm,
        latestBattery: currentTelemetry?.baterai_persen ?? logs[0]?.baterai_persen,
      };
    }

    if (logs.length > 0) {
      const sumSuhu = logs.reduce((acc, curr) => acc + curr.suhu_c, 0);
      const sumPh = logs.reduce((acc, curr) => acc + curr.ph, 0);
      const sumTds = logs.reduce((acc, curr) => acc + curr.tds_ppm, 0);
      const minSuhu = Math.min(...logs.map((l) => l.suhu_c));
      const maxSuhu = Math.max(...logs.map((l) => l.suhu_c));
      const minPh = Math.min(...logs.map((l) => l.ph));
      const maxPh = Math.max(...logs.map((l) => l.ph));
      const minTds = Math.min(...logs.map((l) => l.tds_ppm));
      const maxTds = Math.max(...logs.map((l) => l.tds_ppm));

      return {
        count: logs.length,
        sumSuhu,
        sumPh,
        sumTds,
        minSuhu,
        maxSuhu,
        minPh,
        maxPh,
        minTds,
        maxTds,
        activeSeconds: activeConnectionSeconds,
        sessionStartTime: sessionStartTime,
        latestSuhu: logs[0]?.suhu_c,
        latestPh: logs[0]?.ph,
        latestTds: logs[0]?.tds_ppm,
        latestBattery: logs[0]?.baterai_persen,
      };
    }

    return {
      count: 0,
      sumSuhu: 0,
      sumPh: 0,
      sumTds: 0,
      minSuhu: null,
      maxSuhu: null,
      minPh: null,
      maxPh: null,
      minTds: null,
      maxTds: null,
      activeSeconds: activeConnectionSeconds,
      sessionStartTime: sessionStartTime,
      latestSuhu: currentTelemetry?.suhu_c,
      latestPh: currentTelemetry?.ph,
      latestTds: currentTelemetry?.tds_ppm,
      latestBattery: currentTelemetry?.baterai_persen,
    };
  }, [sessionStats, logs, activeConnectionSeconds, sessionStartTime, currentTelemetry]);

  // Trigger notification toast
  const triggerNotification = (msg: string) => {
    setExportNotification(msg);
    setTimeout(() => {
      setExportNotification(null);
    }, 4000);
  };

  // PDF Export trigger
  const handleDownloadPdf = () => {
    if (logs.length === 0) return;
    try {
      exportReportPdf(logs, effectiveSessionStats);
      triggerNotification('Laporan PDF berhasil dibuat dan diunduh!');
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  // CSV Export trigger (with full session summary metadata)
  const handleDownloadCsv = () => {
    if (logs.length === 0) return;
    try {
      exportReportCsv(logs, effectiveSessionStats);
      triggerNotification('Laporan CSV (data historis & ringkasan) berhasil diunduh!');
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  // Summary Metrics for in-card header display
  const summary = useMemo(() => {
    if (logs.length === 0) return { avgTemp: '0.0', avgPh: '0.00', avgTds: 0, avgBattery: 0, count: 0 };
    const totalTemp = logs.reduce((acc, curr) => acc + curr.suhu_c, 0);
    const totalPh = logs.reduce((acc, curr) => acc + curr.ph, 0);
    const totalTds = logs.reduce((acc, curr) => acc + curr.tds_ppm, 0);
    const totalBattery = logs.reduce((acc, curr) => acc + (curr.baterai_persen ?? 85), 0);

    return {
      avgTemp: (totalTemp / logs.length).toFixed(1),
      avgPh: (totalPh / logs.length).toFixed(2),
      avgTds: Math.round(totalTds / logs.length),
      avgBattery: Math.round(totalBattery / logs.length),
      count: logs.length,
    };
  }, [logs]);

  const cardBase = isDark
    ? 'animate-fade-in-up bg-[#131826]/90 border border-slate-800/80 p-5 sm:p-6 rounded-2xl backdrop-blur-xl shadow-xs'
    : 'animate-fade-in-up bg-white border border-stone-200/80 p-5 sm:p-6 rounded-2xl shadow-xs transition-all';

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const divider = isDark ? 'border-slate-800/60' : 'border-stone-200/60';

  return (
    <div className={cardBase}>
      {/* Header with stats and actions */}
      <div className={`flex flex-wrap items-center justify-between gap-4 border-b ${divider} pb-4`}>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 hover:scale-105 ${
              isDark
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/25'
                : 'bg-sky-50 text-sky-600 border border-sky-200/70'
            }`}
          >
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-semibold tracking-tight ${textPrimary}`}>
                Log Data Telemetri &amp; Riwayat Sesi
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {logs.length} entri
              </span>
            </div>
            <p className={`text-xs ${textSecondary}`}>
              Penyimpanan lokal telemetri kualitas air kapal untuk analisis &amp; ekspor CSV
            </p>
          </div>
        </div>

        {/* Quick summary cards */}
        {logs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className={`hover-lift rounded-xl px-3 py-1.5 ${isDark ? 'bg-slate-900/60 border border-slate-800' : 'bg-slate-50 border border-slate-200/70'}`}>
              <span className={`block text-[10px] ${textSecondary}`}>Rata-rata Suhu</span>
              <span className="text-orange-600 font-semibold tabular-nums">{summary.avgTemp} °C</span>
            </div>
            <div className={`hover-lift rounded-xl px-3 py-1.5 ${isDark ? 'bg-slate-900/60 border border-slate-800' : 'bg-slate-50 border border-slate-200/70'}`}>
              <span className={`block text-[10px] ${textSecondary}`}>Rata-rata pH</span>
              <span className="text-emerald-700 font-semibold tabular-nums">{summary.avgPh}</span>
            </div>
            <div className={`hover-lift rounded-xl px-3 py-1.5 ${isDark ? 'bg-slate-900/60 border border-slate-800' : 'bg-slate-50 border border-slate-200/70'}`}>
              <span className={`block text-[10px] ${textSecondary}`}>Rata-rata TDS</span>
              <span className="text-sky-700 font-semibold tabular-nums">{summary.avgTds} ppm</span>
            </div>
            <div className={`hover-lift rounded-xl px-3 py-1.5 ${isDark ? 'bg-slate-900/60 border border-slate-800' : 'bg-slate-50 border border-slate-200/70'}`}>
              <span className={`block text-[10px] ${textSecondary}`}>Rata-rata Daya</span>
              <span className="text-emerald-700 font-semibold tabular-nums">{summary.avgBattery}%</span>
            </div>
          </div>
        )}

        {/* Action Buttons: Export, Cloud Save & Clear */}
        <div className="flex items-center gap-2">
          {currentUser && onSaveLogsToCloud && (
            <button
              onClick={onSaveLogsToCloud}
              disabled={logs.length === 0 || isSavingCloud}
              className={`btn-simple flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold cursor-pointer shadow-xs ${
                cloudSyncSuccess
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Simpan sesi telemetri ke cloud Firestore"
            >
              {cloudSyncSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Tersimpan di Cloud</span>
                </>
              ) : isSavingCloud ? (
                <>
                  <Cloud className="h-3.5 w-3.5 animate-bounce" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="h-3.5 w-3.5 text-sky-600" />
                  <span>Simpan Firestore</span>
                </>
              )}
            </button>
          )}

          {/* Download Report Button with Split Menu */}
          <div className="relative" ref={dropdownRef}>
            <div className="btn-simple flex items-center rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-xs transition-all">
              <button
                onClick={() => setIsReportModalOpen(true)}
                disabled={logs.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold hover:bg-white/10 rounded-l-full disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Buka panel Download Report (PDF & CSV)"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>Download Report</span>
              </button>
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                disabled={logs.length === 0}
                className="px-2 py-1.5 text-xs hover:bg-white/10 rounded-r-full border-l border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Pilih format unduhan cepat (PDF atau CSV)"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Quick format dropdown */}
            {isDropdownOpen && (
              <div
                className={`animate-fade-in-up absolute right-0 top-full mt-2 w-64 rounded-2xl p-1.5 shadow-xl border z-30 transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                  Opsi Format Laporan
                </div>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleDownloadPdf();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <FileText className="h-4 w-4 text-sky-500 shrink-0" />
                  <div>
                    <div className="font-semibold">Unduh Dokumen PDF (.pdf)</div>
                    <div className="text-[10px] text-slate-400">Format resmi A4, grafik tren &amp; statistik</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleDownloadCsv();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <Table className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-semibold">Unduh Spreadsheet CSV (.csv)</div>
                    <div className="text-[10px] text-slate-400">Header metadata ringkasan + data tabular</div>
                  </div>
                </button>
                <div className="my-1 border-t border-slate-200/40 dark:border-slate-800" />
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsReportModalOpen(true);
                  }}
                  className="flex w-full items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Kustomisasi & Pratinjau Laporan</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs ${
              isDark
                ? 'border border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-rose-500/15 hover:text-rose-300'
                : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Hapus</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs flex items-center gap-1 ${textSecondary}`}>
            <Filter className="h-3 w-3" /> Filter:
          </span>
          <div
            className={`flex items-center rounded-full p-1 text-xs font-medium ${
              isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200/70'
            }`}
          >
            <button
              onClick={() => {
                setFilterStatus('ALL');
                setCurrentPage(1);
              }}
              className={`rounded-full px-3 py-1 transition-colors cursor-pointer ${
                filterStatus === 'ALL'
                  ? isDark
                    ? 'bg-slate-800 text-white font-medium'
                    : 'bg-white text-slate-900 font-semibold shadow-xs'
                  : textSecondary
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => {
                setFilterStatus('NORMAL');
                setCurrentPage(1);
              }}
              className={`rounded-full px-3 py-1 transition-colors cursor-pointer ${
                filterStatus === 'NORMAL'
                  ? 'bg-emerald-100 text-emerald-800 font-semibold shadow-xs'
                  : textSecondary
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => {
                setFilterStatus('ACID');
                setCurrentPage(1);
              }}
              className={`rounded-full px-3 py-1 transition-colors cursor-pointer ${
                filterStatus === 'ACID'
                  ? 'bg-amber-100 text-amber-800 font-semibold shadow-xs'
                  : textSecondary
              }`}
            >
              pH Asam (&lt;6.5)
            </button>
            <button
              onClick={() => {
                setFilterStatus('BASE');
                setCurrentPage(1);
              }}
              className={`rounded-full px-3 py-1 transition-colors cursor-pointer ${
                filterStatus === 'BASE'
                  ? 'bg-rose-100 text-rose-800 font-semibold shadow-xs'
                  : textSecondary
              }`}
            >
              pH Basa (&gt;8.5)
            </button>
            <button
              onClick={() => {
                setFilterStatus('HIGH_TDS');
                setCurrentPage(1);
              }}
              className={`rounded-full px-3 py-1 transition-colors cursor-pointer ${
                filterStatus === 'HIGH_TDS'
                  ? 'bg-sky-100 text-sky-800 font-semibold shadow-xs'
                  : textSecondary
              }`}
            >
              TDS Tinggi
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nilai pH, TDS, jam..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className={`w-full rounded-full pl-9 pr-3.5 py-1.5 text-xs transition-colors focus:outline-none ${
              isDark
                ? 'border border-slate-800 bg-slate-900 text-slate-200 placeholder-slate-500 focus:border-sky-500'
                : 'border border-stone-200 bg-stone-50 text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:bg-white'
            }`}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className={`mt-3.5 overflow-x-auto rounded-2xl border ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-stone-200/80 bg-white'
        }`}
      >
        <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <thead className={`border-b text-[11px] font-semibold ${isDark ? 'border-slate-800 bg-slate-900/80 text-slate-400' : 'border-stone-200 bg-stone-50/80 text-slate-600'}`}>
            <tr>
              <th className="py-3 px-4 font-semibold">Waktu</th>
              <th className="py-3 px-4 font-semibold">Suhu (°C)</th>
              <th className="py-3 px-4 font-semibold">pH Air</th>
              <th className="py-3 px-4 font-semibold">TDS (ppm)</th>
              <th className="py-3 px-4 font-semibold">Baterai (%)</th>
              <th className="py-3 px-4 font-semibold">Status Kualitas Air</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800/40' : 'divide-stone-100'}`}>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  {logs.length === 0
                    ? 'Belum ada log data. Tunggu transmisi MQTT atau jalankan Simulator ESP32.'
                    : 'Tidak ada data yang sesuai filter pencarian.'}
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => {
                const isAcid = log.ph < 6.5;
                const isBase = log.ph > 8.5;
                const batVal = log.baterai_persen ?? 85;
                const isBatLow = batVal < 20;
                const isHighTds = log.tds_ppm > 500;

                return (
                  <tr
                    key={log.id}
                    className={`transition-colors ${isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50/80'}`}
                  >
                    <td className="py-2.5 px-4 flex items-center gap-1.5 text-slate-500">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span className="tabular-nums">{log.timeFormatted}</span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-orange-600 tabular-nums">
                      {log.suhu_c.toFixed(1)} °C
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-semibold tabular-nums text-xs ${
                          isAcid
                            ? 'bg-amber-100 text-amber-800'
                            : isBase
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {log.ph.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-sky-700 font-medium tabular-nums">
                      {log.tds_ppm} ppm
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`font-semibold rounded-full px-2 py-0.5 text-xs tabular-nums ${
                          isBatLow
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : batVal <= 45
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {batVal}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          isAcid
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : isBase
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : isHighTds
                            ? 'bg-sky-100 text-sky-800 border border-sky-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isAcid
                          ? 'pH Asam'
                          : isBase
                          ? 'pH Basa'
                          : isHighTds
                          ? 'TDS Tinggi'
                          : 'Optimal'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {filteredLogs.length > pageSize && (
        <div className={`mt-3 flex items-center justify-between text-xs ${textSecondary}`}>
          <div>
            Menampilkan {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, filteredLogs.length)} dari {filteredLogs.length} entri
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-40 transition-colors cursor-pointer shadow-xs ${
                isDark ? 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border border-stone-200 bg-white text-slate-700 hover:bg-stone-50'
              }`}
            >
              Sebelumnya
            </button>
            <span className={`px-2 font-medium ${textPrimary}`}>
              Hal {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-40 transition-colors cursor-pointer shadow-xs ${
                isDark ? 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border border-stone-200 bg-white text-slate-700 hover:bg-stone-50'
              }`}
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
      {/* Toast Notifikasi Ekspor */}
      {exportNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-white" />
          <span>{exportNotification}</span>
        </div>
      )}

      {/* Modal Download Report */}
      {isReportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsReportModalOpen(false)}
        >
          <div
            className={`w-full max-w-xl rounded-3xl p-6 shadow-2xl border transition-all ${
              isDark
                ? 'bg-[#111622] border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-500 border border-sky-500/25">
                  <FileDown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Download Report Telemetri
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ekspor ringkasan statistik sesi berjalan &amp; log historis kualitas air kapal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Session Stats Summary Snapshot */}
            <div className="my-5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-sky-500" />
                  Pratinjau Ringkasan Sesi yang Akan Dimasukkan:
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  Durasi: {formatDuration(effectiveSessionStats.activeSeconds)}
                </span>
              </div>

              <div
                className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl p-3 border ${
                  isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200/70'
                }`}
              >
                <div className="p-2">
                  <span className="block text-[10px] text-slate-400">Rata-rata Suhu</span>
                  <span className="text-sm font-semibold text-orange-600 dark:orange-400 tabular-nums">
                    {effectiveSessionStats.count > 0
                      ? (effectiveSessionStats.sumSuhu / effectiveSessionStats.count).toFixed(1)
                      : summary.avgTemp}{' '}
                    °C
                  </span>
                  <span className="block text-[9px] text-slate-400 mt-0.5">
                    Min: {effectiveSessionStats.minSuhu != null ? effectiveSessionStats.minSuhu.toFixed(1) : '-'} · Max: {effectiveSessionStats.maxSuhu != null ? effectiveSessionStats.maxSuhu.toFixed(1) : '-'}
                  </span>
                </div>

                <div className="p-2">
                  <span className="block text-[10px] text-slate-400">Rata-rata pH</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {effectiveSessionStats.count > 0
                      ? (effectiveSessionStats.sumPh / effectiveSessionStats.count).toFixed(2)
                      : summary.avgPh}
                  </span>
                  <span className="block text-[9px] text-slate-400 mt-0.5">
                    Min: {effectiveSessionStats.minPh != null ? effectiveSessionStats.minPh.toFixed(2) : '-'} · Max: {effectiveSessionStats.maxPh != null ? effectiveSessionStats.maxPh.toFixed(2) : '-'}
                  </span>
                </div>

                <div className="p-2">
                  <span className="block text-[10px] text-slate-400">Rata-rata TDS</span>
                  <span className="text-sm font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
                    {effectiveSessionStats.count > 0
                      ? Math.round(effectiveSessionStats.sumTds / effectiveSessionStats.count)
                      : summary.avgTds}{' '}
                    ppm
                  </span>
                  <span className="block text-[9px] text-slate-400 mt-0.5">
                    Min: {effectiveSessionStats.minTds ?? '-'} · Max: {effectiveSessionStats.maxTds ?? '-'}
                  </span>
                </div>

                <div className="p-2">
                  <span className="block text-[10px] text-slate-400">Total Sampel Log</span>
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {logs.length} entri
                  </span>
                  <span className="block text-[9px] text-slate-400 mt-0.5">
                    Catu: {effectiveSessionStats.latestBattery ?? 85}%
                  </span>
                </div>
              </div>
            </div>

            {/* Export Format Selection Cards */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Format Ekspor Laporan:
              </div>

              {/* PDF Option Card */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                  isDark
                    ? 'border-sky-500/30 bg-sky-500/5 hover:border-sky-500/50'
                    : 'border-sky-200 bg-sky-50/50 hover:border-sky-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-xs">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold">Laporan Dokumen PDF (.pdf)</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Laporan resmi A4 siap cetak &amp; arsip. Dilengkapi kartu KPI sesi, grafik tren fluktuasi
                      vektor (pH &amp; Suhu/TDS), ringkasan statistik komprehensif, evaluasi baku mutu PP No. 22/2021,
                      dan tabel log historis terformat.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleDownloadPdf();
                    setIsReportModalOpen(false);
                  }}
                  disabled={logs.length === 0}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh PDF</span>
                </button>
              </div>

              {/* CSV Option Card */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                  isDark
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                    : 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <Table className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold">Spreadsheet Data CSV (.csv)</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Format data terstruktur Excel/Sheets. Memuat baris metadata ringkasan sesi (durasi,
                      rata-rata, min/max) pada header dokumen diikuti seluruh baris telemetri historis.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleDownloadCsv();
                    setIsReportModalOpen(false);
                  }}
                  disabled={logs.length === 0}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh CSV</span>
                </button>
              </div>
            </div>

            {/* Footer action */}
            <div className="mt-5 pt-3 flex items-center justify-end border-t border-slate-200/60 dark:border-slate-800/60">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
