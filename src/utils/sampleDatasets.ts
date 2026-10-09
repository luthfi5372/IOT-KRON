import { TelemetryLogEntry, TelemetryPayload } from '../types/telemetry';

export interface DatasetPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  baseTemp: number;
  basePh: number;
  baseTds: number;
  baseBattery: number;
  tempVariance: number;
  phVariance: number;
  tdsVariance: number;
  sampleCount: number;
  badgeColor: string;
}

export const SAMPLE_DATASET_PRESETS: DatasetPreset[] = [
  {
    id: 'danau_alami',
    name: 'Danau Alami Asri (Baku Mutu Optimal)',
    category: 'Perairan Alami Bersih',
    description: 'Data ideal perairan tawar alami dengan pH seimbang (7.3 - 7.5), suhu sejuk 26.5°C, dan TDS rendah 180 PPM (Memenuhi PP RI No. 22/2021 Kelas I & II).',
    baseTemp: 26.5,
    basePh: 7.38,
    baseTds: 185,
    baseBattery: 88,
    tempVariance: 0.6,
    phVariance: 0.15,
    tdsVariance: 15,
    sampleCount: 50,
    badgeColor: 'emerald',
  },
  {
    id: 'sungai_asam',
    name: 'Sungai Asidifikasi (pH Asam Kritis)',
    category: 'Anomali Lingkungan Asam',
    description: 'Data simulasi aliran sungai terpapar buangan asam atau tanah gambut dengan pH turun tajam ke 5.2 - 5.8, TDS 320 PPM, dan suhu 29.5°C.',
    baseTemp: 29.4,
    basePh: 5.45,
    baseTds: 340,
    baseBattery: 78,
    tempVariance: 0.8,
    phVariance: 0.25,
    tdsVariance: 30,
    sampleCount: 50,
    badgeColor: 'rose',
  },
  {
    id: 'tambak_alkalin_tds',
    name: 'Tambak Budidaya (Basa & TDS Padat)',
    category: 'Akuakultur Semi-Intensif',
    description: 'Data tambak udang/ikan dengan fotosintesis alga tinggi memicu pH alkalin 8.7 - 9.1 dan akumulasi pakan/mineral TDS 920 PPM.',
    baseTemp: 31.6,
    basePh: 8.92,
    baseTds: 950,
    baseBattery: 68,
    tempVariance: 1.1,
    phVariance: 0.22,
    tdsVariance: 65,
    sampleCount: 50,
    badgeColor: 'amber',
  },
  {
    id: 'muara_estuari',
    name: 'Muara Estuari Payau (Salinitas Tinggi)',
    category: 'Perairan Payau Dinamis',
    description: 'Zona percampuran air tawar dan pasang surut laut dengan TDS padat 1.650 PPM, pH stabil 7.85, dan suhu 28.2°C.',
    baseTemp: 28.2,
    basePh: 7.82,
    baseTds: 1680,
    baseBattery: 82,
    tempVariance: 0.7,
    phVariance: 0.18,
    tdsVariance: 120,
    sampleCount: 50,
    badgeColor: 'sky',
  },
  {
    id: 'siang_terik_do_rendah',
    name: 'Kolam Siang Terik (Suhu Ekstrem & Stres DO)',
    category: 'Paparan Termal Ekstrem',
    description: 'Data kondisi perairan di bawah sinar matahari khatulistiwa langsung dengan suhu menembus 33.8°C memicu penurunan kapasitas kelarutan oksigen (DO).',
    baseTemp: 33.8,
    basePh: 8.12,
    baseTds: 420,
    baseBattery: 58,
    tempVariance: 1.4,
    phVariance: 0.2,
    tdsVariance: 25,
    sampleCount: 50,
    badgeColor: 'purple',
  },
];

/**
 * Menghasilkan kumpulan log telemetri realistis berdasarkan preset yang dipilih
 */
export function generatePresetDataset(
  preset: DatasetPreset,
  intervalSeconds: number = 2
): { logs: TelemetryLogEntry[]; latestPayload: TelemetryPayload } {
  const now = Date.now();
  const count = preset.sampleCount;
  const logs: TelemetryLogEntry[] = [];

  let curTemp = preset.baseTemp;
  let curPh = preset.basePh;
  let curTds = preset.baseTds;
  let curBattery = preset.baseBattery;

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - 1 - i) * intervalSeconds * 1000;
    const timeFormatted = new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Gaussian-like small random walk
    const tempDelta = (Math.random() - 0.49) * (preset.tempVariance * 0.3);
    const phDelta = (Math.random() - 0.49) * (preset.phVariance * 0.3);
    const tdsDelta = (Math.random() - 0.49) * (preset.tdsVariance * 0.3);
    const batDelta = (Math.random() * 0.05);

    curTemp = Math.max(18, Math.min(40, curTemp + tempDelta));
    curPh = Math.max(3.5, Math.min(11, curPh + phDelta));
    curTds = Math.max(20, Math.min(4000, curTds + tdsDelta));
    curBattery = Math.max(10, curBattery - batDelta);

    const voltage = 10.0 + (curBattery / 100) * 2.6;
    const status = curPh < 6.5 ? 'WARNING' : curPh > 8.5 ? 'WARNING' : 'NORMAL';

    logs.push({
      id: `${timestamp}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp,
      timeFormatted,
      suhu_c: parseFloat(curTemp.toFixed(2)),
      ph: parseFloat(curPh.toFixed(2)),
      tds_ppm: Math.round(curTds),
      baterai_persen: Math.round(curBattery),
      tegangan_v: parseFloat(voltage.toFixed(2)),
      pompa_up: 'OFF',
      pompa_down: 'OFF',
      status,
    });
  }

  const lastLog = logs[logs.length - 1];
  const latestPayload: TelemetryPayload = {
    suhu_c: lastLog.suhu_c,
    ph: lastLog.ph,
    tds_ppm: lastLog.tds_ppm,
    baterai_persen: lastLog.baterai_persen,
    tegangan_v: lastLog.tegangan_v,
    pompa_up: 'OFF',
    pompa_down: 'OFF',
    status: lastLog.status,
    timestamp: now,
  };

  return { logs, latestPayload };
}

export interface StatisticalProcessedData {
  count: number;
  meanSuhu: number;
  medianSuhu: number;
  minSuhu: number;
  maxSuhu: number;
  stdevSuhu: number;
  varianceSuhu: number;

  meanPh: number;
  medianPh: number;
  minPh: number;
  maxPh: number;
  stdevPh: number;
  variancePh: number;

  meanTds: number;
  medianTds: number;
  minTds: number;
  maxTds: number;
  stdevTds: number;
  varianceTds: number;

  // Derivatif Formulasi Akuatik
  wqiScore: number;
  wqiClassification: string;
  ecEstimatedUsCm: number;
  salinityPpt: number;
  doCapacityMgL: number;
  waterCategory: string;

  // Evaluasi Baku Mutu PP 22/2021
  complianceKelas1: boolean;
  complianceKelas2: boolean;
  complianceKelas3: boolean;
  complianceNotes: string[];
}

/**
 * Menghitung seluruh olahan data statistik dan parameter turunan dari kumpulan log
 */
export function computeProcessedDataStats(logs: TelemetryLogEntry[]): StatisticalProcessedData {
  if (logs.length === 0) {
    return {
      count: 0,
      meanSuhu: 0,
      medianSuhu: 0,
      minSuhu: 0,
      maxSuhu: 0,
      stdevSuhu: 0,
      varianceSuhu: 0,
      meanPh: 0,
      medianPh: 0,
      minPh: 0,
      maxPh: 0,
      stdevPh: 0,
      variancePh: 0,
      meanTds: 0,
      medianTds: 0,
      minTds: 0,
      maxTds: 0,
      stdevTds: 0,
      varianceTds: 0,
      wqiScore: 0,
      wqiClassification: 'Belum Ada Data',
      ecEstimatedUsCm: 0,
      salinityPpt: 0,
      doCapacityMgL: 0,
      waterCategory: 'Tidak Diketahui',
      complianceKelas1: false,
      complianceKelas2: false,
      complianceKelas3: false,
      complianceNotes: ['Belum ada log telemetri yang terkumpul.'],
    };
  }

  const n = logs.length;
  const suhus = logs.map((l) => l.suhu_c);
  const phs = logs.map((l) => l.ph);
  const tdss = logs.map((l) => l.tds_ppm);

  const calcMean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const calcMedian = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const calcVariance = (arr: number[], mean: number) => {
    if (arr.length <= 1) return 0;
    const sumSq = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    return sumSq / (arr.length - 1);
  };

  const meanSuhu = calcMean(suhus);
  const medianSuhu = calcMedian(suhus);
  const minSuhu = Math.min(...suhus);
  const maxSuhu = Math.max(...suhus);
  const varianceSuhu = calcVariance(suhus, meanSuhu);
  const stdevSuhu = Math.sqrt(varianceSuhu);

  const meanPh = calcMean(phs);
  const medianPh = calcMedian(phs);
  const minPh = Math.min(...phs);
  const maxPh = Math.max(...phs);
  const variancePh = calcVariance(phs, meanPh);
  const stdevPh = Math.sqrt(variancePh);

  const meanTds = calcMean(tdss);
  const medianTds = calcMedian(tdss);
  const minTds = Math.min(...tdss);
  const maxTds = Math.max(...tdss);
  const varianceTds = calcVariance(tdss, meanTds);
  const stdevTds = Math.sqrt(varianceTds);

  // WQI calculation (Water Quality Index 0 - 100)
  // Sub-index pH: optimum 7.0 (100 pts), toleransi 6.5 - 8.5
  let phSubIndex = 100 - Math.min(100, Math.abs(meanPh - 7.0) * 45);
  phSubIndex = Math.max(0, Math.min(100, phSubIndex));

  // Sub-index TDS: < 300 ppm (100), 300-500 (80), 500-1000 (50), > 1000 (< 30)
  let tdsSubIndex = 100;
  if (meanTds > 1000) tdsSubIndex = Math.max(10, 40 - (meanTds - 1000) / 50);
  else if (meanTds > 500) tdsSubIndex = 75 - ((meanTds - 500) / 500) * 35;
  else if (meanTds > 300) tdsSubIndex = 90 - ((meanTds - 300) / 200) * 15;

  // Sub-index Suhu: optimum 25 - 28 C
  let tempSubIndex = 100;
  if (meanSuhu > 32) tempSubIndex = Math.max(20, 70 - (meanSuhu - 32) * 15);
  else if (meanSuhu > 28) tempSubIndex = 95 - (meanSuhu - 28) * 6;
  else if (meanSuhu < 22) tempSubIndex = Math.max(30, 85 - (22 - meanSuhu) * 10);

  const wqiScore = Math.round(phSubIndex * 0.4 + tdsSubIndex * 0.35 + tempSubIndex * 0.25);

  let wqiClassification = 'Sangat Baik (Excellent)';
  if (wqiScore < 50) wqiClassification = 'Tercemar Berat / Buruk (Poor)';
  else if (wqiScore < 70) wqiClassification = 'Cukup / Sedang (Fair)';
  else if (wqiScore < 85) wqiClassification = 'Baik (Good)';

  // EC & Salinitas
  const ecEstimatedUsCm = Math.round(meanTds * 1.56);
  const salinityPpt = parseFloat((meanTds / 1000).toFixed(2));

  // Henry's Law DO capacity: DO_sat = 14.652 - 0.41022*T + 0.007991*T^2 - 0.000077774*T^3
  const t = meanSuhu;
  const doCapacityMgL = parseFloat(
    (14.652 - 0.41022 * t + 0.007991 * Math.pow(t, 2) - 0.000077774 * Math.pow(t, 3)).toFixed(2)
  );

  let waterCategory = 'Perairan Tawar Murni';
  if (meanTds > 1000) waterCategory = 'Perairan Payau / Estuari Salinitas Sedang-Tinggi';
  else if (meanTds > 500) waterCategory = 'Perairan Tambak Budidaya Semi-Intensif';
  else if (meanTds > 300) waterCategory = 'Perairan Tawar Sungai / Danau Produktif';

  // PP RI No. 22/2021 Baku Mutu Air Nasional (Lampiran VI)
  // Kelas 1 (Air Baku Minum): pH 6 - 9, TDS <= 1000 mg/L, Deviasi Suhu Deviasi 3 C
  // Kelas 2 (Rekreasi & Budidaya Perikanan): pH 6 - 9, TDS <= 1000 mg/L
  // Kelas 3 (Peternakan & Pertanian): pH 6 - 9, TDS <= 1000 mg/L
  const complianceKelas1 = meanPh >= 6.5 && meanPh <= 8.5 && meanTds <= 500 && meanSuhu <= 32;
  const complianceKelas2 = meanPh >= 6.0 && meanPh <= 9.0 && meanTds <= 1000 && meanSuhu <= 33;
  const complianceKelas3 = meanPh >= 6.0 && meanPh <= 9.0 && meanTds <= 1000;

  const complianceNotes: string[] = [];
  if (meanPh < 6.0) complianceNotes.push('pH rata-rata berada di bawah ambang batas minimal PP 22/2021 (< 6.0, asidosis perairan).');
  else if (meanPh > 9.0) complianceNotes.push('pH rata-rata melampaui ambang batas maksimal PP 22/2021 (> 9.0, alkalinisasi berlebih).');
  else if (meanPh < 6.5 || meanPh > 8.5) complianceNotes.push('pH berada di zona toleransi sekunder (6.0 - 6.5 atau 8.5 - 9.0), perlu pemantauan ketat.');

  if (meanTds > 1000) complianceNotes.push(`TDS rata-rata (${Math.round(meanTds)} PPM) melampaui baku mutu Kelas I-III (maksimal 1.000 mg/L).`);
  else if (meanTds > 500) complianceNotes.push(`TDS (${Math.round(meanTds)} PPM) melampaui rekomendasi air baku minum (Kelas I), namun memenuhi Kelas II (perikanan).`);

  if (meanSuhu > 32) complianceNotes.push(`Suhu rata-rata tinggi (${meanSuhu.toFixed(1)}°C) berpotensi menurunkan kelarutan oksigen (DO Saturated tinggal ${doCapacityMgL} mg/L).`);

  if (complianceNotes.length === 0) {
    complianceNotes.push('Semua parameter rata-rata (pH, Suhu, TDS) memenuhi baku mutu air nasional PP RI No. 22/2021 Kelas I & II.');
  }

  return {
    count: n,
    meanSuhu: parseFloat(meanSuhu.toFixed(2)),
    medianSuhu: parseFloat(medianSuhu.toFixed(2)),
    minSuhu: parseFloat(minSuhu.toFixed(2)),
    maxSuhu: parseFloat(maxSuhu.toFixed(2)),
    stdevSuhu: parseFloat(stdevSuhu.toFixed(2)),
    varianceSuhu: parseFloat(varianceSuhu.toFixed(3)),

    meanPh: parseFloat(meanPh.toFixed(2)),
    medianPh: parseFloat(medianPh.toFixed(2)),
    minPh: parseFloat(minPh.toFixed(2)),
    maxPh: parseFloat(maxPh.toFixed(2)),
    stdevPh: parseFloat(stdevPh.toFixed(2)),
    variancePh: parseFloat(variancePh.toFixed(3)),

    meanTds: Math.round(meanTds),
    medianTds: Math.round(medianTds),
    minTds: Math.round(minTds),
    maxTds: Math.round(maxTds),
    stdevTds: parseFloat(stdevTds.toFixed(1)),
    varianceTds: Math.round(varianceTds),

    wqiScore,
    wqiClassification,
    ecEstimatedUsCm,
    salinityPpt,
    doCapacityMgL,
    waterCategory,

    complianceKelas1,
    complianceKelas2,
    complianceKelas3,
    complianceNotes,
  };
}
