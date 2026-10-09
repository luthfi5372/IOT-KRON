import React from 'react';
import {
  Radio,
  Wifi,
  Settings,
  Volume2,
  VolumeX,
  Terminal,
  Ship,
  FlaskConical,
  LogOut,
  User as UserIcon,
  Cloud,
  CheckCircle2,
  Bell,
  BellOff,
  BellRing,
  Sparkles,
  Bot,
  Wrench,
} from 'lucide-react';
import { ConnectionStatus } from '../types/telemetry';
import { User as FirebaseUser } from 'firebase/auth';
import { NotificationPermissionState } from '../utils/browserNotifications';

interface NavbarProps {
  status: ConnectionStatus;
  statusMessage?: string;
  topic: string;
  brokerUrl: string;
  lastMessageAge: number | null; // in seconds
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenSimulator: () => void;
  isSimulating: boolean;
  onOpenScience: () => void;
  onOpenAiAdvisor?: () => void;
  onOpenMaintenance?: () => void;
  isCalibrationDue?: boolean;
  currentUser: FirebaseUser | null;
  onLoginGoogle: () => void;
  onLogout: () => void;
  isFirestoreConnected: boolean;
  isDark?: boolean;
  onToggleTheme?: () => void;
  isSensorActive?: boolean;
  // Browser Notification
  browserNotifPermission?: NotificationPermissionState;
  browserNotifEnabled?: boolean;
  onToggleBrowserNotif?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  statusMessage,
  topic,
  brokerUrl,
  lastMessageAge,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  onOpenSimulator,
  isSimulating,
  onOpenScience,
  onOpenAiAdvisor,
  onOpenMaintenance,
  isCalibrationDue = false,
  currentUser,
  onLoginGoogle,
  onLogout,
  isFirestoreConnected,
  isDark = false,
  onToggleTheme,
  isSensorActive = true,
  browserNotifPermission = 'default',
  browserNotifEnabled = false,
  onToggleBrowserNotif,
}) => {
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const isDisconnected = status === 'disconnected' || status === 'error';

  return (
    <header
      className={`sticky top-0 z-30 transition-all duration-300 backdrop-blur-xl ${
        isDark
          ? 'border-b border-white/[0.06] bg-[#0d121f]/80 text-slate-100'
          : 'border-b border-stone-200/80 bg-white/85 text-slate-800 shadow-[0_1px_8px_rgba(0,0,0,0.02)]'
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand & Vessel Identity */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all shadow-xs ${
              isDark
                ? 'bg-sky-500/10 text-sky-400 border border-sky-400/20'
                : 'bg-sky-50 text-sky-600 border border-sky-100'
            }`}
          >
            <Ship className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Telemetri Kapal
              </h1>
              <span className={isDark ? 'text-slate-600' : 'text-slate-300'} aria-hidden="true">·</span>
              <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                USV Nusa-01
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Monitoring Kualitas Air &amp; Kontrol Aktuator Dosing
            </p>
          </div>
        </div>

        {/* Status Badges & Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Live Connection & Sensor Status */}
          <div className="flex items-center gap-2 text-xs">
            {/* Broker Status */}
            {isConnected ? (
              <span
                className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${
                  isDark
                    ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/20'
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Broker Terhubung
              </span>
            ) : isConnecting ? (
              <span
                className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${
                  isDark
                    ? 'text-amber-300 bg-amber-500/10 border border-amber-500/20'
                    : 'text-amber-700 bg-amber-50 border border-amber-200/60'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-spin" />
                Menghubungkan
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${
                  isDark
                    ? 'text-rose-300 bg-rose-500/10 border border-rose-500/20'
                    : 'text-rose-700 bg-rose-50 border border-rose-200/60'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Terputus
              </span>
            )}

            {/* Sensor Live vs Dead Status */}
            {isSensorActive ? (
              <span
                className={`inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-full text-xs ${
                  isDark
                    ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/20'
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                }`}
                title="Sensor mengirim data secara real-time"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Sensor Realtime
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-full text-xs ${
                  isDark
                    ? 'text-rose-300 bg-rose-500/20 border border-rose-500/35'
                    : 'text-rose-800 bg-rose-100 border border-rose-300'
                }`}
                title="Sinyal sensor mati/terputus, perlu menghubungkan dengan sensor"
              >
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                Perlu Hubungkan Sensor
              </span>
            )}

            {lastMessageAge !== null && isConnected && (
              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                · {lastMessageAge}d lalu
              </span>
            )}
          </div>

          <span className={isDark ? 'text-slate-700 hidden sm:inline' : 'text-slate-200 hidden sm:inline'} aria-hidden="true">|</span>

          {/* Theme Switcher Button - Pinterest Light vs Soft Dark */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`btn-simple flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 text-amber-300 hover:bg-slate-700/80 border border-slate-700/50'
                  : 'bg-orange-50/80 text-orange-700 hover:bg-orange-100 border border-orange-200/60 shadow-xs'
              }`}
              title={isDark ? 'Ganti ke Tema Pinterest Soft Light' : 'Ganti ke Tema Soft Dark'}
            >
              <span>{isDark ? '🌙' : '🌸'}</span>
              <span className="hidden sm:inline">{isDark ? 'Soft Dark' : 'Pinterest Light'}</span>
            </button>
          )}

          {/* AI Diagnosa Kapal Button */}
          {onOpenAiAdvisor && (
            <button
              onClick={onOpenAiAdvisor}
              className={`btn-simple flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                isDark
                  ? 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 border border-sky-500/30 shadow-xs'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/80 shadow-xs'
              }`}
              title="Buka AI Konsultan & Diagnosa Telemetri Kualitas Air Kapal"
            >
              <Sparkles className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
              <span>AI Diagnosa</span>
            </button>
          )}

          {/* Science Skills Portal Button */}
          <button
            onClick={onOpenScience}
            className={`btn-simple flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
              isDark
                ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Buka Portal Sains & PubChem Kimia Perairan"
          >
            <FlaskConical className="h-3.5 w-3.5 text-purple-500" />
            <span className="hidden sm:inline">Sains &amp; Kimia</span>
          </button>

          {/* Maintenance & Sensor Calibration Tracking Button */}
          {onOpenMaintenance && (
            <button
              onClick={onOpenMaintenance}
              className={`btn-simple relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                isCalibrationDue
                  ? isDark
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                    : 'bg-rose-100 text-rose-800 border border-rose-300 shadow-xs'
                  : isDark
                  ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/25'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80 shadow-xs'
              }`}
              title="Buka Pelacakan Jam Operasi & Pemeliharaan Kalibrasi Sensor"
            >
              <Wrench className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Pemeliharaan</span>
              {isCalibrationDue && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                </span>
              )}
            </button>
          )}

          {/* Simulator Status Button */}
          <button
            onClick={onOpenSimulator}
            className={`btn-simple flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
              isSimulating
                ? isDark
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-xs'
                : isDark
                ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Buka panel simulasi data ESP32"
          >
            <Terminal className="h-3.5 w-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Simulator</span>
            {isSimulating && (
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </button>

          {/* Audio Alarm Mute/Unmute */}
          <button
            onClick={onToggleSound}
            className={`btn-simple flex items-center justify-center p-2 rounded-xl text-xs cursor-pointer ${
              soundEnabled
                ? isDark
                  ? 'text-sky-300 hover:bg-slate-800/60'
                  : 'text-sky-600 hover:bg-slate-100'
                : isDark
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title={soundEnabled ? 'Alarm Suara Aktif' : 'Alarm Suara Dimatikan'}
            aria-label={soundEnabled ? 'Alarm Suara Aktif' : 'Alarm Suara Dimatikan'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Browser Background Notification Button */}
          {onToggleBrowserNotif && browserNotifPermission !== 'unsupported' && (
            <button
              onClick={onToggleBrowserNotif}
              className={`btn-simple relative flex items-center justify-center p-2 rounded-xl text-xs cursor-pointer ${
                browserNotifPermission === 'denied'
                  ? 'text-rose-400 opacity-60 hover:opacity-100'
                  : browserNotifPermission === 'granted' && browserNotifEnabled
                  ? isDark
                    ? 'text-sky-300 bg-sky-500/15 border border-sky-500/30 hover:bg-sky-500/25'
                    : 'text-sky-600 bg-sky-50 border border-sky-200 hover:bg-sky-100 shadow-xs'
                  : browserNotifPermission === 'default'
                  ? isDark
                    ? 'text-amber-300 hover:bg-slate-800/60'
                    : 'text-amber-600 hover:bg-slate-100'
                  : isDark
                  ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title={
                browserNotifPermission === 'denied'
                  ? 'Izin notifikasi browser diblokir di pengaturan situs'
                  : browserNotifPermission === 'default'
                  ? 'Aktifkan notifikasi browser (peringatan tab di latar belakang)'
                  : browserNotifEnabled
                  ? 'Notifikasi browser aktif (peringatan otomatis saat di latar belakang)'
                  : 'Notifikasi browser dinonaktifkan'
              }
              aria-label="Pengaturan Notifikasi Browser"
            >
              {browserNotifPermission === 'denied' ? (
                <BellOff className="h-4 w-4" />
              ) : browserNotifPermission === 'granted' && browserNotifEnabled ? (
                <BellRing className="h-4 w-4" />
              ) : browserNotifPermission === 'default' ? (
                <>
                  <Bell className="h-4 w-4 text-amber-500" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500" />
                </>
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Pengaturan MQTT Broker & Firmware"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Konfigurasi</span>
          </button>

          {/* Firebase Authentication Profile (if logged in) */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-1 text-xs">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Operator'}
                  className="h-6 w-6 rounded-full object-cover border border-slate-300"
                />
              ) : (
                <UserIcon className="h-4 w-4 text-sky-500" />
              )}
              <span
                className={`hidden sm:inline font-medium text-xs max-w-[90px] truncate ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                {currentUser.displayName || currentUser.email?.split('@')[0] || 'Operator'}
              </span>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer p-0.5"
                title="Keluar dari akun Google"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

