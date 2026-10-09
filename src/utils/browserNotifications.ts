// Browser Notification API service for Water Quality Telemetry Monitoring
// Alerts the user when water quality parameters cross critical thresholds,
// especially when the dashboard tab is in the background or minimized.

export type NotificationPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

export type CriticalThresholdType =
  | 'PH_ACID'
  | 'PH_BASE'
  | 'TDS_CRITICAL'
  | 'TEMP_HOT'
  | 'TEMP_COLD'
  | 'BATTERY_LOW'
  | 'SENSOR_OFFLINE';

export interface WaterAlertInfo {
  type: CriticalThresholdType;
  title: string;
  body: string;
  tag: string;
  severity: 'warning' | 'critical';
  valueFormatted: string;
}

// Cooldown between repeated notifications for the same trigger (in milliseconds)
const COOLDOWN_MS = 45000; // 45 seconds

// State trackers for notifications
const lastNotifiedTime: Partial<Record<CriticalThresholdType, number>> = {};
let originalDocTitle = '';
let titleIntervalId: number | null = null;

/**
 * Checks if Notification API is supported in the current environment
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets the current notification permission status
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Requests browser notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem('telemetry_browser_notifications_enabled', 'true');
    }
    return permission as NotificationPermissionState;
  } catch {
    // Older browsers or restricted iframe environments
    return Notification.permission as NotificationPermissionState;
  }
}

/**
 * Gets user preference for enabling browser notifications
 */
export function isBrowserNotificationEnabled(): boolean {
  if (!isNotificationSupported()) return false;
  const saved = localStorage.getItem('telemetry_browser_notifications_enabled');
  // Default to true if already granted, otherwise follow saved preference
  if (saved === null) {
    return Notification.permission === 'granted';
  }
  return saved === 'true';
}

/**
 * Sets user preference for browser notifications
 */
export function setBrowserNotificationEnabled(enabled: boolean): void {
  localStorage.setItem('telemetry_browser_notifications_enabled', enabled ? 'true' : 'false');
}

/**
 * Flashes browser tab title when an alert is active in the background
 */
function startTitleFlashing(alertText: string) {
  if (typeof document === 'undefined') return;
  if (!originalDocTitle) {
    originalDocTitle = document.title || 'Dashboard Telemetri Kapal';
  }

  if (titleIntervalId !== null) {
    window.clearInterval(titleIntervalId);
  }

  let toggle = false;
  titleIntervalId = window.setInterval(() => {
    if (document.hidden) {
      document.title = toggle ? `🚨 ${alertText}` : `⚠️ ${originalDocTitle}`;
      toggle = !toggle;
    } else {
      stopTitleFlashing();
    }
  }, 1200);
}

/**
 * Stops flashing the browser tab title
 */
export function stopTitleFlashing() {
  if (titleIntervalId !== null) {
    window.clearInterval(titleIntervalId);
    titleIntervalId = null;
  }
  if (typeof document !== 'undefined' && originalDocTitle) {
    document.title = originalDocTitle;
  }
}

// Listen to tab visibility change to restore title when user returns
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      stopTitleFlashing();
    }
  });
}

/**
 * Dispatches a native browser notification via Notification API
 */
export function sendBrowserNotification(
  alert: WaterAlertInfo,
  force: boolean = false
): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  if (!isBrowserNotificationEnabled() && !force) return false;

  const now = Date.now();
  const lastTime = lastNotifiedTime[alert.type] || 0;

  // Rate limit notifications unless explicitly forced (e.g. test notification)
  if (!force && now - lastTime < COOLDOWN_MS) {
    return false;
  }

  lastNotifiedTime[alert.type] = now;

  try {
    const notification = new Notification(alert.title, {
      body: alert.body,
      tag: alert.tag, // Replaces previous notification of same tag in OS notification center
      icon: '/vite.svg',
      badge: '/vite.svg',
      requireInteraction: alert.severity === 'critical',
      silent: false,
    });

    // Bring tab into focus when user clicks notification
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // If tab is currently in the background, also flash the document title
    if (typeof document !== 'undefined' && document.hidden) {
      startTitleFlashing(`[${alert.severity.toUpperCase()}] ${alert.valueFormatted}`);
    }

    return true;
  } catch (err) {
    console.warn('Browser notification error:', err);
    return false;
  }
}

/**
 * Evaluates water parameters against critical thresholds and triggers
 * browser notification if any parameter is in critical state.
 *
 * Designed to work seamlessly even when tab is in background.
 */
export function checkAndNotifyThresholds(
  current: {
    ph: number;
    suhu_c: number;
    tds_ppm: number;
    baterai_persen: number;
  },
  previous: {
    ph: number;
    suhu_c: number;
    tds_ppm: number;
    baterai_persen: number;
  },
  isSensorActive: boolean = true
): void {
  // If sensor is dead/offline
  if (!isSensorActive) {
    sendBrowserNotification({
      type: 'SENSOR_OFFLINE',
      title: '🔌 Sensor Telemetri Kapal Terputus',
      body: 'Transmisi data sensor ESP32 berhenti. Periksa daya kapal dan koneksi probe sensor air.',
      tag: 'telemetry-sensor-offline',
      severity: 'critical',
      valueFormatted: 'Sensor Offline',
    });
    return;
  }

  // 1. pH Acidic Critical (< 6.50)
  if (current.ph < 6.5) {
    const isEdgeTrigger = previous.ph >= 6.5;
    const alert: WaterAlertInfo = {
      type: 'PH_ACID',
      title: '⚠️ Kualitas Air: pH Asam Kritis!',
      body: `Derajat keasaman turun ke ${current.ph.toFixed(2)} pH (batas aman 6.50 - 8.50). Modul dosing nonaktif, harap periksa sirkulasi air manual.`,
      tag: 'telemetry-ph-acid',
      severity: current.ph < 6.0 ? 'critical' : 'warning',
      valueFormatted: `pH ${current.ph.toFixed(2)} (Asam)`,
    };
    sendBrowserNotification(alert, isEdgeTrigger);
  }

  // 2. pH Alkaline Critical (> 8.50)
  if (current.ph > 8.5) {
    const isEdgeTrigger = previous.ph <= 8.5;
    const alert: WaterAlertInfo = {
      type: 'PH_BASE',
      title: '🚨 Kualitas Air: pH Basa Kritis!',
      body: `Derajat keasaman naik ke ${current.ph.toFixed(2)} pH (batas aman 6.50 - 8.50). Modul dosing nonaktif, harap lakukan aerasi/pergantian air.`,
      tag: 'telemetry-ph-base',
      severity: current.ph > 9.0 ? 'critical' : 'warning',
      valueFormatted: `pH ${current.ph.toFixed(2)} (Basa)`,
    };
    sendBrowserNotification(alert, isEdgeTrigger);
  }

  // 3. TDS Critical (> 800 ppm)
  if (current.tds_ppm > 800) {
    const isEdgeTrigger = previous.tds_ppm <= 800;
    const alert: WaterAlertInfo = {
      type: 'TDS_CRITICAL',
      title: '⚠️ Kualitas Air: TDS Sangat Tinggi!',
      body: `Partikel terlarut mencapai ${Math.round(current.tds_ppm)} PPM. Kualitas air memburuk dan mineral pekat terakumulasi.`,
      tag: 'telemetry-tds-critical',
      severity: current.tds_ppm > 1000 ? 'critical' : 'warning',
      valueFormatted: `${Math.round(current.tds_ppm)} PPM`,
    };
    sendBrowserNotification(alert, isEdgeTrigger);
  }

  // 4. Extreme Temperature Hot (> 33.0°C)
  if (current.suhu_c > 33.0) {
    const isEdgeTrigger = previous.suhu_c <= 33.0;
    const alert: WaterAlertInfo = {
      type: 'TEMP_HOT',
      title: '🔥 Peringatan Suhu: Air Terlalu Panas!',
      body: `Suhu air terdeteksi ${current.suhu_c.toFixed(1)}°C (melebihi batas aman 33.0°C). Kelarutan oksigen (DO) menurun drastis.`,
      tag: 'telemetry-temp-hot',
      severity: 'warning',
      valueFormatted: `${current.suhu_c.toFixed(1)}°C`,
    };
    sendBrowserNotification(alert, isEdgeTrigger);
  }

  // 5. Extreme Temperature Cold (< 20.0°C)
  if (current.suhu_c < 20.0) {
    const isEdgeTrigger = previous.suhu_c >= 20.0;
    const alert: WaterAlertInfo = {
      type: 'TEMP_COLD',
      title: '❄️ Peringatan Suhu: Air Terlalu Dingin!',
      body: `Suhu air turun ke ${current.suhu_c.toFixed(1)}°C di bawah ambang batas biologis perairan.`,
      tag: 'telemetry-temp-cold',
      severity: 'warning',
      valueFormatted: `${current.suhu_c.toFixed(1)}°C`,
    };
    sendBrowserNotification(alert, isEdgeTrigger);
  }

  // 6. Battery Low (< 20%)
  if (current.baterai_persen < 20) {
    const isEdgeTrigger = previous.baterai_persen >= 20;
    const alert: WaterAlertInfo = {
      type: 'BATTERY_LOW',
      title: '🔋 Peringatan: Daya Baterai Kapal Kritis!',
      body: `Sisa daya baterai ESP32 tinggal ${Math.round(current.baterai_persen)}%. Segera hubungkan pengisian daya untuk mencegah offline.`,
      tag: 'telemetry-battery-low',
      severity: 'critical',
      valueFormatted: `Baterai ${Math.round(current.baterai_persen)}%`,
    };
    sendBrowserNotification(alert, isEdgeTrigger);
  }
}

/**
 * Triggers an immediate test notification to verify browser permissions and behavior
 */
export function sendTestBrowserNotification(): boolean {
  return sendBrowserNotification(
    {
      type: 'PH_ACID',
      title: '🔔 Uji Coba Notifikasi Browser Telemetri',
      body: 'Notifikasi browser berhasil aktif! Anda akan menerima peringatan otomatis saat parameter air melampaui batas kritis.',
      tag: 'telemetry-test-notification',
      severity: 'warning',
      valueFormatted: 'Uji Coba Berhasil',
    },
    true
  );
}
