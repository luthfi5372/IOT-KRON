// Sensor Mathematical Formulation & Predictive Engine
// Computes derived indices, percentages (WQI, DO Saturation, Biocompatibility),
// and projects future sensor behavior (15-30m forecast) based on historical telemetry.

import { TelemetryLogEntry } from '../types/telemetry';

export interface DerivedSensorMetrics {
  // 1. Water Quality Index (WQI)
  wqiScore: number; // 0 - 100%
  wqiStatus: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Tercemar' | 'Kritis';
  wqiColor: string; // Tailwind color token
  wqiBreakdown: {
    phSubIndex: number; // 0 - 100
    tdsSubIndex: number; // 0 - 100
    tempSubIndex: number; // 0 - 100
  };

  // 2. Dissolved Oxygen (DO) Saturation Capacity
  doCapacityMgL: number; // mg/L
  doSaturationPercent: number; // 0 - 100%
  doStatus: 'Optimal' | 'Cukup' | 'Rendah (Hipoksia)';

  // 3. Electrical Conductivity & Salinity Equivalence
  conductivityUsCm: number; // microSiemens/cm (~ TDS / 0.65)
  salinityPpt: number; // ppt (g/L)
  salinityCategory: 'Tawar Segar' | 'Sedikit Payau' | 'Payau' | 'Tinggi';

  // 4. Ecosystem Biocompatibility Index
  biocompatibilityPercent: number; // 0 - 100%
  biocompatibilityVerdict: string;

  // 5. Osmotic Stress on Aquatic Flora/Fauna
  osmoticStressPercent: number; // 0 - 100% (lower is better)

  // 6. Predictive Forecasts (15 & 30 Minutes Ahead)
  prediction: {
    phSlopePerMin: number; // rate of change d(pH)/dt
    projectedPh15m: number;
    projectedPh30m: number;
    phTrendDescription: string;
    projectedTds15m: number;
    projectedTds30m: number;
    tdsSlopePerMin: number;
    ecologicalStatus: 'STABIL_AMAN' | 'PERLU_SIRKULASI' | 'PERLU_AERASI' | 'WASPADAI_PENGUAPAN';
    statusMessage: string;
    dosingSystemStatus: 'DINONAKTIFKAN_RUSAK';
    estimatedTimeToThresholdMin: number | null; // minutes until pH < 6.5 or > 8.5
    confidenceScore: number; // 0 - 100%
  };
}

/**
 * Calculates scientific sub-index for pH (ideal aquatic range: 6.8 - 7.6)
 */
function calculatePhSubIndex(ph: number): number {
  if (ph >= 6.8 && ph <= 7.6) {
    return 100;
  }
  if (ph >= 6.5 && ph < 6.8) {
    return Math.max(0, 100 - (6.8 - ph) * 100); // 70 - 100
  }
  if (ph > 7.6 && ph <= 8.5) {
    return Math.max(0, 100 - (ph - 7.6) * 33.3); // 70 - 100
  }
  if (ph < 6.5) {
    // Strongly acidic penalty
    const penalty = (6.5 - ph) * 45;
    return Math.max(5, 70 - penalty);
  }
  // Strongly alkaline penalty
  const penalty = (ph - 8.5) * 45;
  return Math.max(5, 70 - penalty);
}

/**
 * Calculates scientific sub-index for TDS (ideal range for aquaculture & freshwater: 150 - 500 ppm)
 */
function calculateTdsSubIndex(tds: number): number {
  if (tds >= 150 && tds <= 450) {
    return 100;
  }
  if (tds < 150) {
    return Math.max(50, (tds / 150) * 100);
  }
  if (tds <= 700) {
    return Math.max(50, 100 - ((tds - 450) / 250) * 40); // 60 - 100
  }
  if (tds <= 1200) {
    return Math.max(20, 60 - ((tds - 700) / 500) * 35); // 25 - 60
  }
  return Math.max(5, 20 - ((tds - 1200) / 1000) * 15);
}

/**
 * Calculates thermal suitability sub-index (ideal tropical water: 25°C - 30°C)
 */
function calculateTempSubIndex(tempC: number): number {
  if (tempC >= 26 && tempC <= 29.5) {
    return 100;
  }
  if (tempC >= 24 && tempC < 26) {
    return Math.max(70, 100 - (26 - tempC) * 15);
  }
  if (tempC > 29.5 && tempC <= 32) {
    return Math.max(65, 100 - (tempC - 29.5) * 14);
  }
  if (tempC < 24) {
    return Math.max(10, 70 - (24 - tempC) * 10);
  }
  return Math.max(10, 65 - (tempC - 32) * 12);
}

/**
 * Dissolved Oxygen Saturation via Benson-Krause aquatic solubility equation (at standard atmospheric pressure)
 * DO_sat(T) = 14.652 - 0.41022*T + 0.007991*T^2 - 0.000077774*T^3
 * corrected for salinity (TDS / 1000)
 */
function calculateDoCapacity(tempC: number, tdsPpm: number) {
  const t = Math.max(0, Math.min(45, tempC));
  const freshwaterDo = 14.652 - 0.41022 * t + 0.007991 * Math.pow(t, 2) - 0.000077774 * Math.pow(t, 3);
  
  // Salinity correction factor: approximately -0.005 mg/L per 1000 ppm TDS
  const salinityCorrection = (tdsPpm / 1000) * 0.008;
  const netCapacity = Math.max(2.0, freshwaterDo - salinityCorrection);
  
  // Standard benchmark saturation in tropical aquaculture is ~7.5 - 8.2 mg/L
  const baselineOptimal = 7.8;
  const saturationPercent = Math.min(100, Math.max(15, (netCapacity / baselineOptimal) * 100));

  let status: 'Optimal' | 'Cukup' | 'Rendah (Hipoksia)' = 'Optimal';
  if (saturationPercent < 65) {
    status = 'Rendah (Hipoksia)';
  } else if (saturationPercent < 85) {
    status = 'Cukup';
  }

  return {
    capacityMgL: Number(netCapacity.toFixed(2)),
    saturationPercent: Math.round(saturationPercent),
    status,
  };
}

/**
 * Calculates predictive slopes and future estimates based on telemetry log history
 */
function calculatePredictions(
  currentPh: number,
  currentTds: number,
  logs: TelemetryLogEntry[],
  isSensorActive: boolean = true
) {
  // Default values when not enough historical points
  let phSlopePerMin = 0;
  let tdsSlopePerMin = 0;
  let confidenceScore = isSensorActive ? 75 : 20;

  if (logs.length >= 3 && isSensorActive) {
    // Take the most recent 10 records
    const recentLogs = logs.slice(0, 10);
    const newest = recentLogs[0];
    const oldest = recentLogs[recentLogs.length - 1];

    const timeDiffMinutes = (newest.timestamp - oldest.timestamp) / 60000;

    if (timeDiffMinutes >= 0.05) {
      phSlopePerMin = (newest.ph - oldest.ph) / timeDiffMinutes;
      tdsSlopePerMin = (newest.tds_ppm - oldest.tds_ppm) / timeDiffMinutes;
      // Dampen extreme noise
      phSlopePerMin = Math.max(-0.25, Math.min(0.25, phSlopePerMin));
      tdsSlopePerMin = Math.max(-15, Math.min(25, tdsSlopePerMin));
      confidenceScore = Math.min(96, Math.max(60, 70 + recentLogs.length * 2.5));
    }
  }

  // Calculate 15-minute and 30-minute projections
  // Apply a decay coefficient (mean-reverting nature of water buffer capacity)
  const decay15 = 0.85;
  const decay30 = 0.70;

  const deltaPh15 = phSlopePerMin * 15 * decay15;
  const deltaPh30 = phSlopePerMin * 30 * decay30;
  const projectedPh15m = Number(Math.max(3.0, Math.min(11.0, currentPh + deltaPh15)).toFixed(2));
  const projectedPh30m = Number(Math.max(3.0, Math.min(11.0, currentPh + deltaPh30)).toFixed(2));

  const deltaTds15 = tdsSlopePerMin * 15 * decay15;
  const deltaTds30 = tdsSlopePerMin * 30 * decay30;
  const projectedTds15m = Math.max(0, Math.round(currentTds + deltaTds15));
  const projectedTds30m = Math.max(0, Math.round(currentTds + deltaTds30));

  // Determine trend description
  let phTrendDescription = 'Stabil dalam rentang ekuilibrium (±0.02 pH)';
  if (phSlopePerMin > 0.015) {
    phTrendDescription = `Cenderung naik (+${(phSlopePerMin * 10).toFixed(2)}/10 mnt)`;
  } else if (phSlopePerMin < -0.015) {
    phTrendDescription = `Cenderung turun (${(phSlopePerMin * 10).toFixed(2)}/10 mnt)`;
  }

  // Determine predicted ecological recommendation (Dosing module is disabled due to hardware issue)
  let ecologicalStatus: 'STABIL_AMAN' | 'PERLU_SIRKULASI' | 'PERLU_AERASI' | 'WASPADAI_PENGUAPAN' = 'STABIL_AMAN';
  let statusMessage = 'Kualitas air diperkirakan tetap stabil secara alami. Modul dosing dinonaktifkan (perangkat rusak).';
  let estimatedTimeToThresholdMin: number | null = null;

  if (projectedPh30m < 6.5 || currentPh < 6.6) {
    ecologicalStatus = 'PERLU_SIRKULASI';
    statusMessage = `Prediksi pergeseran asam (pH ~${projectedPh15m}). Karena pompa dosing rusak, lakukan sirkulasi air atau penambahan air segar bertahap.`;
    if (phSlopePerMin < -0.005 && currentPh > 6.5) {
      estimatedTimeToThresholdMin = Math.round((currentPh - 6.5) / Math.abs(phSlopePerMin));
    }
  } else if (projectedPh30m > 8.5 || currentPh > 8.4) {
    ecologicalStatus = 'PERLU_AERASI';
    statusMessage = `Prediksi pergeseran basa (pH ~${projectedPh15m}). Karena pompa dosing rusak, tingkatkan aerasi permukaan dan pergantian air bertahap.`;
    if (phSlopePerMin > 0.005 && currentPh < 8.5) {
      estimatedTimeToThresholdMin = Math.round((8.5 - currentPh) / phSlopePerMin);
    }
  } else if (tdsSlopePerMin > 5 || projectedTds30m > 750) {
    ecologicalStatus = 'WASPADAI_PENGUAPAN';
    statusMessage = `Konsentrasi garam mineral TDS meningkat (+${(tdsSlopePerMin * 15).toFixed(0)} ppm/15 mnt) akibat evaporasi termal.`;
  }

  return {
    phSlopePerMin: Number(phSlopePerMin.toFixed(4)),
    projectedPh15m,
    projectedPh30m,
    phTrendDescription,
    projectedTds15m,
    projectedTds30m,
    tdsSlopePerMin: Number(tdsSlopePerMin.toFixed(2)),
    ecologicalStatus,
    statusMessage,
    dosingSystemStatus: 'DINONAKTIFKAN_RUSAK' as const,
    estimatedTimeToThresholdMin,
    confidenceScore: Math.round(confidenceScore),
  };
}

/**
 * Main function: computes all formulated metrics and future predictions
 */
export function computeSensorFormulations(
  suhu_c: number,
  ph: number,
  tds_ppm: number,
  logs: TelemetryLogEntry[] = [],
  isSensorActive: boolean = true
): DerivedSensorMetrics {
  // 1. Water Quality Sub-Indices
  const phSub = calculatePhSubIndex(ph);
  const tdsSub = calculateTdsSubIndex(tds_ppm);
  const tempSub = calculateTempSubIndex(suhu_c);

  // WQI = w_ph * q_ph + w_tds * q_tds + w_temp * q_temp
  // Weights: pH (0.45), TDS (0.35), Temperature (0.20)
  const weightedWqi = phSub * 0.45 + tdsSub * 0.35 + tempSub * 0.20;
  const wqiScore = Math.round(Math.max(0, Math.min(100, weightedWqi)));

  let wqiStatus: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Tercemar' | 'Kritis' = 'Sangat Baik';
  let wqiColor = 'text-emerald-500';

  if (wqiScore >= 88) {
    wqiStatus = 'Sangat Baik';
    wqiColor = 'text-emerald-500';
  } else if (wqiScore >= 75) {
    wqiStatus = 'Baik';
    wqiColor = 'text-sky-500';
  } else if (wqiScore >= 60) {
    wqiStatus = 'Cukup';
    wqiColor = 'text-amber-500';
  } else if (wqiScore >= 40) {
    wqiStatus = 'Tercemar';
    wqiColor = 'text-orange-500';
  } else {
    wqiStatus = 'Kritis';
    wqiColor = 'text-rose-500';
  }

  // 2. DO Saturation
  const doResult = calculateDoCapacity(suhu_c, tds_ppm);

  // 3. Electrical Conductivity & Salinity
  const conductivityUsCm = Math.round(tds_ppm / 0.65);
  const salinityPpt = Number(((tds_ppm * 0.0008)).toFixed(3)); // approximate ppt
  let salinityCategory: 'Tawar Segar' | 'Sedikit Payau' | 'Payau' | 'Tinggi' = 'Tawar Segar';
  if (tds_ppm < 400) {
    salinityCategory = 'Tawar Segar';
  } else if (tds_ppm < 800) {
    salinityCategory = 'Sedikit Payau';
  } else if (tds_ppm < 2000) {
    salinityCategory = 'Payau';
  } else {
    salinityCategory = 'Tinggi';
  }

  // 4. Biocompatibility Index (overall health percentage for aquatic life)
  const biocompatibilityPercent = Math.round(
    Math.max(5, Math.min(100, (wqiScore * 0.6) + (doResult.saturationPercent * 0.4)))
  );

  let biocompatibilityVerdict = 'Optimal untuk biota akuatik dan organisme perairan.';
  if (biocompatibilityPercent < 50) {
    biocompatibilityVerdict = 'Stres tinggi pada biota air, koreksi pH & aerasi darurat diperlukan!';
  } else if (biocompatibilityPercent < 75) {
    biocompatibilityVerdict = 'Kondisi cukup toleran, pantau kecenderungan fluktuasi parameter.';
  }

  // 5. Osmotic stress: higher TDS + extreme pH creates osmotic stress
  const osmoticBase = Math.min(100, (tds_ppm / 1200) * 60 + Math.abs(ph - 7.2) * 20);
  const osmoticStressPercent = Math.round(Math.max(5, Math.min(95, osmoticBase)));

  // 6. Future Predictive Forecast
  const prediction = calculatePredictions(ph, tds_ppm, logs, isSensorActive);

  return {
    wqiScore,
    wqiStatus,
    wqiColor,
    wqiBreakdown: {
      phSubIndex: Math.round(phSub),
      tdsSubIndex: Math.round(tdsSub),
      tempSubIndex: Math.round(tempSub),
    },
    doCapacityMgL: doResult.capacityMgL,
    doSaturationPercent: doResult.saturationPercent,
    doStatus: doResult.status,
    conductivityUsCm,
    salinityPpt,
    salinityCategory,
    biocompatibilityPercent,
    biocompatibilityVerdict,
    osmoticStressPercent,
    prediction,
  };
}
