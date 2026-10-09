import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { AlertBanner } from './components/AlertBanner';
import { MetricCards, WaterQualityIndexResult } from './components/MetricCards';
import { SensorAnalyticsCard } from './components/SensorAnalyticsCard';
import { RealTimeChart } from './components/RealTimeChart';
import { DataLogTable } from './components/DataLogTable';
import { SimulatorModal } from './components/SimulatorModal';
import { MqttSettingsModal } from './components/MqttSettingsModal';
import { SciencePortalModal } from './components/SciencePortalModal';
import { AiAdvisorModal } from './components/AiAdvisorModal';
import { SessionStatsSummary } from './components/SessionStatsSummary';
import { MaintenanceModal } from './components/MaintenanceModal';
import { MaintenanceReminderBanner } from './components/MaintenanceReminderBanner';
import { SensorMaintenanceState, DEFAULT_MAINTENANCE_STATE } from './types/maintenance';
import { MqttService } from './services/mqttService';
import { SimulatorService, SimMode } from './services/simulatorService';
import {
  auth,
  signInWithGoogle,
  logOut,
  testFirestoreConnection,
  saveLogToFirestore,
} from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  TelemetryPayload,
  TelemetryLogEntry,
  ConnectionStatus,
  MqttConfig,
  PumpState,
} from './types/telemetry';
import { playAlertBeep } from './utils/audioAlert';
import {
  NotificationPermissionState,
  getNotificationPermission,
  requestNotificationPermission,
  isBrowserNotificationEnabled,
  setBrowserNotificationEnabled,
  checkAndNotifyThresholds,
  sendTestBrowserNotification,
} from './utils/browserNotifications';
import {
  Compass,
  Gauge,
  Radio,
  Shield,
  Waves,
  Info,
  Wrench,
  BarChart3,
  FlaskConical,
  Table2,
  Layers,
} from 'lucide-react';

const INITIAL_MQTT_CONFIG: MqttConfig = {
  brokerUrl: 'wss://broker.emqx.io:8084/mqtt',
  topic: 'kapal/telemetri',
  commandTopic: 'kapal/kontrol',
  clientId: `kapal_web_${Math.random().toString(16).substring(2, 8)}`,
  cleanSession: true,
  useSsl: true,
};

const DEFAULT_PAYLOAD: TelemetryPayload = {
  suhu_c: 28.4,
  ph: 7.24,
  tds_ppm: 460,
  baterai_persen: 86,
  tegangan_v: 12.24,
  pompa_up: 'OFF',
  pompa_down: 'OFF',
  status: 'NORMAL',
  timestamp: Date.now(),
};

/**
 * Real-time Water Quality Index (WQI) Algorithm
 * Evaluates instantaneous water conditions based on:
 * - pH (weight 45%): Optimal 6.8 - 7.6 (NSF-WQI & PP No. 22/2021 Class II standard)
 * - TDS (weight 35%): Optimal 150 - 450 ppm (dissolved ionic mineral balance)
 * - Temperature (weight 20%): Optimal tropical range 26°C - 29.5°C
 */
export function calculateWaterQualityIndex(
  ph: number,
  tempC: number,
  tdsPpm: number
): WaterQualityIndexResult {
  // 1. pH Sub-Index (q_ph: 0 - 100)
  let qPh = 100;
  let phStatus = 'Netral Ideal';
  if (ph >= 6.8 && ph <= 7.6) {
    qPh = 100;
    phStatus = 'Netral Ideal';
  } else if (ph >= 6.5 && ph < 6.8) {
    qPh = Math.max(70, 100 - (6.8 - ph) * 100);
    phStatus = 'Agak Asam (Toleran)';
  } else if (ph > 7.6 && ph <= 8.5) {
    qPh = Math.max(70, 100 - (ph - 7.6) * 33.3);
    phStatus = 'Agak Basa (Toleran)';
  } else if (ph < 6.5) {
    qPh = Math.max(5, 70 - (6.5 - ph) * 45);
    phStatus = ph < 5.5 ? 'Asam Kritis' : 'Asam Rendah';
  } else {
    qPh = Math.max(5, 70 - (ph - 8.5) * 45);
    phStatus = ph > 9.5 ? 'Basa Kritis' : 'Basa Tinggi';
  }

  // 2. Temperature Sub-Index (q_temp: 0 - 100)
  let qTemp = 100;
  let tempStatus = 'Suhu Ideal';
  if (tempC >= 26 && tempC <= 29.5) {
    qTemp = 100;
    tempStatus = 'Suhu Ideal';
  } else if (tempC >= 24 && tempC < 26) {
    qTemp = Math.max(70, 100 - (26 - tempC) * 15);
    tempStatus = 'Sejuk';
  } else if (tempC > 29.5 && tempC <= 32) {
    qTemp = Math.max(65, 100 - (tempC - 29.5) * 14);
    tempStatus = 'Hangat';
  } else if (tempC < 24) {
    qTemp = Math.max(10, 70 - (24 - tempC) * 10);
    tempStatus = 'Dingin Ekstrem';
  } else {
    qTemp = Math.max(10, 65 - (tempC - 32) * 12);
    tempStatus = 'Panas Ekstrem';
  }

  // 3. TDS Sub-Index (q_tds: 0 - 100)
  let qTds = 100;
  let tdsStatus = 'Mineral Optimal';
  if (tdsPpm >= 150 && tdsPpm <= 450) {
    qTds = 100;
    tdsStatus = 'Mineral Optimal';
  } else if (tdsPpm < 150) {
    qTds = Math.max(60, (tdsPpm / 150) * 100);
    tdsStatus = 'Mineral Rendah';
  } else if (tdsPpm <= 700) {
    qTds = Math.max(55, 100 - ((tdsPpm - 450) / 250) * 45);
    tdsStatus = 'Mineral Sedang';
  } else if (tdsPpm <= 1200) {
    qTds = Math.max(25, 55 - ((tdsPpm - 700) / 500) * 30);
    tdsStatus = 'Payau';
  } else {
    qTds = Math.max(5, 25 - ((tdsPpm - 1200) / 1000) * 15);
    tdsStatus = 'Salinitas Tinggi';
  }

  // 4. Weights: pH (45%), TDS (35%), Temperature (20%)
  const weightPh = 0.45;
  const weightTds = 0.35;
  const weightTemp = 0.20;

  const rawWqi = qPh * weightPh + qTds * weightTds + qTemp * weightTemp;
  const score = Math.round(Math.max(0, Math.min(100, rawWqi)));

  let status: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Tercemar' | 'Kritis' = 'Sangat Baik';
  let statusEn: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical' = 'Excellent';
  let ratingGrade: 'A' | 'B' | 'C' | 'D' | 'E' = 'A';
  let color = 'text-emerald-500';
  let badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
  let badgeText = 'text-emerald-700 dark:text-emerald-300';
  let badgeBorder = 'border-emerald-200 dark:border-emerald-800/60';
  let description = 'Kualitas air prima, sangat mendukung biota perairan.';

  if (score >= 88) {
    status = 'Sangat Baik';
    statusEn = 'Excellent';
    ratingGrade = 'A';
    color = 'text-emerald-500';
    badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
    badgeText = 'text-emerald-700 dark:text-emerald-300';
    badgeBorder = 'border-emerald-200 dark:border-emerald-800/60';
    description = 'Kualitas air prima, sangat mendukung biota perairan.';
  } else if (score >= 72) {
    status = 'Baik';
    statusEn = 'Good';
    ratingGrade = 'B';
    color = 'text-sky-500';
    badgeBg = 'bg-sky-50 dark:bg-sky-950/40';
    badgeText = 'text-sky-700 dark:text-sky-300';
    badgeBorder = 'border-sky-200 dark:border-sky-800/60';
    description = 'Kualitas air aman dalam rentang baku mutu budidaya.';
  } else if (score >= 55) {
    status = 'Cukup';
    statusEn = 'Fair';
    ratingGrade = 'C';
    color = 'text-amber-500';
    badgeBg = 'bg-amber-50 dark:bg-amber-950/40';
    badgeText = 'text-amber-700 dark:text-amber-300';
    badgeBorder = 'border-amber-200 dark:border-amber-800/60';
    description = 'Fluktuasi terdeteksi, perhatikan aerasi dan sirkulasi perairan.';
  } else if (score >= 40) {
    status = 'Tercemar';
    statusEn = 'Poor';
    ratingGrade = 'D';
    color = 'text-orange-500';
    badgeBg = 'bg-orange-50 dark:bg-orange-950/40';
    badgeText = 'text-orange-700 dark:text-orange-300';
    badgeBorder = 'border-orange-200 dark:border-orange-800/60';
    description = 'Parameter suboptimal, stres sedang pada organisme air.';
  } else {
    status = 'Kritis';
    statusEn = 'Critical';
    ratingGrade = 'E';
    color = 'text-rose-500';
    badgeBg = 'bg-rose-50 dark:bg-rose-950/40';
    badgeText = 'text-rose-700 dark:text-rose-300';
    badgeBorder = 'border-rose-200 dark:border-rose-800/60';
    description = 'Tercemar berat! Bahaya mortalitas bagi biota air.';
  }

  return {
    score,
    status,
    statusEn,
    ratingGrade,
    color,
    badgeBg,
    badgeText,
    badgeBorder,
    subIndices: {
      ph: Math.round(qPh),
      temperature: Math.round(qTemp),
      tds: Math.round(qTds),
    },
    weights: {
      ph: weightPh,
      temperature: weightTemp,
      tds: weightTds,
    },
    description,
    parametersStatus: {
      phStatus,
      tempStatus,
      tdsStatus,
    },
  };
}

export default function App() {
  // 1. Telemetry State
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryPayload>(DEFAULT_PAYLOAD);
  const [prevTelemetry, setPrevTelemetry] = useState<TelemetryPayload>(DEFAULT_PAYLOAD);
  const [minTemp, setMinTemp] = useState<number>(28.4);
  const [maxTemp, setMaxTemp] = useState<number>(28.4);

  // 2. Data Logs for Session History & Chart
  const [logs, setLogs] = useState<TelemetryLogEntry[]>([]);
  const [isChartPaused, setIsChartPaused] = useState<boolean>(false);

  // 2b. Cumulative Session Statistics & Active Connection Duration State
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => Date.now());
  const [activeConnectionSeconds, setActiveConnectionSeconds] = useState<number>(0);
  const [sessionStats, setSessionStats] = useState<{
    count: number;
    sumSuhu: number;
    sumPh: number;
    sumTds: number;
    minSuhu: number;
    maxSuhu: number;
    minPh: number;
    maxPh: number;
    minTds: number;
    maxTds: number;
  }>({
    count: 0,
    sumSuhu: 0,
    sumPh: 0,
    sumTds: 0,
    minSuhu: 0,
    maxSuhu: 0,
    minPh: 0,
    maxPh: 0,
    minTds: 0,
    maxTds: 0,
  });

  // 2c. Sensor Maintenance & Recalibration Tracking State
  const [maintenance, setMaintenance] = useState<SensorMaintenanceState>(() => {
    try {
      const saved = localStorage.getItem('usv_sensor_maintenance');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load maintenance state from localStorage', e);
    }
    return DEFAULT_MAINTENANCE_STATE;
  });
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState<boolean>(false);

  // Calibration Due Check
  const isPhDue = (maintenance.phOperatingSeconds / 3600) >= maintenance.phMaxOperatingHours;
  const isTdsDue = (maintenance.tdsOperatingSeconds / 3600) >= maintenance.tdsMaxOperatingHours;
  const isCalibrationDue = isPhDue || isTdsDue;

  // Persist maintenance state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('usv_sensor_maintenance', JSON.stringify(maintenance));
    } catch (e) {
      // ignore
    }
  }, [maintenance]);

  // 2d. Real-Time Water Quality Index (WQI) Algorithm Calculation
  const currentWqi = useMemo(() => {
    return calculateWaterQualityIndex(
      currentTelemetry.ph,
      currentTelemetry.suhu_c,
      currentTelemetry.tds_ppm
    );
  }, [currentTelemetry.ph, currentTelemetry.suhu_c, currentTelemetry.tds_ppm]);

  const prevWqi = useMemo(() => {
    if (!prevTelemetry) return undefined;
    return calculateWaterQualityIndex(
      prevTelemetry.ph,
      prevTelemetry.suhu_c,
      prevTelemetry.tds_ppm
    );
  }, [prevTelemetry?.ph, prevTelemetry?.suhu_c, prevTelemetry?.tds_ppm]);

  // 3. MQTT Connection State
  const [mqttConfig, setMqttConfig] = useState<MqttConfig>(INITIAL_MQTT_CONFIG);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('connecting');
  const [connMessage, setConnMessage] = useState<string>('Menghubungkan ke broker...');
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number | null>(null);
  const [lastMessageAge, setLastMessageAge] = useState<number | null>(null);

  // 4. Actuator & Automation State
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [alertDismissed, setAlertDismissed] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // 4b. Browser Notification API State & Handlers
  const [browserNotifPermission, setBrowserNotifPermission] = useState<NotificationPermissionState>(() =>
    getNotificationPermission()
  );
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState<boolean>(() =>
    isBrowserNotificationEnabled()
  );

  const handleRequestBrowserNotif = useCallback(async () => {
    const res = await requestNotificationPermission();
    setBrowserNotifPermission(res);
    if (res === 'granted') {
      setBrowserNotifEnabled(true);
      sendTestBrowserNotification();
    }
  }, []);

  const handleToggleBrowserNotif = useCallback(async () => {
    if (browserNotifPermission !== 'granted') {
      const res = await requestNotificationPermission();
      setBrowserNotifPermission(res);
      if (res === 'granted') {
        setBrowserNotifEnabled(true);
        sendTestBrowserNotification();
      }
      return;
    }
    setBrowserNotifEnabled((prev) => {
      const next = !prev;
      setBrowserNotificationEnabled(next);
      return next;
    });
  }, [browserNotifPermission]);

  const handleTestBrowserNotif = useCallback(() => {
    if (browserNotifPermission !== 'granted') {
      handleRequestBrowserNotif();
    } else {
      sendTestBrowserNotification();
    }
  }, [browserNotifPermission, handleRequestBrowserNotif]);

  // 5. Simulator & Modals State
  const [isSimulating, setIsSimulating] = useState<boolean>(false); // default OFF so real sensor data is expected
  const [hasReceivedFirstPacket, setHasReceivedFirstPacket] = useState<boolean>(false);
  const [simMode, setSimMode] = useState<SimMode>('dynamic');
  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isScienceModalOpen, setIsScienceModalOpen] = useState<boolean>(false);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);

  // 6. Firebase Auth & Firestore State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const [isSavingCloud, setIsSavingCloud] = useState<boolean>(false);
  const [cloudSyncSuccess, setCloudSyncSuccess] = useState<boolean>(false);

  // 7. Theme State - Default: false (Pinterest Soft Light Aesthetic)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pinterest_theme');
      if (saved) return saved === 'dark';
    }
    return false;
  });

  // 8. Simple Mode & Tab Navigation State
  type DashboardTab = 'monitoring' | 'analytics' | 'logs';
  const [activeTab, setActiveTab] = useState<DashboardTab>('monitoring');
  const [isAllWidgetsView, setIsAllWidgetsView] = useState<boolean>(false);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('pinterest_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('pinterest_theme', 'light');
    }
  }, [isDark]);

  // Refs for services
  const mqttServiceRef = useRef<MqttService | null>(null);
  const simulatorServiceRef = useRef<SimulatorService | null>(null);
  const prevPhRef = useRef<number>(7.24);
  const prevBatRef = useRef<number>(86);

  // Firebase Auth Listener & Firestore Connection Test
  useEffect(() => {
    // Test Firestore connection on boot
    testFirestoreConnection().then((connected) => {
      setIsFirestoreConnected(connected);
    });

    // Listen to Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Format local time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Process incoming telemetry data (from MQTT or Simulator)
  const handleIncomingPayload = useCallback((incoming: Partial<TelemetryPayload>) => {
    const now = Date.now();
    setLastMessageTimestamp(now);
    setLastMessageAge(0);
    setHasReceivedFirstPacket(true);

    setCurrentTelemetry((prev) => {
      const merged: TelemetryPayload = {
        ...prev,
        ...incoming,
        suhu_c: incoming.suhu_c !== undefined ? incoming.suhu_c : prev.suhu_c,
        ph: incoming.ph !== undefined ? incoming.ph : prev.ph,
        tds_ppm: incoming.tds_ppm !== undefined ? incoming.tds_ppm : prev.tds_ppm,
        baterai_persen: incoming.baterai_persen !== undefined ? incoming.baterai_persen : prev.baterai_persen,
        tegangan_v: incoming.tegangan_v !== undefined ? incoming.tegangan_v : prev.tegangan_v,
        pompa_up: incoming.pompa_up !== undefined ? incoming.pompa_up : prev.pompa_up,
        pompa_down: incoming.pompa_down !== undefined ? incoming.pompa_down : prev.pompa_down,
        status: incoming.status !== undefined ? incoming.status : prev.status,
        timestamp: now,
      };

      setPrevTelemetry(prev);

      // Update min/max temperature tracker
      setMinTemp((curr) => Math.min(curr, merged.suhu_c));
      setMaxTemp((curr) => Math.max(curr, merged.suhu_c));

      // Threshold audio alert trigger
      const prevPh = prevPhRef.current;
      prevPhRef.current = merged.ph;
      const prevBat = prevBatRef.current;
      prevBatRef.current = merged.baterai_persen;

      if (soundEnabled) {
        if (merged.ph < 6.5 && prevPh >= 6.5) {
          playAlertBeep('warning');
        } else if (merged.ph > 8.5 && prevPh <= 8.5) {
          playAlertBeep('critical');
        } else if (merged.baterai_persen < 20 && prevBat >= 20) {
          playAlertBeep('critical');
        }
      }

      // Browser Notification API: Alert when water quality parameters cross critical thresholds
      // Works even when dashboard tab is in background!
      checkAndNotifyThresholds(
        {
          ph: merged.ph,
          suhu_c: merged.suhu_c,
          tds_ppm: merged.tds_ppm,
          baterai_persen: merged.baterai_persen,
        },
        {
          ph: prev.ph,
          suhu_c: prev.suhu_c,
          tds_ppm: prev.tds_ppm,
          baterai_persen: prev.baterai_persen,
        },
        true
      );

      // Auto reset dismiss if state recovers to normal
      if (merged.ph >= 6.5 && merged.ph <= 8.5) {
        setAlertDismissed(false);
      }

      // Add to logs & charts
      const newEntry: TelemetryLogEntry = {
        ...merged,
        id: `${now}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: now,
        timeFormatted: formatTime(new Date(now)),
      };

      setLogs((prevLogs) => {
        // Keep up to 200 logs in active session memory
        const updated = [...prevLogs, newEntry];
        if (updated.length > 200) {
          return updated.slice(updated.length - 200);
        }
        return updated;
      });

      // Update cumulative session stats
      setSessionStats((prev) => {
        const isFirst = prev.count === 0;
        return {
          count: prev.count + 1,
          sumSuhu: prev.sumSuhu + merged.suhu_c,
          sumPh: prev.sumPh + merged.ph,
          sumTds: prev.sumTds + merged.tds_ppm,
          minSuhu: isFirst ? merged.suhu_c : Math.min(prev.minSuhu, merged.suhu_c),
          maxSuhu: isFirst ? merged.suhu_c : Math.max(prev.maxSuhu, merged.suhu_c),
          minPh: isFirst ? merged.ph : Math.min(prev.minPh, merged.ph),
          maxPh: isFirst ? merged.ph : Math.max(prev.maxPh, merged.ph),
          minTds: isFirst ? merged.tds_ppm : Math.min(prev.minTds, merged.tds_ppm),
          maxTds: isFirst ? merged.tds_ppm : Math.max(prev.maxTds, merged.tds_ppm),
        };
      });

      return merged;
    });
  }, [soundEnabled]);

  // Resynchronize with MQTT broker
  const handleResyncSource = useCallback(() => {
    if (mqttServiceRef.current) {
      setConnMessage('Menyinkronkan ulang dengan broker MQTT...');
      setConnStatus('connecting');
      mqttServiceRef.current.disconnect();
      setTimeout(() => {
        mqttServiceRef.current?.connect();
      }, 400);
    }
  }, []);

  // Initialize MQTT Service
  useEffect(() => {
    const service = new MqttService(mqttConfig);
    mqttServiceRef.current = service;

    service.setCallbacks(
      (payload) => {
        handleIncomingPayload(payload);
      },
      (status, message) => {
        setConnStatus(status);
        if (message) setConnMessage(message);
      }
    );

    service.connect();

    return () => {
      service.disconnect();
    };
  }, [mqttConfig, handleIncomingPayload]);

  // Initialize Simulator Service
  useEffect(() => {
    const sim = new SimulatorService();
    simulatorServiceRef.current = sim;
    sim.setMode(simMode);

    if (isSimulating) {
      sim.start(2000, (payload) => {
        handleIncomingPayload(payload);
      });
    }

    return () => {
      sim.stop();
    };
  }, [isSimulating, simMode, handleIncomingPayload]);

  // Keep track of packet age (seconds since last message)
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastMessageTimestamp) {
        const diffSeconds = Math.floor((Date.now() - lastMessageTimestamp) / 1000);
        setLastMessageAge(diffSeconds);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastMessageTimestamp]);

  // Sensor Realtime Heartbeat: Sensor is ONLY active if data has actually been received AND packet age <= 8 seconds
  const SENSOR_TIMEOUT_SECONDS = 8;
  const isSensorActive = hasReceivedFirstPacket && lastMessageAge !== null && lastMessageAge <= SENSOR_TIMEOUT_SECONDS;

  // Beep & browser notification when sensor disconnects
  const prevSensorActiveRef = useRef<boolean>(true);
  useEffect(() => {
    if (prevSensorActiveRef.current && !isSensorActive && lastMessageTimestamp !== null) {
      if (soundEnabled) {
        playAlertBeep('critical');
      }
      checkAndNotifyThresholds(currentTelemetry, prevTelemetry, false);
    }
    prevSensorActiveRef.current = isSensorActive;
  }, [isSensorActive, soundEnabled, lastMessageTimestamp, currentTelemetry, prevTelemetry]);

  // Active Connection Duration & Sensor Maintenance Operating Time Timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (isSensorActive || connStatus === 'connected' || isSimulating) {
        setActiveConnectionSeconds((prev) => prev + 1);
      }
      if (isSensorActive || isSimulating) {
        setMaintenance((prev) => ({
          ...prev,
          phOperatingSeconds: prev.phOperatingSeconds + 1,
          tdsOperatingSeconds: prev.tdsOperatingSeconds + 1,
          tempOperatingSeconds: prev.tempOperatingSeconds + 1,
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isSensorActive, connStatus, isSimulating]);

  // Maintenance & Calibration Handlers
  const handleResetPhCalibration = useCallback(() => {
    setMaintenance((prev) => ({
      ...prev,
      phOperatingSeconds: 0,
      lastPhCalibrationDate: Date.now(),
      phCalibrationCount: prev.phCalibrationCount + 1,
      reminderDismissed: false,
    }));
  }, []);

  const handleResetTdsCalibration = useCallback(() => {
    setMaintenance((prev) => ({
      ...prev,
      tdsOperatingSeconds: 0,
      lastTdsCalibrationDate: Date.now(),
      tdsCalibrationCount: prev.tdsCalibrationCount + 1,
      reminderDismissed: false,
    }));
  }, []);

  const handleSetPhMaxHours = useCallback((hours: number) => {
    setMaintenance((prev) => ({
      ...prev,
      phMaxOperatingHours: hours,
      reminderDismissed: false,
    }));
  }, []);

  const handleSetTdsMaxHours = useCallback((hours: number) => {
    setMaintenance((prev) => ({
      ...prev,
      tdsMaxOperatingHours: hours,
      reminderDismissed: false,
    }));
  }, []);

  const handleSimulateAdvanceTime = useCallback((hours: number) => {
    setMaintenance((prev) => ({
      ...prev,
      phOperatingSeconds: prev.phOperatingSeconds + hours * 3600,
      tdsOperatingSeconds: prev.tdsOperatingSeconds + hours * 3600,
      tempOperatingSeconds: prev.tempOperatingSeconds + hours * 3600,
      reminderDismissed: false,
    }));
  }, []);

  const handleDismissMaintenanceReminder = useCallback(() => {
    setMaintenance((prev) => ({
      ...prev,
      reminderDismissed: true,
    }));
  }, []);

  // Handler to reset session statistics & connection timer
  const handleResetSessionStats = useCallback(() => {
    setSessionStartTime(Date.now());
    setActiveConnectionSeconds(0);
    setSessionStats({
      count: 0,
      sumSuhu: 0,
      sumPh: 0,
      sumTds: 0,
      minSuhu: 0,
      maxSuhu: 0,
      minPh: 0,
      maxPh: 0,
      minTds: 0,
      maxTds: 0,
    });
  }, []);

  // Manual pump toggle handler
  const handleManualPumpToggle = (pump: 'up' | 'down', targetState: PumpState) => {
    if (!isManualMode) return;

    playAlertBeep('click');

    const updatedUp = pump === 'up' ? targetState : 'OFF';
    const updatedDown = pump === 'down' ? targetState : 'OFF';

    const manualPayload: TelemetryPayload = {
      ...currentTelemetry,
      pompa_up: updatedUp,
      pompa_down: updatedDown,
      status: 'MANUAL',
      timestamp: Date.now(),
    };

    setCurrentTelemetry(manualPayload);

    // Publish to MQTT command topic
    if (mqttServiceRef.current) {
      mqttServiceRef.current.publish(mqttConfig.commandTopic, {
        command: pump === 'up' ? 'pompa_up' : 'pompa_down',
        state: targetState,
        mode: 'MANUAL',
        timestamp: Date.now(),
      });
    }
  };

  // Switch Simulator Modes
  const handleChangeSimMode = (mode: SimMode) => {
    setSimMode(mode);
    if (simulatorServiceRef.current) {
      simulatorServiceRef.current.setMode(mode);
    }
  };

  // Toggle Simulator running state
  const handleToggleSim = () => {
    if (isSimulating) {
      simulatorServiceRef.current?.stop();
      setIsSimulating(false);
    } else {
      simulatorServiceRef.current?.start(2000, (payload) => {
        handleIncomingPayload(payload);
      });
      setIsSimulating(true);
    }
  };

  // Reconnect MQTT manually
  const handleReconnectMqtt = () => {
    if (mqttServiceRef.current) {
      mqttServiceRef.current.disconnect();
      setTimeout(() => {
        mqttServiceRef.current?.connect();
      }, 500);
    }
  };

  // Google Login & Logout Handlers
  const handleLoginGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign-In error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Save current logs to Firestore
  const handleSaveLogsToCloud = async () => {
    if (!currentUser || logs.length === 0) return;
    setIsSavingCloud(true);
    setCloudSyncSuccess(false);

    try {
      const recentLogs = logs.slice(-10);
      for (const logItem of recentLogs) {
        await saveLogToFirestore(logItem, currentUser.uid);
      }
      setCloudSyncSuccess(true);
      setTimeout(() => setCloudSyncSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to sync logs to Firestore:', err);
    } finally {
      setIsSavingCloud(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen flex flex-col overflow-x-hidden transition-colors duration-300 ${
        isDark
          ? 'bg-[#0c1017] text-slate-100 selection:bg-sky-500/20 selection:text-sky-200'
          : 'bg-[#faf9f6] text-slate-800 selection:bg-orange-100 selection:text-orange-900'
      }`}
    >
      {/* Soft Ambient Background Glows */}
      <div className={isDark ? "ambient-glow-sky top-0 left-[-100px] opacity-70" : "ambient-glow-peach top-[-50px] left-[-80px] opacity-40"} />
      <div className={isDark ? "ambient-glow-emerald top-[35%] right-[-150px] opacity-60" : "ambient-glow-sage top-[30%] right-[-100px] opacity-40"} />
      <div className={isDark ? "ambient-glow-indigo bottom-[-100px] left-[20%] opacity-60" : "ambient-glow-mist bottom-[-50px] left-[15%] opacity-40"} />

      {/* 1. Header / Navbar with Science & Auth */}
      <Navbar
        status={connStatus}
        statusMessage={connMessage}
        topic={mqttConfig.topic}
        brokerUrl={mqttConfig.brokerUrl}
        lastMessageAge={lastMessageAge}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenSimulator={() => setIsSimModalOpen(true)}
        isSimulating={isSimulating}
        onOpenScience={() => setIsScienceModalOpen(true)}
        onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
        onOpenMaintenance={() => setIsMaintenanceModalOpen(true)}
        isCalibrationDue={isCalibrationDue}
        currentUser={currentUser}
        onLoginGoogle={handleLoginGoogle}
        onLogout={handleLogout}
        isFirestoreConnected={isFirestoreConnected}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        isSensorActive={isSensorActive}
        browserNotifPermission={browserNotifPermission}
        browserNotifEnabled={browserNotifEnabled}
        onToggleBrowserNotif={handleToggleBrowserNotif}
      />

      {/* Main Dashboard Container */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 space-y-5">
        {/* Simple & Clean Operational Sub-Header with Navigation Tabs */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ${
            isDark
              ? 'border border-slate-800/80 bg-[#121826]/85 backdrop-blur-xl shadow-xs'
              : 'border border-stone-200/80 bg-white/90 shadow-xs backdrop-blur-md'
          }`}
        >
          {/* Identity & Status */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 ${
                isDark ? 'bg-sky-500/10 border border-sky-500/20 text-sky-300' : 'bg-sky-50 border border-sky-200 text-sky-600'
              }`}
            >
              <Compass className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  USV NUSA-01
                </span>
                <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Teluk Estuari
                </span>
                <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
                {isSensorActive ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 live-sensor-glow" />
                    <span>Realtime ({lastMessageAge ?? 0}s)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>Perlu Sensor</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Controls: Monitoring Utama | Analisis | Riwayat */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center p-1 rounded-xl border ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-stone-100/90 border-stone-200/80'
              }`}
            >
              <button
                onClick={() => {
                  setActiveTab('monitoring');
                  setIsAllWidgetsView(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  !isAllWidgetsView && activeTab === 'monitoring'
                    ? isDark
                      ? 'bg-sky-500/20 text-sky-300 shadow-xs font-semibold'
                      : 'bg-white text-slate-900 shadow-xs font-semibold'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Tampilan ringkas & sederhana: metrik utama dan grafik realtime"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Monitoring Live</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('analytics');
                  setIsAllWidgetsView(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  !isAllWidgetsView && activeTab === 'analytics'
                    ? isDark
                      ? 'bg-sky-500/20 text-sky-300 shadow-xs font-semibold'
                      : 'bg-white text-slate-900 shadow-xs font-semibold'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Analisis formulasi ilmiah, DO kelarutan, dan proyeksi sensor"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                <span>Analisis Mutu</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('logs');
                  setIsAllWidgetsView(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  !isAllWidgetsView && activeTab === 'logs'
                    ? isDark
                      ? 'bg-sky-500/20 text-sky-300 shadow-xs font-semibold'
                      : 'bg-white text-slate-900 shadow-xs font-semibold'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Tabel rekaman data sesi, filter, dan ekspor CSV/PDF"
              >
                <Table2 className="h-3.5 w-3.5" />
                <span>Riwayat &amp; Ekspor</span>
              </button>
            </div>

            {/* Quick Toggle: Semua Widget Sekaligus */}
            <button
              onClick={() => setIsAllWidgetsView((prev) => !prev)}
              className={`btn-simple flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                isAllWidgetsView
                  ? isDark
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold'
                    : 'bg-stone-200 text-stone-900 border-stone-300 font-semibold'
                  : isDark
                  ? 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700/60'
                  : 'bg-stone-50 text-stone-600 hover:text-stone-900 border-stone-200/80 shadow-2xs'
              }`}
              title={isAllWidgetsView ? 'Ganti ke Mode Tab Sederhana' : 'Buka Semua Bagian Sekaligus'}
            >
              <Layers className="h-3 w-3" />
              <span className="hidden sm:inline">{isAllWidgetsView ? 'Mode Ringkas' : 'Semua Widget'}</span>
            </button>

            {/* Quick Sensor Reconnect if disconnected */}
            {!isSensorActive && (
              <button
                onClick={() => {
                  setIsSimulating(true);
                  setLastMessageTimestamp(Date.now());
                  setLastMessageAge(0);
                }}
                className={`btn-simple text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border cursor-pointer ${
                  isDark
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 shadow-2xs'
                }`}
              >
                Hubungkan Sensor
              </button>
            )}
          </div>
        </div>

        {/* 1b. Sensor Maintenance & Recalibration Reminder Banner */}
        <MaintenanceReminderBanner
          maintenance={maintenance}
          onOpenMaintenanceModal={() => setIsMaintenanceModalOpen(true)}
          onQuickResetPh={handleResetPhCalibration}
          onQuickResetTds={handleResetTdsCalibration}
          onDismiss={handleDismissMaintenanceReminder}
          isDark={isDark}
        />

        {/* 2. Automated Alert Banner (pH < 6.5 or pH > 8.5, and Battery < 20%, and Sensor Offline) */}
        <AlertBanner
          ph={currentTelemetry.ph}
          batteryPercentage={currentTelemetry.baterai_persen}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          isDismissed={alertDismissed}
          onDismiss={() => setAlertDismissed((prev) => !prev)}
          isDark={isDark}
          isSensorActive={isSensorActive}
          lastMessageAge={lastMessageAge}
          onStartSimulator={() => {
            setIsSimulating(true);
            setLastMessageTimestamp(Date.now());
            setLastMessageAge(0);
          }}
          onReconnectMqtt={handleResyncSource}
          browserNotifPermission={browserNotifPermission}
          browserNotifEnabled={browserNotifEnabled}
          onRequestBrowserNotif={handleRequestBrowserNotif}
          onToggleBrowserNotif={handleToggleBrowserNotif}
          onTestBrowserNotif={handleTestBrowserNotif}
        />

        {/* =========================================================================
            DYNAMIC TABBED VIEWS (Simple & Clean by Default)
            ========================================================================= */}

        {/* TAB 1: MONITORING UTAMA (Default Sederhana: 5 Kartu Metrik + Grafik Realtime) */}
        {(isAllWidgetsView || activeTab === 'monitoring') && (
          <div className="space-y-5 animate-fade-in">
            {/* 5 Kartu Telemetri Utama & WQI */}
            <section aria-label="Kartu Telemetri Kualitas Air & Daya">
              <MetricCards
                suhu_c={currentTelemetry.suhu_c}
                ph={currentTelemetry.ph}
                tds_ppm={currentTelemetry.tds_ppm}
                baterai_persen={currentTelemetry.baterai_persen}
                tegangan_v={currentTelemetry.tegangan_v}
                minTemp={minTemp}
                maxTemp={maxTemp}
                prevSuhu={prevTelemetry.suhu_c}
                prevPh={prevTelemetry.ph}
                prevTds={prevTelemetry.tds_ppm}
                isDark={isDark}
                isSensorActive={isSensorActive}
                hasReceivedData={hasReceivedFirstPacket}
                wqi={currentWqi}
                prevWqi={prevWqi?.score}
                isPhCalibrationDue={isPhDue}
                isTdsCalibrationDue={isTdsDue}
                phOperatingHours={maintenance.phOperatingSeconds / 3600}
                phMaxHours={maintenance.phMaxOperatingHours}
                tdsOperatingHours={maintenance.tdsOperatingSeconds / 3600}
                tdsMaxHours={maintenance.tdsMaxOperatingHours}
                onOpenMaintenance={() => setIsMaintenanceModalOpen(true)}
              />
            </section>

            {/* Grafik Linier Telemetri Real-Time */}
            <section aria-label="Grafik Linier Real-time">
              <RealTimeChart
                dataPoints={logs}
                isPaused={isChartPaused}
                onTogglePause={() => setIsChartPaused((prev) => !prev)}
                onClearPoints={() => setLogs([])}
                isDark={isDark}
              />
            </section>
          </div>
        )}

        {/* TAB 2: ANALISIS MUTU & PROYEKSI (Sensor Formulations & Session Statistics) */}
        {(isAllWidgetsView || activeTab === 'analytics') && (
          <div className="space-y-5 animate-fade-in">
            {/* Ringkasan Statistik Sesi Berjalan */}
            <section aria-label="Ringkasan Statistik Sesi Berjalan">
              <SessionStatsSummary
                avgSuhu={sessionStats.count > 0 ? sessionStats.sumSuhu / sessionStats.count : (hasReceivedFirstPacket ? currentTelemetry.suhu_c : null)}
                avgPh={sessionStats.count > 0 ? sessionStats.sumPh / sessionStats.count : (hasReceivedFirstPacket ? currentTelemetry.ph : null)}
                avgTds={sessionStats.count > 0 ? sessionStats.sumTds / sessionStats.count : (hasReceivedFirstPacket ? currentTelemetry.tds_ppm : null)}
                minSuhu={sessionStats.count > 0 ? sessionStats.minSuhu : (hasReceivedFirstPacket ? currentTelemetry.suhu_c : null)}
                maxSuhu={sessionStats.count > 0 ? sessionStats.maxSuhu : (hasReceivedFirstPacket ? currentTelemetry.suhu_c : null)}
                minPh={sessionStats.count > 0 ? sessionStats.minPh : (hasReceivedFirstPacket ? currentTelemetry.ph : null)}
                maxPh={sessionStats.count > 0 ? sessionStats.maxPh : (hasReceivedFirstPacket ? currentTelemetry.ph : null)}
                minTds={sessionStats.count > 0 ? sessionStats.minTds : (hasReceivedFirstPacket ? currentTelemetry.tds_ppm : null)}
                maxTds={sessionStats.count > 0 ? sessionStats.maxTds : (hasReceivedFirstPacket ? currentTelemetry.tds_ppm : null)}
                currentSuhu={currentTelemetry.suhu_c}
                currentPh={currentTelemetry.ph}
                currentTds={currentTelemetry.tds_ppm}
                sampleCount={sessionStats.count > 0 ? sessionStats.count : (hasReceivedFirstPacket ? 1 : 0)}
                activeSeconds={activeConnectionSeconds}
                isConnected={connStatus === 'connected' || isSimulating}
                isSensorActive={isSensorActive}
                isDark={isDark}
                sessionStartTime={sessionStartTime}
                onResetSession={handleResetSessionStats}
              />
            </section>

            {/* Analisis Rumusan & Proyeksi Perilaku Sensor */}
            <section aria-label="Analisis Rumusan & Proyeksi Sensor">
              <SensorAnalyticsCard
                suhu_c={currentTelemetry.suhu_c}
                ph={currentTelemetry.ph}
                tds_ppm={currentTelemetry.tds_ppm}
                logs={logs}
                isDark={isDark}
                isSensorActive={isSensorActive}
                hasReceivedData={hasReceivedFirstPacket}
                onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
              />
            </section>
          </div>
        )}

        {/* TAB 3: RIWAYAT & EKSPOR (Tabel Data Logs & PDF/CSV Exporter) */}
        {(isAllWidgetsView || activeTab === 'logs') && (
          <div className="space-y-5 animate-fade-in">
            <section aria-label="Log Data dan Ekspor">
              <DataLogTable
                logs={logs}
                onClearLogs={() => setLogs([])}
                currentUser={currentUser}
                onSaveLogsToCloud={handleSaveLogsToCloud}
                isSavingCloud={isSavingCloud}
                cloudSyncSuccess={cloudSyncSuccess}
                isDark={isDark}
                sessionStats={sessionStats}
                activeConnectionSeconds={activeConnectionSeconds}
                sessionStartTime={sessionStartTime}
                currentTelemetry={currentTelemetry}
              />
            </section>
          </div>
        )}
      </main>

      {/* Footer Notes */}
      <footer
        className={`relative z-10 border-t py-4 text-center text-xs transition-colors ${
          isDark
            ? 'border-slate-800/40 bg-[#0c1017]/80 text-slate-400'
            : 'border-stone-200/80 bg-white/70 text-slate-500'
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <span>Sistem Telemetri &amp; Dosing Perairan Kapal Otonom © 2026</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            ESP32-S3 · DS18B20 · pH-4502C · TDS Analog · Firebase Firestore
          </span>
        </div>
      </footer>

      {/* Simulator Modal */}
      <SimulatorModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        isSimulating={isSimulating}
        simMode={simMode}
        onToggleSim={handleToggleSim}
        onChangeSimMode={handleChangeSimMode}
        latestPayload={currentTelemetry}
        onInjectCustomPayload={handleIncomingPayload}
        canPublishMqtt={connStatus === 'connected'}
        isDark={isDark}
      />

      {/* MQTT Configuration & Arduino Code Modal */}
      <MqttSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={mqttConfig}
        onSaveConfig={(newCfg) => setMqttConfig(newCfg)}
        onReconnect={handleReconnectMqtt}
      />

      {/* Science Skills & PubChem Portal Modal */}
      <SciencePortalModal
        isOpen={isScienceModalOpen}
        onClose={() => setIsScienceModalOpen(false)}
        currentTemp={currentTelemetry.suhu_c}
        currentPh={currentTelemetry.ph}
      />

      {/* AI Telemetry & Maritime Water Quality Advisor Modal */}
      <AiAdvisorModal
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        suhu_c={currentTelemetry.suhu_c}
        ph={currentTelemetry.ph}
        tds_ppm={currentTelemetry.tds_ppm}
        baterai_persen={currentTelemetry.baterai_persen}
        isSensorActive={isSensorActive}
        isDark={isDark}
      />

      {/* Sensor Maintenance Tracking & Recalibration Modal */}
      <MaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        maintenance={maintenance}
        onResetPhCalibration={handleResetPhCalibration}
        onResetTdsCalibration={handleResetTdsCalibration}
        onSetPhMaxHours={handleSetPhMaxHours}
        onSetTdsMaxHours={handleSetTdsMaxHours}
        onSimulateAdvanceTime={handleSimulateAdvanceTime}
        isDark={isDark}
      />
    </div>
  );
}
