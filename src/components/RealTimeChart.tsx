import React, { useState } from 'react';
import { Activity, Play, Pause, RefreshCw, Unplug } from 'lucide-react';
import { TelemetryLogEntry } from '../types/telemetry';

interface RealTimeChartProps {
  dataPoints: TelemetryLogEntry[];
  isPaused: boolean;
  onTogglePause: () => void;
  onClearPoints: () => void;
  isDark?: boolean;
}

type ChartViewMode = 'dual' | 'ph' | 'tds' | 'suhu';

export const RealTimeChart: React.FC<RealTimeChartProps> = ({
  dataPoints,
  isPaused,
  onTogglePause,
  onClearPoints,
  isDark = false,
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('dual');
  const [windowSize, setWindowSize] = useState<number>(20);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Take the most recent N points
  const visibleData = dataPoints.slice(-windowSize);

  // SVG dimensions - Expanded for significantly higher visibility & dynamic range
  const svgWidth = 960;
  const svgHeight = 340;
  const padding = { top: 38, right: 65, bottom: 42, left: 65 };
  const innerWidth = svgWidth - padding.left - padding.right;
  const innerHeight = svgHeight - padding.top - padding.bottom;

  // Scales & boundaries
  const phMin = 4.0;
  const phMax = 11.0;
  const getYForPh = (ph: number) => {
    const clamped = Math.min(phMax, Math.max(phMin, ph));
    return padding.top + innerHeight - ((clamped - phMin) / (phMax - phMin)) * innerHeight;
  };

  const currentMaxTds = Math.max(600, ...visibleData.map((d) => d.tds_ppm + 50));
  const tdsMin = 0;
  const tdsMax = Math.ceil(currentMaxTds / 100) * 100;
  const getYForTds = (tds: number) => {
    const clamped = Math.min(tdsMax, Math.max(tdsMin, tds));
    return padding.top + innerHeight - ((clamped - tdsMin) / (tdsMax - tdsMin)) * innerHeight;
  };

  const tempMin = 20;
  const tempMax = 36;
  const getYForTemp = (temp: number) => {
    const clamped = Math.min(tempMax, Math.max(tempMin, temp));
    return padding.top + innerHeight - ((clamped - tempMin) / (tempMax - tempMin)) * innerHeight;
  };

  const getX = (index: number) => {
    if (visibleData.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (visibleData.length - 1)) * innerWidth;
  };

  const phPoints = visibleData.map((d, i) => `${getX(i)},${getYForPh(d.ph)}`);
  const phPathD = phPoints.length > 0 ? `M ${phPoints.join(' L ')}` : '';
  const phAreaD =
    phPoints.length > 0
      ? `M ${phPoints.join(' L ')} L ${getX(visibleData.length - 1)},${padding.top + innerHeight} L ${padding.left},${
          padding.top + innerHeight
        } Z`
      : '';

  const tdsPoints = visibleData.map((d, i) => `${getX(i)},${getYForTds(d.tds_ppm)}`);
  const tdsPathD = tdsPoints.length > 0 ? `M ${tdsPoints.join(' L ')}` : '';
  const tdsAreaD =
    tdsPoints.length > 0
      ? `M ${tdsPoints.join(' L ')} L ${getX(visibleData.length - 1)},${padding.top + innerHeight} L ${padding.left},${
          padding.top + innerHeight
        } Z`
      : '';

  const tempPoints = visibleData.map((d, i) => `${getX(i)},${getYForTemp(d.suhu_c)}`);
  const tempPathD = tempPoints.length > 0 ? `M ${tempPoints.join(' L ')}` : '';
  const tempAreaD =
    tempPoints.length > 0
      ? `M ${tempPoints.join(' L ')} L ${getX(visibleData.length - 1)},${padding.top + innerHeight} L ${padding.left},${
          padding.top + innerHeight
        } Z`
      : '';

  const yPh65 = getYForPh(6.5);
  const yPh85 = getYForPh(8.5);

  const activePoint = hoverIndex !== null && visibleData[hoverIndex]
    ? visibleData[hoverIndex]
    : visibleData[visibleData.length - 1] || null;

  const cardBase = isDark
    ? 'animate-fade-in-up bg-[#121826]/95 border border-slate-800/90 p-5 sm:p-6 rounded-2xl backdrop-blur-xl shadow-lg ring-1 ring-white/5'
    : 'animate-fade-in-up bg-white border border-stone-200/90 p-5 sm:p-6 rounded-2xl shadow-md transition-all';

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const divider = isDark ? 'border-slate-800/80' : 'border-stone-200/80';
  const gridStroke = isDark ? 'rgba(51, 65, 85, 0.45)' : 'rgba(226, 232, 240, 0.9)';

  const phTicks = [11.0, 10.0, 8.5, 7.0, 6.5, 5.0, 4.0];
  const tdsTicks = [
    tdsMax,
    Math.round(tdsMax * 0.75),
    Math.round(tdsMax * 0.5),
    Math.round(tdsMax * 0.25),
    0,
  ];

  return (
    <div className={cardBase}>
      {/* Chart Header & Controls */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-3 border-b ${divider}`}>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
              isDark
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200/70'
            }`}
          >
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xs font-semibold sm:text-sm ${textPrimary}`}>
                Grafik Fluktuasi Real-Time
              </h2>
              {!isPaused ? (
                <span
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    isDark
                      ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/20'
                      : 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Stream
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Jeda
                </span>
              )}
            </div>
            <p className={`text-xs ${textSecondary}`}>
              Fluktuasi kualitas air ({visibleData.length} data titik geser)
            </p>
          </div>
        </div>

        {/* View toggles & Stream pause */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector Pill */}
          <div
            className={`flex items-center rounded-full p-1 text-xs font-medium ${
              isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200/70'
            }`}
          >
            <button
              onClick={() => setViewMode('dual')}
              className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                viewMode === 'dual'
                  ? isDark
                    ? 'bg-slate-800 text-white font-medium shadow-xs'
                    : 'bg-white text-slate-800 font-semibold shadow-xs'
                  : textSecondary
              }`}
            >
              Dual (pH + TDS)
            </button>
            <button
              onClick={() => setViewMode('ph')}
              className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                viewMode === 'ph'
                  ? isDark
                    ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                    : 'bg-emerald-100 text-emerald-800 font-semibold shadow-xs'
                  : textSecondary
              }`}
            >
              pH
            </button>
            <button
              onClick={() => setViewMode('tds')}
              className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                viewMode === 'tds'
                  ? isDark
                    ? 'bg-sky-500/20 text-sky-300 font-medium'
                    : 'bg-sky-100 text-sky-800 font-semibold shadow-xs'
                  : textSecondary
              }`}
            >
              TDS
            </button>
            <button
              onClick={() => setViewMode('suhu')}
              className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                viewMode === 'suhu'
                  ? isDark
                    ? 'bg-orange-500/20 text-orange-300 font-medium'
                    : 'bg-orange-100 text-orange-800 font-semibold shadow-xs'
                  : textSecondary
              }`}
            >
              Suhu
            </button>
          </div>

          {/* Window size Selector */}
          <div
            className={`hidden sm:flex items-center rounded-full p-1 text-xs font-medium ${
              isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200/70'
            }`}
          >
            {[10, 20, 30].map((size) => (
              <button
                key={size}
                onClick={() => setWindowSize(size)}
                className={`rounded-full px-2.5 py-0.5 transition-all cursor-pointer ${
                  windowSize === size
                    ? isDark
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-800 font-semibold shadow-xs'
                    : textSecondary
                }`}
              >
                {size} pt
              </button>
            ))}
          </div>

          {/* Pause / Play Button */}
          <button
            onClick={onTogglePause}
            className={`btn-simple flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-xs ${
              isPaused
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
            }`}
            title={isPaused ? 'Lanjutkan Stream' : 'Jeda Grafik'}
          >
            {isPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
            <span>{isPaused ? 'Lanjutkan' : 'Jeda'}</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="mt-4">
        {visibleData.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 text-center px-4 ${textSecondary}`}>
            <Unplug className="h-8 w-8 text-rose-500 mb-2 animate-pulse" />
            <p className="text-sm font-semibold text-rose-700">Perlu Menghubungkan dengan Sensor</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Sensor fisik kapal mati atau belum mengirimkan data. Grafik akan bergerak otomatis saat data realtime masuk via MQTT (topik: <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">kapal/telemetri</code>).
            </p>
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-56 md:h-64 overflow-visible select-none"
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="phSoftGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="tdsSoftGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[4, 6, 8, 10].map((gridPh) => {
                const y = getYForPh(gridPh);
                return (
                  <line
                    key={gridPh}
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke={gridStroke}
                    strokeWidth="1"
                  />
                );
              })}

              {/* Safe Zone Band for pH */}
              {(viewMode === 'dual' || viewMode === 'ph') && (
                <rect
                  x={padding.left}
                  y={yPh85}
                  width={innerWidth}
                  height={Math.max(0, yPh65 - yPh85)}
                  fill="#10b981"
                  fillOpacity={isDark ? 0.05 : 0.07}
                />
              )}

              {/* Reference Lines */}
              {(viewMode === 'dual' || viewMode === 'ph') && (
                <>
                  <line
                    x1={padding.left}
                    y1={yPh85}
                    x2={svgWidth - padding.right}
                    y2={yPh85}
                    stroke="#f43f5e"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    opacity="0.5"
                  />
                  <line
                    x1={padding.left}
                    y1={yPh65}
                    x2={svgWidth - padding.right}
                    y2={yPh65}
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    opacity="0.5"
                  />
                </>
              )}

              {/* TDS Area & Line */}
              {(viewMode === 'dual' || viewMode === 'tds') && (
                <>
                  <path d={tdsAreaD} fill="url(#tdsSoftGrad)" />
                  <path
                    d={tdsPathD}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Suhu Line */}
              {viewMode === 'suhu' && (
                <path
                  d={tempPathD}
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* pH Area & Line */}
              {(viewMode === 'dual' || viewMode === 'ph') && (
                <>
                  <path d={phAreaD} fill="url(#phSoftGrad)" />
                  <path
                    d={phPathD}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Hover Crosshair & Points */}
              {visibleData.map((d, i) => {
                const x = getX(i);
                const yPh = getYForPh(d.ph);
                const yTds = getYForTds(d.tds_ppm);
                const isHovered = hoverIndex === i;

                return (
                  <g key={d.id || i} onMouseEnter={() => setHoverIndex(i)} className="cursor-crosshair">
                    <rect
                      x={x - (innerWidth / visibleData.length) / 2}
                      y={padding.top}
                      width={innerWidth / visibleData.length}
                      height={innerHeight}
                      fill="transparent"
                    />

                    {isHovered && (
                      <line
                        x1={x}
                        y1={padding.top}
                        x2={x}
                        y2={padding.top + innerHeight}
                        stroke={isDark ? '#475569' : '#94a3b8'}
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    )}

                    {(viewMode === 'dual' || viewMode === 'ph') && (
                      <circle
                        cx={x}
                        cy={yPh}
                        r={isHovered ? 5 : i === visibleData.length - 1 ? 4 : 2.5}
                        fill={d.ph < 6.5 ? '#f59e0b' : d.ph > 8.5 ? '#f43f5e' : '#059669'}
                        stroke={isDark ? '#0f172a' : '#ffffff'}
                        strokeWidth="1.5"
                      />
                    )}

                    {(viewMode === 'dual' || viewMode === 'tds') && (
                      <circle
                        cx={x}
                        cy={yTds}
                        r={isHovered ? 4.5 : i === visibleData.length - 1 ? 3.5 : 2}
                        fill="#0284c7"
                        stroke={isDark ? '#0f172a' : '#ffffff'}
                        strokeWidth="1.5"
                      />
                    )}
                  </g>
                );
              })}

              {/* Y Axis Labels */}
              {(viewMode === 'dual' || viewMode === 'ph') && (
                <text x="14" y="22" fill="#059669" fontSize="11" fontWeight="700">
                  pH
                </text>
              )}

              {(viewMode === 'dual' || viewMode === 'tds') && (
                <text x={svgWidth - 36} y="22" fill="#0284c7" fontSize="11" fontWeight="700">
                  TDS
                </text>
              )}

              {visibleData.length > 0 && (
                <>
                  <text x={padding.left} y={svgHeight - 12} fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
                    {visibleData[0].timeFormatted}
                  </text>
                  <text x={svgWidth - padding.right - 25} y={svgHeight - 12} fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
                    {visibleData[visibleData.length - 1].timeFormatted}
                  </text>
                </>
              )}
            </svg>
          </div>
        )}

        {/* Hover Tooltip Bar */}
        {hoveredData && (
          <div
            className={`mt-2 flex flex-wrap items-center justify-between rounded-2xl px-4 py-2 text-xs shadow-xs ${
              isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-50 border border-slate-200/80 text-slate-700'
            }`}
          >
            <span className={textSecondary}>
              Waktu: <strong className={textPrimary}>{hoveredData.timeFormatted}</strong>
            </span>
            <div className="flex items-center gap-4">
              <span className="text-emerald-700 font-semibold">
                pH {hoveredData.ph.toFixed(2)}
              </span>
              <span className="text-sky-700 font-semibold">
                TDS {hoveredData.tds_ppm} ppm
              </span>
              <span className="text-orange-700 font-semibold">
                Suhu {hoveredData.suhu_c.toFixed(1)}°C
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className={`mt-3 flex flex-wrap items-center justify-between text-xs ${textSecondary}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>pH (4.0 – 11.0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            <span>TDS ({tdsMax} ppm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>Batas Asam (6.5)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span>Batas Basa (8.5)</span>
          </div>
        </div>

        <button
          onClick={onClearPoints}
          className="flex items-center gap-1 text-[11px] hover:text-slate-900 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3 w-3" />
          Bersihkan Titik
        </button>
      </div>
    </div>
  );
};
