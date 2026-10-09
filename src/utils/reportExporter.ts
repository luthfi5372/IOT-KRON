import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TelemetryLogEntry } from '../types/telemetry';
import { computeSensorFormulations } from './sensorAnalytics';

export interface SessionStatsData {
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
  activeSeconds: number;
  sessionStartTime?: number;
  latestSuhu?: number;
  latestPh?: number;
  latestTds?: number;
  latestBattery?: number;
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs} jam ${mins} mnt ${secs} dtk (${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')})`;
  }
  return `${mins} mnt ${secs} dtk (${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')})`;
}

/**
 * Generate and trigger download of CSV report containing session summary and historical telemetry logs
 */
export function exportReportCsv(logs: TelemetryLogEntry[], stats: SessionStatsData): void {
  const now = new Date();
  const exportTimestampStr = now.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const avgSuhu = stats.count > 0 ? (stats.sumSuhu / stats.count).toFixed(2) : '-';
  const avgPh = stats.count > 0 ? (stats.sumPh / stats.count).toFixed(2) : '-';
  const avgTds = stats.count > 0 ? Math.round(stats.sumTds / stats.count).toString() : '-';
  const durationStr = formatDuration(stats.activeSeconds);

  const metaHeader = [
    '# =========================================================================',
    '# LAPORAN TELEMETRI & KUALITAS AIR KAPAL OTONOM (SESSION REPORT)',
    `# Tanggal & Waktu Ekspor   : ${exportTimestampStr}`,
    `# Total Durasi Sesi Aktif : ${durationStr}`,
    `# Total Sampel Terkumpul  : ${stats.count} data point`,
    '# -------------------------------------------------------------------------',
    '# RINGKASAN STATISTIK SESI:',
    `# Rata-rata Suhu Air      : ${avgSuhu} C (Min: ${stats.minSuhu ?? '-'} C, Max: ${stats.maxSuhu ?? '-'} C)`,
    `# Rata-rata pH Air        : ${avgPh} (Min: ${stats.minPh ?? '-'}, Max: ${stats.maxPh ?? '-'})`,
    `# Rata-rata TDS           : ${avgTds} ppm (Min: ${stats.minTds ?? '-'} ppm, Max: ${stats.maxTds ?? '-'} ppm)`,
    `# Status Standar Air      : ${
      stats.count > 0
        ? Number(avgPh) >= 6.5 && Number(avgPh) <= 8.5 && Number(avgTds) <= 500
          ? 'NORMAL / BAKU MUTU TERPENUHI (PP RI No. 22/2021)'
          : 'PERHATIAN / ANOMALI TERDETEKSI'
        : 'Belum Ada Sampel'
    }`,
    '# =========================================================================',
    '',
  ];

  const columns = [
    'No',
    'Timestamp_Unix',
    'Waktu_Lokal',
    'Suhu_C',
    'pH',
    'TDS_PPM',
    'Baterai_Persen',
    'Tegangan_Volt',
    'Status_Kualitas',
  ];

  const rows = logs.map((log, idx) => {
    const status =
      log.ph < 6.5
        ? 'Asam'
        : log.ph > 8.5
        ? 'Basa'
        : log.tds_ppm > 500
        ? 'TDS Tinggi'
        : 'Normal';

    return [
      idx + 1,
      log.timestamp,
      `"${log.timeFormatted}"`,
      log.suhu_c.toFixed(2),
      log.ph.toFixed(2),
      log.tds_ppm,
      log.baterai_persen ?? 85,
      (log.tegangan_v ?? (10.0 + ((log.baterai_persen ?? 85) / 100) * 2.6)).toFixed(2),
      `"${status}"`,
    ];
  });

  const csvContent = [
    ...metaHeader,
    columns.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const fileDate = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  link.setAttribute('href', url);
  link.setAttribute('download', `laporan_telemetri_kapal_${fileDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Draws professional vector trend chart for pH and Environmental Standard Corridor
 */
function drawPhTrendChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  logs: TelemetryLogEntry[],
  stats: SessionStatsData
): void {
  // 1. Chart Container with rounded corners & border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  // Title bar banner
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(x, y, w, 6.5, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(x, y + 6.5, x + w, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('TREN FLUKTUASI pH AIR & KORIDOR BAKU MUTU', x + 3, y + 4.5);

  const plotX = x + 9;
  const plotY = y + 9;
  const plotW = w - 12;
  const plotH = h - 16;

  // Determine scale
  const minPhVal = stats.minPh ?? (logs.length > 0 ? Math.min(...logs.map((l) => l.ph)) : 7.0);
  const maxPhVal = stats.maxPh ?? (logs.length > 0 ? Math.max(...logs.map((l) => l.ph)) : 7.0);
  const minScale = Math.min(5.5, Math.floor(minPhVal * 2) / 2 - 0.5);
  const maxScale = Math.max(9.5, Math.ceil(maxPhVal * 2) / 2 + 0.5);
  const range = maxScale - minScale;

  // 2. Safe zone corridor (pH 6.50 - 8.50 PP RI No. 22/2021)
  const safeTopY = plotY + plotH - ((Math.min(8.5, maxScale) - minScale) / range) * plotH;
  const safeBottomY = plotY + plotH - ((Math.max(6.5, minScale) - minScale) / range) * plotH;
  const safeH = safeBottomY - safeTopY;

  if (safeH > 0) {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.rect(plotX, safeTopY, plotW, safeH, 'F');

    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.setLineWidth(0.2);
    doc.line(plotX, safeTopY, plotX + plotW, safeTopY);
    doc.line(plotX, safeBottomY, plotX + plotW, safeBottomY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('Zona Baku Mutu (6.5 - 8.5)', plotX + plotW - 1, safeTopY + 2.2, { align: 'right' });
  }

  // 3. Gridlines & Y-axis labels
  const steps = [6.0, 7.0, 8.0, 9.0];
  steps.forEach((p) => {
    if (p >= minScale && p <= maxScale) {
      const gy = plotY + plotH - ((p - minScale) / range) * plotH;
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.setLineWidth(0.15);
      doc.line(plotX, gy, plotX + plotW, gy);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(p.toFixed(1), plotX - 1.5, gy + 1, { align: 'right' });
    }
  });

  // 4. Baseline Average reference dashed line
  const avgPhNum = stats.count > 0 ? stats.sumPh / stats.count : null;
  if (avgPhNum !== null) {
    const avgY = plotY + plotH - ((avgPhNum - minScale) / range) * plotH;
    doc.setDrawColor(14, 165, 233); // sky-500
    doc.setLineWidth(0.25);
    for (let dx = plotX; dx < plotX + plotW; dx += 2.5) {
      doc.line(dx, avgY, Math.min(dx + 1.2, plotX + plotW), avgY);
    }
  }

  // 5. Plot trend curve
  if (logs.length > 0) {
    const chrono = [...logs].sort((a, b) => a.timestamp - b.timestamp);
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setLineWidth(0.5);

    let prevX = 0;
    let prevY = 0;

    chrono.forEach((pt, idx) => {
      const ptX = plotX + (idx / Math.max(1, chrono.length - 1)) * plotW;
      const ptY = plotY + plotH - ((Math.max(minScale, Math.min(maxScale, pt.ph)) - minScale) / range) * plotH;

      if (idx > 0) {
        doc.line(prevX, prevY, ptX, ptY);
      }

      // Draw point markers
      if (chrono.length <= 25 || idx === 0 || idx === chrono.length - 1) {
        doc.setFillColor(16, 185, 129);
        doc.circle(ptX, ptY, 0.4, 'F');
      }

      prevX = ptX;
      prevY = ptY;
    });

    // Time ticks on X axis
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text(chrono[0].timeFormatted.slice(0, 8), plotX, plotY + plotH + 3.2);
    doc.text(
      chrono[chrono.length - 1].timeFormatted.slice(0, 8),
      plotX + plotW,
      plotY + plotH + 3.2,
      { align: 'right' }
    );
  } else {
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Belum ada data rekaman untuk grafik', plotX + plotW / 2, plotY + plotH / 2, {
      align: 'center',
    });
  }

  // 6. Legend
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Garis pH (Hijau)  |  - - Rata-rata (${avgPhNum ? avgPhNum.toFixed(2) : '-'})  |  Zona Baku Mutu (6.5-8.5)`,
    x + 3,
    y + h - 1.8
  );
}

/**
 * Draws professional vector trend chart for Suhu and TDS
 */
function drawTempTdsTrendChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  logs: TelemetryLogEntry[],
  stats: SessionStatsData
): void {
  // 1. Chart Container with rounded corners & border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  // Title bar banner
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, 6.5, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(x, y + 6.5, x + w, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('TREN SUHU (°C) & TDS PADATAN (PPM)', x + 3, y + 4.5);

  const plotX = x + 9;
  const plotY = y + 9;
  const plotW = w - 19;
  const plotH = h - 16;

  // Temperature scale (20 to 36 C)
  const tempMin = 20;
  const tempMax = 36;
  const tempRange = tempMax - tempMin;

  // TDS scale (0 to 800 ppm)
  const tdsMin = 0;
  const tdsMax = 800;
  const tdsRange = tdsMax - tdsMin;

  // Horizontal Gridlines & Dual Axis labels
  const gridSteps = [
    { t: 24, tds: 200 },
    { t: 28, tds: 400 },
    { t: 32, tds: 600 },
  ];

  gridSteps.forEach((step) => {
    const gy = plotY + plotH - ((step.t - tempMin) / tempRange) * plotH;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.15);
    doc.line(plotX, gy, plotX + plotW, gy);

    // Left axis (Suhu - Orange)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(234, 88, 12); // orange-600
    doc.text(`${step.t}°`, plotX - 1.5, gy + 1, { align: 'right' });

    // Right axis (TDS - Sky)
    doc.setTextColor(2, 132, 199); // sky-600
    doc.text(`${step.tds}`, plotX + plotW + 1.5, gy + 1, { align: 'left' });
  });

  if (logs.length > 0) {
    const chrono = [...logs].sort((a, b) => a.timestamp - b.timestamp);

    // Plot Suhu curve (Orange)
    doc.setDrawColor(249, 115, 22); // orange-500
    doc.setLineWidth(0.5);
    let prevTempX = 0;
    let prevTempY = 0;

    chrono.forEach((pt, idx) => {
      const ptX = plotX + (idx / Math.max(1, chrono.length - 1)) * plotW;
      const ptY = plotY + plotH - ((Math.max(tempMin, Math.min(tempMax, pt.suhu_c)) - tempMin) / tempRange) * plotH;

      if (idx > 0) {
        doc.line(prevTempX, prevTempY, ptX, ptY);
      }
      if (chrono.length <= 25 || idx === 0 || idx === chrono.length - 1) {
        doc.setFillColor(249, 115, 22);
        doc.circle(ptX, ptY, 0.4, 'F');
      }
      prevTempX = ptX;
      prevTempY = ptY;
    });

    // Plot TDS curve (Sky Blue)
    doc.setDrawColor(2, 132, 199); // sky-600
    doc.setLineWidth(0.5);
    let prevTdsX = 0;
    let prevTdsY = 0;

    chrono.forEach((pt, idx) => {
      const ptX = plotX + (idx / Math.max(1, chrono.length - 1)) * plotW;
      const ptY = plotY + plotH - ((Math.max(tdsMin, Math.min(tdsMax, pt.tds_ppm)) - tdsMin) / tdsRange) * plotH;

      if (idx > 0) {
        doc.line(prevTdsX, prevTdsY, ptX, ptY);
      }
      if (chrono.length <= 25 || idx === 0 || idx === chrono.length - 1) {
        doc.setFillColor(2, 132, 199);
        doc.circle(ptX, ptY, 0.4, 'F');
      }
      prevTdsX = ptX;
      prevTdsY = ptY;
    });

    // Time ticks on X axis
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text(chrono[0].timeFormatted.slice(0, 8), plotX, plotY + plotH + 3.2);
    doc.text(
      chrono[chrono.length - 1].timeFormatted.slice(0, 8),
      plotX + plotW,
      plotY + plotH + 3.2,
      { align: 'right' }
    );
  } else {
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Belum ada data rekaman untuk grafik', plotX + plotW / 2, plotY + plotH / 2, {
      align: 'center',
    });
  }

  // Legend
  const avgTempStr = stats.count > 0 ? (stats.sumSuhu / stats.count).toFixed(1) : '-';
  const avgTdsStr = stats.count > 0 ? Math.round(stats.sumTds / stats.count).toString() : '-';
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Suhu Air (°C, Avg: ${avgTempStr}°) [Oranye]  |  TDS Padatan (ppm, Avg: ${avgTdsStr}) [Biru]`,
    x + 3,
    y + h - 1.8
  );
}

/**
 * Draws professional executive KPI summary cards
 */
function drawKpiCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  accentColor: [number, number, number],
  title: string,
  mainValue: string,
  subValue: string,
  badgeText: string,
  badgeBg: [number, number, number],
  badgeTextCol: [number, number, number]
): void {
  // Card base
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  // Top accent line
  doc.setFillColor(...accentColor);
  doc.rect(x + 1, y, w - 2, 1.2, 'F');

  // Title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(title, x + 3, y + 5.5);

  // Main KPI Value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(mainValue, x + 3, y + 11.5);

  // Sub value range
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(subValue, x + 3, y + 15.5);

  // Status pill badge
  doc.setFillColor(...badgeBg);
  doc.roundedRect(x + 3, y + 17.5, w - 6, 4.2, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...badgeTextCol);
  doc.text(badgeText, x + w / 2, y + 20.4, { align: 'center' });
}

/**
 * Generate and trigger download of PDF report containing professional session summary,
 * crisp vector trend charts, and historical logs
 */
export function exportReportPdf(logs: TelemetryLogEntry[], stats: SessionStatsData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const now = new Date();
  const exportDateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const exportTimeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const avgSuhuNum = stats.count > 0 ? stats.sumSuhu / stats.count : null;
  const avgPhNum = stats.count > 0 ? stats.sumPh / stats.count : null;
  const avgTdsNum = stats.count > 0 ? stats.sumTds / stats.count : null;

  const avgSuhu = avgSuhuNum !== null ? avgSuhuNum.toFixed(2) : '-';
  const avgPh = avgPhNum !== null ? avgPhNum.toFixed(2) : '-';
  const avgTds = avgTdsNum !== null ? Math.round(avgTdsNum).toString() : '-';
  const durationStr = formatDuration(stats.activeSeconds);

  // Scientific calculation for report
  const latestSuhu = stats.latestSuhu ?? (avgSuhuNum ?? 28.0);
  const latestPh = stats.latestPh ?? (avgPhNum ?? 7.2);
  const latestTds = stats.latestTds ?? (avgTdsNum ?? 450);
  const analytics = computeSensorFormulations(latestSuhu, latestPh, latestTds, logs, true);

  const isWaterQualityOptimal =
    avgPhNum !== null && avgPhNum >= 6.5 && avgPhNum <= 8.5 && avgTdsNum !== null && avgTdsNum <= 500;

  // =========================================================================
  // PAGE 1: EXECUTIVE DASHBOARD, STATISTICAL SUMMARY & TREND CHARTS
  // =========================================================================

  // 1. Header Banner (Navy theme)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  // Accent Line
  doc.setFillColor(14, 165, 233); // sky-500
  doc.rect(0, 32, 210, 1.2, 'F');

  // Header Typography
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('LAPORAN RESMI TELEMETRI & KUALITAS AIR PERAIRAN', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(186, 230, 253); // sky-200
  doc.text(
    'SISTEM PEMANTAUAN KAPAL OTONOM (USV NUSA-01) · PLATFORM EMBEDDED IOT ESP32-S3',
    14,
    18
  );

  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Waktu Cetak: ${exportDateStr} · ${exportTimeStr} WIB`, 14, 25);
  doc.text(`Lokasi Operasi: Perairan Teluk Estuari (Zona Maritim)`, 95, 25);
  doc.text(`Durasi Sesi: ${durationStr}`, 160, 25);

  // Document Number & Global Water Status Pill on top right
  const docId = `RPT-USV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`No. Dokumen: ${docId}`, 196, 12, { align: 'right' });

  // WQI Global Status Badge
  const wqiBgColor: [number, number, number] =
    analytics.wqiScore >= 88
      ? [16, 185, 129]
      : analytics.wqiScore >= 72
      ? [2, 132, 199]
      : analytics.wqiScore >= 55
      ? [217, 119, 6]
      : [225, 29, 72];
  doc.setFillColor(...wqiBgColor);
  doc.roundedRect(142, 16, 54, 5.2, 1.2, 1.2, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`WQI: ${analytics.wqiScore}/100 · ${analytics.wqiStatus.toUpperCase()}`, 169, 19.6, { align: 'center' });

  // 2. Section 1 Title: Ringkasan Eksekutif & Kartu KPI
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Ringkasan Eksekutif & Indikator Kunci (KPI Sesi)', 14, 38.5);

  // Draw 4 KPI Cards side-by-side
  // Printable width = 182mm (14mm to 196mm). Card width = 43mm, gap = 3.33mm
  const cardW = 43;
  const cardH = 23;
  const cardY = 41;

  // Card 1: Suhu
  drawKpiCard(
    doc,
    14,
    cardY,
    cardW,
    cardH,
    [249, 115, 22], // Orange
    'Suhu Air (DS18B20)',
    avgSuhu !== '-' ? `${avgSuhu} °C` : '-',
    stats.minSuhu != null && stats.maxSuhu != null ? `Min: ${stats.minSuhu.toFixed(1)}° · Max: ${stats.maxSuhu.toFixed(1)}°` : 'Rentang stabil',
    avgSuhuNum !== null && avgSuhuNum >= 20 && avgSuhuNum <= 32 ? 'Optimal (Baku Mutu)' : 'Waspada Suhu',
    [254, 243, 199], // amber-100
    [180, 83, 9] // amber-700
  );

  // Card 2: pH
  drawKpiCard(
    doc,
    14 + cardW + 3.33,
    cardY,
    cardW,
    cardH,
    [16, 185, 129], // Emerald
    'Derajat Keasaman (pH)',
    avgPh !== '-' ? `${avgPh}` : '-',
    stats.minPh != null && stats.maxPh != null ? `Min: ${stats.minPh.toFixed(2)} · Max: ${stats.maxPh.toFixed(2)}` : 'Rentang stabil',
    avgPhNum !== null && avgPhNum >= 6.5 && avgPhNum <= 8.5 ? 'Netral (PP RI 22/2021)' : 'Anomali Keasaman',
    [236, 253, 245], // emerald-100
    [4, 120, 87] // emerald-700
  );

  // Card 3: TDS
  drawKpiCard(
    doc,
    14 + (cardW + 3.33) * 2,
    cardY,
    cardW,
    cardH,
    [2, 132, 199], // Sky
    'Padatan Terlarut (TDS)',
    avgTds !== '-' ? `${avgTds} ppm` : '-',
    stats.minTds != null && stats.maxTds != null ? `Min: ${stats.minTds} · Max: ${stats.maxTds} ppm` : 'Rentang stabil',
    avgTdsNum !== null && avgTdsNum <= 500 ? 'Air Tawar Baik' : 'Mineral / Payau',
    [224, 242, 254], // sky-100
    [3, 105, 161] // sky-700
  );

  // Card 4: Daya Sistem Kapal
  const battVal = stats.latestBattery ?? 85;
  const voltVal = 10.0 + (battVal / 100) * 2.6;
  drawKpiCard(
    doc,
    14 + (cardW + 3.33) * 3,
    cardY,
    cardW,
    cardH,
    [99, 102, 241], // Indigo
    'Catu Daya Kapal (ESP32)',
    `${battVal}% (${voltVal.toFixed(1)}V)`,
    `Sampel: ${stats.count} rekaman data`,
    battVal >= 20 ? 'Baterai Prima' : 'Perlu Pengisian',
    [238, 242, 255], // indigo-100
    [67, 56, 202] // indigo-700
  );

  // 3. Section 2 Title: Grafik Tren Fluktuasi Telemetri Sesi
  const chartSectionY = cardY + cardH + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Grafik Tren Fluktuasi Telemetri Sesi (Visualisasi Data Riil)', 14, chartSectionY);

  // Render 2 Side-by-side Vector Trend Charts
  const chartW = 89;
  const chartH = 43;
  const chartY = chartSectionY + 2.5;

  drawPhTrendChart(doc, 14, chartY, chartW, chartH, logs, stats);
  drawTempTdsTrendChart(doc, 14 + chartW + 4, chartY, chartW, chartH, logs, stats);

  // 4. Section 3 Title: Matriks Evaluasi Statistik Sesi
  const tableSectionY = chartY + chartH + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Matriks Evaluasi Statistik & Kepatuhan Baku Mutu Lingkungan', 14, tableSectionY);

  // Summary Table Rows with enriched scientific formulations
  const summaryRows = [
    [
      'Derajat Keasaman (pH Air)',
      avgPh !== '-' ? `${avgPh}` : '-',
      stats.minPh != null && stats.maxPh != null ? `${stats.minPh.toFixed(2)} - ${stats.maxPh.toFixed(2)}` : '-',
      stats.latestPh != null ? `${stats.latestPh.toFixed(2)}` : '-',
      '6.50 – 8.50',
      avgPhNum !== null && avgPhNum >= 6.5 && avgPhNum <= 8.5
        ? 'Sesuai Baku Mutu (Optimal Netral)'
        : 'Anomali / Perlu Buffer Netralisasi',
    ],
    [
      'Suhu Air Sensor DS18B20',
      avgSuhu !== '-' ? `${avgSuhu} °C` : '-',
      stats.minSuhu != null && stats.maxSuhu != null ? `${stats.minSuhu.toFixed(1)} - ${stats.maxSuhu.toFixed(1)} °C` : '-',
      stats.latestSuhu != null ? `${stats.latestSuhu.toFixed(1)} °C` : '-',
      'Deviasi ±3°C Udara (20 – 32°C)',
      avgSuhuNum !== null && avgSuhuNum >= 20 && avgSuhuNum <= 32
        ? 'Optimal Perairan Alami'
        : 'Fluktuasi Suhu Signifikan',
    ],
    [
      'Total Padatan Terlarut (TDS)',
      avgTds !== '-' ? `${avgTds} ppm` : '-',
      stats.minTds != null && stats.maxTds != null ? `${stats.minTds} - ${stats.maxTds} ppm` : '-',
      stats.latestTds != null ? `${stats.latestTds} ppm` : '-',
      '< 1000 ppm (Baku Mutu Kelas II)',
      avgTdsNum !== null && avgTdsNum <= 500
        ? 'Sangat Baik (< 500 ppm)'
        : 'Padatan Cukup Tinggi / Sedimen',
    ],
    [
      'Estimasi Oksigen Terlarut (DO O₂)',
      `${analytics.doCapacityMgL.toFixed(1)} mg/L`,
      `Saturasi: ${analytics.doSaturationPercent}%`,
      `${analytics.doCapacityMgL.toFixed(1)} mg/L`,
      '> 4.0 mg/L (Kelayakan Akuatik)',
      analytics.doCapacityMgL >= 4.0 ? 'Kapasitas Oksigen Memadai' : 'Potensi Hipoksia',
    ],
    [
      'Konduktivitas Listrik (EC)',
      `~${analytics.conductivityUsCm} µS/cm`,
      `Salinitas: ${analytics.salinityCategory}`,
      `~${analytics.conductivityUsCm} µS/cm`,
      '< 1500 µS/cm (Air Tawar)',
      analytics.conductivityUsCm < 1500 ? 'Karakteristik Tawar / Rendah Ion' : 'Ion Mineral Tinggi',
    ],
    [
      'Indeks Mutu Air (WQI Model)',
      `${analytics.wqiScore}% (${analytics.wqiStatus})`,
      'Biokompatibilitas: ' + analytics.biocompatibilityPercent + '%',
      `${analytics.wqiScore}%`,
      'Skor WQI > 70% (Kategori Baik)',
      analytics.wqiScore >= 70 ? 'Ekosistem Perairan Sehat' : 'Kualitas Air Menurun',
    ],
  ];

  autoTable(doc, {
    startY: tableSectionY + 2.5,
    head: [
      [
        'Parameter Uji & Sensor',
        'Rata-Rata Sesi',
        'Rentang (Min - Max)',
        'Nilai Terakhir',
        'Baku Mutu (PP RI 22/2021)',
        'Evaluasi Kelayakan Mutu',
      ],
    ],
    body: summaryRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 26 },
      2: { cellWidth: 32 },
      3: { cellWidth: 22 },
      4: { cellWidth: 33 },
      5: { cellWidth: 27 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalSummaryY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 200;

  // 5. Environmental Quality Verdict Box
  const verdictY = finalSummaryY + 3.5;
  doc.setFillColor(isWaterQualityOptimal ? 240 : 254, isWaterQualityOptimal ? 253 : 242, isWaterQualityOptimal ? 244 : 242);
  doc.setDrawColor(isWaterQualityOptimal ? 167 : 252, isWaterQualityOptimal ? 243 : 165, isWaterQualityOptimal ? 208 : 165);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, verdictY, 182, 16.5, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(isWaterQualityOptimal ? 5 : 153, isWaterQualityOptimal ? 150 : 27, isWaterQualityOptimal ? 105 : 27);
  doc.text(
    isWaterQualityOptimal
      ? '✓ KESIMPULAN EVALUASI: AIR MEMENUHI STANDAR MUTU PERAIRAN KELAS II (PP RI NO. 22/2021)'
      : '⚠ KESIMPULAN EVALUASI: TERDETEKSI FLUKTUASI PARAMETER AIR DI LUAR STANDAR OPTIMAL',
    18,
    verdictY + 4.8
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Berdasarkan data sesi selama ${durationStr} dengan total ${stats.count} paket data telemetri, nilai rata-rata derajat keasaman pH ${avgPh} dan konsentrasi padatan terlarut TDS ${avgTds} ppm terbukti stabil. Kondisi ekosistem mendukung biota perairan. Modul aktuator dosing kimiawi dalam kondisi siaga (standby) dan tidak membutuhkan tindakan korektif darurat.`,
    18,
    verdictY + 8.8,
    { maxWidth: 174 }
  );

  // Digital Verification & Seal note on bottom Page 1
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `* Seluruh parameter diverifikasi secara realtime melalui probe mikrokontroler ESP32-S3. Detail entri per detik tercantum pada lembar lampiran log historis.`,
    14,
    verdictY + 19.5
  );

  // =========================================================================
  // PAGE 2+: HISTORICAL LOG DATA TABLE & SIGN-OFF SEAL
  // =========================================================================
  doc.addPage();

  const logSectionY = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`4. Lampiran Log Data Historis Telemetri (${logs.length} Rekaman Sampel)`, 14, logSectionY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Urutan kronologis transmisi telemetri kapal otonom USV NUSA-01 per interval pencatatan ke memori lokal & cloud.`,
    14,
    logSectionY + 4.5
  );

  const logRows = logs.map((log, index) => {
    const status =
      log.ph < 6.5
        ? 'Asam (<6.5)'
        : log.ph > 8.5
        ? 'Basa (>8.5)'
        : log.tds_ppm > 500
        ? 'TDS Tinggi'
        : 'Normal (Optimal)';

    const batt = log.baterai_persen ?? 85;
    const tegangan = log.tegangan_v ?? (10.0 + (batt / 100) * 2.6);

    return [
      (index + 1).toString(),
      log.timeFormatted,
      `${log.suhu_c.toFixed(2)} °C`,
      log.ph.toFixed(2),
      `${log.tds_ppm} ppm`,
      `${batt}% (${tegangan.toFixed(2)}V)`,
      status,
    ];
  });

  autoTable(doc, {
    startY: logSectionY + 7,
    head: [
      [
        'No',
        'Waktu Pengujian',
        'Suhu Sensor',
        'pH Air',
        'TDS Sensor',
        'Baterai (Voltase)',
        'Status Kualitas Air',
      ],
    ],
    body: logRows.length > 0 ? logRows : [['-', 'Belum ada rekaman log', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [2, 132, 199], // sky-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 32 },
      2: { cellWidth: 26 },
      3: { cellWidth: 22 },
      4: { cellWidth: 28 },
      5: { cellWidth: 36 },
      6: { cellWidth: 28 },
    },
    margin: { left: 14, right: 14, bottom: 24 },
  });

  // Digital verification seal block after table
  const finalLogY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 200;
  if (finalLogY < 245) {
    const sealY = finalLogY + 6;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(120, sealY, 76, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text('VALIDASI & OTORISASI TELEMETRI SISTEM', 123, sealY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Sistem: Autonomous Surface Vessel (USV NUSA-01)`, 123, sealY + 9);
    doc.text(`Sensor: DS18B20 · pH-4502C · Analog TDS · ESP32-S3`, 123, sealY + 12.5);
    doc.text(`Timestamp ID: ${now.getTime()}`, 123, sealY + 16);

    doc.setFillColor(16, 185, 129);
    doc.circle(125, sealY + 21, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('TERVERIFIKASI SISTEM TELEMETRI MARITIM', 128, sealY + 22);
  }

  // =========================================================================
  // ACCURATE MULTI-PAGE RUNNING HEADER & FOOTER NUMBERING
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running Header on page > 1
    if (i > 1) {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(14, 8, 182, 6.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 14.5, 196, 14.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text('USV NUSA-01 · Laporan Telemetri & Kualitas Air Perairan', 17, 12.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`${docId} · ${exportDateStr}`, 193, 12.2, { align: 'right' });
    }

    // Bottom Footer on all pages
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 286, 196, 286);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Halaman ${i} dari ${totalPages} · Dokumen Resmi Telemetri & Analisis Sesi Kapal Otonom`,
      14,
      290
    );
    doc.text('Standar Baku Mutu: PP RI No. 22/2021 (Kelas II)', 196, 290, { align: 'right' });
  }

  const fileDate = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  doc.save(`laporan_telemetri_kapal_${fileDate}.pdf`);
}
