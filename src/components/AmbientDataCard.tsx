import React, { useState } from 'react';
import {
  CloudSun,
  RefreshCw,
  MapPin,
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  Sun,
  CloudRain,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ChevronDown,
  Navigation,
} from 'lucide-react';
import {
  AmbientLocation,
  AmbientSyncState,
  PRESET_WATER_LOCATIONS,
} from '../types/ambient';

interface AmbientDataCardProps {
  ambientState: AmbientSyncState;
  suhuAir_c: number;
  phAir: number;
  tdsAir: number;
  isDark: boolean;
  onSyncNow: () => void;
  onSelectLocation: (loc: AmbientLocation) => void;
  onDetectGpsLocation: () => void;
  onToggleAutoSync: () => void;
}

export const AmbientDataCard: React.FC<AmbientDataCardProps> = ({
  ambientState,
  suhuAir_c,
  phAir,
  tdsAir,
  isDark,
  onSyncNow,
  onSelectLocation,
  onDetectGpsLocation,
  onToggleAutoSync,
}) => {
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const { location, weather, correlation, isSyncing, lastSyncTimestamp, autoSyncEnabled, source } =
    ambientState;

  // Format time ago
  const formatTimeAgo = (ts: number): string => {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (elapsedSeconds < 10) return 'Baru saja';
    if (elapsedSeconds < 60) return `${elapsedSeconds} detik lalu`;
    const mins = Math.floor(elapsedSeconds / 60);
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    return `${hours} jam lalu`;
  };

  const cardBase = isDark
    ? 'bg-[#121826]/90 border border-slate-800/80 text-slate-100 shadow-xs'
    : 'bg-white border border-stone-200/80 text-slate-800 shadow-xs';

  const subCardBase = isDark
    ? 'bg-slate-900/60 border border-slate-800/70 hover:border-slate-700/80 transition-all duration-300'
    : 'bg-stone-50/80 border border-stone-200/70 hover:border-stone-300 transition-all duration-300';

  return (
    <div className={`rounded-2xl p-5 sm:p-6 transition-all duration-300 animate-fade-in-up ${cardBase}`}>
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/60 dark:border-slate-800/60">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 hover:rotate-6 ${
              isDark
                ? 'bg-amber-500/15 border border-amber-500/25 text-amber-300'
                : 'bg-amber-50 border border-amber-200/90 text-amber-600'
            }`}
          >
            <CloudSun className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Sinkronisasi Data Lingkungan &amp; Cuaca Sekitar
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  source === 'live_api'
                    ? isDark
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : isDark
                    ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                    : 'bg-sky-50 border-sky-200 text-sky-700'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {source === 'live_api' ? 'Open-Meteo Live API' : 'Stasiun Pemantau Lokal'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Korelasi parameter telemetri sensor USV (Suhu {suhuAir_c.toFixed(1)}°C, pH {phAir.toFixed(2)}, TDS {Math.round(tdsAir)} PPM) dengan kondisi meteorologi atmosfer sekitar
            </p>
          </div>
        </div>

        {/* Action Controls: Location, GPS, Sync Now */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Location Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
              className={`btn-simple flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700/70 text-slate-200 hover:bg-slate-700/80'
                  : 'bg-white border-stone-200 text-slate-700 hover:bg-stone-50 shadow-2xs'
              }`}
              title="Pilih lokasi perairan sekitar"
            >
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              <span className="max-w-[140px] truncate">{location.name}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isLocationDropdownOpen && (
              <div
                className={`absolute right-0 top-full mt-2 w-72 rounded-2xl p-2 z-50 border shadow-lg backdrop-blur-xl animate-fade-in-up ${
                  isDark
                    ? 'bg-[#151c2d] border-slate-700/80 text-slate-200'
                    : 'bg-white border-stone-200 text-slate-800'
                }`}
              >
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Pilih Titik Perairan Sekitar
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {PRESET_WATER_LOCATIONS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onSelectLocation(preset);
                        setIsLocationDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        location.id === preset.id
                          ? isDark
                            ? 'bg-sky-500/20 text-sky-300 font-bold'
                            : 'bg-sky-50 text-sky-700 font-bold'
                          : isDark
                          ? 'hover:bg-slate-800/60'
                          : 'hover:bg-stone-100'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {preset.waterType} · {preset.province}
                        </div>
                      </div>
                      {location.id === preset.id && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* GPS Detector Button */}
          <button
            onClick={onDetectGpsLocation}
            className={`btn-simple flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
              isDark
                ? 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:bg-slate-700/80'
                : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50 shadow-2xs'
            }`}
            title="Deteksi koordinat GPS aktual perangkat sekitar perairan"
          >
            <Navigation className="h-3.5 w-3.5 text-indigo-500" />
            <span className="hidden sm:inline">GPS Saya</span>
          </button>

          {/* Sync Now Button */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className={`btn-simple flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
              isDark
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 hover:bg-sky-500/30'
                : 'bg-sky-600 border-sky-700 text-white hover:bg-sky-700 shadow-xs'
            } ${isSyncing ? 'opacity-70 cursor-not-allowed' : ''}`}
            title="Tarik pembaruan data cuaca sekitar langsung dari Open-Meteo"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-Bar: Last Sync Info & Auto-Sync Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs">
        <div className="flex items-center gap-2">
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            Titik Pantau: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{location.name}</strong> ({location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°)
          </span>
          <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>·</span>
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            Terakhir disinkronkan: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{formatTimeAgo(lastSyncTimestamp)}</strong>
          </span>
        </div>

        {/* Auto Sync Toggle */}
        <button
          onClick={onToggleAutoSync}
          className={`btn-simple flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${
            autoSyncEnabled
              ? isDark
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : isDark
              ? 'bg-slate-800 border-slate-700 text-slate-400'
              : 'bg-stone-100 border-stone-200 text-slate-500'
          }`}
          title="Sinkronisasi otomatis latar belakang setiap 5 menit"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${autoSyncEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          <span>Auto-Sync 5 Menit: {autoSyncEnabled ? 'Aktif' : 'Mati'}</span>
        </button>
      </div>

      {/* 3. Ambient Telemetry Metrics Grid (6 Primary Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 mt-4">
        {/* Metric 1: Suhu Udara vs Suhu Air (Thermal Delta) */}
        <div className={`hover-lift rounded-xl p-3.5 ${subCardBase}`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <Thermometer className="h-4 w-4 text-orange-500" />
              Suhu Udara Sekitar
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              correlation.deltaSuhu > 0
                ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-200'
                : 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200'
            }`}>
              ΔT: {correlation.deltaSuhu > 0 ? `+${correlation.deltaSuhu}` : correlation.deltaSuhu}°C
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight mt-1">
            {weather.suhuUdara_c.toFixed(1)} <span className="text-sm font-medium text-slate-400">°C</span>
          </div>
          <div className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
            Terasa: {weather.suhuTerasa_c.toFixed(1)}°C (Air: {suhuAir_c.toFixed(1)}°C)
          </div>
        </div>

        {/* Metric 2: Kelembaban Udara Sekitar */}
        <div className={`hover-lift rounded-xl p-3.5 ${subCardBase}`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <Droplets className="h-4 w-4 text-sky-500" />
              Kelembaban Udara
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300">
              RH
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight mt-1">
            {weather.kelembaban_persen} <span className="text-sm font-medium text-slate-400">%</span>
          </div>
          <div className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
            {weather.kelembaban_persen > 80 ? 'Kelembaban tinggi (evaporasi lambat)' : 'Evaporasi permukaan stabil'}
          </div>
        </div>

        {/* Metric 3: Cuaca & Curah Hujan (Rain Dilution Risk) */}
        <div className={`hover-lift rounded-xl p-3.5 ${subCardBase}`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <CloudRain className="h-4 w-4 text-blue-500" />
              Cuaca &amp; Hujan
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              correlation.risikoPengenceranHujan === 'AMAN'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                : correlation.risikoPengenceranHujan === 'WASPADA'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200'
                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
            }`}>
              {correlation.risikoPengenceranHujan}
            </span>
          </div>
          <div className="text-lg font-bold tracking-tight mt-1 flex items-center gap-1.5 truncate">
            <span>{weather.cuacaIcon}</span>
            <span className="truncate">{weather.cuacaLabel}</span>
          </div>
          <div className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
            Curah hujan: {weather.curahHujan_mm} mm/jam
          </div>
        </div>

        {/* Metric 4: Tekanan Barometrik & Saturasi Oksigen DO */}
        <div className={`hover-lift rounded-xl p-3.5 ${subCardBase}`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <Gauge className="h-4 w-4 text-purple-500" />
              Tekanan Barometrik
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
              hPa
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight mt-1">
            {Math.round(weather.tekananUdara_hpa)} <span className="text-sm font-medium text-slate-400">hPa</span>
          </div>
          <div className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
            DO Maks Henry: ~{correlation.estimasiDoMaksimal_mgL} mg/L
          </div>
        </div>

        {/* Metric 5: Kecepatan & Arah Angin Sekitar */}
        <div className={`hover-lift rounded-xl p-3.5 ${subCardBase}`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <Wind className="h-4 w-4 text-teal-500" />
              Angin Sekitar
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300">
              {weather.arahAngin_label.split(' ')[0]}
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight mt-1">
            {weather.kecepatanAngin_kmh.toFixed(1)} <span className="text-sm font-medium text-slate-400">km/j</span>
          </div>
          <div className="text-[11px] mt-1 text-slate-500 dark:text-slate-400 truncate">
            Arah {weather.arahAngin_label} ({weather.arahAngin_derajat}°)
          </div>
        </div>

        {/* Metric 6: Radiasi UV & Fotosintesis Alga */}
        <div className={`hover-lift rounded-xl p-3.5 ${subCardBase}`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <Sun className="h-4 w-4 text-amber-500" />
              Indeks UV Surya
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              weather.indeksUv >= 7
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
                : weather.indeksUv >= 4
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
            }`}>
              {weather.indeksUv >= 7 ? 'Tinggi' : weather.indeksUv >= 4 ? 'Sedang' : 'Rendah'}
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight mt-1">
            {weather.indeksUv.toFixed(1)} <span className="text-sm font-medium text-slate-400">UV</span>
          </div>
          <div className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
            {weather.indeksUv >= 6 ? 'Memicu fotosintesis & pH naik' : 'Fotodegradasi stabil'}
          </div>
        </div>
      </div>

      {/* 4. Environmental Correlation Insights Banner */}
      <div
        className={`mt-4 rounded-xl p-3.5 border transition-all ${
          isDark
            ? 'bg-sky-950/30 border-sky-800/40 text-sky-200'
            : 'bg-sky-50/80 border-sky-200 text-sky-900'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <Compass className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-[13px] flex items-center gap-2">
              <span>Analisis Korelasi Lingkungan Sekitar &amp; Perilaku Sensor Air</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-[11px] leading-relaxed">
              <div className="rounded-lg p-2 bg-white/50 dark:bg-slate-900/40 border border-sky-200/60 dark:border-sky-800/40">
                <strong className="block text-sky-700 dark:text-sky-300 mb-0.5">1. Keseimbangan Termal:</strong>
                {correlation.deltaSuhuLabel}
              </div>
              <div className="rounded-lg p-2 bg-white/50 dark:bg-slate-900/40 border border-sky-200/60 dark:border-sky-800/40">
                <strong className="block text-sky-700 dark:text-sky-300 mb-0.5">2. Pengaruh Cuaca/Hujan:</strong>
                {correlation.risikoPengenceranPesan}
              </div>
              <div className="rounded-lg p-2 bg-white/50 dark:bg-slate-900/40 border border-sky-200/60 dark:border-sky-800/40">
                <strong className="block text-sky-700 dark:text-sky-300 mb-0.5">3. Dinamika Surya &amp; Angin:</strong>
                {correlation.pengaruhFotosintesisUv} {correlation.pengaruhAnginAerasi}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
