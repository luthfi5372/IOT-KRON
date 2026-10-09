import React, { useState, useEffect, useRef } from 'react';
import {
  Thermometer,
  Droplets,
  Activity,
  Battery,
  ArrowUp,
  ArrowDown,
  Minus,
  ShieldCheck,
  Award,
} from 'lucide-react';

export interface WaterQualityIndexResult {
  score: number;
  status: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Tercemar' | 'Kritis';
  statusEn: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  ratingGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  subIndices: {
    ph: number;
    temperature: number;
    tds: number;
  };
  weights: {
    ph: number;
    temperature: number;
    tds: number;
  };
  description: string;
  parametersStatus: {
    phStatus: string;
    tempStatus: string;
    tdsStatus: string;
  };
}

interface MetricCardsProps {
  suhu_c: number;
  ph: number;
  tds_ppm: number;
  baterai_persen: number;
  tegangan_v?: number;
  minTemp?: number;
  maxTemp?: number;
  prevSuhu?: number;
  prevPh?: number;
  prevTds?: number;
  isDark?: boolean;
  isSensorActive?: boolean;
  hasReceivedData?: boolean;
  // Water Quality Index (WQI) Props
  wqi?: WaterQualityIndexResult;
  prevWqi?: number;
  // Sensor Maintenance & Calibration Status
  isPhCalibrationDue?: boolean;
  isTdsCalibrationDue?: boolean;
  phOperatingHours?: number;
  phMaxHours?: number;
  tdsOperatingHours?: number;
  tdsMaxHours?: number;
  onOpenMaintenance?: () => void;
}

interface TrendIndicatorProps {
  current: number;
  prev?: number;
  threshold?: number;
  unit?: string;
  decimals?: number;
  isDark?: boolean;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  current,
  prev,
  threshold = 0.01,
  unit = '',
  decimals = 1,
  isDark = false,
}) => {
  if (prev === undefined || prev === null) {
    return (
      <span
        title="Nilai awal stabil"
        className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full select-none ${
          isDark
            ? 'bg-slate-800 text-slate-400 border border-slate-700/60'
            : 'bg-stone-100 text-stone-600 border border-stone-200/70'
        }`}
      >
        <Minus className="h-3 w-3 stroke-[2.5]" />
        <span>Stabil</span>
      </span>
    );
  }

  const diff = current - prev;
  const absDiff = Math.abs(diff);

  if (absDiff < threshold) {
    return (
      <span
        title="Nilai stabil dibandingkan pembacaan sebelumnya"
        className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full select-none ${
          isDark
            ? 'bg-slate-800 text-slate-400 border border-slate-700/60'
            : 'bg-stone-100 text-stone-600 border border-stone-200/70'
        }`}
      >
        <Minus className="h-3 w-3 stroke-[2.5]" />
        <span>Stabil</span>
      </span>
    );
  }

  if (diff > 0) {
    return (
      <span
        title={`Meningkat +${diff.toFixed(decimals)}${unit} dari pembacaan sebelumnya`}
        className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full select-none ${
          isDark
            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            : 'bg-amber-50 text-amber-700 border border-amber-200/80'
        }`}
      >
        <ArrowUp className="h-3 w-3 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
        <span>+{diff.toFixed(decimals)}{unit}</span>
      </span>
    );
  }

  return (
    <span
      title={`Menurun ${diff.toFixed(decimals)}${unit} dari pembacaan sebelumnya`}
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full select-none ${
        isDark
          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
          : 'bg-sky-50 text-sky-700 border border-sky-200/80'
      }`}
    >
      <ArrowDown className="h-3 w-3 text-sky-600 dark:text-sky-400 stroke-[2.5]" />
      <span>{diff.toFixed(decimals)}{unit}</span>
    </span>
  );
};

interface AnimatedMetricValueProps {
  value: number;
  decimals?: number;
  duration?: number;
  isSensorActive?: boolean;
  hasReceivedData?: boolean;
  className?: string;
  glowColor?: 'orange' | 'emerald' | 'sky' | 'rose' | 'amber';
  isDark?: boolean;
}

const AnimatedMetricValue: React.FC<AnimatedMetricValueProps> = ({
  value,
  decimals = 1,
  duration = 550,
  isSensorActive = true,
  hasReceivedData = true,
  className = '',
  glowColor = 'sky',
  isDark = false,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const prevValueRef = useRef<number>(value);
  const animFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If not received data yet or same value, sync without animation
    if (!hasReceivedData || prevValueRef.current === value) {
      setDisplayValue(value);
      return;
    }

    const startVal = displayValue;
    const endVal = value;
    const startTime = performance.now();
    prevValueRef.current = value;

    // Trigger subtle update highlight
    setIsUpdating(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsUpdating(false);
    }, duration + 100);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic: 1 - (1 - progress)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, duration, hasReceivedData]);

  if (!hasReceivedData || !isSensorActive) {
    return (
      <span className={`tabular-nums transition-opacity duration-300 opacity-60 ${className}`}>
        {hasReceivedData ? value.toFixed(decimals) : '--'}
      </span>
    );
  }

  const glowStyles = {
    orange: isDark
      ? 'text-orange-300 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]'
      : 'text-orange-600 drop-shadow-[0_0_6px_rgba(234,88,12,0.3)]',
    emerald: isDark
      ? 'text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]'
      : 'text-emerald-600 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]',
    sky: isDark
      ? 'text-sky-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]'
      : 'text-sky-600 drop-shadow-[0_0_6px_rgba(2,132,199,0.3)]',
    rose: isDark
      ? 'text-rose-300 drop-shadow-[0_0_10px_rgba(251,113,133,0.5)]'
      : 'text-rose-600 drop-shadow-[0_0_6px_rgba(225,29,72,0.3)]',
    amber: isDark
      ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.5)]'
      : 'text-amber-600 drop-shadow-[0_0_6px_rgba(217,119,6,0.3)]',
  }[glowColor];

  return (
    <span
      className={`relative inline-block tabular-nums transition-all duration-300 transform-gpu ${
        isUpdating ? `scale-[1.04] ${glowStyles}` : ''
      } ${className}`}
      style={{
        transitionProperty: 'transform, color, filter, opacity',
      }}
    >
      {displayValue.toFixed(decimals)}
    </span>
  );
};

export const MetricCards: React.FC<MetricCardsProps> = ({
  suhu_c,
  ph,
  tds_ppm,
  baterai_persen,
  tegangan_v,
  minTemp = 25.0,
  maxTemp = 32.0,
  prevSuhu,
  prevPh,
  prevTds,
  isDark = false,
  isSensorActive = true,
  hasReceivedData = true,
  wqi,
  prevWqi,
  isPhCalibrationDue = false,
  isTdsCalibrationDue = false,
  phOperatingHours,
  phMaxHours = 50,
  tdsOperatingHours,
  tdsMaxHours = 100,
  onOpenMaintenance,
}) => {
  // 0. Water Quality Index (WQI) Fallback / Processor
  const effectiveWqi: WaterQualityIndexResult = wqi ?? (() => {
    const qPh = ph >= 6.8 && ph <= 7.6 ? 100 : (ph >= 6.5 ? 85 : 45);
    const qTemp = suhu_c >= 26 && suhu_c <= 29.5 ? 100 : (suhu_c >= 24 && suhu_c <= 32 ? 80 : 50);
    const qTds = tds_ppm >= 150 && tds_ppm <= 450 ? 100 : (tds_ppm <= 700 ? 75 : 40);
    const score = Math.round(qPh * 0.45 + qTds * 0.35 + qTemp * 0.20);
    const ratingGrade: 'A' | 'B' | 'C' | 'D' | 'E' =
      score >= 88 ? 'A' : score >= 72 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'E';
    return {
      score,
      status: score >= 88 ? 'Sangat Baik' : score >= 72 ? 'Baik' : score >= 55 ? 'Cukup' : score >= 40 ? 'Tercemar' : 'Kritis',
      statusEn: score >= 88 ? 'Excellent' : score >= 72 ? 'Good' : score >= 55 ? 'Fair' : score >= 40 ? 'Poor' : 'Critical',
      ratingGrade,
      color: score >= 88 ? 'text-emerald-500' : score >= 72 ? 'text-sky-500' : score >= 55 ? 'text-amber-500' : 'text-rose-500',
      badgeBg: score >= 88 ? 'bg-emerald-50 dark:bg-emerald-950/40' : score >= 72 ? 'bg-sky-50 dark:bg-sky-950/40' : score >= 55 ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-rose-50 dark:bg-rose-950/40',
      badgeText: score >= 88 ? 'text-emerald-700 dark:text-emerald-300' : score >= 72 ? 'text-sky-700 dark:text-sky-300' : score >= 55 ? 'text-amber-700 dark:text-amber-300' : 'text-rose-700 dark:text-rose-300',
      badgeBorder: score >= 88 ? 'border-emerald-200 dark:border-emerald-800/60' : score >= 72 ? 'border-sky-200 dark:border-sky-800/60' : score >= 55 ? 'border-amber-200 dark:border-amber-800/60' : 'border-rose-200 dark:border-rose-800/60',
      subIndices: { ph: Math.round(qPh), temperature: Math.round(qTemp), tds: Math.round(qTds) },
      weights: { ph: 0.45, temperature: 0.20, tds: 0.35 },
      description: 'Kualitas air dihitung berdasarkan bobot pH, TDS, dan suhu.',
      parametersStatus: { phStatus: 'Normal', tempStatus: 'Normal', tdsStatus: 'Normal' },
    };
  })();

  // 1. Suhu Status
  const tempStatusText =
    suhu_c < 24
      ? 'Sejuk'
      : suhu_c <= 32
      ? 'Optimal'
      : 'Hangat';

  // 2. pH Status
  const isAcidic = ph < 6.5;
  const isAlkaline = ph > 8.5;

  const phStatusText = isAcidic
    ? 'Asam (Dosing Basa)'
    : isAlkaline
    ? 'Basa (Dosing Asam)'
    : 'Optimal Netral';

  const phClamped = Math.max(0, Math.min(14, ph));
  const phPercentage = (phClamped / 14) * 100;

  // 3. TDS Status
  let tdsLabel = 'Air Bersih';
  if (tds_ppm < 300) {
    tdsLabel = 'Sangat Murni';
  } else if (tds_ppm <= 600) {
    tdsLabel = 'Mineral Alami';
  } else if (tds_ppm <= 900) {
    tdsLabel = 'Payau Sedang';
  } else {
    tdsLabel = 'Salinitas Tinggi';
  }

  const estimatedEc = Math.round(tds_ppm * 1.56);

  // 4. Battery Status
  const batteryLevel = Math.max(0, Math.min(100, Math.round(baterai_persen)));
  const isBatteryLow = batteryLevel < 20;
  const isBatteryMedium = batteryLevel >= 20 && batteryLevel <= 45;

  const voltage = tegangan_v ?? Number((10.0 + (batteryLevel / 100) * 2.6).toFixed(2));
  const estHours = Math.floor((batteryLevel / 100) * 5.2);
  const estMins = Math.round((((batteryLevel / 100) * 5.2) - estHours) * 60);

  const batteryStatusText = isBatteryLow
    ? 'Daya Lemah'
    : isBatteryMedium
    ? 'Daya Sedang'
    : 'Daya Prima';

  // Card classes - Simple, clean, minimalist design with tactile micro-interactions
  const cardBase = isDark
    ? `hover-lift group bg-[#131826]/90 p-5 rounded-2xl backdrop-blur-xl transition-all duration-300 border ${
        !isSensorActive ? 'border-rose-500/35 bg-rose-950/10' : 'border-slate-800/80 hover:border-slate-700'
      }`
    : `hover-lift group bg-white p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 border ${
        !isSensorActive ? 'border-rose-300 bg-rose-50/20' : 'border-stone-200/80 hover:border-stone-300'
      }`;

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const barTrack = isDark ? 'bg-slate-800/80' : 'bg-slate-100';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {/* CARD 0: WATER QUALITY INDEX (WQI) */}
      <div
        className={`${cardBase} animate-fade-in-up border-l-4 ${
          effectiveWqi.ratingGrade === 'A'
            ? 'border-l-emerald-500'
            : effectiveWqi.ratingGrade === 'B'
            ? 'border-l-sky-500'
            : effectiveWqi.ratingGrade === 'C'
            ? 'border-l-amber-500'
            : effectiveWqi.ratingGrade === 'D'
            ? 'border-l-orange-500'
            : 'border-l-rose-500'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${
                !isSensorActive
                  ? isDark
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                  : effectiveWqi.ratingGrade === 'A'
                  ? isDark
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200/70'
                  : effectiveWqi.ratingGrade === 'B'
                  ? isDark
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/25'
                    : 'bg-sky-50 text-sky-600 border border-sky-200/70'
                  : effectiveWqi.ratingGrade === 'C'
                  ? isDark
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                    : 'bg-amber-50 text-amber-600 border border-amber-200/70'
                  : isDark
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                  : 'bg-rose-50 text-rose-600 border border-rose-200/70'
              }`}
            >
              <ShieldCheck className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className={`text-xs font-semibold ${textPrimary}`}>Indeks Mutu Air</h2>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    effectiveWqi.ratingGrade === 'A'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                      : effectiveWqi.ratingGrade === 'B'
                      ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300'
                      : effectiveWqi.ratingGrade === 'C'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-300'
                  }`}
                >
                  Grade {effectiveWqi.ratingGrade}
                </span>
              </div>
              <p className={`text-[11px] ${textSecondary}`}>WQI (pH · TDS · Suhu)</p>
            </div>
          </div>

          {/* Status Badge */}
          {isSensorActive ? (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${effectiveWqi.badgeBg} ${effectiveWqi.badgeText} ${effectiveWqi.badgeBorder}`}
            >
              {effectiveWqi.status}
            </span>
          ) : (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isDark
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              Perlu sensor
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <div className="flex items-baseline">
              <AnimatedMetricValue
                value={effectiveWqi.score}
                decimals={0}
                hasReceivedData={hasReceivedData}
                isSensorActive={isSensorActive}
                className={`text-3xl sm:text-4xl font-semibold tracking-tight ${
                  !isSensorActive || !hasReceivedData ? 'text-slate-400 opacity-60' : textPrimary
                }`}
                glowColor={
                  effectiveWqi.ratingGrade === 'A'
                    ? 'emerald'
                    : effectiveWqi.ratingGrade === 'B'
                    ? 'sky'
                    : effectiveWqi.ratingGrade === 'C'
                    ? 'amber'
                    : 'rose'
                }
                isDark={isDark}
              />
              <span className={`ml-1 text-sm font-normal ${textSecondary}`}>/100</span>
            </div>
          </div>

          <TrendIndicator
            current={effectiveWqi.score}
            prev={prevWqi}
            threshold={0.5}
            unit=" pt"
            decimals={0}
            isDark={isDark}
          />
        </div>

        {/* Progress Bar & Sub-indices breakdown */}
        {!isSensorActive ? (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-rose-500">
            ESP32 offline · Menunggu data
          </div>
        ) : (
          <div className="mt-3.5 space-y-2">
            <div className={`relative h-2 w-full overflow-hidden rounded-full ${barTrack}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  effectiveWqi.ratingGrade === 'A'
                    ? 'bg-emerald-500'
                    : effectiveWqi.ratingGrade === 'B'
                    ? 'bg-sky-500'
                    : effectiveWqi.ratingGrade === 'C'
                    ? 'bg-amber-500'
                    : effectiveWqi.ratingGrade === 'D'
                    ? 'bg-orange-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(5, Math.min(100, effectiveWqi.score))}%` }}
              />
            </div>

            {/* Sub-indices mini chips */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              <div
                className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] ${
                  isDark ? 'bg-slate-800/60' : 'bg-stone-50 border border-stone-200/50'
                }`}
                title={`Sub-indeks pH: ${effectiveWqi.subIndices.ph}% (${effectiveWqi.parametersStatus.phStatus})`}
              >
                <span
                  className={`font-semibold ${
                    effectiveWqi.subIndices.ph >= 80
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : effectiveWqi.subIndices.ph >= 60
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-rose-500'
                  }`}
                >
                  pH {effectiveWqi.subIndices.ph}%
                </span>
                <span className={`text-[9px] ${textSecondary}`}>Bobot 45%</span>
              </div>

              <div
                className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] ${
                  isDark ? 'bg-slate-800/60' : 'bg-stone-50 border border-stone-200/50'
                }`}
                title={`Sub-indeks TDS: ${effectiveWqi.subIndices.tds}% (${effectiveWqi.parametersStatus.tdsStatus})`}
              >
                <span
                  className={`font-semibold ${
                    effectiveWqi.subIndices.tds >= 80
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : effectiveWqi.subIndices.tds >= 60
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-rose-500'
                  }`}
                >
                  TDS {effectiveWqi.subIndices.tds}%
                </span>
                <span className={`text-[9px] ${textSecondary}`}>Bobot 35%</span>
              </div>

              <div
                className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] ${
                  isDark ? 'bg-slate-800/60' : 'bg-stone-50 border border-stone-200/50'
                }`}
                title={`Sub-indeks Suhu: ${effectiveWqi.subIndices.temperature}% (${effectiveWqi.parametersStatus.tempStatus})`}
              >
                <span
                  className={`font-semibold ${
                    effectiveWqi.subIndices.temperature >= 80
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : effectiveWqi.subIndices.temperature >= 60
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-rose-500'
                  }`}
                >
                  Suhu {effectiveWqi.subIndices.temperature}%
                </span>
                <span className={`text-[9px] ${textSecondary}`}>Bobot 20%</span>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* CARD 1: SUHU PERAIRAN */}
      <div className={`${cardBase} animate-fade-in-up`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${
                !isSensorActive
                  ? isDark
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isDark
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                  : 'bg-orange-50 text-orange-600 border border-orange-200/70'
              }`}
            >
              <Thermometer className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </div>
            <div>
              <h2 className={`text-xs font-semibold ${textPrimary}`}>Suhu Perairan</h2>
              <p className={`text-[11px] ${textSecondary}`}>Sensor DS18B20</p>
            </div>
          </div>

          {/* Status Badge */}
          {isSensorActive ? (
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                isDark
                  ? 'bg-orange-500/15 text-orange-300 border border-orange-500/20'
                  : 'bg-orange-50 text-orange-700 border border-orange-200/60'
              }`}
            >
              {tempStatusText}
            </span>
          ) : (
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                isDark
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              Perlu menghubungkan dengan sensor
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <div className="flex items-baseline">
              <AnimatedMetricValue
                value={suhu_c}
                decimals={1}
                hasReceivedData={hasReceivedData}
                isSensorActive={isSensorActive}
                className={`text-3xl sm:text-4xl font-semibold tracking-tight ${
                  !isSensorActive || !hasReceivedData ? 'text-slate-400 opacity-60' : textPrimary
                }`}
                glowColor="orange"
                isDark={isDark}
              />
              <span className={`ml-1 text-sm font-normal ${textSecondary}`}>°C</span>
            </div>

            {/* Small trend indicator arrow next to temperature */}
            {isSensorActive && hasReceivedData && (
              <TrendIndicator
                current={suhu_c}
                prev={prevSuhu}
                threshold={0.05}
                unit="°"
                decimals={1}
                isDark={isDark}
              />
            )}
          </div>

          <div className="text-right">
            {isSensorActive && hasReceivedData ? (
              <div className={`text-xs ${textSecondary}`}>
                Ideal 28.0°
              </div>
            ) : (
              <span className="text-[11px] text-rose-600 font-medium">Offline</span>
            )}
          </div>
        </div>

        {/* Minimal Progress / Offline indicator */}
        {!isSensorActive ? (
          <div className="mt-3.5 rounded-xl bg-rose-50 border border-rose-200/80 p-2 text-center text-[11px] font-medium text-rose-800">
            Sensor mati · Perlu menghubungkan dengan sensor
          </div>
        ) : (
          <div className="mt-4 space-y-1.5">
            <div className={`relative h-2 w-full overflow-hidden rounded-full ${barTrack}`}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(5, ((suhu_c - 15) / (40 - 15)) * 100))}%`,
                }}
              />
            </div>
            <div className={`flex justify-between text-xs ${textSecondary}`}>
              <span>Min {minTemp.toFixed(1)}°C</span>
              <span>Target 28.0°</span>
              <span>Maks {maxTemp.toFixed(1)}°C</span>
            </div>
          </div>
        )}
      </div>

      {/* CARD 2: pH AIR */}
      <div className={`${cardBase} animate-fade-in-up-delay-1`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${
                !isSensorActive
                  ? isDark
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isDark
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200/70'
              }`}
            >
              <Droplets className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </div>
            <div>
              <h2 className={`text-xs font-semibold ${textPrimary}`}>Derajat Keasaman</h2>
              <div className="flex items-center gap-1.5">
                <p className={`text-[11px] ${textSecondary}`}>Probe Kaca pH-4502C</p>
                {isPhCalibrationDue ? (
                  <button
                    onClick={onOpenMaintenance}
                    className="cursor-pointer inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 animate-pulse hover:bg-rose-200"
                    title="Probe telah melampaui batas jam kerja. Klik untuk panduan kalibrasi & reset"
                  >
                    Kalibrasi!
                  </button>
                ) : phOperatingHours != null ? (
                  <span
                    className={`text-[9px] font-mono ${
                      phOperatingHours >= phMaxHours * 0.85
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-stone-400 dark:text-slate-500'
                    }`}
                    title={`Jam operasi kumulatif: ${phOperatingHours.toFixed(1)}j dari batas ${phMaxHours}j`}
                  >
                    ({phOperatingHours.toFixed(0)}/{phMaxHours}j)
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          {isSensorActive ? (
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                isAcidic
                  ? isDark ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  : isAlkaline
                  ? isDark ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                  : isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
              }`}
            >
              {phStatusText}
            </span>
          ) : (
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                isDark
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              Perlu menghubungkan dengan sensor
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <div className="flex items-baseline">
              <AnimatedMetricValue
                value={ph}
                decimals={2}
                hasReceivedData={hasReceivedData}
                isSensorActive={isSensorActive}
                className={`text-3xl sm:text-4xl font-semibold tracking-tight ${
                  !isSensorActive || !hasReceivedData
                    ? 'text-slate-400 opacity-60'
                    : isAcidic
                    ? 'text-amber-600'
                    : isAlkaline
                    ? 'text-rose-600'
                    : textPrimary
                }`}
                glowColor={isAcidic ? 'orange' : isAlkaline ? 'rose' : 'emerald'}
                isDark={isDark}
              />
              <span className={`ml-1 text-sm font-normal ${textSecondary}`}>pH</span>
            </div>

            {/* Small trend indicator arrow next to pH */}
            {isSensorActive && hasReceivedData && (
              <TrendIndicator
                current={ph}
                prev={prevPh}
                threshold={0.02}
                unit=""
                decimals={2}
                isDark={isDark}
              />
            )}
          </div>

          <div className={`text-right text-xs ${textSecondary}`}>
            {isSensorActive && hasReceivedData ? 'Normal: 6.50 – 8.50' : <span className="text-rose-600 font-medium">Offline</span>}
          </div>
        </div>

        {/* 0-14 pH Progress Bar or Offline Alert */}
        {!isSensorActive ? (
          <div className="mt-3.5 rounded-xl bg-rose-50 border border-rose-200/80 p-2 text-center text-[11px] font-medium text-rose-800">
            Probe pH mati · Perlu menghubungkan dengan sensor
          </div>
        ) : (
          <div className="mt-4 space-y-1.5">
            <div className={`relative h-2 w-full rounded-full ${barTrack}`}>
              <div className="absolute inset-0 flex rounded-full overflow-hidden opacity-75">
                <div className="w-[46.4%] bg-amber-400/80" />
                <div className="w-[14.3%] bg-emerald-500" />
                <div className="w-[39.3%] bg-rose-400/80" />
              </div>

              <div
                className={`absolute top-[-2px] bottom-[-2px] w-1.5 rounded-full shadow-xs transition-all duration-300 ${
                  isDark ? 'bg-white' : 'bg-slate-900'
                }`}
                style={{ left: `calc(${phPercentage}% - 3px)` }}
              />
            </div>

            <div className={`flex justify-between text-xs ${textSecondary}`}>
              <span>0 Asam</span>
              <span>6.5 Netral 8.5</span>
              <span>14 Basa</span>
            </div>
          </div>
        )}
      </div>

      {/* CARD 3: TDS */}
      <div className={`${cardBase} animate-fade-in-up-delay-2`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${
                !isSensorActive
                  ? isDark
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isDark
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/25'
                  : 'bg-sky-50 text-sky-600 border border-sky-200/70'
              }`}
            >
              <Activity className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </div>
            <div>
              <h2 className={`text-xs font-semibold ${textPrimary}`}>Partikel Terlarut</h2>
              <div className="flex items-center gap-1.5">
                <p className={`text-[11px] ${textSecondary}`}>Sensor TDS Analog</p>
                {isTdsCalibrationDue ? (
                  <button
                    onClick={onOpenMaintenance}
                    className="cursor-pointer inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 animate-pulse hover:bg-rose-200"
                    title="Probe TDS telah melampaui batas jam kerja. Klik untuk panduan kalibrasi & reset"
                  >
                    Kalibrasi!
                  </button>
                ) : tdsOperatingHours != null ? (
                  <span
                    className={`text-[9px] font-mono ${
                      tdsOperatingHours >= tdsMaxHours * 0.85
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-stone-400 dark:text-slate-500'
                    }`}
                    title={`Jam operasi kumulatif: ${tdsOperatingHours.toFixed(1)}j dari batas ${tdsMaxHours}j`}
                  >
                    ({tdsOperatingHours.toFixed(0)}/{tdsMaxHours}j)
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          {isSensorActive ? (
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                isDark
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/20'
                  : 'bg-sky-50 text-sky-700 border border-sky-200/60'
              }`}
            >
              {tdsLabel}
            </span>
          ) : (
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                isDark
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              Perlu menghubungkan dengan sensor
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <div className="flex items-baseline">
              <AnimatedMetricValue
                value={tds_ppm}
                decimals={0}
                hasReceivedData={hasReceivedData}
                isSensorActive={isSensorActive}
                className={`text-3xl sm:text-4xl font-semibold tracking-tight ${
                  !isSensorActive || !hasReceivedData ? 'text-slate-400 opacity-60' : textPrimary
                }`}
                glowColor="sky"
                isDark={isDark}
              />
              <span className={`ml-1 text-sm font-normal ${textSecondary}`}>ppm</span>
            </div>

            {/* Small trend indicator arrow next to TDS */}
            {isSensorActive && hasReceivedData && (
              <TrendIndicator
                current={tds_ppm}
                prev={prevTds}
                threshold={1}
                unit=""
                decimals={0}
                isDark={isDark}
              />
            )}
          </div>

          <div className={`text-right text-xs tabular-nums ${textSecondary}`}>
            {isSensorActive && hasReceivedData ? `~${estimatedEc} µS/cm` : <span className="text-rose-600 font-medium">Offline</span>}
          </div>
        </div>

        {/* TDS Bar or Offline notice */}
        {!isSensorActive ? (
          <div className="mt-3.5 rounded-xl bg-rose-50 border border-rose-200/80 p-2 text-center text-[11px] font-medium text-rose-800">
            Sensor TDS mati · Perlu menghubungkan dengan sensor
          </div>
        ) : (
          <div className="mt-4 space-y-1.5">
            <div className={`relative h-2 w-full overflow-hidden rounded-full ${barTrack}`}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(5, (tds_ppm / 1200) * 100))}%`,
                }}
              />
            </div>
            <div className={`flex justify-between text-xs ${textSecondary}`}>
              <span>0 Murni</span>
              <span>300</span>
              <span>600</span>
              <span>1000+</span>
            </div>
          </div>
        )}
      </div>

      {/* CARD 4: BATERAI ESP32 */}
      <div className={`${cardBase} animate-fade-in-up-delay-3`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${
                !isSensorActive
                  ? isDark
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isBatteryLow
                  ? isDark
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                    : 'bg-rose-50 text-rose-600 border border-rose-200/70'
                  : isBatteryMedium
                  ? isDark
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                    : 'bg-amber-50 text-amber-600 border border-amber-200/70'
                  : isDark
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200/70'
              }`}
            >
              <Battery className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </div>
            <div>
              <h2 className={`text-xs font-semibold ${textPrimary}`}>Catu Daya Kapal</h2>
              <p className={`text-[11px] ${textSecondary}`}>Baterai Pack ESP32</p>
            </div>
          </div>

          {/* Status Badge */}
          {isSensorActive ? (
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                isBatteryLow
                  ? isDark ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                  : isBatteryMedium
                  ? isDark ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  : isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
              }`}
            >
              {batteryStatusText}
            </span>
          ) : (
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                isDark
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              Perlu menghubungkan dengan sensor
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-baseline">
            <AnimatedMetricValue
              value={batteryLevel}
              decimals={0}
              hasReceivedData={hasReceivedData}
              isSensorActive={isSensorActive}
              className={`text-3xl sm:text-4xl font-semibold tracking-tight ${
                !isSensorActive || !hasReceivedData
                  ? 'text-slate-400 opacity-60'
                  : isBatteryLow
                  ? 'text-rose-600'
                  : textPrimary
              }`}
              glowColor={isBatteryLow ? 'rose' : 'emerald'}
              isDark={isDark}
            />
            <span className={`ml-1 text-sm font-normal ${textSecondary}`}>%</span>
          </div>

          <div className={`text-right text-xs tabular-nums ${textSecondary}`}>
            {isSensorActive && hasReceivedData ? `${voltage.toFixed(2)} V` : <span className="text-rose-600 font-medium">Offline</span>}
          </div>
        </div>

        {/* Battery Bar or Offline notice */}
        {!isSensorActive ? (
          <div className="mt-3.5 rounded-xl bg-rose-50 border border-rose-200/80 p-2 text-center text-[11px] font-medium text-rose-800">
            ESP32 offline · Perlu menghubungkan dengan sensor
          </div>
        ) : (
          <div className="mt-4 space-y-1.5">
            <div className={`relative h-2 w-full overflow-hidden rounded-full ${barTrack}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isBatteryLow
                    ? 'bg-rose-500'
                    : isBatteryMedium
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(5, batteryLevel)}%` }}
              />
            </div>
            <div className={`flex justify-between text-xs ${textSecondary}`}>
              <span>{isBatteryLow ? 'Perlu Pengisian' : 'Estimasi Sisa'}</span>
              <span>{estHours > 0 ? `~${estHours}j ${estMins}m` : `~${estMins} mnt`}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
